#!/usr/bin/env node

import { constants } from "node:fs";
import { access, chmod, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const SKILL_CATEGORIES = [
	"knowledge",
	"verification",
	"data",
	"workflow",
	"scaffold",
	"quality",
	"deploy",
	"debugging",
	"ops",
];

function printUsage() {
	console.log("Usage: skill-create.js <skill-name> [options]");
	console.log("");
	console.log("Options:");
	console.log("  --description <text>  Trigger-oriented description for SKILL.md frontmatter");
	console.log(`  --category <name>     Skill category (${SKILL_CATEGORIES.join(", ")}), default: workflow`);
	console.log("  --dir <path>          Skills root directory (default: current working directory)");
	console.log("  --force               Overwrite generated files if they already exist");
	console.log("  --help                Show help");
	console.log("");
	console.log("Examples:");
	console.log("  node skill-create.js signup-verifier --category verification");
	console.log("  bun skill-create.js billing-lib --category knowledge --description \"Use when coding against internal billing SDK\"");
}

function parseArgs(argv) {
	const options = {
		description: "",
		category: "workflow",
		dir: process.cwd(),
		force: false,
	};

	let skillName = "";

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (!arg.startsWith("--") && !skillName) {
			skillName = arg;
			continue;
		}

		switch (arg) {
			case "--description":
				options.description = argv[++i] ?? "";
				break;
			case "--category":
				options.category = (argv[++i] ?? "").trim().toLowerCase();
				break;
			case "--dir":
				options.dir = argv[++i] ?? options.dir;
				break;
			case "--force":
				options.force = true;
				break;
			default:
				throw new Error(`Unknown option: ${arg}`);
		}
	}

	return { skillName, options };
}

function buildDescription(name, category, inputDescription) {
	if (inputDescription.trim()) return inputDescription.trim();
	return `Use when you need ${category} workflows for ${name}.`;
}

function buildSkillMd(name, description, category) {
	return `---
name: ${name}
description: ${description}
---

# ${name}

## When to Use

- Use when this request clearly matches ${category} workflows
- Prefer this skill over ad-hoc instructions when repeatability matters
- If request does not match, do not invoke this skill

## Skill Type

- category: ${category}

## Setup

\`\`\`bash
cd {baseDir}
npm install
# or
bun install
\`\`\`

## File Layout

- \`scripts/\`: runnable helpers the agent can execute with node/bun
- \`references/\`: deeper docs/examples/gotcha history (progressive disclosure)
- \`assets/\`: output templates and static artifacts
- \`config.example.json\`: user/environment setup contract
- \`state/\`: optional local memory/logs (prefer stable external path in config)

## Hooks (Optional)

- If runtime supports skill-scoped hooks, keep hooks narrow and reversible
- Prefer explicit activation for stricter safety modes

## Commands

\`\`\`bash
# Primary helper
{baseDir}/scripts/${name}-run.js "task input"

# Explicit runtimes
node {baseDir}/scripts/${name}-run.js "task input"
bun {baseDir}/scripts/${name}-run.js "task input"
\`\`\`

## Output Contract

- Return concise, deterministic output (JSON or clearly structured text)
- Keep diagnostics on stderr
- Exit non-zero on failure

## Gotchas (Do Not Do)

- Don’t broaden trigger surface; this causes misfires.
- Don’t hide critical edge cases in prose; put them in bullet gotchas.
- Don’t force one rigid path when context may require adaptation.
- Don’t print noisy logs to stdout when parsable output is expected.

## Iteration Log

- Add new gotchas whenever failures recur
- Keep this skill small; split into references/scripts as complexity grows
`;
}

function buildPackageJson(name, description) {
	return JSON.stringify(
		{
			name,
			version: "1.0.0",
			private: true,
			type: "module",
			description,
			scripts: {
				run: `node scripts/${name}-run.js`,
				validate: "node ../skill-creator/skill-validate.js .",
			},
		},
		null,
		2,
	) + "\n";
}

function buildConfigExample(name) {
	return JSON.stringify(
		{
			skillName: name,
			version: "1",
			userPreferences: {
				outputFormat: "json",
				reviewMode: "standard",
			},
			dataPath: "~/.local/share/pi-skills/${skillName}",
		},
		null,
		2,
	)
		.replace("${skillName}", name)
		.concat("\n");
}

function buildReferencesReadme(name) {
	return `# References

Use this directory for progressive disclosure:

- API signatures
- domain-specific examples
- troubleshooting notes
- decision tables

Keep top-level SKILL.md concise; move depth here.

Suggested files:
- api.md
- examples.md
- troubleshooting.md
- gotchas-log.md

Current skill: ${name}
`;
}

function buildGotchasLog() {
	return `# Gotchas Log

Record newly discovered failure modes here, then fold stable ones into SKILL.md -> ## Gotchas.

## Template

- Date:
- Prompt/situation:
- Failure mode:
- Fix:
- Should become permanent gotcha? (yes/no)
`;
}

function buildOutputTemplate() {
	return `# Output Template

## Summary
- 

## Actions Taken
- 

## Evidence
- 

## Risks / Follow-ups
- 
`;
}

function buildStateReadme() {
	return `# State

Optional local memory for this skill (logs/checkpoints/cache).

Guidelines:
- Do not store secrets in plain text.
- Keep volatile state minimal.
- If skill upgrades wipe local files, point to a stable external path via config (dataPath).
`;
}

function buildRunScript(name) {
	return `#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help")) {
	console.log("Usage: ${name}-run.js <task-input>");
	console.log("\nExamples:");
	console.log("  ${name}-run.js \"analyze this request\"");
	process.exit(args.includes("--help") ? 0 : 1);
}

async function maybeLoadConfig() {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const configPath = join(__dirname, "..", "config.json");
	try {
		const raw = await readFile(configPath, "utf8");
		return JSON.parse(raw);
	} catch {
		console.error("ℹ config.json not found; using defaults (copy from config.example.json)");
		return null;
	}
}

try {
	const input = args.join(" ").trim();
	if (!input) throw new Error("Input cannot be empty");

	const config = await maybeLoadConfig();
	const output = {
		skill: "${name}",
		input,
		mode: config?.userPreferences?.reviewMode ?? "standard",
		message: "Replace this with skill-specific logic.",
		timestamp: new Date().toISOString(),
	};

	console.log(JSON.stringify(output, null, 2));
} catch (error) {
	console.error("✗", error instanceof Error ? error.message : String(error));
	process.exit(1);
}
`;
}

function buildGitignore() {
	return `config.json
state/*.jsonl
state/*.log
state/*.db
`;
}

async function exists(path) {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

async function writeGenerated(path, content, force) {
	await writeFile(path, content, { flag: force ? "w" : "wx" });
}

async function main() {
	const argv = process.argv.slice(2);
	if (argv.length === 0 || argv.includes("--help")) {
		printUsage();
		process.exit(argv.includes("--help") ? 0 : 1);
	}

	const { skillName, options } = parseArgs(argv);
	if (!skillName) throw new Error("Missing required <skill-name>");
	if (!/^[a-z0-9][a-z0-9-]*$/.test(skillName)) {
		throw new Error("Skill name must match: ^[a-z0-9][a-z0-9-]*$");
	}
	if (!SKILL_CATEGORIES.includes(options.category)) {
		throw new Error(`Invalid --category. Must be one of: ${SKILL_CATEGORIES.join(", ")}`);
	}

	const rootDir = resolve(options.dir);
	const skillDir = join(rootDir, skillName);
	const scriptsDir = join(skillDir, "scripts");
	const referencesDir = join(skillDir, "references");
	const assetsDir = join(skillDir, "assets");
	const stateDir = join(skillDir, "state");
	const runScriptPath = join(scriptsDir, `${skillName}-run.js`);
	const description = buildDescription(skillName, options.category, options.description);

	if ((await exists(skillDir)) && !options.force) {
		throw new Error(`Target directory already exists: ${skillDir} (use --force to overwrite files)`);
	}

	await mkdir(skillDir, { recursive: true });
	await mkdir(scriptsDir, { recursive: true });
	await mkdir(referencesDir, { recursive: true });
	await mkdir(assetsDir, { recursive: true });
	await mkdir(stateDir, { recursive: true });

	await writeGenerated(join(skillDir, "SKILL.md"), buildSkillMd(skillName, description, options.category), options.force);
	await writeGenerated(join(skillDir, "package.json"), buildPackageJson(skillName, description), options.force);
	await writeGenerated(join(skillDir, "config.example.json"), buildConfigExample(skillName), options.force);
	await writeGenerated(join(skillDir, ".gitignore"), buildGitignore(), options.force);
	await writeGenerated(join(referencesDir, "README.md"), buildReferencesReadme(skillName), options.force);
	await writeGenerated(join(referencesDir, "gotchas-log.md"), buildGotchasLog(), options.force);
	await writeGenerated(join(assetsDir, "output-template.md"), buildOutputTemplate(), options.force);
	await writeGenerated(join(stateDir, "README.md"), buildStateReadme(), options.force);
	await writeGenerated(runScriptPath, buildRunScript(skillName), options.force);
	await chmod(runScriptPath, 0o755);

	console.log(`✓ Skill scaffold created: ${skillDir}`);
	console.log("Generated files:");
	console.log(`  - ${join(skillDir, "SKILL.md")}`);
	console.log(`  - ${join(skillDir, "package.json")}`);
	console.log(`  - ${join(skillDir, "config.example.json")}`);
	console.log(`  - ${join(skillDir, ".gitignore")}`);
	console.log(`  - ${join(referencesDir, "README.md")}`);
	console.log(`  - ${join(referencesDir, "gotchas-log.md")}`);
	console.log(`  - ${join(assetsDir, "output-template.md")}`);
	console.log(`  - ${join(stateDir, "README.md")}`);
	console.log(`  - ${runScriptPath}`);
}

main().catch((error) => {
	console.error("✗", error instanceof Error ? error.message : String(error));
	process.exit(1);
});
