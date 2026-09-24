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
    return file;
  }
  for (const dir of ['nvim', 'ghostty', 'tmux', 'agents/skills', 'agents/commands', 'agents/claude/rules', 'agents/claude/skills', 'agents/opencode/skills', 'agents/opencode/subagents', 'agents/pi/agents', 'agents/pi/pi-skills', 'agents/pi/extensions']) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  for (const file of ['herdr/config.toml', 'zed/settings.json', 'zed/keymap.json', 'agents/AGENTS.md', 'agents/opencode/opencode.json', 'agents/pi/AGENTS.md', 'agents/pi/SYSTEM.md', 'agents/pi/context.md', 'agents/pi/keybindings.json']) write(file);
  write('agents/pi/settings.json', '{}');
  write('agents/claude/settings.json', '{}');
  write('agents/pi/packages.json', '{"packages":[]}');
  write('tmux/tmux.conf');
  write('agents/skills/common/SKILL.md', 'shared');
  write('agents/claude/skills/claude-only/SKILL.md', 'claude');
  write('agents/opencode/skills/opencode-only/SKILL.md', 'opencode');
  write('agents/pi/pi-skills/pi-only/SKILL.md', 'pi');
  write('agents/pi/extensions/custom.ts', '// custom');
  const calls = [];
  const messages = [];
  const settings = path.join(home, '.pi/agent/settings.json');
  const fakeExecute = (command, args, cwd) => {
    calls.push({ command, args, cwd });
    if (command === 'pi') {
      assert.equal(args[0], 'install');
      const source = args[1];
      const split = source.lastIndexOf('@');
      const name = source.slice(4, split);
      const version = source.slice(split + 1);
      const state = fs.existsSync(settings) ? JSON.parse(fs.readFileSync(settings)) : {};
      state.packages = (state.packages ?? []).filter((p) => p !== `npm:${name}` && !p.startsWith(`npm:${name}@`));
      state.packages.push(source);
      fs.mkdirSync(path.dirname(settings), { recursive: true });
      fs.writeFileSync(settings, JSON.stringify(state));
      const manifest = path.join(home, '.pi/agent/npm/node_modules', name, 'package.json');
      fs.mkdirSync(path.dirname(manifest), { recursive: true });
      fs.writeFileSync(manifest, JSON.stringify({ name, version }));
      return true;
    }
    assert.equal(command, 'npm');
    if (args[0] === 'ls') return fs.existsSync(path.join(cwd, 'node_modules/fixture-installed'));
    assert.ok(['ci', 'install'].includes(args[0]));
    fs.mkdirSync(path.join(cwd, 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'node_modules/fixture-installed'), 'installed');
    return true;
  };
  const options = { root, home, config, stateHome, platform: 'linux', execute: fakeExecute, log: (line) => messages.push(line) };
  return { root, home, config, stateHome, write, settings, calls, messages, options,
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

test('fresh setup creates the existing dotfiles and per-harness layout', (t) => {
  const f = fixture(t);
  assert.ok(f.apply().changes > 0);
  assertLink(path.join(f.home, '.agents/skills'), path.join(f.root, 'agents/skills'));
  assertLink(f.settings, path.join(f.root, 'agents/pi/settings.json'));
  assert.equal(fs.existsSync(path.join(f.home, '.claude/settings.json')), false);
  assertLink(path.join(f.home, '.claude/skills/common'), path.join(f.root, 'agents/skills/common'));
  assertLink(path.join(f.home, '.pi/agent/skills/pi-only'), path.join(f.root, 'agents/pi/pi-skills/pi-only'));
  assertLink(path.join(f.config, 'opencode/skills/opencode-only'), path.join(f.root, 'agents/opencode/skills/opencode-only'));
  assertLink(path.join(f.config, 'tmux/tmux.conf'), path.join(f.root, 'tmux/tmux.conf'));
  assert.ok(fs.lstatSync(path.join(f.home, '.pi/agent/skills')).isDirectory());
  for (const name of ['package.json', 'bun.lock']) {
    assert.equal(fs.readdirSync(path.join(f.home, '.pi/agent')).includes(name), false);
  }
  assert.equal(f.calls.length, 0);
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

test('new skill and extension additions are discovered without editing a manifest', (t) => {
  const f = fixture(t);
  f.apply();
  f.write('agents/skills/another/SKILL.md');
  f.write('agents/pi/pi-skills/another-pi/SKILL.md');
  f.write('agents/pi/extensions/another.ts');
  assert.equal(f.apply().changes, 3);
  assert.ok(fs.existsSync(path.join(f.home, '.agents/skills/another/SKILL.md')));
  assert.ok(fs.existsSync(path.join(f.home, '.claude/skills/another/SKILL.md')));
  assert.equal(f.apply().changes, 0);
});

test('removed and renamed managed skills and extensions are pruned', (t) => {
  const f = fixture(t);
  f.apply();
  fs.renameSync(path.join(f.root, 'agents/pi/pi-skills/pi-only'), path.join(f.root, 'agents/pi/pi-skills/renamed'));
  fs.unlinkSync(path.join(f.root, 'agents/pi/extensions/custom.ts'));
  fs.rmSync(path.join(f.root, 'agents/skills/common'), { recursive: true });
  f.apply();
  assert.equal(fs.existsSync(path.join(f.home, '.pi/agent/skills/pi-only')), false);
  assert.equal(fs.existsSync(path.join(f.home, '.pi/agent/extensions/custom.ts')), false);
  assert.equal(fs.existsSync(path.join(f.home, '.claude/skills/common')), false);
  assert.ok(fs.existsSync(path.join(f.home, '.pi/agent/skills/renamed')));
  const state = JSON.parse(fs.readFileSync(f.stateFile));
  assert.ok(!Object.keys(state.links).some((name) => name.endsWith('/custom.ts')));
});

test('local-only skills stay untouched and are not imported or replicated', (t) => {
  const f = fixture(t);
  local(path.join(f.home, '.pi/agent/skills/private/SKILL.md'), 'private');
  local(path.join(f.home, '.local/share/omarchy/default/agents/skills/omarchy/SKILL.md'), 'machine-only');
  local(path.join(f.home, '.local/share/omarchy/default/pi/agent/extensions/omarchy-system-theme.ts'), 'machine-only');
  f.apply({ platform: 'darwin' });
  assert.equal(fs.readFileSync(path.join(f.home, '.pi/agent/skills/private/SKILL.md'), 'utf8'), 'private');
  for (const name of ['private', 'omarchy']) {
    assert.equal(fs.existsSync(path.join(f.root, 'agents/skills', name)), false);
    assert.equal(fs.existsSync(path.join(f.home, '.claude/skills', name)), false);
  }
  assert.equal(fs.existsSync(path.join(f.home, '.pi/agent/extensions/omarchy-system-theme.ts')), false);
  assertLink(path.join(f.home, '.tmux/tmux.conf'), path.join(f.root, 'tmux/tmux.conf'));
});

test('conflicts fail before modifying links; explicit backup preserves local content', (t) => {
  const f = fixture(t);
  const file = path.join(f.home, '.claude/skills/common/local.txt');
  local(file, 'keep me');
  assert.throws(() => f.apply(), /Existing path is not an owned link/);
  assert.equal(fs.existsSync(path.join(f.home, '.agents/skills')), false);
  assert.equal(fs.existsSync(f.stateFile), false);
  assert.equal(fs.existsSync(path.join(f.root, 'agents/skills/common/local.txt')), false);
  f.apply({ backup: true });
  const backup = f.messages.find((line) => line.startsWith('backup saved: ')).slice('backup saved: '.length);
  assert.ok(backup.startsWith(path.join(f.stateHome, 'dotfiles/backups')));
  assert.equal(fs.readFileSync(path.join(backup, 'local.txt'), 'utf8'), 'keep me');
  assert.deepEqual(fs.readdirSync(path.dirname(path.dirname(file))).sort(), ['claude-only', 'common']);
  assert.equal(f.apply().changes, 0);
});

test('a user replacement of an obsolete managed link is never removed', (t) => {
  const f = fixture(t);
  f.apply();
  const dst = path.join(f.home, '.pi/agent/extensions/custom.ts');
  fs.unlinkSync(dst);
  fs.writeFileSync(dst, 'my local file');
  fs.unlinkSync(path.join(f.root, 'agents/pi/extensions/custom.ts'));
  assert.throws(() => f.apply({ backup: true }), /replaced locally/);
  assert.equal(fs.readFileSync(dst, 'utf8'), 'my local file');
});

test('missing managed links are repaired and a moved checkout is reconciled', (t) => {
  const f = fixture(t);
  f.apply();
  fs.unlinkSync(path.join(f.home, '.claude/skills/common'));
  assert.equal(f.apply().changes, 1);
  const moved = path.join(path.dirname(f.root), 'new checkout');
  fs.renameSync(f.root, moved);
  f.apply({ root: moved });
  assertLink(path.join(f.home, '.agents/skills'), path.join(moved, 'agents/skills'));
  assert.equal(f.apply({ root: moved }).changes, 0);
});

test('dry-run and check create no home/state files and run no install commands', (t) => {
  const f = fixture(t);
  f.write('agents/pi/packages.json', '{"packages":["npm:pi-example@1.0.0"]}');
  assert.ok(f.apply({ dryRun: true }).changes > 0);
  assert.ok(f.apply({ check: true }).changes > 0);
  assert.equal(fs.existsSync(f.home), false);
  assert.equal(f.calls.length, 0);
});

test('pinned packages install once, and adding/updating one installs only that package', (t) => {
  const f = fixture(t);
  f.write('agents/pi/settings.json', JSON.stringify({ theme: 'mine', packages: ['npm:other@2.0.0'] }));
  f.write('agents/pi/packages.json', '{"packages":["npm:pi-example@1.0.0"]}');
  f.apply();
  assert.equal(f.calls.filter((call) => call.command === 'pi').length, 1);
  assert.equal(f.apply().changes, 0);
  f.write('agents/pi/packages.json', '{"packages":["npm:pi-example@1.0.0","npm:@scope/new@2.0.0"]}');
  f.apply();
  assert.equal(f.calls.at(-1).args[1], 'npm:@scope/new@2.0.0');
  f.write('agents/pi/packages.json', '{"packages":["npm:pi-example@1.1.0","npm:@scope/new@2.0.0"]}');
  f.apply();
  assert.equal(f.calls.filter((call) => call.command === 'pi').length, 3);
  assert.equal(f.calls.at(-1).args[1], 'npm:pi-example@1.1.0');
  const settings = JSON.parse(fs.readFileSync(f.settings));
  assert.equal(settings.theme, 'mine');
  assert.ok(settings.packages.includes('npm:other@2.0.0'));
  assert.equal(settings.packages.filter((p) => p.startsWith('npm:pi-example@')).length, 1);
  assertLink(f.settings, path.join(f.root, 'agents/pi/settings.json'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.root, 'agents/pi/settings.json'))).theme, 'mine');
  assert.equal(f.apply().changes, 0);
});

test('a declared package with missing files is reinstalled', (t) => {
  const f = fixture(t);
  f.write('agents/pi/packages.json', '{"packages":["npm:pi-example@1.0.0"]}');
  f.apply();
  fs.rmSync(path.join(f.home, '.pi/agent/npm/node_modules/pi-example'), { recursive: true });
  f.apply();
  assert.equal(f.calls.length, 2);
});

test('custom package filters are preserved, and pin changes require manual reconciliation', (t) => {
  const f = fixture(t);
  const content = JSON.stringify({ packages: [{ source: 'npm:pi-example@0.9.0', skills: [] }] });
  const source = f.write('agents/pi/settings.json', content);
  f.write('agents/pi/packages.json', '{"packages":["npm:pi-example@1.0.0"]}');
  assert.throws(() => f.apply(), /custom resource filters/);
  assert.equal(fs.readFileSync(source, 'utf8'), content);
  assert.equal(f.calls.length, 0);
});

test('npm dependencies use locks, skip healthy installs, and repair missing files', (t) => {
  const f = fixture(t);
  const dir = 'agents/pi/pi-skills/pi-only';
  f.write(`${dir}/package.json`, '{"dependencies":{"example":"1.0.0"}}');
  const lock = f.write(`${dir}/package-lock.json`, '{"lockfileVersion":3}');
  f.apply();
  assert.equal(f.calls[0].args[0], 'ci');
  const callsBefore = f.calls.filter((call) => call.args[0] === 'ci').length;
  assert.equal(f.apply().changes, 0);
  assert.equal(f.calls.filter((call) => call.args[0] === 'ci').length, callsBefore);
  fs.unlinkSync(path.join(f.root, dir, 'node_modules/fixture-installed'));
  f.apply();
  assert.equal(f.calls.filter((call) => call.args[0] === 'ci').length, callsBefore + 1);
  fs.appendFileSync(lock, '\n');
  f.apply();
  assert.equal(f.calls.filter((call) => call.args[0] === 'ci').length, callsBefore + 2);
});

test('unlocked extension dependencies do not save manifests, locks, or install Pi peer packages', (t) => {
  const f = fixture(t);
  const dir = 'agents/pi/extensions/wiki';
  const content = '{"dependencies":{"diff":"^8.0.2"},"peerDependencies":{"@earendil-works/pi-coding-agent":"*"}}';
  f.write(`${dir}/package.json`, content);
  f.apply();
  const call = f.calls.find((call) => call.args[0] === 'install');
  assert.ok(call.args.includes('--no-save'));
  assert.ok(call.args.includes('--package-lock=false'));
  assert.ok(call.args.includes('--legacy-peer-deps'));
  assert.equal(fs.readFileSync(path.join(f.root, dir, 'package.json'), 'utf8'), content);
  assert.equal(fs.existsSync(path.join(f.root, dir, 'package-lock.json')), false);
});

test('package failures are retryable and leave an ownership record', (t) => {
  const f = fixture(t);
  f.write('agents/pi/packages.json', '{"packages":["npm:pi-example@1.0.0"]}');
  assert.throws(() => f.apply({ execute: () => false }), /Pi installation failed/);
  assert.ok(fs.existsSync(f.stateFile));
  assert.equal(fs.existsSync(path.join(f.stateHome, 'dotfiles/installation.lock')), false);
  f.apply();
  assert.equal(f.apply().changes, 0);
});

test('legacy repo links can be pruned, but foreign symlinks are not adopted', (t) => {
  const f = fixture(t);
  const dir = path.join(f.home, '.pi/agent/skills');
  fs.mkdirSync(dir, { recursive: true });
  fs.symlinkSync(path.join(f.root, 'agents/skills/common'), path.join(dir, 'common'));
  fs.symlinkSync('/does/not/exist/private', path.join(dir, 'private'));
  f.apply();
  assert.equal(fs.readdirSync(dir).includes('common'), false);
  assert.equal(fs.readlinkSync(path.join(dir, 'private')), '/does/not/exist/private');
});

test('directory symlinks cannot cause writes into a source tree', (t) => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.home, '.claude'), { recursive: true });
  fs.symlinkSync(path.join(f.root, 'agents/skills'), path.join(f.home, '.claude/skills'));
  assert.throws(() => f.apply({ backup: true }), /Parent must be a real directory/);
  assert.equal(fs.existsSync(path.join(f.root, 'agents/skills/claude-only')), false);
});

test('name collisions and unpinned package sources fail before installation', (t) => {
  const f = fixture(t);
  f.write('agents/claude/skills/common/SKILL.md', 'different');
  assert.throws(() => f.apply(), /Duplicate destination/);
  fs.rmSync(path.join(f.root, 'agents/claude/skills/common'), { recursive: true });
  f.write('agents/pi/packages.json', '{"packages":["npm:pi-example"]}');
  assert.throws(() => f.apply(), /Expected pinned npm package/);
  assert.equal(fs.existsSync(f.home), false);
});

test('links-only skips package/dependency installation and nested extension skills are linked', (t) => {
  const f = fixture(t);
  f.write('agents/pi/packages.json', '{"packages":["npm:pi-example@1.0.0"]}');
  f.write('agents/pi/extensions/wiki/skills/retrieve/SKILL.md');
  f.write('agents/pi/extensions/wiki/package.json', '{"dependencies":{"diff":"8.0.2"}}');
  f.apply({ linksOnly: true });
  assert.equal(f.calls.length, 0);
  assertLink(path.join(f.home, '.pi/agent/skills/retrieve'), path.join(f.root, 'agents/pi/extensions/wiki/skills/retrieve'));
});

test('removing a package declaration does not uninstall a machine-local package', (t) => {
  const f = fixture(t);
  f.write('agents/pi/packages.json', '{"packages":["npm:pi-example@1.0.0"]}');
  f.apply();
  f.write('agents/pi/packages.json', '{"packages":[]}');
  const calls = f.calls.length;
  assert.equal(f.apply().changes, 0);
  assert.equal(f.calls.length, calls);
  assert.ok(fs.existsSync(path.join(f.home, '.pi/agent/npm/node_modules/pi-example/package.json')));
});

test('an existing installation lock prevents link mutation', (t) => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.stateHome, 'dotfiles/installation.lock'), { recursive: true });
  assert.throws(() => f.apply(), /Another installation may be running/);
  assert.equal(fs.existsSync(path.join(f.home, '.agents/skills')), false);
  assert.equal(f.calls.length, 0);
});

test('config roots and unowned package settings cannot redirect writes into the checkout', (t) => {
  const f = fixture(t);
  fs.mkdirSync(f.home, { recursive: true });
  assert.throws(() => f.apply({ config: path.join(f.root, 'new-config') }), /Config directory resolves into/);
  assert.throws(() => f.apply({ stateHome: path.join(f.root, 'new-state') }), /State directory resolves into/);
  fs.symlinkSync(f.root, f.config);
  assert.throws(() => f.apply({ backup: true }), /Config directory resolves into/);
  fs.unlinkSync(f.config);
  f.write('agents/pi/packages.json', '{"packages":["npm:pi-example@1.0.0"]}');
  const sourceSettings = f.write('private-settings.json', '{}');
  fs.mkdirSync(path.dirname(f.settings), { recursive: true });
  fs.symlinkSync(sourceSettings, f.settings);
  assert.throws(() => f.apply(), /Existing path is not an owned link/);
  assert.equal(fs.readFileSync(sourceSettings, 'utf8'), '{}');
});

test('pruning never follows a replaced directory even when no desired children remain', (t) => {
  const f = fixture(t);
  f.apply();
  const skills = path.join(f.home, '.pi/agent/skills');
  const foreign = path.join(f.home, 'foreign-skills');
  fs.renameSync(skills, foreign);
  fs.symlinkSync(foreign, skills);
  fs.rmSync(path.join(f.root, 'agents/pi/pi-skills/pi-only'), { recursive: true });
  assert.throws(() => f.apply(), /Parent must be a real directory/);
  assert.ok(fs.lstatSync(path.join(foreign, 'pi-only')).isSymbolicLink());
});

test('matching installed packages with custom resource filters are skipped unchanged', (t) => {
  const f = fixture(t);
  const content = JSON.stringify({ packages: [{ source: 'npm:pi-example@1.0.0', skills: [] }] });
  f.write('agents/pi/settings.json', content);
  local(path.join(f.home, '.pi/agent/npm/node_modules/pi-example/package.json'), '{"version":"1.0.0"}');
  f.write('agents/pi/packages.json', '{"packages":["npm:pi-example@1.0.0"]}');
  f.apply();
  assert.equal(f.calls.length, 0);
  assert.equal(fs.readFileSync(f.settings, 'utf8'), content);
});

test('external skill source symlinks are rejected instead of replicated', (t) => {
  const f = fixture(t);
  const outside = path.join(f.home, 'external-skill');
  local(path.join(outside, 'SKILL.md'), 'not in dotfiles');
  fs.symlinkSync(outside, path.join(f.root, 'agents/skills/external'));
  assert.throws(() => f.apply(), /Source escapes the dotfiles checkout/);
  assert.equal(fs.existsSync(path.join(f.home, '.agents/skills')), false);
});

test('Pi settings migration backs up the original while Claude settings stay local', (t) => {
  const f = fixture(t);
  const originalPi = JSON.stringify({ theme: 'local', packages: ['npm:pi-example@1.0.0'] });
  const originalClaude = JSON.stringify({ env: { LOCAL_SETTING: 'only-here' } });
  local(f.settings, originalPi);
  const claude = path.join(f.home, '.claude/settings.json');
  local(claude, originalClaude);
  const auth = path.join(f.home, '.pi/agent/auth.json');
  local(auth, 'private fixture');
  f.write('agents/pi/settings.json', '{"theme":"repo","packages":[]}');
  f.write('agents/claude/settings.json', '{"hooks":{}}');
  f.write('agents/pi/packages.json', '{"packages":["npm:pi-example@1.0.0"]}');
  local(path.join(f.home, '.pi/agent/npm/node_modules/pi-example/package.json'), '{"version":"1.0.0"}');
  assert.throws(() => f.apply(), /Existing path is not an owned link/);
  assert.equal(fs.readFileSync(f.settings, 'utf8'), originalPi);
  assert.equal(fs.readFileSync(claude, 'utf8'), originalClaude);
  f.apply({ backup: true });
  assert.equal(f.calls.filter((call) => call.command === 'pi').length, 1);
  assert.equal(JSON.parse(fs.readFileSync(f.settings)).theme, 'repo');
  assert.equal(fs.readFileSync(claude, 'utf8'), originalClaude);
  const backups = f.messages.filter((line) => line.startsWith('backup saved: ')).map((line) => line.slice('backup saved: '.length));
  assert.ok(backups.some((file) => fs.readFileSync(file, 'utf8') === originalPi));
  assert.ok(!backups.some((file) => fs.readFileSync(file, 'utf8') === originalClaude));
  assert.equal(fs.readFileSync(auth, 'utf8'), 'private fixture');
  assert.equal(fs.existsSync(path.join(f.root, 'agents/pi/auth.json')), false);
  assert.equal(f.apply().changes, 0);
});

test('allowing repo settings still rejects Pi package storage inside the checkout', (t) => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.home, '.pi/agent'), { recursive: true });
  fs.symlinkSync(f.root, path.join(f.home, '.pi/agent/npm'));
  f.write('agents/pi/packages.json', '{"packages":["npm:pi-example@1.0.0"]}');
  assert.throws(() => f.apply(), /Pi npm resolves into the checkout/);
  assert.equal(fs.existsSync(path.join(f.home, '.agents/skills')), false);
});

test('invalid repo Pi settings fail before any link is created', (t) => {
  const f = fixture(t);
  f.write('agents/pi/settings.json', 'invalid JSON');
  assert.throws(() => f.apply({ linksOnly: true }), SyntaxError);
  assert.equal(fs.existsSync(f.home), false);
});

test('failed dependency installation is not marked complete and can be retried', (t) => {
  const f = fixture(t);
  f.write('agents/pi/extensions/wiki/package.json', '{"dependencies":{"diff":"8.0.2"}}');
  assert.throws(() => f.apply({ execute: () => false }), /Dependency installation failed/);
  assert.deepEqual(JSON.parse(fs.readFileSync(f.stateFile)).dependencies, {});
  f.apply();
  assert.equal(f.apply().changes, 0);
});
