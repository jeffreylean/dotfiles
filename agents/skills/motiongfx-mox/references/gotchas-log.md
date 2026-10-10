# Gotchas history

## MotionGfx/Moxie film workflow

These observations motivated the skill. They are not guarantees that every project will fail in the same way.

### Separate formations read as a cut, not a dissolve

- Symptom: visible voxels shrink away and a tiny-dot galaxy appears, despite smooth numeric transforms.
- Cause: the foreground voxels and revealed galaxy are different visual material with unrelated origins.
- Fix: seed grains inside the full-size source voxels, expose them during erosion, and carry those same grain packets into the destination.
- Guardrail: top-level continuity step and Gotchas; sample and inspect the overlap, not only endpoint shapes.

### Quiet pullback tails play twice under rewind

- Symptom: several seconds appear stalled before the subject changes again.
- Cause: motion flattens near the forward endpoint and the reverse immediately repeats the quiet segment.
- Fix: retain deliberate orbital/secondary motion or revise timing; test both sides of reversal.
- Guardrail: phase-specific motion checks plus actual visual review.

### Asset cleanup crashed after apparently successful rendering

- Symptom: all requested stills were written, then the IO task-pool thread overflowed its stack during cleanup.
- Context: a prototype used hundreds of distinct dust-packet meshes/materials inside one GLB.
- Fix in that project: reuse sixteen grain meshes across independently animated packets. Later full runs exited successfully without stack overrides or dependency changes.
- Guardrail: prefer shared assets and inspect final process exit status. This is an observed mitigation, not a universal Bevy asset-count limit.

### A shrinking replacement logo did not match particle paths

- Symptom: a smaller wave logo grew inside a larger particle outline.
- Cause: two different scale trajectories during the handoff.
- Fix: reveal strokes at the exact positions traced by the particles before changing the assembled logo's scale.
- Guardrail: compare world-space geometry through the overlap, not just final branding.

### Floating-point video time requests resembled duplicate frames

- Symptom: some adjacent comparison samples had identical pixel statistics, although moving raw PNGs were distinct.
- Investigation: raw-frame hashing and sequential decoded-frame cadence distinguished video content from image-generator sampling.
- Fix: use rational frame-index timestamps for exact AVFoundation frame extraction.
- Guardrail: separate timestamp, content-cadence, and visual-motion evidence; do not blame the animation from one probe.

### Fine grains suffered in the sharing encode

- Symptom: the high-quality frame showed dust clearly while a low-bitrate copy weakened the handoff.
- Fix: adjust readable particle size/contrast and validate the small encode; provide a short higher-bitrate transition excerpt when useful.
- Guardrail: actual byte-limit checks and a separate compressed-preview inspection.

## Skill iteration

- Baseline: the skill-creator scaffold passed its structural validator, but its placeholder helper did not provide MotionGfx functionality.
- Replacement: added a real preflight/scaffold/file-audit CLI, a standalone Rust author/GLB/export/renderer example, and explicit scope limits.
- Safety: added no-overwrite, dependency-root containment, symlink-ancestor containment, escaped-asset rejection, manifest consistency, and malformed-GLB checks.
- Portability: checkout paths are arguments/configuration, not hardcoded user directories. The starter does not depend on the film project used to learn the workflow.
- API correction found by compilation: `Track::sequences_spans()` returns a slice in the tested checkout. The first timing test incorrectly called `.flat_map()` directly. Adding `.iter()` fixed Rust E0599; the corrected starter was rebuilt, unit-tested, authored, imported, and rendered.
- Visual review: the starter's light unlit background material appears neutral gray under the default camera's tone mapping. Document it as neutral rather than promising a white render from material values alone.
- Verification principle: helper tests and a Markdown validator are not substitutes for compiling and importing a generated `.mox`; see validation.md for actual evidence.

## Add future observations

Record the situation, observed failure, evidence, fix, and whether it should become a top-level Gotchas bullet. Preserve reproducible failures, remove duplicated advice, and do not turn one project's art direction into a general rule.
