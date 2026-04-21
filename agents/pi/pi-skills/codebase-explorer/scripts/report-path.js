#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const name = process.argv[2]?.trim();
if (!name) {
  console.error('ERROR: Usage: node report-path.js <repoName>');
  process.exit(1);
}

const safe = name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
if (!safe) {
  console.error('ERROR: repo name empty after sanitization');
  process.exit(1);
}

const d = new Date();
const ts = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;

const base = path.join(os.homedir(), '.pi', 'codebase');
fs.mkdirSync(base, { recursive: true });
const reportPath = path.join(base, `${safe}-${ts}.md`);

console.log(JSON.stringify({ repoName: safe, reportPath }, null, 2));
