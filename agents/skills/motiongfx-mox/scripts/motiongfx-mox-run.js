#!/usr/bin/env node

import { run } from './lib.js';

const usage = `Usage: motiongfx-mox-run.js <command> [options]

Commands:
  doctor --moxie PATH                 Inspect checkout and Rust tools; no writes
  init --moxie PATH --out NEW_DIR      Create a standalone Rust author + .mox renderer
  check --project DIR                Check artifact files and hashes, NOT runtime validity

Options:
  --config FILE   JSON with moxieRoot and/or projectRoot; CLI flags take precedence
  --help          Show help

MOXIE_ROOT is a fallback for --moxie. Relative config paths use the config directory.
init refuses existing outputs, destinations inside Moxie/this skill, and # in paths.
No command installs dependencies, invokes Cargo builds, or changes source checkouts.

Examples:
  node scripts/motiongfx-mox-run.js doctor --moxie /path/to/moxie
  bun scripts/motiongfx-mox-run.js init --moxie /path/to/moxie --out ~/Documents/new-motion
  ./scripts/motiongfx-mox-run.js check --project ~/Documents/new-motion
`;

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help')) {
  console.log(usage);
  process.exit(args.length === 0 ? 1 : 0);
}
try {
  console.log(JSON.stringify(await run(args), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
