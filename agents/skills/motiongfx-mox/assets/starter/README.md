# MotionGfx .mox starter

A six-second scene with three blue cubes: sequential lifts (`ord_chain`), simultaneous turns (`ord_all`), and overlapping pulses (`ord_flow`). Edit `src/main.rs` to author your own choreography. This is a working technical starting point, not a finished promotional design.

## Generate and validate

Run from this project directory:

```sh
cargo fmt
cargo test --bin author
cargo run --bin author
cargo run --bin preview -- "$PWD" --check
cargo run --bin preview -- "$PWD" --stills
```

Open `scene.mox` in Moxie. Keep `assets/scene-r1.glb` with the project. `preview/stills/` contains renders of the saved project, not a different procedural approximation. Review those images before rendering a complete sequence.

```sh
cargo run --bin preview -- "$PWD" --stills '0,0.5,1.5,3.5,4.5,5.9'
cargo run --bin preview -- "$PWD" --frames
```

Frame size, fps, duration, and count come from `manifest.json`, written by the author. For this unmodified starter, an optional FFmpeg encode is:

```sh
ffmpeg -n -framerate 30 -i preview/frames/%04d.png -frames:v 180 -c:v libx264 -pix_fmt yuv420p -movflags +faststart preview.mp4
```

Adapt fps and count to the manifest after changing timing. FFmpeg is not installed or invoked by the skill. The renderer needs a working graphics backend even without a window. Linux may need platform development libraries to build Bevy; macOS needs the normal Rust/linker toolchain.

## Files and limits

- `src/main.rs`: real native MotionGfx authoring and native/export parity validation.
- `src/export.rs`: narrow transform exporter using compiled clip timing; reflected `.mox` serialization.
- `src/geometry.rs`: small shared GLB, including shaded blue cubes and a neutral backdrop.
- `src/preview.rs`: actual `.mox` loader, dependency checks, finite poses, backward seek, offscreen capture.
- `setup.json`: dependency roots and revisions reported at initialization.
- `evidence/native-export.json`: serialized-animation equivalence to the native timeline.
- `evidence/import.json`: actual reflected project import and sampling evidence.
- `evidence/compiled-timing.json`: compiled action starts, durations, fields, and easing.

The export supports Transform translation/rotation/scale, To operations, and the default registry's linear/cubic-in-out easing. Rust closures, arbitrary components, custom shaders, and material-property actions are not made serializable by this adapter.

Asset handles use Moxie's `abs://` source and `#Material0/std` loader path. If the folder moves, rerun authoring to update absolute paths. Bump `geometry::BUNDLE` when revising asset contents to avoid stale editor caches. Save a revision before rerunning the author: it overwrites generated assets, `scene.mox`, manifest, and evidence.

Moxie and its vendored MotionGfx dependencies are read-only. Use ordinary Cargo and keep target output in this project's `target/`; do not patch dependency sources or manually link cached build products. Pin the generated Cargo.lock once tested. Recheck source APIs when upgrading dependency revisions.
