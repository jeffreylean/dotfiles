#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { existsPath, listJsFilesRecursive } from "./lib/skill-fs.js";
import { extractSectionBody, hasSection, parseFrontmatter } from "./lib/skill-markdown.js";

const REQUIRED_SECTIONS = ["When to Use", "Commands", "Output Contract"];

function printUsage() {
	console.log("Usage: skill-validate.js <skill-dir>");
	console.log("");
	console.log("Examples:");
	console.log("  node skill-validate.js ./browser-tools");
	console.log("  bun skill-validate.js ~/.pi/agent/skills/my-skill");
}

function validateDescriptionQuality(description, warnings) {
	const value = (description || "").trim();
	if (value.length < 24) {
		warnings.push("Frontmatter description is very short; make trigger conditions explicit");
	}
	if (!/use when|when .*need|for requests that/i.test(value)) {
		warnings.push("Frontmatter description should be trigger-oriented (e.g., start with 'Use when ...')");
	}
}

function validateSectionShape(skillMd, issues, warnings) {
	for (const section of REQUIRED_SECTIONS) {
		if (!hasSection(skillMd, section)) {
			issues.push(`SKILL.md missing required section: ## ${section}`);
		}
	}

	const gotchasBody = extractSectionBody(skillMd, /^##\s+Gotchas(?:\s*\([^)]*\))?\s*$/m);
	if (!gotchasBody) {
		issues.push("SKILL.md missing required section: ## Gotchas");
		return;
	}

	const gotchaBullets = gotchasBody.match(/^\s*[-*]\s+/gm) ?? [];
	if (gotchaBullets.length === 0) {
		issues.push("## Gotchas section must contain at least one bullet anti-pattern");
	} else if (gotchaBullets.length < 3) {
		warnings.push("## Gotchas should usually contain 3+ bullets for stronger guardrails");
	}
}

async function validateSkillDir(skillDir) {
	const issues = [];
	const warnings = [];

	let dirStat;
	try {
		dirStat = await stat(skillDir);
	} catch {
		issues.push(`Directory does not exist: ${skillDir}`);
		return { issues, warnings };
	}

	if (!dirStat.isDirectory()) {
		issues.push(`Not a directory: ${skillDir}`);
		return { issues, warnings };
	}

	const skillMdPath = join(skillDir, "SKILL.md");
	let skillMd = "";
	try {
		skillMd = await readFile(skillMdPath, "utf8");
	} catch {
		issues.push(`Missing SKILL.md: ${skillMdPath}`);
	}

	if (skillMd) {
		const frontmatter = parseFrontmatter(skillMd);
		if (!frontmatter) {
			issues.push("SKILL.md is missing valid frontmatter block");
		} else {
			if (!frontmatter.name || !frontmatter.name.trim()) {
				issues.push("Frontmatter missing required field: name");
			}
			if (!frontmatter.description || !frontmatter.description.trim()) {
				issues.push("Frontmatter missing required field: description");
			} else {
				validateDescriptionQuality(frontmatter.description, warnings);
			}
		}
		validateSectionShape(skillMd, issues, warnings);
	}

	const packageJsonPath = join(skillDir, "package.json");
	try {
		const raw = await readFile(packageJsonPath, "utf8");
		const pkg = JSON.parse(raw);
		if (pkg.type !== "module") {
			warnings.push("package.json exists but \"type\" is not \"module\"");
		}
	} catch {
		warnings.push("package.json missing (ok if no dependencies/scripts are needed)");
	}

	if (!(await existsPath(join(skillDir, "references")))) {
		warnings.push("Missing references/ directory (progressive disclosure is recommended)");
	}
	if (!(await existsPath(join(skillDir, "assets")))) {
		warnings.push("Missing assets/ directory (templates/static artifacts recommended)");
	}
	if (!(await existsPath(join(skillDir, "config.example.json")))) {
		warnings.push("Missing config.example.json (setup contract recommended)");
	}
	if (!(await existsPath(join(skillDir, "references", "gotchas-log.md")))) {
		warnings.push("Missing references/gotchas-log.md (iterative gotcha capture recommended)");
	}

	const jsFiles = await listJsFilesRecursive(skillDir);
	if (jsFiles.length === 0) {
		warnings.push("No .js helper scripts found");
	}

	for (const file of jsFiles) {
		const content = await readFile(file, "utf8");
		const isCliScript = content.includes("process.argv") || content.startsWith("#!/usr/bin/env node");
		if (!isCliScript) continue;

		if (!content.startsWith("#!/usr/bin/env node")) {
			issues.push(`${basename(file)} missing shebang: #!/usr/bin/env node`);
		}
		if (!content.includes("Usage:")) {
			warnings.push(`${basename(file)} has no usage text`);
		}
	}

	return { issues, warnings };
}

async function main() {
	const args = process.argv.slice(2);
	if (args.length === 0 || args.includes("--help")) {
		printUsage();
		process.exit(args.includes("--help") ? 0 : 1);
	}

	const skillDir = resolve(args[0]);
	const { issues, warnings } = await validateSkillDir(skillDir);

	if (issues.length === 0) {
		console.log(`✓ Validation passed: ${skillDir}`);
	} else {
		console.error(`✗ Validation failed: ${skillDir}`);
		for (const issue of issues) {
			console.error(`  - ${issue}`);
		}
	}

	if (warnings.length > 0) {
		console.log("Warnings:");
		for (const warning of warnings) {
			console.log(`  - ${warning}`);
		}
	}

	process.exit(issues.length === 0 ? 0 : 1);
}

main().catch((error) => {
	console.error("✗", error instanceof Error ? error.message : String(error));
	process.exit(1);
});
