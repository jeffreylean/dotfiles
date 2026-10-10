import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const crateNames = ['motiongfx', 'motiongfx_interp', 'motiongfx_scene', 'bevy_motiongfx'];
const required = ['Cargo.toml', 'crates/moxie/Cargo.toml', 'crates/moxie/src/project.rs',
  'crates/moxie_asset/Cargo.toml', 'crates/moxie_asset/src/lib.rs',
  ...crateNames.map(name => `vendor/motiongfx/crates/${name}/Cargo.toml`),
  'vendor/motiongfx/crates/bevy_motiongfx/src/scene/backend.rs'];

export function userPath(value, base = process.cwd()) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Expected a non-empty path');
  return resolve(base, value === '~' ? homedir() : value.startsWith('~/') ? join(homedir(), value.slice(2)) : value);
}

export function inside(child, parent) {
  const path = relative(parent, child);
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
}

export async function canonicalFuture(path) {
  try { return await realpath(path); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const parent = dirname(path);
    if (parent === path) throw error;
    return join(await canonicalFuture(parent), path.slice(parent.length + (parent.endsWith(sep) ? 0 : 1)));
  }
}

function command(program, args, optional = false) {
  try { return execFileSync(program, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 }).trim(); }
  catch (error) {
    if (optional) return null;
    throw new Error(`${program} ${args.join(' ')} failed: ${error.message}`);
  }
}

export async function inspectCheckout(path, probeTools = true) {
  if (process.platform === 'win32') throw new Error('This starter uses Moxie\'s /-rooted abs asset source; Windows requires adaptation.');
  const root = await realpath(userPath(path));
  for (const file of required) {
    if (!(await stat(join(root, file))).isFile()) throw new Error(`Missing source file: ${file}`);
  }
  const cargo = await readFile(join(root, 'Cargo.toml'), 'utf8');
  const version = cargo.match(/^\s*bevy\s*=\s*\{[^\n]*version\s*=\s*"([^"]+)"/m)?.[1];
  if (!version || !/^0\.19(?:\.\d+)?$/.test(version)) throw new Error(`Starter is verified for Bevy 0.19; checkout declares ${version ?? 'an unrecognized dependency form'}. Inspect and adapt APIs first.`);
  const project = await readFile(join(root, 'crates/moxie/src/project.rs'), 'utf8');
  const backend = await readFile(join(root, 'vendor/motiongfx/crates/bevy_motiongfx/src/scene/backend.rs'), 'utf8');
  for (const marker of ['DynamicWorldSerializer', 'WorldDeserializer', 'EntityUid', 'bookmarks']) {
    if (!project.includes(marker)) throw new Error(`Project serialization API changed: missing ${marker}`);
  }
  for (const field of ['translation', 'rotation', 'scale']) {
    if (!backend.includes(`path!(<Transform>::${field})`)) throw new Error(`Default registry does not advertise Transform.${field}`);
  }
  return { root, bevy: version, moxieRevision: command('git', ['-C', root, 'rev-parse', 'HEAD'], true),
    motiongfxRevision: command('git', ['-C', join(root, 'vendor/motiongfx'), 'rev-parse', 'HEAD'], true),
    tools: probeTools ? { cargo: command('cargo', ['--version']), rustc: command('rustc', ['--version']) } : {},
    scope: 'Structural compatibility checks only; cargo build and actual .mox import are still required.' };
}

function cargoManifest(root) {
  const path = value => JSON.stringify(value);
  const crate = name => path(join(root, 'vendor/motiongfx/crates', name));
  return `[package]\nname = "motiongfx-mox-scene"\nversion = "0.1.0"\nedition = "2024"\n\n[workspace]\n\n[[bin]]\nname = "author"\npath = "src/main.rs"\n\n[[bin]]\nname = "preview"\npath = "src/preview.rs"\n\n[dependencies]\nbevy = { version = "0.19", features = ["serialize", "scene"] }\nbevy_motiongfx = { path = ${crate('bevy_motiongfx')}, features = ["scene"] }\nmotiongfx_scene = { path = ${crate('motiongfx_scene')} }\nmoxie = { path = ${path(join(root, 'crates/moxie'))} }\nmoxie_asset = { path = ${path(join(root, 'crates/moxie_asset'))} }\nron = "0.12"\nserde = { version = "1", features = ["derive"] }\nserde_json = "1"\n\n[patch.crates-io]\n${crateNames.map(name => `${name} = { path = ${crate(name)} }`).join('\n')}\n\n[profile.dev]\nopt-level = 1\n\n[profile.dev.package."*"]\nopt-level = 3\n`;
}

export async function initialize({ moxieRoot, output }, probeTools = true) {
  const checkout = await inspectCheckout(moxieRoot, probeTools);
  const requested = userPath(output);
  const target = await canonicalFuture(requested);
  if (target.includes('#')) throw new Error('Output path cannot contain #: Bevy uses it to separate asset labels');
  if (inside(target, checkout.root) || inside(target, skillRoot)) throw new Error('Output must be outside the dependency checkout and skill directory');
  try {
    await lstat(requested);
    throw new Error(`Output already exists; choose a new project directory: ${requested}`);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(dirname(target), { recursive: true });
  await mkdir(target);
  await cp(join(skillRoot, 'assets/starter'), target, { recursive: true, force: false, errorOnExist: true });
  await writeFile(join(target, 'Cargo.toml'), cargoManifest(checkout.root), { flag: 'wx' });
  await writeFile(join(target, 'setup.json'), `${JSON.stringify({ schema: 1, checkout, output: target }, null, 2)}\n`, { flag: 'wx' });
  for (const folder of ['assets', 'evidence', 'preview']) await mkdir(join(target, folder), { recursive: true });
  return { status: 'created', project: target, built: false, checkout,
    next: ['cargo fmt', 'cargo test --bin author', 'cargo run --bin author', 'cargo run --bin preview -- "$PWD" --check', 'cargo run --bin preview -- "$PWD" --stills'] };
}

async function artifact(root, name) {
  if (typeof name !== 'string' || !name || isAbsolute(name)) throw new Error(`Expected a relative artifact path: ${name}`);
  const path = await realpath(join(root, name));
  if (!inside(path, root)) throw new Error(`Artifact escapes project directory: ${name}`);
  const info = await stat(path);
  if (!info.isFile() || info.size === 0) throw new Error(`Empty or non-file artifact: ${name}`);
  const content = await readFile(path);
  return { path: name, bytes: info.size, sha256: createHash('sha256').update(content).digest('hex'), content };
}

export async function checkArtifacts(project) {
  const root = await realpath(userPath(project));
  const manifestFile = await artifact(root, 'manifest.json');
  const manifest = JSON.parse(manifestFile.content.toString());
  if (manifest.schema !== 1) throw new Error('Expected starter manifest schema 1');
  for (const field of ['fps', 'width', 'height', 'frame_count']) {
    if (!Number.isSafeInteger(manifest[field]) || manifest[field] <= 0) throw new Error(`Invalid manifest ${field}`);
  }
  if (!Number.isFinite(manifest.duration_seconds) || manifest.duration_seconds <= 0 || manifest.frame_count !== Math.ceil(manifest.duration_seconds * manifest.fps)) throw new Error('Manifest duration/fps/frame count disagree');
  if (typeof manifest.project !== 'string' || !manifest.project.endsWith('.mox')) throw new Error('Manifest must name a .mox project');
  if (!Array.isArray(manifest.asset_files) || manifest.asset_files.length === 0) throw new Error('Manifest asset_files must be a non-empty array');
  const files = [manifestFile, await artifact(root, manifest.project)];
  for (const name of manifest.asset_files) {
    const file = await artifact(root, name);
    if (name.endsWith('.glb') && (file.content.length < 20 || file.content.toString('ascii', 0, 4) !== 'glTF' || file.content.readUInt32LE(4) !== 2 || file.content.readUInt32LE(8) !== file.bytes)) throw new Error(`Invalid GLB header or length: ${name}`);
    files.push(file);
  }
  return { status: 'pass', level: 'files-only', project: root,
    scope: 'Manifest-listed file existence, containment, manifest consistency, GLB header, and hashes. Does NOT parse RON, discover unlisted asset references, compile timelines, load assets in Bevy, or judge visuals.',
    files: files.map(({ content, ...file }) => file),
    requiredRuntimeChecks: ['cargo test --bin author', 'cargo run --bin author', 'cargo run --bin preview -- "$PWD" --check', 'cargo run --bin preview -- "$PWD" --stills'] };
}

export async function run(args) {
  const [action, ...tokens] = args;
  const flags = { doctor: ['moxie', 'config'], init: ['moxie', 'out', 'config'], check: ['project', 'config'] }[action];
  if (!flags) throw new Error(`Unknown command: ${action ?? '(missing)'}`);
  const options = {};
  for (let i = 0; i < tokens.length; i += 2) {
    const key = tokens[i].replace(/^--/, '');
    if (!tokens[i].startsWith('--') || !flags.includes(key) || key in options) throw new Error(`Unknown or repeated option: ${tokens[i]}`);
    const value = tokens[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    options[key] = value;
  }
  let config = {};
  let base = process.cwd();
  if (options.config) {
    const path = userPath(options.config);
    config = JSON.parse(await readFile(path, 'utf8'));
    if (!config || Array.isArray(config) || typeof config !== 'object') throw new Error('Config must be an object');
    if (Object.keys(config).some(key => !['moxieRoot', 'projectRoot'].includes(key))) throw new Error('Config supports only moxieRoot and projectRoot');
    base = dirname(path);
  }
  const moxie = options.moxie ? userPath(options.moxie) : config.moxieRoot ? userPath(config.moxieRoot, base) : process.env.MOXIE_ROOT ? userPath(process.env.MOXIE_ROOT) : null;
  if (action === 'doctor') {
    if (!moxie) throw new Error('Provide --moxie or MOXIE_ROOT');
    return inspectCheckout(moxie);
  }
  if (action === 'init') {
    if (!moxie) throw new Error('Provide --moxie or MOXIE_ROOT');
    const output = options.out ? userPath(options.out) : config.projectRoot ? userPath(config.projectRoot, base) : null;
    if (!output) throw new Error('Provide --out');
    return initialize({ moxieRoot: moxie, output });
  }
  const project = options.project ? userPath(options.project) : config.projectRoot ? userPath(config.projectRoot, base) : null;
  if (!project) throw new Error('Provide --project');
  return checkArtifacts(project);
}
