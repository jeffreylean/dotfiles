import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const exists = (file) => fs.existsSync(file);
const stat = (file) => {
  try { return fs.lstatSync(file); } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
};
const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const inside = (file, directory) => file === directory || file.startsWith(directory + path.sep);
const entries = (directory) => fs.readdirSync(directory).filter((name) => !name.startsWith('.')).sort();
const target = (file) => stat(file)?.isSymbolicLink() ? fs.readlinkSync(file) : undefined;

// Resolve existing ancestors too, so a not-yet-created destination cannot hide
// a parent symlink back into the checkout.
function realLocation(file) {
  const tail = [];
  let parent = path.resolve(file);
  while (!stat(parent)) {
    tail.unshift(path.basename(parent));
    parent = path.dirname(parent);
  }
  return path.join(fs.realpathSync(parent), ...tail);
}

function run(command, args, cwd, quiet = false) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: quiet ? 'pipe' : 'inherit' });
  if (result.error) throw new Error(`Cannot run ${command}: ${result.error.message}`);
  return result.status === 0;
}

// Read the checkout, never harvest installed skills from the current machine.
function desiredLayout(root, home, config, platform) {
  const links = new Map();
  const packageRoots = new Set();
  const mixed = new Map();
  const registerMixed = (dst, src) => mixed.set(dst, [...(mixed.get(dst) ?? []), src]);
  const source = (relative) => {
    const file = path.join(root, relative);
    if (!exists(file)) throw new Error(`Missing source: ${file}`);
    if (!inside(fs.realpathSync(file), fs.realpathSync(root))) {
      throw new Error(`Source escapes the dotfiles checkout: ${file}`);
    }
    return file;
  };
  const add = (src, dst) => {
    const previous = links.get(dst);
    if (previous && fs.realpathSync(previous) !== fs.realpathSync(src)) {
      throw new Error(`Duplicate destination: ${dst}\n  ${previous}\n  ${src}`);
    }
    links.set(dst, src);
  };
  const link = (relative, dst) => add(source(relative), dst);
  const children = (relative, dst) => {
    const directory = source(relative);
    registerMixed(dst, directory);
    for (const name of entries(directory)) link(`${relative}/${name}`, path.join(dst, name));
  };
  const skills = (relative, dst) => {
    const directory = source(relative);
    registerMixed(dst, directory);
    const visit = (dir) => {
      if (exists(path.join(dir, 'SKILL.md'))) {
        // Also validates relative symlinks committed within the checkout.
        source(path.relative(root, dir));
        packageRoots.add(dir);
        add(dir, path.join(dst, path.basename(dir)));
        return;
      }
      for (const name of entries(dir)) {
        if (name === 'node_modules') continue;
        const child = path.join(dir, name);
        // Only follow a symlink when it names a skill, not an arbitrary directory tree.
        if (stat(child)?.isSymbolicLink()) {
          if (exists(path.join(child, 'SKILL.md'))) visit(child);
        } else if (stat(child)?.isDirectory()) visit(child);
      }
    };
    visit(directory);
  };

  link('nvim', path.join(config, 'nvim'));
  link('ghostty', path.join(config, 'ghostty'));
  children('tmux', platform === 'darwin' ? path.join(home, '.tmux') : path.join(config, 'tmux'));
  for (const relative of ['herdr/config.toml', 'zed/settings.json', 'zed/keymap.json']) {
    link(relative, path.join(config, relative));
  }

  link('agents/skills', path.join(home, '.agents/skills'));
  const pi = path.join(home, '.pi/agent');
  for (const name of ['AGENTS.md', 'SYSTEM.md', 'context.md', 'package.json', 'bun.lock', 'keybindings.json', 'agents']) {
    link(`agents/pi/${name}`, path.join(pi, name));
  }
  if (exists(path.join(root, 'agents/pi/prompts'))) link('agents/pi/prompts', path.join(pi, 'prompts'));
  children('agents/pi/extensions', path.join(pi, 'extensions'));
  skills('agents/pi/pi-skills', path.join(pi, 'skills'));
  packageRoots.add(source('agents/pi'));
  for (const name of entries(path.join(root, 'agents/pi/extensions'))) {
    const relative = `agents/pi/extensions/${name}`;
    if (!fs.statSync(source(relative)).isDirectory()) continue;
    packageRoots.add(source(relative));
    if (exists(path.join(root, relative, 'skills'))) skills(`${relative}/skills`, path.join(pi, 'skills'));
  }

  link('agents/AGENTS.md', path.join(home, '.claude/CLAUDE.md'));
  link('agents/commands', path.join(home, '.claude/commands'));
  link('agents/claude/rules', path.join(home, '.claude/rules'));
  skills('agents/skills', path.join(home, '.claude/skills'));
  skills('agents/claude/skills', path.join(home, '.claude/skills'));
  link('agents/AGENTS.md', path.join(config, 'opencode/AGENTS.md'));
  link('agents/commands', path.join(config, 'opencode/command'));
  link('agents/opencode/opencode.json', path.join(config, 'opencode/opencode.json'));
  link('agents/opencode/subagents', path.join(config, 'opencode/agents'));
  skills('agents/opencode/skills', path.join(config, 'opencode/skills'));
  link('agents/AGENTS.md', path.join(home, '.codex/AGENTS.md'));
  // No Omarchy or other machine-local discovery. Only sources above are deployed.
  return { links, packageRoots, mixed };
}

function parsePackage(source) {
  const match = typeof source === 'string' && source.match(/^npm:((?:@[^/\s]+\/)?[^@/\s]+)@(\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?)$/);
  if (!match) throw new Error(`Expected pinned npm package, e.g. npm:pi-example@1.2.3; got ${JSON.stringify(source)}`);
  return { source, name: match[1], version: match[2] };
}

function packageName(source) {
  return typeof source === 'string' ? source.match(/^npm:((?:@[^/\s]+\/)?[^@/\s]+)/)?.[1] : undefined;
}

function configuredSources(settings, name) {
  return (settings.packages ?? []).filter((entry) => packageName(typeof entry === 'string' ? entry : entry.source) === name);
}

function packageInstalled(pi, pkg) {
  const file = path.join(pi, 'npm/node_modules', pkg.name, 'package.json');
  return exists(file) && readJSON(file).version === pkg.version;
}

function declarationMatches(settings, pkg) {
  const entries = configuredSources(settings, pkg.name);
  return entries.length === 1 && (typeof entries[0] === 'string' ? entries[0] : entries[0].source) === pkg.source;
}

export function install({
  root, home, config = path.join(home, '.config'), stateHome = path.join(home, '.local/state'),
  platform = process.platform, dryRun = false, check = false, backup = false, linksOnly = false,
  execute = run, log = console.log,
}) {
  if (!['linux', 'darwin'].includes(platform)) throw new Error('Only Linux and macOS are supported.');
  root = path.resolve(root);
  home = path.resolve(home);
  config = path.resolve(config);
  const preview = dryRun || check;
  for (const [label, directory] of [['Home', home], ['Config', config], ['State', path.join(stateHome, 'dotfiles')]]) {
    if (inside(realLocation(directory), fs.realpathSync(root))) {
      throw new Error(`${label} directory resolves into the dotfiles checkout; refusing to write through it.`);
    }
  }
  const stateDir = path.join(stateHome, 'dotfiles');
  const stateFile = path.join(stateDir, 'installation.json');
  const state = exists(stateFile) ? readJSON(stateFile) : { version: 1, links: {}, dependencies: {} };
  if (state.version !== 1 || !state.links || !state.dependencies) throw new Error(`Invalid state file: ${stateFile}`);
  const { links, packageRoots, mixed } = desiredLayout(root, home, config, platform);
  const previous = { ...state.links };
  const actions = [];
  const conflicts = [];
  const addAction = (kind, dst, src) => actions.push({ kind, dst, src });

  // Adopt only recognizable repo links from the older setup script, never local content.
  const legacyRoots = new Map(mixed);
  for (const dir of [path.join(home, '.pi/agent/skills'), path.join(config, 'opencode/skills'), path.join(home, '.codex/skills')]) {
    legacyRoots.set(dir, [...(legacyRoots.get(dir) ?? []), path.join(root, 'agents/skills')]);
  }
  for (const [dir, sources] of legacyRoots) {
    if (!stat(dir)?.isDirectory()) continue;
    for (const name of entries(dir)) {
      const dst = path.join(dir, name);
      const raw = target(dst);
      if (!raw) continue;
      const absolute = path.resolve(dir, raw);
      if (sources.some((src) => inside(absolute, src)) && path.basename(absolute) === name) {
        previous[dst] ??= raw;
      }
    }
  }

  // Do not follow directory symlinks and accidentally modify a checkout or foreign tree.
  for (const dst of new Set([...links.keys(), ...Object.keys(previous)])) {
    let parent = path.dirname(dst);
    while (parent !== home && parent !== config && (inside(parent, home) || inside(parent, config))) {
      const info = stat(parent);
      if (info && !info.isDirectory()) {
        conflicts.push(`Parent must be a real directory: ${parent}`);
        break;
      }
      parent = path.dirname(parent);
    }
  }
  for (const [dst, src] of links) {
    const raw = target(dst);
    if (raw && path.resolve(path.dirname(dst), raw) === src) continue;
    if (!stat(dst)) addAction('link', dst, src);
    else if (raw && previous[dst] === raw) addAction('replace', dst, src);
    else if (backup) addAction('backup-link', dst, src);
    else conflicts.push(`Existing path is not an owned link: ${dst} (use --backup to preserve it and install the repo link)`);
  }
  for (const [dst, oldTarget] of Object.entries(previous)) {
    if (links.has(dst) || !stat(dst)) continue;
    if (!inside(dst, home) && !inside(dst, config)) {
      conflicts.push(`Refusing to prune state entry outside this home/config: ${dst}`);
    } else if (target(dst) === oldTarget) addAction('remove', dst);
    else conflicts.push(`Previously managed link was replaced locally; leaving untouched: ${dst}`);
  }

  // Validate manifests before making any changes, including link changes.
  const packages = linksOnly ? [] : readJSON(path.join(root, 'agents/pi/packages.json')).packages.map(parsePackage);
  if (new Set(packages.map((pkg) => pkg.name)).size !== packages.length) throw new Error('Duplicate package names in agents/pi/packages.json');
  const pi = path.join(home, '.pi/agent');
  const settingsPath = path.join(pi, 'settings.json');
  const settings = exists(settingsPath) ? readJSON(settingsPath) : {};
  const packageChanges = packages.filter((pkg) => !declarationMatches(settings, pkg) || !packageInstalled(pi, pkg));
  if (packageChanges.length) {
    for (const file of [settingsPath, path.join(pi, 'npm')]) {
      if (inside(realLocation(file), fs.realpathSync(root))) {
        conflicts.push(`Pi ${path.basename(file)} resolves into the checkout; keep mutable Pi settings and package storage machine-local.`);
      }
    }
  }
  // Preserve resource filters: don't let a CLI pin change silently broaden package permissions.
  for (const pkg of packageChanges) {
    if (configuredSources(settings, pkg.name).some((entry) => typeof entry !== 'string')) {
      conflicts.push(`Pi package ${pkg.name} has custom resource filters; reconcile its source/version manually before rerunning.`);
    }
  }
  const dependencyHealthy = (directory) => exists(path.join(directory, 'node_modules')) && execute(
    'npm', ['ls', '--omit=dev', '--omit=peer', '--all', '--json', '--logs-max=0', '--update-notifier=false'], directory, true,
  );
  const dependencies = [];
  if (!linksOnly) for (const directory of [...packageRoots].sort()) {
    const manifest = path.join(directory, 'package.json');
    if (!exists(manifest) || !Object.keys(readJSON(manifest).dependencies ?? {}).length) continue;
    const lock = path.join(directory, 'package-lock.json');
    const hash = createHash('sha256').update(fs.readFileSync(manifest));
    if (exists(lock)) hash.update(fs.readFileSync(lock));
    const fingerprint = hash.update(`${platform}/${process.arch}/${process.versions.node.split('.')[0]}`).digest('hex');
    const key = path.relative(root, directory);
    if (state.dependencies[key] !== fingerprint || !dependencyHealthy(directory)) {
      dependencies.push({ directory, fingerprint, key, locked: exists(lock) });
    }
  }

  for (const action of actions) log(`${preview ? 'would ' : ''}${action.kind}: ${action.dst}${action.src ? ` -> ${action.src}` : ''}`);
  for (const pkg of packageChanges) log(`${preview ? 'would ' : ''}install Pi package: ${pkg.source}`);
  for (const dep of dependencies) log(`${preview ? 'would ' : ''}install dependencies: ${dep.key}${dep.locked ? ' (npm ci)' : ' (no npm lockfile)'}`);
  if (conflicts.length) throw new Error([...new Set(conflicts)].join('\n'));
  const changes = actions.length + packageChanges.length + dependencies.length;
  if (preview) return { changes };

  fs.mkdirSync(stateDir, { recursive: true });
  const lockDir = path.join(stateDir, 'installation.lock');
  try { fs.mkdirSync(lockDir); } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Another installation may be running. If a previous run crashed, inspect and remove ${lockDir}`);
    throw error;
  }
  const save = () => {
    const contents = JSON.stringify(state, null, 2) + '\n';
    if (exists(stateFile) && fs.readFileSync(stateFile, 'utf8') === contents) return;
    const temporary = `${stateFile}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, contents, { mode: 0o600 });
    fs.renameSync(temporary, stateFile);
  };
  try {
    for (const { kind, dst, src } of actions) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      if (kind === 'backup-link') {
        // Keep backups outside harness discovery roots, so a backed-up SKILL.md
        // cannot remain active as a second/conflicting skill.
        let saved = path.join(stateDir, 'backups', String(Date.now()), dst.slice(path.parse(dst).root.length));
        while (stat(saved)) saved += '.1';
        fs.mkdirSync(path.dirname(saved), { recursive: true });
        fs.renameSync(dst, saved);
        log(`backup saved: ${saved}`);
      } else if (kind === 'replace' || kind === 'remove') {
        if (target(dst) !== previous[dst]) throw new Error(`Path changed during installation: ${dst}`);
        fs.unlinkSync(dst);
      }
      if (kind !== 'remove') fs.symlinkSync(src, dst);
    }
    state.links = Object.fromEntries([...links].map(([dst]) => [dst, target(dst)]));
    save(); // Keep ownership even if a subsequent package install fails.
    for (const pkg of packageChanges) {
      if (!execute('pi', ['install', pkg.source], home)) throw new Error(`Pi installation failed: ${pkg.source}`);
      if (!exists(settingsPath) || !declarationMatches(readJSON(settingsPath), pkg) || !packageInstalled(pi, pkg)) {
        throw new Error(`Pi did not reconcile ${pkg.source}; inspect pi list and settings.json, then retry.`);
      }
    }
    for (const dep of dependencies) {
      const args = dep.locked
        ? ['ci', '--omit=dev', '--no-audit', '--no-fund']
        : ['install', '--omit=dev', '--legacy-peer-deps', '--no-save', '--package-lock=false', '--no-audit', '--no-fund'];
      if (!execute('npm', args, dep.directory)) throw new Error(`Dependency installation failed: ${dep.key}`);
      if (!dependencyHealthy(dep.directory)) {
        throw new Error(`Dependency verification failed: ${dep.key}`);
      }
      state.dependencies[dep.key] = dep.fingerprint;
      save();
    }
    log(changes ? 'Installation complete.' : 'Already up to date.');
    return { changes };
  } finally {
    fs.rmdirSync(lockDir);
  }
}

function main() {
  const flags = new Set(process.argv.slice(2));
  const known = ['--help', '-h', '--dry-run', '--check', '--backup', '--links-only'];
  for (const flag of flags) if (!known.includes(flag)) throw new Error(`Unknown option: ${flag}`);
  if (flags.has('--help') || flags.has('-h')) {
    console.log(`Usage: scripts/installation.sh [--dry-run | --check] [--backup] [--links-only]

Install repo-owned dotfiles, skills, Pi extensions, and declared npm dependencies.
Requires Node.js 22+, npm, and Pi (unless --links-only).

  --dry-run     Show actions without installing or changing files.
  --check       Read-only drift check; exit 1 when changes are required.
  --backup      Move conflicting local paths to backups; never merge into Git.
  --links-only  Skip Pi packages and npm dependencies.

State: $XDG_STATE_HOME/dotfiles/installation.json (default ~/.local/state).
Only repo-owned links are pruned. Unlisted local skills/packages stay untouched.
No machine-local skills, credentials, or Omarchy integrations are imported.`);
    return;
  }
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22+ is required.');
  const home = process.env.HOME || os.homedir();
  if (process.env.PI_CODING_AGENT_DIR && path.resolve(process.env.PI_CODING_AGENT_DIR) !== path.join(home, '.pi/agent')) {
    throw new Error('Unset PI_CODING_AGENT_DIR: this installer targets ~/.pi/agent.');
  }
  const result = install({
    root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), home,
    config: process.env.XDG_CONFIG_HOME || path.join(home, '.config'),
    stateHome: process.env.XDG_STATE_HOME || path.join(home, '.local/state'),
    dryRun: flags.has('--dry-run'), check: flags.has('--check'),
    backup: flags.has('--backup'), linksOnly: flags.has('--links-only'),
  });
  if (flags.has('--check') && result.changes) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(`installation: ${error.message}`); process.exitCode = 1; }
}
