#!/usr/bin/env node

import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { existsPath, listJsFilesRecursive } from "./lib/skill-fs.js";
import { appendSection, hasSection, parseFrontmatter } from "./lib/skill-markdown.js";

function printUsage() {
	console.log("Usage: skill-improve.js <skill-dir> [--write]");
	console.log("");
	console.log("Examples:");
	console.log("  node skill-improve.js ./browser-tools");
	console.log("  node skill-improve.js ./browser-tools --write");
	console.log("  bun skill-improve.js ~/.pi/agent/skills/my-skill --write");
}

function buildGotchasSeed() {
	return [
		"- Don’t broaden trigger surface; keep invocation conditions explicit.",
		"- Don’t skip concrete examples; add command usage for each helper script.",
		"- Don’t emit noisy logs to stdout when structured output is expected.",
	].join("\n");
}

function buildDefaultSection(section) {
	switch (section) {
		case "When to Use":
			return "- Add concrete trigger phrases\n- Add explicit out-of-scope cases";
		case "Commands":
			return "```bash\n# Add runnable examples here\n```";
		case "Output Contract":
			return "- Define output shape\n- Define failure behavior and non-zero exits";
		case "Gotchas":
			return buildGotchasSeed();
		default:
			return "- TODO";
	}
}

function buildConfigExample(skillName) {
	return JSON.stringify(
		{
			skillName,
			version: "1",
			userPreferences: {
				outputFormat: "json",
			},
			dataPath: `~/.local/share/pi-skills/${skillName}`,
		},
		null,
		2,
	) + "\n";
}

function buildGotchasLog() {
	return `# Gotchas Log

Track observed failures, then fold stable findings into SKILL.md -> ## Gotchas.

- Date:
- Situation:
- Failure:
- Fix:
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
`;
}

function buildStateReadme() {
	return `# State

Optional local memory/cache/logs for this skill.
Keep secrets out of plain-text storage.
`;
}

function buildHelperScript(skillName) {
	return `#!/usr/bin/env node

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help")) {
	console.log("Usage: ${skillName}-helper.js <input>");
	process.exit(args.includes("--help") ? 0 : 1);
}

try {
	console.log(JSON.stringify({ skill: "${skillName}", input: args.join(" ") }, null, 2));
} catch (error) {
	console.error("✗", error instanceof Error ? error.message : String(error));
	process.exit(1);
}
`;
}

async function main() {
	const args = process.argv.slice(2);
	if (args.length === 0 || args.includes("--help")) {
		printUsage();
		process.exit(args.includes("--help") ? 0 : 1);
	}

	const writeMode = args.includes("--write");
	const targetArg = args.find((arg) => !arg.startsWith("--"));
	if (!targetArg) throw new Error("Missing <skill-dir>");

	const skillDir = resolve(targetArg);
	if (!(await existsPath(skillDir))) throw new Error(`Directory does not exist: ${skillDir}`);

	const actions = [];

	const skillMdPath = join(skillDir, "SKILL.md");
	let skillMd = "";
	try {
		skillMd = await readFile(skillMdPath, "utf8");
	} catch {
		throw new Error(`Missing SKILL.md: ${skillMdPath}`);
	}

	const frontmatter = parseFrontmatter(skillMd);
	const skillName = frontmatter?.name?.trim() || basename(skillDir);

	const requiredSections = ["When to Use", "Commands", "Output Contract", "Gotchas"];
	let nextSkillMd = skillMd;
	for (const section of requiredSections) {
		if (!hasSection(nextSkillMd, section)) {
			nextSkillMd = appendSection(nextSkillMd, section, buildDefaultSection(section));
			actions.push(`Add missing section to SKILL.md: ## ${section}`);
		}
	}

	const referencesDir = join(skillDir, "references");
	const assetsDir = join(skillDir, "assets");
	const scriptsDir = join(skillDir, "scripts");
	const stateDir = join(skillDir, "state");

	const jsFiles = await listJsFilesRecursive(skillDir);
	const hasScriptsDir = await existsPath(scriptsDir);
	const needsHelperScript = jsFiles.length === 0;

	if (!(await existsPath(referencesDir))) actions.push("Create directory: references/");
	if (!(await existsPath(assetsDir))) actions.push("Create directory: assets/");
	if (!hasScriptsDir && needsHelperScript) actions.push("Create directory: scripts/");
	if (!(await existsPath(stateDir))) actions.push("Create directory: state/");

	const configExamplePath = join(skillDir, "config.example.json");
	if (!(await existsPath(configExamplePath))) actions.push("Create file: config.example.json");

	const gotchasLogPath = join(referencesDir, "gotchas-log.md");
	if (!(await existsPath(gotchasLogPath))) actions.push("Create file: references/gotchas-log.md");

	const outputTemplatePath = join(assetsDir, "output-template.md");
	if (!(await existsPath(outputTemplatePath))) actions.push("Create file: assets/output-template.md");

	const stateReadmePath = join(stateDir, "README.md");
	if (!(await existsPath(stateReadmePath))) actions.push("Create file: state/README.md");

	const helperScriptPath = join(scriptsDir, `${skillName}-helper.js`);
	if (needsHelperScript) {
		actions.push(`Create helper script: scripts/${skillName}-helper.js`);
	}

	if (!writeMode) {
		console.log(`Dry run: ${skillDir}`);
		if (actions.length === 0) {
			console.log("✓ No baseline improvements needed");
		} else {
			console.log("Planned improvements:");
			for (const action of actions) console.log(`  - ${action}`);
			console.log("\nRun with --write to apply these changes.");
		}
		return;
	}

	if (nextSkillMd !== skillMd) {
		await writeFile(skillMdPath, nextSkillMd);
	}

	await mkdir(referencesDir, { recursive: true });
	await mkdir(assetsDir, { recursive: true });
	if (needsHelperScript || hasScriptsDir) {
		await mkdir(scriptsDir, { recursive: true });
	}
	await mkdir(stateDir, { recursive: true });

	if (!(await existsPath(configExamplePath))) {
		await writeFile(configExamplePath, buildConfigExample(skillName));
	}
	if (!(await existsPath(gotchasLogPath))) {
		await writeFile(gotchasLogPath, buildGotchasLog());
	}
	if (!(await existsPath(outputTemplatePath))) {
		await writeFile(outputTemplatePath, buildOutputTemplate());
	}
	if (!(await existsPath(stateReadmePath))) {
		await writeFile(stateReadmePath, buildStateReadme());
	}
	if (needsHelperScript) {
		await writeFile(helperScriptPath, buildHelperScript(skillName));
		await chmod(helperScriptPath, 0o755);
	}

	console.log(`✓ Improvements applied: ${skillDir}`);
	if (actions.length > 0) {
		console.log("Applied:");
		for (const action of actions) console.log(`  - ${action}`);
	}
}

main().catch((error) => {
	console.error("✗", error instanceof Error ? error.message : String(error));
	process.exit(1);
});
