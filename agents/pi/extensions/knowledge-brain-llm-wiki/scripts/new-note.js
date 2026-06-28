#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

const DEFAULT_VAULT = process.env.KNOWLEDGE_BRAIN_VAULT || path.join(homedir(), "Documents", "knowledge-brain");

function usage() {
  console.log(`Usage: new-note.js --title <title> [--type <type>] [--vault <path>] [--dir <path>] [--summary <text>]\n\nCreates a frontmatter-compliant starter note. Agents must still update links, MOCs, and log.md.\n\nExamples:\n  node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/new-note.js --type concept --title "Durable Execution"\n  node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/new-note.js --type source --title "Some Article" --summary "Short summary"`);
}

function parseArgs(argv) {
  const args = { vault: DEFAULT_VAULT, type: "concept", title: "", summary: "", dir: "", status: "seed" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--vault") args.vault = argv[++i];
    else if (a === "--type") args.type = argv[++i];
    else if (a === "--title") args.title = argv[++i];
    else if (a === "--summary") args.summary = argv[++i];
    else if (a === "--dir") args.dir = argv[++i];
    else if (a === "--status") args.status = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function defaultDir(type) {
  return {
    concept: "10-Wiki/Concepts",
    source: "20-Sources/Articles",
    project: "10-Wiki/Projects",
    decision: "10-Wiki/Decisions",
    output: "30-Outputs",
    inbox: "00-Inbox",
    meta: "90-Meta"
  }[type] || "00-Inbox";
}

function safeName(title) {
  return title.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

function body(type, title) {
  if (type === "source") return `# ${title}\n\n## Summary\n\n## Source Claims\n\n- \n\n## Synthesis\n\n## Links\n\n- External:\n- Concepts: [[]]\n\n## Open Questions\n\n- \n`;
  if (type === "project") return `# ${title}\n\n## Goal\n\n## Current State\n\n## Decisions\n\n- \n\n## Links\n\n- Concepts: [[]]\n- Sources: [[]]\n- Outputs: [[]]\n\n## Open Questions\n\n- \n\n## Next Actions\n\n- [ ] \n`;
  if (type === "decision") return `# ${title}\n\n## Context\n\n## Decision\n\n## Consequences\n\n## Alternatives Considered\n\n## Links\n\n- Projects: [[]]\n- Concepts: [[]]\n`;
  return `# ${title}\n\n## Summary\n\n## Key Points\n\n- \n\n## Links\n\n- Related: [[]]\n- Sources: [[]]\n\n## Open Questions\n\n- \n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();
  if (!args.title) throw new Error("--title is required");
  const date = new Date().toISOString().slice(0, 10);
  const root = path.resolve(args.vault);
  const dir = path.resolve(root, args.dir || defaultDir(args.type));
  const file = path.join(dir, `${safeName(args.title)}.md`);
  if (existsSync(file)) throw new Error(`Refusing to overwrite existing note: ${file}`);
  await mkdir(dir, { recursive: true });
  const content = `---\ntitle: ${args.title}\ntype: ${args.type}\nstatus: ${args.status}\nsummary: ${args.summary}\naliases: []\ntags: []\ncreated: ${date}\nupdated: ${date}\nprivate: false\nllm_include: true\n---\n\n${body(args.type, args.title)}`;
  await writeFile(file, content);
  console.log(file);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
