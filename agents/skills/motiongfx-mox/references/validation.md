# Validation evidence

## Tested environment

- macOS on Apple M1 Pro, Metal rendering backend.
- Node 24.1.0 and Bun 1.3.5.
- Cargo/rustc 1.96.0.
- Moxie source revision: `89617fe8374d6ad02bc89e34f534b6646e4152e2`.
- Vendored MotionGfx revision: `70ab0daa1c1a118c09958d4325abe16b762062fe`, crate version 0.3.1.
- The fresh Cargo resolution used **Bevy 0.19.1**. Retain Cargo.lock for reproducibility.

The test project was created under `$HOME/Documents/motiongfx-skill-validation` with this skill's `init` helper. It used its own fresh `target/` and ordinary Cargo, with three build jobs. No cached-library linking or source-repository modifications were used.

## Results

| Check | Result |
| --- | --- |
| skill-creator structural validator | Passed under Node and Bun |
| Node helper tests | 16 passed |
| Bun helper tests | 16 passed |
| Executable shebang and explicit runtime CLI | Tested |
| No-overwrite, source/skill containment, symlink guards, asset-label path guard | Tested |
| Manifest consistency, missing/escaping assets, GLB header rejection, hashes | Tested |
| Rust unit tests | 3 passed |
| Native compiled timing | Chain 0/1/2s; all 3/3/3s; flow 4/4.2/4.4s |
| Native versus serialized-animation parity | 1,825 transform comparisons across 365 times, including backward seeks |
| Saved `.mox` import | Reflected entities, compilation/staging, asset loading, 366 sampled transform checks, backward seek passed |
| Still rendering | Six 1280x720 images; sampled images visually inspected |
| Complete frame rendering | 180 numbered PNGs; every header/dimension checked against manifest |
| Node/Bun artifact audits | Passed with matching output |

The generated scene is a six-second technical example with three blue shaded cubes on a neutral backdrop. It is not a finished creative treatment.

Raw logs and reports remain in the test project's `evidence/`: `cargo-test.log`, `author.log`, `native-export.json`, `import.log`, `import.json`, `stills.log`, `frames.log`, `frames.json`, and artifact-audit output. A compact durable summary with hashes is in [validation-evidence.json](validation-evidence.json).

## Corrections during validation

The first native compile exposed an incorrect direct `.flat_map()` on `sequences_spans()`, which returns a slice. Adding `.iter()` fixed E0599. The corrected source was copied into the smoke project, rebuilt, tested, authored, imported, and rendered successfully. The shipped starter source matches that tested source.

The initial skill-creator scaffold passed structural validation; it was then replaced with real MotionGfx helpers and a working starter. Syntax checks, runtime tests, source compatibility checks, actual graphics import/rendering, and local documentation-link checks complement the structural validator.

## Not claimed

- No manual File > Open/UI interaction in the Moxie editor was performed for this starter. The actual reflected project-loader path and rendering were exercised.
- No MP4 encode or video-size/cadence claim is made for the starter smoke test. Those delivery checks are documented for requested film outputs.
- Linux and Windows execution were not tested. The helper explicitly rejects Windows because the supplied Moxie absolute-source convention requires adaptation.
- Future source revisions are not guaranteed compatible by version strings or `doctor`; inspect and compile again.
- The file-audit helper does not parse RON, discover all referenced assets, or assess animation quality.
