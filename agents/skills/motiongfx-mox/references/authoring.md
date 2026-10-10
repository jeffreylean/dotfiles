# Authoring motion that exports correctly

## Start with an editable model

Separate the visual vocabulary from its choreography:

- Asset geometry and materials: shared primitives, embedded images, small reusable grain patterns.
- Scene structure: named subjects and parent/child groups with `EntityUid` addresses.
- Choreography: native MotionGfx actions and composition.
- Export: supported typed field destinations and actual compiled timing.
- Delivery: an actual-project renderer, frame/video checks, and a handoff manifest.

Parent transforms simplify reusable assemblies, but compare both parent and child transforms when proving reversal. Local-pose equivalence is only enough when the hierarchy is unchanged. Define one coordinate system and camera framing before authoring; do not mix world units with assumed screen pixels. The starter uses world units and the inspected editor's default camera pose `(0, 2, 14)` looking at the origin. A production screen-space layout should calibrate its own frame explicitly.

Do not introduce extra ownership wrappers or synchronization to organize a small single-threaded authoring program. Plain structs, vectors, and borrowed worlds suffice for the bundled starter. Follow checkout-specific approval rules for memory-management types.

## Native composition

```rust
let action = builder
    .act(entity, path!(<Transform>::translation), |position| {
        *position + Vec3::Y * 1.4
    })
    .with_ease(ease::cubic::ease_in_out);
```

The starter passes this builder to `Export::capture`, which calls `.play(duration)` and records the same field destination. `capture_linear` explicitly applies linear easing and records it. Do not use the cubic capture helper for an action with a different easing function.

| Composition | Effect | Starter example |
| --- | --- | --- |
| `ord_chain()` | Start the next fragment after the previous completes | Three lifts at 0, 1, and 2 seconds |
| `ord_all()` | Start fragments together | All turns begin at 3 seconds |
| `ord_flow(offset)` | Stagger overlapping fragment starts | Pulses begin at 4, 4.2, and 4.4 seconds |

These are compiled schedule facts, not text labels placed over unrelated motion. The starter tests those clip starts. Its final hold is intentional; do not add holds between every feature automatically.

## Continuous transitions

For every morph, answer:

1. What existing on-screen material becomes the next shape?
2. Where does each particle or fragment originate?
3. When do its old and new representations overlap?
4. Is its trajectory continuous, and is its size readable throughout?
5. Does the transition remain understandable in the compressed sharing copy?

For a voxel-to-particle dissolve, seed particle groups inside each voxel. While its solid body erodes, expose and release those groups from the same volume. Guide them continuously toward the destination. Do not shrink a few isolated cubes to almost nothing and independently reveal a finished point cloud. More particles or stronger easing will not repair an identity discontinuity.

Small packets of grains can share a path to control scene size; disclose that granularity rather than claiming individual physics. Reuse mesh/material handles across packets. Large numbers of unique glTF subassets can be much more costly than the same visible particle count using a few shared patterns.

Budget visible motion by phase. An exponential pullback that flattens near its endpoint produces a quiet stretch; reversing it plays that stretch twice. Keep an intentional motion channel active, shorten the tail, or revise the choreography. Test before, at, and after each handoff, not only the most attractive endpoint.

## Real advance and rewind

If the film claims to demonstrate time control, call the actual APIs, rather than independently drawing a forward path and a similar-looking return:

```rust
let dt = Duration::from_millis(100);
timeline.advance_time(dt);
timeline.queue_actions();
timeline.sample_queued_actions(&registry, BevyWorld::from_mut(&mut world));
// Record current time and poses here.

timeline.rewind_time(dt);
timeline.queue_actions();
timeline.sample_queued_actions(&registry, BevyWorld::from_mut(&mut world));
```

Keep the source subject on its own timeline. Bake the recorded poses into the film so captions and other shots do not rewind. Verify mirrored source time, transforms, endpoint clamping, and dense subframe parity with the native keyframed source. Sampling a keyframed source does not prove fidelity to an unrelated analytic curve or physical simulation.

The `.mox` stores the sampled clips, **not** the imperative controller calls. State that boundary clearly. The starter's unit test demonstrates real forward/reverse sampling; production time-control choreography still needs its own bake and equivalence tests.

Linear sampled translations/scales should remain linear. Applying cubic-in-out at every small sample causes a sequence of speed bumps. Preserve quaternion interpolation and normalized rotations. If omitting unchanged fields, retain elapsed time and validate the gaps and reversed seeks.

## Scope and visual defaults

The three blue cubes are a technical smoke scene. Replace them with the user's intended composition. A past film's white background, particular slogan, galaxy metaphor, or 42-second duration are not default product requirements.

Choose editable geometry where it matters. Rasterized text is acceptable only with explicit disclosure: the texture can move, but the editor cannot necessarily edit its wording. Avoid opaque text-reveal masks that accidentally cover the background or hide a logo during a handoff.
