import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { install } from './install.mjs';

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dotfiles-install-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'repo with spaces');
  const home = path.join(directory, 'home');
  const config = path.join(home, 'custom config');
  const stateHome = path.join(home, 'state');
  function write(relative, content = '') {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  for (const file of ['nvim/init.lua', 'ghostty/config', 'rex/init.lua', 'tmux/tmux.conf', 'herdr/config.toml', 'zed/settings.json', 'zed/keymap.json']) write(file);
  const messages = [];
  const options = { root, home, config, stateHome, platform: 'linux', log: (line) => messages.push(line) };
  return { root, home, config, stateHome, write, messages,
    stateFile: path.join(stateHome, 'dotfiles/installation.json'),
    apply: (overrides = {}) => install({ ...options, ...overrides }),
  };
}

function local(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function assertLink(file, destination) {
  assert.equal(fs.readlinkSync(file), destination);
}

test('fresh setup links each config into the platform location', (t) => {
  const f = fixture(t);
  assert.equal(f.apply().changes, 7);
  for (const name of ['nvim', 'ghostty', 'rex', 'herdr/config.toml', 'zed/settings.json', 'zed/keymap.json']) {
    assertLink(path.join(f.config, name), path.join(f.root, name));
  }
  assertLink(path.join(f.config, 'tmux/tmux.conf'), path.join(f.root, 'tmux/tmux.conf'));
  assert.ok(fs.lstatSync(path.join(f.config, 'tmux')).isDirectory());

  const g = fixture(t);
  g.apply({ platform: 'darwin' });
  assertLink(path.join(g.home, '.tmux/tmux.conf'), path.join(g.root, 'tmux/tmux.conf'));
});

test('second run has no changes and does not rewrite state', (t) => {
  const f = fixture(t);
  f.apply();
  const before = fs.readFileSync(f.stateFile, 'utf8');
  const mtime = fs.statSync(f.stateFile).mtimeMs;
  assert.equal(f.apply().changes, 0);
  assert.equal(fs.readFileSync(f.stateFile, 'utf8'), before);
  assert.equal(fs.statSync(f.stateFile).mtimeMs, mtime);
});

test('added tmux files are linked and removed ones are pruned', (t) => {
  const f = fixture(t);
  f.apply();
  f.write('tmux/theme.conf');
  fs.unlinkSync(path.join(f.root, 'tmux/tmux.conf'));
  assert.equal(f.apply().changes, 2);
  assertLink(path.join(f.config, 'tmux/theme.conf'), path.join(f.root, 'tmux/theme.conf'));
  assert.equal(fs.existsSync(path.join(f.config, 'tmux/tmux.conf')), false);
  assert.ok(!Object.keys(JSON.parse(fs.readFileSync(f.stateFile)).links).some((dst) => dst.endsWith('/tmux.conf')));
  assert.equal(f.apply().changes, 0);
});

test('conflicts fail before modifying links; explicit backup preserves local content', (t) => {
  const f = fixture(t);
  const file = path.join(f.config, 'nvim/local.lua');
  local(file, 'keep me');
  assert.throws(() => f.apply(), /Existing path is not an owned link/);
  assert.equal(fs.existsSync(path.join(f.config, 'ghostty')), false);
  assert.equal(fs.existsSync(f.stateFile), false);
  f.apply({ backup: true });
  const backup = f.messages.find((line) => line.startsWith('backup saved: ')).slice('backup saved: '.length);
  assert.ok(backup.startsWith(path.join(f.stateHome, 'dotfiles/backups')));
  assert.equal(fs.readFileSync(path.join(backup, 'local.lua'), 'utf8'), 'keep me');
  assertLink(path.join(f.config, 'nvim'), path.join(f.root, 'nvim'));
  assert.equal(fs.existsSync(path.join(f.root, 'nvim/local.lua')), false);
  assert.equal(f.apply().changes, 0);
});

test('a user replacement of an obsolete managed link is never removed', (t) => {
  const f = fixture(t);
  f.apply();
  const dst = path.join(f.config, 'tmux/tmux.conf');
  fs.unlinkSync(dst);
  fs.writeFileSync(dst, 'my local file');
  fs.unlinkSync(path.join(f.root, 'tmux/tmux.conf'));
  assert.throws(() => f.apply({ backup: true }), /replaced locally/);
  assert.equal(fs.readFileSync(dst, 'utf8'), 'my local file');
});

test('missing managed links are repaired and a moved checkout is reconciled', (t) => {
  const f = fixture(t);
  f.apply();
  fs.unlinkSync(path.join(f.config, 'zed/keymap.json'));
  assert.equal(f.apply().changes, 1);
  const moved = path.join(path.dirname(f.root), 'new checkout');
  fs.renameSync(f.root, moved);
  f.apply({ root: moved });
  assertLink(path.join(f.config, 'nvim'), path.join(moved, 'nvim'));
  assert.equal(f.apply({ root: moved }).changes, 0);
});

test('dry-run and check create no home or state files', (t) => {
  const f = fixture(t);
  assert.ok(f.apply({ dryRun: true }).changes > 0);
  assert.ok(f.apply({ check: true }).changes > 0);
  assert.ok(f.messages.every((line) => line.startsWith('would ')));
  assert.equal(fs.existsSync(f.home), false);
});

test('directory symlinks cannot cause writes into a source tree', (t) => {
  const f = fixture(t);
  fs.mkdirSync(f.config, { recursive: true });
  fs.symlinkSync(path.join(f.root, 'zed'), path.join(f.config, 'zed'));
  assert.throws(() => f.apply({ backup: true }), /Parent must be a real directory/);
  assert.deepEqual(fs.readdirSync(path.join(f.root, 'zed')).sort(), ['keymap.json', 'settings.json']);
});

test('pruning never follows a replaced directory even when no desired children remain', (t) => {
  const f = fixture(t);
  f.apply();
  const tmux = path.join(f.config, 'tmux');
  const foreign = path.join(f.home, 'foreign-tmux');
  fs.renameSync(tmux, foreign);
  fs.symlinkSync(foreign, tmux);
  fs.unlinkSync(path.join(f.root, 'tmux/tmux.conf'));
  assert.throws(() => f.apply(), /Parent must be a real directory/);
  assert.ok(fs.lstatSync(path.join(foreign, 'tmux.conf')).isSymbolicLink());
});

test('external source symlinks are rejected instead of replicated', (t) => {
  const f = fixture(t);
  const outside = path.join(f.home, 'external.conf');
  local(outside, 'not in dotfiles');
  fs.symlinkSync(outside, path.join(f.root, 'tmux/external.conf'));
  assert.throws(() => f.apply(), /Source escapes the dotfiles checkout/);
  assert.equal(fs.existsSync(f.config), false);
});

test('an existing installation lock prevents link mutation', (t) => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.stateHome, 'dotfiles/installation.lock'), { recursive: true });
  assert.throws(() => f.apply(), /Another installation may be running/);
  assert.equal(fs.existsSync(f.config), false);
});

test('config and state roots cannot redirect writes into the checkout', (t) => {
  const f = fixture(t);
  fs.mkdirSync(f.home, { recursive: true });
  assert.throws(() => f.apply({ config: path.join(f.root, 'new-config') }), /Config directory resolves into/);
  assert.throws(() => f.apply({ stateHome: path.join(f.root, 'new-state') }), /State directory resolves into/);
  fs.symlinkSync(f.root, f.config);
  assert.throws(() => f.apply({ backup: true }), /Config directory resolves into/);
});

test('state entries under agents/ are released: left on disk, unreported, and dropped from state', (t) => {
  const f = fixture(t);
  f.apply();
  const agentLinks = {
    // Still points where state says; the old installer would have pruned it.
    claude: [path.join(f.home, '.claude/CLAUDE.md'), path.join(f.root, 'agents/AGENTS.md')],
    // Recorded relative to the link's directory.
    skills: [path.join(f.home, '.agents/skills'), path.relative(path.join(f.home, '.agents'), path.join(f.root, 'agents/skills'))],
  };
  for (const [dst, raw] of Object.values(agentLinks)) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.symlinkSync(raw, dst);
  }
  // The agents CLI retargeted this one, so disk and state now differ.
  const retargeted = path.join(f.home, '.pi/agent/skills/grill');
  fs.mkdirSync(path.dirname(retargeted), { recursive: true });
  fs.symlinkSync(path.join(f.root, 'agents/library/grill'), retargeted);

  const state = JSON.parse(fs.readFileSync(f.stateFile));
  for (const [dst, raw] of Object.values(agentLinks)) state.links[dst] = raw;
  state.links[retargeted] = path.join(f.root, 'agents/skills/grill');
  state.dependencies['agents/pi/extensions/wiki'] = 'fingerprint';
  fs.writeFileSync(f.stateFile, JSON.stringify(state, null, 2) + '\n');

  f.messages.length = 0;
  assert.equal(f.apply({ check: true }).changes, 0);
  assert.deepEqual(f.messages, []);
  assert.equal(f.apply().changes, 0);

  for (const [dst, raw] of Object.values(agentLinks)) assertLink(dst, raw);
  assertLink(retargeted, path.join(f.root, 'agents/library/grill'));
  const saved = JSON.parse(fs.readFileSync(f.stateFile));
  assert.equal(Object.keys(saved.links).length, 7);
  assert.ok(Object.keys(saved.links).every((dst) => dst.startsWith(f.config)));
  assert.deepEqual(saved.dependencies, {});
});
