---
name: motiongfx-mox
description: Use when creating motion graphics with MotionGfx and exporting editable .mox projects for Moxie, authoring Rust animation timelines, packaging scene assets, or checking native/export parity and rendered transitions.
metadata:
  category: workflow
---

# MotionGfx to Moxie

Create real Rust-authored motion graphics and save an editable Moxie project. Read [the format contract](references/mox-format.md) and [authoring guidance](references/authoring.md) before implementation. Resolve all bundled paths relative to this skill directory.

## When to Use

- A user asks for an animation, motion-graphics scene, explainer, logo motion, or promotional film using MotionGfx.
- A user needs an editable `.mox` for Moxie, not just an MP4 or a renamed RON animation file.
- A user needs asset packaging, time-control demonstrations, export verification, or smoother transitions in such a project.

Do not apply this exporter to unrelated motion libraries. Do not interpret this skill as permission to modify the editor or its dependencies, delegate work, or publish files.

## Setup

- Locate the Moxie checkout and read its applicable project instructions. Prefer its **vendored MotionGfx crates**, not a potentially incompatible sibling checkout or a published crate with a similar version.
- Use a new, user-owned output directory outside source checkouts. Keep sources, assets, evidence, previews, and ordinary Cargo build output there. Preserve prior revisions before regeneration.
- Helpers require Node 20+ or Bun; no npm dependencies. Authoring requires Rust/Cargo; a first Bevy build can take 10+ minutes and several GB. Rendering requires a working Bevy graphics backend, even with no window. Optional video encoding uses an already-installed FFmpeg or a platform encoder.
- This starter targets the inspected **Bevy 0.19 / MotionGfx 0.3.1-era Moxie APIs**. `doctor` checks source structure, not binary compatibility. On drift, inspect current source and adapt explicitly; never patch the dependencies to make the template fit.

## Commands

Set `SKILL` to this skill directory, `MOXIE` to the dependency checkout, and `OUT` to a **new** project directory. Quote all paths.

```sh
node "$SKILL/scripts/motiongfx-mox-run.js" doctor --moxie "$MOXIE"
node "$SKILL/scripts/motiongfx-mox-run.js" init --moxie "$MOXIE" --out "$OUT"
cd "$OUT"
cargo fmt
cargo test --bin author
cargo run --bin author
cargo run --bin preview -- "$PWD" --check
cargo run --bin preview -- "$PWD" --stills
node "$SKILL/scripts/motiongfx-mox-run.js" check --project "$PWD"
```

The same helper supports `bun "$SKILL/scripts/motiongfx-mox-run.js" ...` and direct execution as `"$SKILL/scripts/motiongfx-mox-run.js" ...`. `--config` accepts the shape in [config.example.json](config.example.json); relative paths resolve against that config file. `MOXIE_ROOT` is an optional checkout fallback.

`init` only scaffolds; it does not build. It refuses existing output paths, source-checkout/skill-directory writes, and `#` in output paths because Bevy uses that character for asset labels. `check` only audits files, containment, manifest consistency, GLB headers, and hashes. Neither proves a valid rendered scene. The generated Rust author and preview perform the actual parity and import checks.

## Workflow

1. **Define the shot.** Confirm only missing essentials: intended message, composition, duration/aspect ratio, editability, destination, and delivery limits. Do not reuse a previous film's palette, particle count, captions, or timings as universal requirements.
2. **Bootstrap and inspect.** Run `doctor` and `init`, then read the generated source. The starter is a six-second, three-cube technical example, not the requested creative work. Record dependency revisions and retain Cargo.lock after the first successful build.
3. **Build editable subjects.** Put exported entities under `SceneRoot`; give addressed subjects `EntityUid`. Use named parent/child groups and shared asset-backed meshes/materials. Confirm editor support before adding component types.
4. **Author through MotionGfx.** Use `act`, `ord_chain`, `ord_all`, and `ord_flow`. Capture the same destination, duration, field, and easing in the adapter. Read actual compiled clips for schedule data; never duplicate timing by hand. The export rejects dropped/conflicting actions.
5. **Preserve the visual material.** For a dissolve or morph, define where each visible element comes from and where it goes. Overlap solid erosion with particle emission from those same volumes, then carry the same particles to the new shape. Do not hide one formation and reveal an unrelated one elsewhere. Test short transitions before a full render.
6. **Export and verify.** Serialize both the reflected world and the typed scene. Compare native versus serialized animation at boundaries, dense samples, and backward seeks. For an advance/rewind demonstration, call the real APIs on a source timeline and validate mirrored states; label any baked result honestly.
7. **Review the saved project visually.** Load the actual `.mox`, wait for all dependencies, render selected stills and a short transition clip. Inspect readability, continuity, frame edges, visual density, and the ending. Numeric transform parity is not an aesthetic review.
8. **Render and deliver.** Only then render the complete frame range and encode. Derive fps/count/duration from the manifest. Decode the result, check timestamps/size, record hashes, and link final artifacts. Read [rendering and checks](references/rendering.md) for the validation ladder.

## Output Contract

- Editable `.mox` **plus all referenced assets**, with opening instructions and absolute-path relocation caveats.
- Rust authoring source, Cargo.toml/Cargo.lock, dependency provenance, duration/fps/resolution manifest, and reproducible commands.
- Evidence for native/export parity and actual saved-project import; report separately which render, video, or UI checks were performed.
- Reviewed stills and requested previews; a focused excerpt for a disputed transition. Honor explicit byte limits on the actual encoded file.
- A concise handoff using [assets/output-template.md](assets/output-template.md). Disclose baked time control, mesh packet granularity, rasterized text, or other editability limits when relevant.

## Gotchas

- A `.mox` is **world + scene + bookmarks**, not an animation-only `.mgx.ron` or a scene composition with a changed extension. Preserve entity IDs and hierarchy.
- The inspected default scene registry supports Transform translation/rotation/scale, `To`, and linear/cubic-in-out easing. Arbitrary material fields, custom components, shaders, closures, or morph weights do not become editor-supported merely because native Rust can animate them.
- In-memory `Assets::add` handles alone do not package geometry. Load exported asset paths; register `abs` before AssetPlugin, use Moxie's material loader suffix, and keep `UnapprovedPathMode::Deny` rather than weakening security to hide path errors.
- Cubic-easing every baked sample creates repeated slowdowns. Preserve the source interpolation, avoid overlapping writes to one field, and normalize quaternions.
- A shrinking cube followed by a separately revealed galaxy is not a particle dissolve. Preserve origins, trajectories, overlap, and readable particle density; inspect the encoded handoff too.
- A byte-limit encode can erase fine particles. Verify the sharing version separately from the high-quality master; test actual bytes, dimensions, frame count, and decoding.
- Thousands of unique GLB subassets can create load/cleanup pressure. Reuse a small set of meshes/materials. A render that writes frames and then crashes is still a failed run.
- Asset paths here are absolute. Moving a project requires reauthoring/relinking; bump bundle names when changing assets to avoid stale caches. Regeneration overwrites generated artifacts, so preserve revisions first.
- Do not manually link cached `.rlib`s, modify source checkouts, or introduce ownership/interior-mutability wrappers to bypass a build issue. Use ordinary Cargo and follow the repository's confirmation rules.
- A helper file audit, passing unit tests, or mathematically exact reversal does not prove a smooth or attractive film. Do not report checks that were not actually run.

## File Layout

- `assets/starter/`: runnable author, transform exporter, shared GLB generator, and actual-project renderer.
- `scripts/`: dependency-free Node/Bun preflight, safe scaffold, and file-audit helper.
- `tests/`: helper guardrail tests, independent of a real checkout or graphics device.
- `references/`: API contract, authoring, rendering, failure history, and validation evidence.

## Iteration Log

The first version distills a tested MotionGfx/Moxie film workflow into a general starter. See [validation](references/validation.md) for current evidence and [gotchas history](references/gotchas-log.md) for the failures that shaped the guardrails. Update those files when new failures occur; keep project-specific choreography out of this skill.
