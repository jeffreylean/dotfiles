#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
function usage() { console.log("Usage: llm-wiki-export.js [--vault <path>] [--out <path>] [--include-private]"); }
const DEFAULT_VAULT = process.env.KNOWLEDGE_BRAIN_VAULT || path.join(homedir(), "Documents", "knowledge-brain");
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) { usage(); process.exit(0); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const vault = args.includes("--vault") ? [] : ["--vault", DEFAULT_VAULT];
const withOut = args.includes("--out") ? args : ["--out", path.join(DEFAULT_VAULT, "exports/llm-context.md"), ...args];
const r = spawnSync(process.execPath, [path.join(root, "scripts/export-llm-bundle.js"), ...vault, ...withOut], { stdio: "inherit" });
process.exit(r.status ?? 1);
