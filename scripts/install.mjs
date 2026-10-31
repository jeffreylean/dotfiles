import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
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

// Read the checkout, never harvest config from the current machine.
function desiredLayout(root, home, config, platform) {
  const links = new Map();
  const link = (relative, dst) => {
    const file = path.join(root, relative);
    if (!exists(file)) throw new Error(`Missing source: ${file}`);
    if (!inside(fs.realpathSync(file), fs.realpathSync(root))) {
      throw new Error(`Source escapes the dotfiles checkout: ${file}`);
    }
    links.set(dst, file);
  };

  link('nvim', path.join(config, 'nvim'));
  link('ghostty', path.join(config, 'ghostty'));
  link('rex', path.join(config, 'rex'));
  const tmux = platform === 'darwin' ? path.join(home, '.tmux') : path.join(config, 'tmux');
  for (const name of entries(path.join(root, 'tmux'))) link(`tmux/${name}`, path.join(tmux, name));
  for (const relative of ['herdr/config.toml', 'zed/settings.json', 'zed/keymap.json']) {
    link(relative, path.join(config, relative));
  }
  return links;
}

export function install({
  root, home, config = path.join(home, '.config'), stateHome = path.join(home, '.local/state'),
  platform = process.platform, dryRun = false, check = false, backup = false, log = console.log,
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
  // The agents CLI now owns everything under agents/. Forget those entries
  // instead of pruning them, so its links are never removed or reported here.
  const agents = path.join(root, 'agents');
  state.links = Object.fromEntries(Object.entries(state.links)
    .filter(([dst, raw]) => !inside(path.resolve(path.dirname(dst), raw), agents)));
  state.dependencies = Object.fromEntries(Object.entries(state.dependencies)
    .filter(([key]) => !inside(path.resolve(root, key), agents)));
  const links = desiredLayout(root, home, config, platform);
  const previous = state.links;
  const actions = [];
  const conflicts = [];
  const addAction = (kind, dst, src) => actions.push({ kind, dst, src });

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

  for (const action of actions) log(`${preview ? 'would ' : ''}${action.kind}: ${action.dst}${action.src ? ` -> ${action.src}` : ''}`);
  if (conflicts.length) throw new Error([...new Set(conflicts)].join('\n'));
  const changes = actions.length;
  if (preview) return { changes };

  fs.mkdirSync(stateDir, { recursive: true });
  const lockDir = path.join(stateDir, 'installation.lock');
  try { fs.mkdirSync(lockDir); } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Another installation may be running. If a previous run crashed, inspect and remove ${lockDir}`);
    throw error;
  }
  try {
    for (const { kind, dst, src } of actions) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      if (kind === 'backup-link') {
        // Keep backups outside the config roots, so a backed-up file is never
        // picked up as live config.
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
    const contents = JSON.stringify(state, null, 2) + '\n';
    if (!exists(stateFile) || fs.readFileSync(stateFile, 'utf8') !== contents) {
      const temporary = `${stateFile}.${process.pid}.tmp`;
      fs.writeFileSync(temporary, contents, { mode: 0o600 });
      fs.renameSync(temporary, stateFile);
    }
    log(changes ? 'Installation complete.' : 'Already up to date.');
    return { changes };
  } finally {
    fs.rmdirSync(lockDir);
  }
}

function main() {
  const flags = new Set(process.argv.slice(2));
  const known = ['--help', '-h', '--dry-run', '--check', '--backup'];
  for (const flag of flags) if (!known.includes(flag)) throw new Error(`Unknown option: ${flag}`);
  if (flags.has('--help') || flags.has('-h')) {
    console.log(`Usage: scripts/installation.sh [--dry-run | --check] [--backup]

Link repo-owned dotfiles: nvim, ghostty, tmux, herdr and zed.
Agent config under agents/ is installed by the agents CLI (agents sync).
Requires Node.js 22+.

  --dry-run     Show actions without changing files.
  --check       Read-only drift check; exit 1 when changes are required.
  --backup      Move conflicting local paths to backups; never merge into Git.

State: $XDG_STATE_HOME/dotfiles/installation.json (default ~/.local/state).
Only repo-owned links are pruned. Entries pointing under agents/ are released, not pruned.`);
    return;
  }
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22+ is required.');
  const home = process.env.HOME || os.homedir();
  const result = install({
    root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), home,
    config: process.env.XDG_CONFIG_HOME || path.join(home, '.config'),
    stateHome: process.env.XDG_STATE_HOME || path.join(home, '.local/state'),
    dryRun: flags.has('--dry-run'), check: flags.has('--check'), backup: flags.has('--backup'),
  });
  if (flags.has('--check') && result.changes) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(`installation: ${error.message}`); process.exitCode = 1; }
}
