#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const CLONE_BASE = '/Users/jeffreylean/Project/personal/opensource';

const input = process.argv[2]?.trim();

const isGithub = (v = '') => /^https?:\/\/github\.com\/.+\/.+/i.test(v) || /^git@github\.com:.+\/.+/i.test(v);

function repoNameFromGithub(v) {
  if (v.startsWith('http')) {
    const u = new URL(v);
    const segs = u.pathname.split('/').filter(Boolean);
    return (segs[1] || segs[0] || '').replace(/\.git$/, '');
  }
  const rhs = v.split(':')[1] || '';
  const segs = rhs.split('/').filter(Boolean);
  return (segs[1] || segs[0] || '').replace(/\.git$/, '');
}

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

let sourceType = 'cwd';
let repoPath = process.cwd();
let cloned = false;

if (input && isGithub(input)) {
  sourceType = 'github';
  const repo = repoNameFromGithub(input);
  if (!repo) fail('Cannot parse repo name from GitHub URL');
  fs.mkdirSync(CLONE_BASE, { recursive: true });
  repoPath = path.join(CLONE_BASE, repo);
  if (!fs.existsSync(repoPath)) {
    const r = spawnSync('git', ['clone', '--depth=1', input, repoPath], { stdio: 'inherit' });
    if (r.status !== 0) fail('git clone failed');
    cloned = true;
  }
} else if (input) {
  sourceType = 'path';
  repoPath = path.resolve(input);
  if (!fs.existsSync(repoPath)) fail(`Path not found: ${repoPath}`);
  if (!fs.statSync(repoPath).isDirectory()) fail(`Not a directory: ${repoPath}`);
}

const repoName = path.basename(repoPath);

console.log(JSON.stringify({ sourceType, input: input ?? null, repoName, repoPath, cloned }, null, 2));
