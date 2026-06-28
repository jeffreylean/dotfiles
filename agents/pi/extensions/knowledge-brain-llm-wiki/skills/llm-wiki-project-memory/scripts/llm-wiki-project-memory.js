#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
function usage() { console.log("Usage: llm-wiki-project-memory.js --title <project title> [--vault <path>] [--summary <text>]"); }
const DEFAULT_VAULT = process.env.KNOWLEDGE_BRAIN_VAULT || path.join(homedir(), "Documents", "knowledge-brain");
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h") || !args.includes("--title")) { usage(); process.exit(args.includes("--title") ? 0 : 1); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const vault = args.includes("--vault") ? [] : ["--vault", DEFAULT_VAULT];
const r = spawnSync(process.execPath, [path.join(root, "scripts/new-note.js"), ...vault, "--type", "project", ...args], { stdio: "inherit" });
process.exit(r.status ?? 1);
