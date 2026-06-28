#!/usr/bin/env node
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

const DEFAULT_VAULT = process.env.KNOWLEDGE_BRAIN_VAULT || path.join(homedir(), "Documents", "knowledge-brain");

function usage() {
  console.log(`Usage: export-llm-bundle.js [--vault <path>] [--out <path>] [--include-private]\n\nCreates a privacy-aware Markdown bundle for LLM context.\n\nExamples:\n  node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/export-llm-bundle.js`);
}

function parseArgs(argv) {
  const args = { vault: DEFAULT_VAULT, out: path.join(DEFAULT_VAULT, "exports", "llm-context.md"), includePrivate: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--vault") args.vault = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--include-private") args.includePrivate = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

const EXCLUDED_DIRS = new Set([".git", ".obsidian", "node_modules", "exports", ".llm-cache", ".trash"]);
const EXCLUDED_PREFIXES = [];

async function walk(dir, root, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replaceAll(path.sep, "/");
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      if (EXCLUDED_PREFIXES.some((prefix) => `${rel}/`.startsWith(prefix))) continue;
      await walk(full, root, out);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      if (EXCLUDED_PREFIXES.some((prefix) => rel.startsWith(prefix))) continue;
      out.push({ full, rel });
    }
  }
  return out;
}

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim();
  }
  return data;
}

function isFalseyFlag(value) {
  return ["false", "no", "0"].includes(String(value ?? "").trim().toLowerCase());
}

function isTruthyFlag(value) {
  return ["true", "yes", "1"].includes(String(value ?? "").trim().toLowerCase());
}

function priority(rel) {
  const order = ["AGENTS.md", "LLMS.md", "index.md", "README.md", "log.md", "llms.txt"];
  const i = order.indexOf(rel);
  if (i >= 0) return i;
  if (rel.startsWith("10-Wiki/")) return 20;
  if (rel.startsWith("20-Sources/")) return 30;
  if (rel.startsWith("30-Outputs/")) return 40;
  if (rel.startsWith("90-Meta/")) return 50;
  return 60;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();
  const root = path.resolve(args.vault);
  const out = path.resolve(args.out);
  const files = await walk(root, root);
  const included = [];
  const excluded = [];

  for (const file of files) {
    if (!args.includePrivate && file.rel.startsWith("Private/")) {
      excluded.push(`${file.rel} (Private/)`);
      continue;
    }
    const text = await readFile(file.full, "utf8");
    const fm = frontmatter(text);
    if (!args.includePrivate && fm && isTruthyFlag(fm.private)) {
      excluded.push(`${file.rel} (private: true)`);
      continue;
    }
    if (fm && isFalseyFlag(fm.llm_include)) {
      excluded.push(`${file.rel} (llm_include: false)`);
      continue;
    }
    included.push({ ...file, text });
  }

  included.sort((a, b) => priority(a.rel) - priority(b.rel) || a.rel.localeCompare(b.rel));

  const lines = [];
  lines.push("# Knowledge Brain LLM Context Bundle");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Vault: ${root}`);
  lines.push(`Included files: ${included.length}`);
  lines.push(`Excluded files: ${excluded.length}`);
  lines.push("");
  lines.push("## Included Files");
  lines.push("");
  for (const file of included) lines.push(`- ${file.rel}`);
  lines.push("");
  lines.push("## Excluded Files");
  lines.push("");
  for (const item of excluded) lines.push(`- ${item}`);
  lines.push("");

  for (const file of included) {
    lines.push("---");
    lines.push(`\n# File: ${file.rel}\n`);
    lines.push(file.text.trimEnd());
    lines.push("");
  }

  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, lines.join("\n"));
  console.log(`Wrote ${out}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
