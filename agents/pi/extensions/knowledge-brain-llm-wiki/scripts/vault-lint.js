#!/usr/bin/env node
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

const DEFAULT_VAULT = process.env.KNOWLEDGE_BRAIN_VAULT || path.join(homedir(), "Documents", "knowledge-brain");

function usage() {
  console.log(`Usage: vault-lint.js [--vault <path>] [--report <path>] [--json]\n\nChecks a Knowledge Brain Obsidian LLM-wiki vault for frontmatter, wikilinks, and privacy/export risks.\n\nExamples:\n  node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/vault-lint.js\n  node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/vault-lint.js --report ~/Documents/knowledge-brain/90-Meta/Lint-Reports/$(date +%F).md`);
}

function parseArgs(argv) {
  const args = { vault: DEFAULT_VAULT, report: "", json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--vault") args.vault = argv[++i];
    else if (a === "--report") args.report = argv[++i];
    else if (a === "--json") args.json = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

const EXCLUDED_DIRS = new Set([".git", ".obsidian", "node_modules", "exports", ".llm-cache", ".trash"]);
const EXCLUDED_PREFIXES = ["Private/"];
const REQUIRED = ["title", "type", "status", "summary", "created", "updated", "private", "llm_include"];

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

function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
}

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return null;
  const raw = m[1];
  const data = {};
  const lines = raw.split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) {
      current = kv[1];
      data[current] = kv[2].trim();
    } else if (current && /^\s+-\s+/.test(line)) {
      data[current] = `${data[current]} ${line.trim()}`.trim();
    }
  }
  return { raw, data };
}

function boolValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function collectAliases(fm) {
  if (!fm) return [];
  const raw = fm.raw;
  const aliases = [];
  const inline = raw.match(/^aliases:\s*\[(.*?)\]\s*$/m);
  if (inline) {
    for (const part of inline[1].split(",")) {
      const v = part.trim().replace(/^['"]|['"]$/g, "");
      if (v) aliases.push(v);
    }
  }
  const block = raw.match(/^aliases:\s*\n((?:\s+-\s+.*\n?)*)/m);
  if (block) {
    for (const line of block[1].split(/\r?\n/)) {
      const m = line.match(/^\s+-\s+(.+)$/);
      if (m) aliases.push(m[1].trim().replace(/^['"]|['"]$/g, ""));
    }
  }
  return aliases;
}

function renderReport(result) {
  const lines = [];
  lines.push("---");
  lines.push("title: Vault Lint Report");
  lines.push("type: meta");
  lines.push("status: active");
  lines.push(`summary: Lint report with ${result.issueCount} issue(s).`);
  lines.push("aliases: []");
  lines.push("tags:");
  lines.push("  - meta/lint");
  lines.push(`created: ${result.date}`);
  lines.push(`updated: ${result.date}`);
  lines.push("private: false");
  lines.push("llm_include: true");
  lines.push("---\n");
  lines.push(`# Vault Lint Report - ${result.date}\n`);
  lines.push("## Summary\n");
  lines.push(`- Markdown notes checked: ${result.markdownFiles}`);
  lines.push(`- Wikilinks checked: ${result.wikilinks}`);
  lines.push(`- Issues: ${result.issueCount}`);
  lines.push("");
  for (const section of result.sections) {
    lines.push(`## ${section.title}\n`);
    if (section.items.length === 0) lines.push("- None");
    else for (const item of section.items) lines.push(`- ${item}`);
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();
  const root = path.resolve(args.vault);
  const files = await walk(root, root);
  const byName = new Map();
  const notes = [];

  for (const file of files) {
    const text = await readFile(file.full, "utf8");
    const fm = frontmatter(text);
    const stem = path.basename(file.rel, ".md").toLowerCase();
    byName.set(stem, file.rel);
    for (const alias of collectAliases(fm)) byName.set(alias.toLowerCase(), file.rel);
    notes.push({ ...file, text, fm });
  }

  const missingFrontmatter = [];
  const missingRequired = [];
  const unresolved = [];
  const privacyRisks = [];
  let wikilinks = 0;

  for (const note of notes) {
    if (["AGENTS.md", "README.md"].includes(note.rel)) continue;
    if (!note.fm) {
      missingFrontmatter.push(note.rel);
    } else {
      for (const key of REQUIRED) {
        if (!(key in note.fm.data) || note.fm.data[key] === "") missingRequired.push(`${note.rel} missing \`${key}\``);
      }
      if (boolValue(note.fm.data.private) === "true" && boolValue(note.fm.data.llm_include) === "true") {
        privacyRisks.push(`${note.rel} has private=true but llm_include=true`);
      }
    }

    const clean = stripCode(note.text);
    for (const m of clean.matchAll(/!?\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)) {
      const target = m[1].trim();
      if (!target) continue;
      wikilinks++;
      if (!byName.has(target.toLowerCase())) unresolved.push(`${note.rel} -> [[${target}]]`);
    }
  }

  if (existsSync(path.join(root, ".obsidian", "workspace.json"))) {
    // Not an issue if ignored; just mention if .gitignore is absent.
    if (!existsSync(path.join(root, ".gitignore"))) privacyRisks.push(".obsidian/workspace.json exists but .gitignore is missing");
  }

  const sections = [
    { title: "Missing Frontmatter", items: missingFrontmatter },
    { title: "Missing Required Fields", items: missingRequired },
    { title: "Unresolved Wikilinks", items: unresolved },
    { title: "Privacy / Export Risks", items: privacyRisks }
  ];
  const issueCount = sections.reduce((n, s) => n + s.items.length, 0);
  const result = {
    date: new Date().toISOString().slice(0, 10),
    markdownFiles: notes.length,
    wikilinks,
    issueCount,
    sections
  };

  if (args.json) console.log(JSON.stringify(result, null, 2));
  else console.log(renderReport(result));

  if (args.report) {
    const report = path.resolve(args.report);
    await mkdir(path.dirname(report), { recursive: true });
    await writeFile(report, renderReport(result));
    console.error(`Wrote ${report}`);
  }

  process.exit(issueCount === 0 ? 0 : 2);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
