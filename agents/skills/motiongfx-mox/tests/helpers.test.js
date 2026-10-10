import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { canonicalFuture, checkArtifacts, initialize, inside, inspectCheckout, run, skillRoot } from '../scripts/lib.js';

async function fixture(t) {
  const base = await mkdtemp(join(tmpdir(), 'motiongfx-mox-test-'));
  t.after(() => rm(base, { recursive: true, force: true }));
  const checkout = join(base, 'checkout with spaces');
  const files = {
    'Cargo.toml': '[workspace.dependencies]\nbevy = { version = "0.19", default-features = false }\n',
    'crates/moxie/Cargo.toml': '[package]\nname = "moxie"\n',
    'crates/moxie/src/project.rs': 'DynamicWorldSerializer WorldDeserializer EntityUid bookmarks',
    'crates/moxie_asset/Cargo.toml': '[package]\nname = "moxie_asset"\n',
    'crates/moxie_asset/src/lib.rs': 'register_absolute_source',
    'vendor/motiongfx/crates/bevy_motiongfx/src/scene/backend.rs': 'path!(<Transform>::translation) path!(<Transform>::rotation) path!(<Transform>::scale)',
  };
  for (const name of ['motiongfx', 'motiongfx_interp', 'motiongfx_scene', 'bevy_motiongfx']) files[`vendor/motiongfx/crates/${name}/Cargo.toml`] = `[package]\nname = "${name}"\n`;
  for (const [file, text] of Object.entries(files)) {
    await mkdir(dirname(join(checkout, file)), { recursive: true });
    await writeFile(join(checkout, file), text);
  }
  return { base, checkout, output: join(base, 'new graphics') };
}

async function artifacts(root) {
  await mkdir(join(root, 'assets'), { recursive: true });
  const manifest = { schema: 1, project: 'scene.mox', asset_files: ['assets/test.glb'], duration_seconds: 6, fps: 30, width: 1280, height: 720, frame_count: 180 };
  const glb = Buffer.alloc(20);
  glb.write('glTF'); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
  await writeFile(join(root, 'assets/test.glb'), glb);
  await writeFile(join(root, 'scene.mox'), 'not RON: file check must not claim runtime parsing');
  await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest));
  return manifest;
}

test('path containment uses boundaries, not string prefixes', () => {
  assert.equal(inside('/tmp/project/new', '/tmp/project'), true);
  assert.equal(inside('/tmp/project2', '/tmp/project'), false);
  assert.equal(inside('/tmp', '/tmp/project'), false);
});

test('doctor checks source structure without claiming compilation', async t => {
  const f = await fixture(t);
  const result = await inspectCheckout(f.checkout, false);
  assert.equal(result.bevy, '0.19');
  assert.match(result.scope, /Structural/);
  assert.deepEqual(result.tools, {});
});

test('doctor rejects unsupported Bevy versions', async t => {
  const f = await fixture(t);
  await writeFile(join(f.checkout, 'Cargo.toml'), 'bevy = { version = "0.20" }');
  await assert.rejects(inspectCheckout(f.checkout, false), /verified for Bevy 0.19/);
});

test('doctor rejects registry drift', async t => {
  const f = await fixture(t);
  await writeFile(join(f.checkout, 'vendor/motiongfx/crates/bevy_motiongfx/src/scene/backend.rs'), 'empty');
  await assert.rejects(inspectCheckout(f.checkout, false), /registry/);
});

test('init writes a portable standalone project and leaves source manifests unchanged', async t => {
  const f = await fixture(t);
  const before = await readFile(join(f.checkout, 'Cargo.toml'), 'utf8');
  const result = await initialize({ moxieRoot: f.checkout, output: f.output }, false);
  assert.equal(result.status, 'created');
  assert.equal(result.built, false);
  const cargo = await readFile(join(f.output, 'Cargo.toml'), 'utf8');
  assert.ok(cargo.includes(JSON.stringify(join(await realpath(f.checkout), 'crates/moxie'))));
  assert.match(cargo, /\[patch.crates-io\]/);
  assert.match(cargo, /\[workspace\]/);
  for (const file of ['main.rs', 'export.rs', 'geometry.rs', 'preview.rs']) assert.ok((await stat(join(f.output, 'src', file))).isFile());
  assert.equal(await readFile(join(f.checkout, 'Cargo.toml'), 'utf8'), before);
  await assert.rejects(initialize({ moxieRoot: f.checkout, output: f.output }, false), /already exists/);
});

test('init refuses writes inside the source checkout', async t => {
  const f = await fixture(t);
  await assert.rejects(initialize({ moxieRoot: f.checkout, output: join(f.checkout, 'generated') }, false), /outside/);
});

test('init resolves symlinked ancestors before checking scope', async t => {
  const f = await fixture(t);
  const alias = join(f.base, 'alias');
  await symlink(f.checkout, alias, 'dir');
  assert.equal(await canonicalFuture(join(alias, 'child', 'nested')), join(await realpath(f.checkout), 'child', 'nested'));
  await assert.rejects(initialize({ moxieRoot: f.checkout, output: join(alias, 'generated') }, false), /outside/);
});

test('init refuses output paths that collide with Bevy asset labels', async t => {
  const f = await fixture(t);
  await assert.rejects(initialize({ moxieRoot: f.checkout, output: join(f.base, 'scene#one') }, false), /asset labels/);
});

test('init refuses to write into the skill itself', async t => {
  const f = await fixture(t);
  await assert.rejects(initialize({ moxieRoot: f.checkout, output: join(skillRoot, 'new-project') }, false), /outside/);
});

test('file audit is explicitly not a RON or runtime validator', async t => {
  const f = await fixture(t);
  await artifacts(f.output);
  const result = await checkArtifacts(f.output);
  assert.equal(result.level, 'files-only');
  assert.match(result.scope, /Does NOT parse RON/);
  assert.equal(result.files.length, 3);
  assert.ok(result.files.every(file => /^[a-f0-9]{64}$/.test(file.sha256)));
});

test('audit rejects missing assets and malformed GLB headers', async t => {
  const f = await fixture(t);
  await artifacts(f.output);
  await writeFile(join(f.output, 'assets/test.glb'), 'bad glb');
  await assert.rejects(checkArtifacts(f.output), /Invalid GLB/);
  await rm(join(f.output, 'assets/test.glb'));
  await assert.rejects(checkArtifacts(f.output), /ENOENT/);
});

test('audit rejects stale duration and frame count', async t => {
  const f = await fixture(t);
  const manifest = await artifacts(f.output);
  manifest.frame_count = 179;
  await writeFile(join(f.output, 'manifest.json'), JSON.stringify(manifest));
  await assert.rejects(checkArtifacts(f.output), /disagree/);
});

test('audit refuses escaping asset symlinks', async t => {
  const f = await fixture(t);
  await artifacts(f.output);
  const outside = join(f.base, 'outside.glb');
  await writeFile(outside, 'outside');
  await rm(join(f.output, 'assets/test.glb'));
  await symlink(outside, join(f.output, 'assets/test.glb'));
  await assert.rejects(checkArtifacts(f.output), /escapes/);
});

test('config paths are relative to the config directory', async t => {
  const f = await fixture(t);
  await artifacts(f.output);
  const config = join(f.base, 'config.json');
  await writeFile(config, JSON.stringify({ projectRoot: 'new graphics' }));
  assert.equal((await run(['check', '--config', config])).project, await realpath(f.output));
});

test('bad flags and config keys fail instead of being ignored', async t => {
  const f = await fixture(t);
  await assert.rejects(run(['init', '--force', 'yes']), /Unknown/);
  await assert.rejects(run(['check', '--project']), /Missing value/);
  await assert.rejects(run(['check', '--project', 'a', '--project', 'b']), /repeated/);
  const config = join(f.base, 'config.json');
  await writeFile(config, '{"typo":true}');
  await assert.rejects(run(['check', '--config', config]), /only moxieRoot/);
});

test('CLI help works with explicit runtime and executable shebang', () => {
  const cli = join(skillRoot, 'scripts/motiongfx-mox-run.js');
  assert.match(execFileSync(process.execPath, [cli, '--help'], { encoding: 'utf8' }), /Usage:/);
  assert.match(execFileSync(cli, ['--help'], { encoding: 'utf8' }), /Usage:/);
  const bad = spawnSync(process.execPath, [cli, 'unknown'], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.equal(bad.stdout, '');
  assert.match(bad.stderr, /Unknown command/);
});
