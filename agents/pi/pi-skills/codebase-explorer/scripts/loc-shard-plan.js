#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.go', '.py', '.rs', '.java', '.kt', '.swift', '.rb', '.php', '.cs', '.scala', '.vue', '.svelte']);
const ignore = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.turbo', '.cache', '.venv', 'venv', 'target', 'vendor', 'out', 'tmp']);
const monoRoots = new Set(['packages', 'apps', 'services', 'libs', 'modules']);
const testDirs = new Set(['test', 'tests', '__tests__', 'e2e', 'cypress', '__snapshots__']);
const testFileMatchers = [
  /\.(test|spec)\.[^.]+$/i,
  /_test\.[^.]+$/i,
  /^test_[^.]+\.[^.]+$/i,
  /^conftest\.py$/i,
];

function arg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  return process.argv[idx + 1] ?? def;
}

function isTestPath(rel) {
  const normalized = rel.split(path.sep).filter(Boolean);
  const lowerSegments = normalized.map((s) => s.toLowerCase());

  if (lowerSegments.some((segment) => testDirs.has(segment))) {
    return true;
  }

  const base = (lowerSegments[lowerSegments.length - 1] ?? '').trim();
  return testFileMatchers.some((matcher) => matcher.test(base));
}

const repoPath = path.resolve(process.argv[2] || '.');
const maxWorkers = Number(arg('--max-workers', 4));
const splitLoc = Number(arg('--split-loc', 2500));

if (!fs.existsSync(repoPath) || !fs.statSync(repoPath).isDirectory()) {
  console.error(`ERROR: invalid repoPath ${repoPath}`);
  process.exit(1);
}
if (!Number.isInteger(maxWorkers) || maxWorkers <= 0) {
  console.error('ERROR: invalid --max-workers');
  process.exit(1);
}
if (!Number.isInteger(splitLoc) || splitLoc <= 0) {
  console.error('ERROR: invalid --split-loc');
  process.exit(1);
}

function walk(dir, out = [], excluded = { testFiles: 0, testLoc: 0 }) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, d.name);
    if (d.isDirectory()) {
      if (ignore.has(d.name) || d.name.startsWith('.')) continue;
      walk(abs, out, excluded);
      continue;
    }
    if (!d.isFile()) continue;
    if (!exts.has(path.extname(d.name).toLowerCase())) continue;

    const rel = path.relative(repoPath, abs);
    const loc = fs.readFileSync(abs, 'utf8').split(/\r?\n/).length;

    if (isTestPath(rel)) {
      excluded.testFiles += 1;
      excluded.testLoc += loc;
      continue;
    }

    out.push({ rel, loc });
  }
  return { files: out, excluded };
}

function moduleKey(rel) {
  const s = rel.split(path.sep).filter(Boolean);
  if (s.length <= 1) return '.';
  if (monoRoots.has(s[0]) && s[1]) return `${s[0]}/${s[1]}`;
  return s[0];
}

const walkResult = walk(repoPath);
const files = walkResult.files;
const excluded = walkResult.excluded;

const modules = new Map();
for (const f of files) {
  const k = moduleKey(f.rel);
  if (!modules.has(k)) modules.set(k, { name: k, loc: 0, files: [] });
  const m = modules.get(k);
  m.loc += f.loc;
  m.files.push(f);
}

function splitModule(m) {
  if (m.loc <= splitLoc) {
    return [{ id: `${m.name}#1`, module: m.name, loc: m.loc, files: m.files.map((f) => f.rel), fileCount: m.files.length, reason: 'module_within_threshold' }];
  }

  const sorted = [...m.files].sort((a, b) => b.loc - a.loc);
  const chunks = [];
  let cur = { loc: 0, files: [] };

  for (const f of sorted) {
    if (cur.loc > 0 && cur.loc + f.loc > splitLoc) {
      chunks.push(cur);
      cur = { loc: 0, files: [] };
    }
    cur.loc += f.loc;
    cur.files.push(f);
  }

  if (cur.files.length) chunks.push(cur);
  return chunks.map((c, i) => ({ id: `${m.name}#${i + 1}`, module: m.name, loc: c.loc, files: c.files.map((f) => f.rel), fileCount: c.files.length, reason: 'split_by_loc_chunks' }));
}

const moduleList = [...modules.values()].sort((a, b) => b.loc - a.loc);
const shards = moduleList.flatMap(splitModule).sort((a, b) => b.loc - a.loc);
const batches = [];

for (let i = 0; i < shards.length; i += maxWorkers) {
  batches.push({
    batch: batches.length + 1,
    size: Math.min(maxWorkers, shards.length - i),
    shards: shards.slice(i, i + maxWorkers).map((s) => ({ id: s.id, module: s.module, loc: s.loc, fileCount: s.fileCount, reason: s.reason })),
  });
}

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  repoPath,
  options: { maxWorkers, splitLoc },
  exclusions: {
    testFiles: excluded.testFiles,
    testLoc: excluded.testLoc,
  },
  totals: {
    sourceFiles: files.length,
    modules: moduleList.length,
    shards: shards.length,
    totalLoc: moduleList.reduce((n, m) => n + m.loc, 0),
  },
  modules: moduleList.map((m) => ({ name: m.name, loc: m.loc, fileCount: m.files.length, oversized: m.loc > splitLoc })),
  shards,
  batches,
}, null, 2));
