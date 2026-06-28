#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

const DEFAULT_VAULT = process.env.KNOWLEDGE_BRAIN_VAULT || path.join(homedir(), "Documents", "knowledge-brain");
const EXCLUDED_DIRS = new Set([".git", ".obsidian", "node_modules", "exports", ".llm-cache", ".trash"]);
const DEFAULT_EXCLUDED_PREFIXES = ["Private/"];

function usage() {
  console.log(`Usage: search-vault.js --query <text> [--vault <path>] [--path <prefix>] [--limit <n>] [--context <n>] [--json] [--include-private]\n\nSearches ~/Documents/knowledge-brain by default and returns ranked Markdown note excerpts.\n\nExamples:\n  node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/search-vault.js --query "durable execution"\n  node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/search-vault.js --query "agents" --path 10-Wiki --limit 5`);
}

function parseArgs(argv) {
  const args = { vault: DEFAULT_VAULT, query: "", pathPrefix: "", limit: 8, context: 2, json: false, includePrivate: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--vault") args.vault = argv[++i];
    else if (a === "--query" || a === "-q") args.query = argv[++i];
    else if (a === "--path") args.pathPrefix = argv[++i].replace(/^\.\//, "").replace(/\/$/, "");
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--context") args.context = Number(argv[++i]);
    else if (a === "--json") args.json = true;
    else if (a === "--include-private") args.includePrivate = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

async function walk(dir, root, args, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replaceAll(path.sep, "/");
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      if (!args.includePrivate && DEFAULT_EXCLUDED_PREFIXES.some((prefix) => `${rel}/`.startsWith(prefix))) continue;
      await walk(full, root, args, out);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      if (args.pathPrefix && !(rel === args.pathPrefix || rel.startsWith(`${args.pathPrefix}/`))) continue;
      if (!args.includePrivate && DEFAULT_EXCLUDED_PREFIXES.some((prefix) => rel.startsWith(prefix))) continue;
      out.push({ full, rel });
    }
  }
  return out;
}

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return {};
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim();
  }
  return data;
}

function truthy(value) {
  return ["true", "yes", "1"].includes(String(value ?? "").trim().toLowerCase());
}

function falsey(value) {
  return ["false", "no", "0"].includes(String(value ?? "").trim().toLowerCase());
}

function terms(query) {
  return query.toLowerCase().split(/[^\p{L}\p{N}_-]+/u).filter((t) => t.length >= 2);
}

function contextFor(text, queryTerms, radius) {
  const lines = text.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (queryTerms.some((t) => lower.includes(t))) hits.push(i);
  }
  if (hits.length === 0) return [];
  const ranges = [];
  for (const hit of hits.slice(0, 3)) {
    const start = Math.max(0, hit - radius);
    const end = Math.min(lines.length - 1, hit + radius);
    ranges.push([start, end]);
  }
  const merged = [];
  for (const [start, end] of ranges) {
    const last = merged.at(-1);
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged.map(([start, end]) => ({
    start: start + 1,
    end: end + 1,
    text: lines.slice(start, end + 1).join("\n")
  }));
}

function scoreNote(rel, text, fm, queryTerms) {
  const stem = path.basename(rel, ".md").toLowerCase();
  const title = String(fm.title || stem).toLowerCase();
  const summary = String(fm.summary || "").toLowerCase();
  const lower = text.toLowerCase();
  let score = 0;
  for (const term of queryTerms) {
    if (stem.includes(term)) score += 20;
    if (title.includes(term)) score += 20;
    if (summary.includes(term)) score += 10;
    if (rel.toLowerCase().includes(term)) score += 5;
    const headingMatches = lower.match(new RegExp(`^#{1,6} .*${escapeRegExp(term)}.*$`, "gmi"))?.length ?? 0;
    score += headingMatches * 6;
    const bodyMatches = lower.split(term).length - 1;
    score += Math.min(bodyMatches, 20);
  }
  return score;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderMarkdown(result) {
  const lines = [];
  lines.push(`# Vault Search: ${result.query}`);
  lines.push("");
  lines.push(`Vault: ${result.vault}`);
  lines.push(`Results: ${result.results.length}`);
  lines.push("");
  for (const item of result.results) {
    lines.push(`## ${item.title}`);
    lines.push("");
    lines.push(`- Path: \`${item.path}\``);
    if (item.summary) lines.push(`- Summary: ${item.summary}`);
    lines.push(`- Score: ${item.score}`);
    lines.push("");
    for (const ctx of item.contexts) {
      lines.push(`Lines ${ctx.start}-${ctx.end}:`);
      lines.push("```md");
      lines.push(ctx.text);
      lines.push("```");
      lines.push("");
    }
  }
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();
  if (!args.query.trim()) {
    usage();
    process.exit(1);
  }

  const root = path.resolve(args.vault);
  const queryTerms = terms(args.query);
  const files = await walk(root, root, args);
  const results = [];

  for (const file of files) {
    const text = await readFile(file.full, "utf8");
    const fm = frontmatter(text);
    if (!args.includePrivate && truthy(fm.private)) continue;
    if (!args.includePrivate && falsey(fm.llm_include)) continue;
    const score = scoreNote(file.rel, text, fm, queryTerms);
    if (score <= 0) continue;
    results.push({
      path: file.rel,
      title: fm.title || path.basename(file.rel, ".md"),
      summary: fm.summary || "",
      score,
      contexts: contextFor(text, queryTerms, args.context)
    });
  }

  results.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  const result = { query: args.query, vault: root, results: results.slice(0, args.limit) };
  console.log(args.json ? JSON.stringify(result, null, 2) : renderMarkdown(result));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
