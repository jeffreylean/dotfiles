#!/usr/bin/env node

import { mkdir, readFile, writeFile, copyFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const PHASES = new Set(["READY", "IN_PROGRESS", "COMPLETE"]);
const STATUSES = new Set(["PENDING", "IN_PROGRESS", "COMPLETE"]);
const EFFORTS = new Set(["S", "M", "L", "XL"]);

function usage() {
  console.log(`Usage:
  prd-deliverables init <name> [--prd <path>] [--issue <url-or-id>]
  prd-deliverables validate <spec-name-or-state-dir>
  prd-deliverables next <spec-name-or-state-dir>

Examples (run from the target project root):
  node /path/to/skills/prd-deliverables/scripts/prd-deliverables.js init billing-retry --prd ./prd.md
  node /path/to/skills/prd-deliverables/scripts/prd-deliverables.js validate billing-retry
  node /path/to/skills/prd-deliverables/scripts/prd-deliverables.js next billing-retry`);
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "prd-deliverables";
}

function parseFlags(args) {
  const flags = new Map();
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      flags.set(arg.slice(2), args[i + 1]);
      i += 1;
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function findStateDir(input) {
  if (!input) throw new Error("Missing spec name or state directory");
  const direct = resolve(input);
  if (await exists(join(direct, "spec.json"))) return direct;

  const specName = slugify(input);
  let dir = process.cwd();
  while (dir !== dirname(dir)) {
    const candidate = join(dir, ".pi", "state", specName);
    if (await exists(join(candidate, "spec.json"))) return candidate;
    dir = dirname(dir);
  }
  throw new Error(`Could not find .pi/state/${specName}/spec.json from ${process.cwd()}`);
}

function initialSpec(name, issue) {
  const specName = slugify(name);
  return {
    schemaVersion: "pi-prd-deliverables/v1",
    specName,
    phase: "READY",
    prd: {
      title: name,
      generatedBy: "to-prd",
      issue: issue || "",
      sourcePath: "prd.md"
    },
    deliverables: [],
    context: {
      patterns: [],
      keyFiles: [],
      nonGoals: []
    },
    subagents: {
      planning: ["scout", "planner"],
      execution: "worker",
      review: "reviewer"
    }
  };
}

async function progressTemplate(specName) {
  const template = await readFile(join(SKILL_DIR, "assets", "progress-template.md"), "utf8");
  return template
    .replaceAll("<spec-name>", specName)
    .replaceAll("<YYYY-MM-DD>", new Date().toISOString().slice(0, 10));
}

function collectValidationErrors(spec) {
  const errors = [];
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    return ["spec.json must be an object"];
  }
  if (spec.schemaVersion !== "pi-prd-deliverables/v1") errors.push("schemaVersion must be pi-prd-deliverables/v1");
  if (!spec.specName) errors.push("Missing specName");
  if (!PHASES.has(spec.phase)) errors.push("phase must be READY, IN_PROGRESS, or COMPLETE");
  if (!spec.prd || typeof spec.prd !== "object" || Array.isArray(spec.prd)) errors.push("prd object is required");
  if (!Array.isArray(spec.deliverables)) errors.push("deliverables must be an array");
  if (Array.isArray(spec.deliverables) && spec.deliverables.length === 0) errors.push("deliverables must contain at least one deliverable after PRD splitting");
  if (!spec.context || typeof spec.context !== "object" || Array.isArray(spec.context)) errors.push("context object is required");
  if (errors.length > 0) return errors;

  const ids = new Set();
  for (let index = 0; index < spec.deliverables.length; index += 1) {
    const deliverable = spec.deliverables[index];
    const expectedId = `D${index + 1}`;
    if (!deliverable.id) errors.push("deliverable missing id");
    if (deliverable.id && deliverable.id !== expectedId) errors.push(`${deliverable.id}: deliverable id must be ordered as ${expectedId}`);
    if (ids.has(deliverable.id)) errors.push(`duplicate deliverable id: ${deliverable.id}`);
    ids.add(deliverable.id);
    if (!deliverable.name) errors.push(`${deliverable.id}: missing name`);
    if (!EFFORTS.has(deliverable.effort)) errors.push(`${deliverable.id}: effort must be S, M, L, or XL`);
    if (!STATUSES.has(deliverable.status)) errors.push(`${deliverable.id}: invalid status`);
    if (!Array.isArray(deliverable.dependsOn)) errors.push(`${deliverable.id}: dependsOn must be an array`);
    if (!Array.isArray(deliverable.tasks)) errors.push(`${deliverable.id}: tasks must be an array`);

    const tasks = Array.isArray(deliverable.tasks) ? deliverable.tasks : [];
    for (const task of tasks) {
      if (!task.id) errors.push(`${deliverable.id}: task missing id`);
      if (task.id && !task.id.startsWith(`${deliverable.id}-`)) errors.push(`${task.id}: task id must start with ${deliverable.id}-`);
      if (!task.category) errors.push(`${task.id}: missing category`);
      if (!task.description) errors.push(`${task.id}: missing description`);
      if (!Array.isArray(task.steps) || task.steps.length === 0) errors.push(`${task.id}: steps must be a non-empty array`);
      if (typeof task.passes !== "boolean") errors.push(`${task.id}: passes must be boolean`);
    }

    if (deliverable.status === "COMPLETE" && tasks.some((task) => task.passes !== true)) {
      errors.push(`${deliverable.id}: status COMPLETE requires every task passes=true`);
    }
  }

  for (let index = 0; index < spec.deliverables.length; index += 1) {
    const deliverable = spec.deliverables[index];
    const priorIds = new Set(spec.deliverables.slice(0, index).map((item) => item.id));
    const deps = Array.isArray(deliverable.dependsOn) ? deliverable.dependsOn : [];
    for (const dep of deps) {
      if (!ids.has(dep)) errors.push(`${deliverable.id}: dependsOn references missing deliverable ${dep}`);
      if (ids.has(dep) && !priorIds.has(dep)) errors.push(`${deliverable.id}: dependsOn must reference only earlier deliverables (${dep} is not earlier)`);
    }
  }

  if (dependencyCycleExists(spec.deliverables)) {
    errors.push("deliverable dependencies must be acyclic and schedulable");
  }

  if (spec.phase === "COMPLETE" && spec.deliverables.some((deliverable) => deliverable.status !== "COMPLETE")) {
    errors.push("phase COMPLETE requires every deliverable status=COMPLETE");
  }

  return errors;
}

function dependencyCycleExists(deliverables) {
  const remaining = new Map(deliverables.map((deliverable) => [
    deliverable.id,
    new Set(Array.isArray(deliverable.dependsOn) ? deliverable.dependsOn : []),
  ]));
  let progressed = true;
  while (remaining.size > 0 && progressed) {
    progressed = false;
    for (const [id, deps] of remaining) {
      const blockedByRemaining = [...deps].some((dep) => remaining.has(dep));
      if (!blockedByRemaining) {
        remaining.delete(id);
        progressed = true;
      }
    }
  }
  return remaining.size > 0;
}

function nextDeliverable(spec) {
  const complete = new Set(spec.deliverables.filter((d) => d.status === "COMPLETE").map((d) => d.id));
  const deliverable = spec.deliverables.find((d) => d.status !== "COMPLETE" && (d.dependsOn || []).every((dep) => complete.has(dep)));
  return {
    deliverable,
    allComplete: spec.deliverables.every((d) => d.status === "COMPLETE"),
  };
}

async function readSpec(stateDir) {
  return JSON.parse(await readFile(join(stateDir, "spec.json"), "utf8"));
}

async function init(args) {
  const { flags, positional } = parseFlags(args);
  const name = positional[0];
  if (!name) throw new Error("init requires <name>");

  const specName = slugify(name);
  const stateDir = resolve(".pi", "state", specName);
  await mkdir(stateDir, { recursive: true });

  const prdPath = flags.get("prd");
  if (prdPath) {
    await copyFile(resolve(prdPath), join(stateDir, "prd.md"));
  } else if (!(await exists(join(stateDir, "prd.md")))) {
    await writeFile(join(stateDir, "prd.md"), `# PRD: ${name}\n\nPaste or synthesize the to-prd output here.\n`, "utf8");
  }

  const specPath = join(stateDir, "spec.json");
  if (!(await exists(specPath))) {
    await writeFile(specPath, `${JSON.stringify(initialSpec(name, flags.get("issue")), null, 2)}\n`, "utf8");
  }

  const progressPath = join(stateDir, "progress.md");
  if (!(await exists(progressPath))) {
    await writeFile(progressPath, await progressTemplate(specName), "utf8");
  }

  console.log(`Initialized ${stateDir}`);
  console.log("Next: fill spec.json deliverables from prd.md, then run validate.");
}

async function validate(args) {
  const stateDir = await findStateDir(args[0]);
  const spec = await readSpec(stateDir);
  const errors = collectValidationErrors(spec);
  if (errors.length > 0) {
    console.error(`Invalid ${join(stateDir, "spec.json")}`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ Valid ${join(stateDir, "spec.json")}`);
}

async function printNext(args) {
  const stateDir = await findStateDir(args[0]);
  const spec = await readSpec(stateDir);
  const errors = collectValidationErrors(spec);
  if (errors.length > 0) {
    console.error("Cannot select next deliverable because spec.json is invalid.");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  const { deliverable, allComplete } = nextDeliverable(spec);
  if (allComplete) {
    console.log("COMPLETE");
    return;
  }
  if (!deliverable) {
    console.error("No deliverable is currently runnable. Check dependency statuses in spec.json.");
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ stateDir, deliverable }, null, 2));
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help" || command === "help") {
    usage();
    return;
  }
  if (command === "init") return init(args);
  if (command === "validate") return validate(args);
  if (command === "next") return printNext(args);
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  usage();
  process.exit(1);
});
