# The .mox contract

## Verify the checkout, not a remembered API

Inspect these files under the selected Moxie root before changing the adapter:

- `crates/moxie/src/project.rs`: project envelope, component allowlist, reflection serialization, load sequence.
- `crates/moxie/src/main.rs`: editor camera and preview assumptions.
- `crates/moxie_asset/src/lib.rs` and `std_material.rs`: absolute source registration and standard-material loader.
- `vendor/motiongfx/crates/bevy_motiongfx/src/scene/backend.rs`: registered fields, operations, easing, interpolation.
- `vendor/motiongfx/crates/bevy_motiongfx/src/scene/{id,value_pool,asset}.rs`: stable IDs, typed values, compilation/staging.
- `vendor/motiongfx/examples/bevy_examples/examples/scene_demo.rs`: split world/animation example; it is not the whole Moxie project format.

The default registry inspected for this skill contains `Transform::translation`, `Transform::rotation`, and `Transform::scale`. Supported operation is `To`; easing is `Linear` or `CubicEaseInOut`. `AnimInterp::Linear` uses each type's MotionGfx interpolation implementation, including quaternion interpolation. Do not manually lerp quaternion components.

The current component allowlist also contains scene-root identity, names, visibility, hierarchy, mesh/material handles, and selected camera/light components. Inclusion in the serialized world is separate from registration as an animated field.

## Envelope

A Moxie project is a RON `Project` with:

| Field | Meaning |
| --- | --- |
| `world` | Bevy reflected `DynamicWorld`, including subjects, transforms, hierarchy, and asset-backed components |
| `scene` | `motiongfx_scene::Scene<Backend>`, containing stage seeds, typed values, and animation tree |
| `bookmarks` | Asset-folder paths; the inspected loader defaults this to empty for older files |

Do not write a lookalike RON string. Use `DynamicWorldSerializer`, official serde types, and `SerializeStruct`. The starter's `export::save` supplies the type registry while serializing the reflected world.

The animation targets `SceneUid::Entity(EntityUid)`. Ordinary Bevy entity indices can be remapped on import; they are not persistent animation addresses. Include the `SceneRoot` when extracting subjects, or child relations can refer to an entity absent from the file. Every exported child must have its necessary ancestors in the extracted world.

The starter records initial values from the unanimated world before playback, stages those values again after verification, and then writes the project. Saving the last sampled pose as an unintended initial state causes incorrect editor playback.

## Asset-backed geometry

Creating geometry with `Assets<Mesh>::add` is sufficient for a running Bevy app, but does not itself create a disk asset that a saved project can reload.

The starter writes a GLB and obtains handles through `AssetServer::load`:

```rust
let mesh = server.load::<Mesh>(format!("{path}#Mesh0/Primitive0"));
let material = server.load::<StandardMaterial>(format!("{path}#Material0/std"));
```

`path` uses Moxie's registered `abs` source, rooted at `/` on the tested platform:

```text
abs://Users/example/Documents/my-scene/assets/scene-r1.glb
```

This is a Bevy asset-source path, not an HTTP URL or an OS `file://` URL. The material suffix is Moxie's `/std` loader path; do not substitute an unrelated glTF label from memory.

Register `moxie_asset::register_absolute_source` **before** AssetPlugin/DefaultPlugins construct the asset sources. The renderer also installs `MoxieAssetPlugin`. Keep unapproved paths denied. Wait for `is_loaded_with_dependencies` on every referenced mesh and material before validation/capture.

These paths are machine-local and absolute. Preserve the project directory, or regenerate/relink after moving it. They are not automatically made portable by keeping a GLB beside the `.mox`. For distribution, agree on a relinking or portable-source strategy supported by the receiving editor.

## Exporting native Rust authoring

The starter adapter records each native action ID with its subject, field, destination, and easing. It then reads the compiled track's sequences and clips for start times and durations. It writes:

1. A stage subject and field seed per animated field.
2. Typed values inserted through `ValueColumn` into `ValuePool`.
3. `ActionCmd` nodes addressed by `EntityUid` and `field_ref(path!(...))`.
4. Per-field chained blocks with delays from compiled clip boundaries.
5. A top-level parallel block and duration-preserving draft.

The recorded-action count must equal the exported clip count. Fail on conflicting/dropped actions rather than silently delivering a partial scene.

A relative closure may have a known destination in this narrow authoring context. Record that destination only when it is actually correct, then prove it with native/export comparison. Do not claim arbitrary closures, custom easing functions, controller calls, or mutable runtime logic are serializable.

The resulting editor tree is organized by field tracks. Original high-level Rust combinator structure remains in source; this adapter does not reconstruct an identical high-level authoring tree.

## Loading proof

The preview uses the real pattern from Moxie's loader:

1. Deserialize `world` using `WorldDeserializer` with `AppTypeRegistry` and the asset server.
2. `write_to_world_with` to restore reflected entities and relationships.
3. Compile `MotionGfxScene` through the default scene registry and manager.
4. Stage initial values, load pending timelines, and sample them.
5. Load all asset dependencies and render the restored project.

Native/export parity alone does not exercise these reflected entity and asset-loading steps. A text search for `world` and `scene` proves even less. The Node/Bun `check` command is deliberately labeled **files-only**.
