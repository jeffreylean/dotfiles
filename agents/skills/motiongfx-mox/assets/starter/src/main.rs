mod export;
mod geometry;

use std::path::Path;
use std::time::Duration;

use bevy::asset::UnapprovedPathMode;
use bevy::prelude::*;
use bevy_motiongfx::BevyMotionGfxPlugin;
use bevy_motiongfx::prelude::*;
use bevy_motiongfx::scene::backend::{Backend, default_scene_registry};
use bevy_motiongfx::scene::id::EntityUid;
use bevy_motiongfx::world::BevyWorld;
use motiongfx_scene::prelude::Scene;

use export::{Export, Field, Value};

const PROJECT: &str = "scene.mox";

fn seconds(value: f64) -> Duration {
    Duration::from_secs_f64(value)
}

fn sample(timeline: &mut BevyTimeline, registry: &Registry, world: &mut World, time: f64) {
    timeline.set_target_time(seconds(time));
    timeline.queue_actions();
    timeline.sample_queued_actions(registry, BevyWorld::from_mut(world));
}

fn poses(world: &mut World) -> Vec<(Entity, Transform)> {
    world
        .query::<(Entity, &Transform)>()
        .iter(world)
        .map(|(entity, pose)| (entity, *pose))
        .collect()
}

fn verify(
    world: &mut World,
    native: &mut BevyTimeline,
    registry: &Registry,
    scene: &Scene<Backend>,
    duration: f64,
) -> serde_json::Value {
    let serialized = ron::ser::to_string(scene).unwrap();
    let imported = ron::from_str::<Scene<Backend>>(&serialized).unwrap();
    let times = (0..=(duration * 60.0).round() as usize)
        .map(|i| i as f64 / 60.0)
        .chain([duration, 1.0, 4.5, 0.0])
        .collect::<Vec<_>>();
    native.bake_actions(registry, BevyWorld::from_ref(world));
    let mut expected = Vec::new();
    for time in &times {
        sample(native, registry, world, *time);
        expected.push(poses(world));
    }
    let scene_registry = default_scene_registry();
    let mut imported_registry = Registry::new();
    let mut timeline = imported
        .compile(&scene_registry, &mut imported_registry)
        .unwrap();
    imported
        .stage(&scene_registry, BevyWorld::from_mut(world))
        .unwrap();
    timeline.bake_actions(&imported_registry, BevyWorld::from_ref(world));
    let mut compared = 0;
    for (time, expected) in times.iter().zip(expected) {
        sample(&mut timeline, &imported_registry, world, *time);
        for ((entity, a), (other, b)) in expected.into_iter().zip(poses(world)) {
            assert_eq!(entity, other);
            assert!(b.translation.is_finite() && b.scale.is_finite() && b.rotation.is_finite());
            assert!((b.rotation.length() - 1.0).abs() < 0.002);
            assert!(
                a.translation.abs_diff_eq(b.translation, 0.002),
                "translation at {time}s"
            );
            assert!(a.scale.abs_diff_eq(b.scale, 0.002), "scale at {time}s");
            assert!(
                a.rotation.abs_diff_eq(b.rotation, 0.002),
                "rotation at {time}s"
            );
            compared += 1;
        }
    }
    imported
        .stage(&scene_registry, BevyWorld::from_mut(world))
        .unwrap();
    serde_json::json!({"status": "pass", "sample_times": times.len(), "transform_comparisons": compared,
        "scope": "native timeline versus serialized animation; includes backward seeks; not a visual-quality test"})
}

fn author(
    world: &World,
    cubes: &[Entity],
    registry: &mut Registry,
    export: &mut Export,
) -> BevyTimeline {
    let mut builder = registry.create_builder();
    let mut chain = Vec::new();
    let mut all = Vec::new();
    let mut flow = Vec::new();
    for entity in cubes.iter().copied() {
        let initial = *world.get::<Transform>(entity).unwrap();
        let top = initial.translation + Vec3::Y * 1.4;
        let rise = builder
            .act(entity, path!(<Transform>::translation), |position| {
                *position + Vec3::Y * 1.4
            })
            .with_ease(ease::cubic::ease_in_out);
        let rise = export.capture(
            rise,
            entity,
            Field::Translation,
            Value::Vector(top),
            0.5,
            "CHAIN / rise",
        );
        let settle = builder
            .act(entity, path!(<Transform>::translation), move |_| {
                initial.translation
            })
            .with_ease(ease::cubic::ease_in_out);
        let settle = export.capture(
            settle,
            entity,
            Field::Translation,
            Value::Vector(initial.translation),
            0.5,
            "CHAIN / settle",
        );
        chain.push([rise, settle].ord_chain());
        let rotation = initial.rotation * Quat::from_rotation_y(std::f32::consts::FRAC_PI_2);
        let turn = builder
            .act(entity, path!(<Transform>::rotation), move |_| rotation)
            .with_ease(ease::cubic::ease_in_out);
        all.push(export.capture(
            turn,
            entity,
            Field::Rotation,
            Value::Rotation(rotation),
            1.0,
            "ALL / turn",
        ));
        let large = initial.scale * 1.35;
        let expand = builder.act(entity, path!(<Transform>::scale), move |_| large);
        let expand = export.capture_linear(
            expand,
            entity,
            Field::Scale,
            Value::Vector(large),
            0.4,
            "FLOW / expand",
        );
        let shrink = builder.act(entity, path!(<Transform>::scale), move |_| initial.scale);
        let shrink = export.capture_linear(
            shrink,
            entity,
            Field::Scale,
            Value::Vector(initial.scale),
            0.4,
            "FLOW / shrink",
        );
        flow.push([expand, shrink].ord_chain());
    }
    builder.compile(
        [
            chain.ord_chain(),
            all.ord_all(),
            flow.ord_flow(seconds(0.2)),
            TrackFragment::silent(seconds(0.8)),
        ]
        .ord_chain()
        .compile(),
    )
}

fn main() {
    let root = std::env::args()
        .nth(1)
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap())
        .canonicalize()
        .unwrap();
    for directory in ["assets", "evidence", "preview"] {
        std::fs::create_dir_all(root.join(directory)).unwrap();
    }
    std::fs::write(
        root.join("assets").join(geometry::BUNDLE),
        geometry::cube_glb(),
    )
    .unwrap();
    let mut app = App::new();
    app.add_plugins((
        MinimalPlugins,
        moxie_asset::register_absolute_source,
        AssetPlugin {
            file_path: root.join("assets").to_string_lossy().into_owned(),
            unapproved_path_mode: UnapprovedPathMode::Deny,
            ..default()
        },
        BevyMotionGfxPlugin,
    ));
    app.init_asset::<Mesh>().init_asset::<StandardMaterial>();
    app.register_type::<moxie::SceneRoot>()
        .register_type::<Transform>()
        .register_type::<Name>()
        .register_type::<Visibility>()
        .register_type::<Children>()
        .register_type::<ChildOf>()
        .register_type::<Mesh3d>()
        .register_type::<MeshMaterial3d<StandardMaterial>>();
    let scene_root = app
        .world_mut()
        .spawn((
            moxie::SceneRoot,
            Name::new("MotionGfx starter"),
            Transform::default(),
            Visibility::Inherited,
        ))
        .id();
    let path = format!(
        "abs://{}",
        root.join("assets")
            .join(geometry::BUNDLE)
            .to_string_lossy()
            .trim_start_matches('/')
    );
    let server = app.world().resource::<AssetServer>();
    let mesh = server.load::<Mesh>(format!("{path}#Mesh0/Primitive0"));
    let material = server.load::<StandardMaterial>(format!("{path}#Material0/std"));
    let paper = server.load::<Mesh>(format!("{path}#Mesh1/Primitive0"));
    let white = server.load::<StandardMaterial>(format!("{path}#Material1/std"));
    app.world_mut().spawn((
        EntityUid::new(),
        Name::new("Paper"),
        ChildOf(scene_root),
        Visibility::Inherited,
        Transform::from_xyz(0.0, 0.0, -3.0).with_scale(Vec3::new(100.0, 100.0, 0.1)),
        Mesh3d(paper),
        MeshMaterial3d(white),
    ));
    let cubes = (0..3)
        .map(|index| {
            app.world_mut()
                .spawn((
                    EntityUid::new(),
                    Name::new(format!("Cube {index}")),
                    ChildOf(scene_root),
                    Visibility::Inherited,
                    Mesh3d(mesh.clone()),
                    MeshMaterial3d(material.clone()),
                    Transform::from_xyz((index as f32 - 1.0) * 3.0, 0.0, 0.0)
                        .with_rotation(Quat::from_euler(EulerRot::XYZ, 0.3, 0.6, 0.0))
                        .with_scale(Vec3::splat(1.3)),
                ))
                .id()
        })
        .collect::<Vec<_>>();
    let mut registry = Registry::new();
    let mut export = Export::default();
    let mut timeline = author(app.world(), &cubes, &mut registry, &mut export);
    let duration = timeline.tracks()[0].duration().as_secs_f64();
    let scene = export.scene(&timeline, app.world(), &root);
    let report = verify(app.world_mut(), &mut timeline, &registry, &scene, duration);
    write_json(&root.join("evidence/native-export.json"), &report);
    export::save(app.world_mut(), &scene, &root);
    write_json(
        &root.join("manifest.json"),
        &serde_json::json!({
            "schema": 1, "project": PROJECT, "asset_files": [format!("assets/{}", geometry::BUNDLE)],
            "duration_seconds": duration, "fps": 30, "width": 1280, "height": 720,
            "frame_count": (duration * 30.0).ceil() as usize, "actions": export.records.len(),
            "authoring": "native MotionGfx builder, compiled transform-track export", "audio": "silent"
        }),
    );
    println!("{}\n{}", root.join(PROJECT).display(), report);
}

fn write_json(path: &Path, value: &serde_json::Value) {
    std::fs::write(path, serde_json::to_vec_pretty(value).unwrap()).unwrap();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scene_ordering_uses_native_compiled_timing() {
        let mut world = World::new();
        let cubes = (0..3)
            .map(|index| {
                world
                    .spawn((
                        EntityUid::new(),
                        Name::new(format!("Cube {index}")),
                        Transform::from_xyz(index as f32 * 3.0, 0.0, 0.0),
                    ))
                    .id()
            })
            .collect::<Vec<_>>();
        let mut registry = Registry::new();
        let mut export = Export::default();
        let timeline = author(&world, &cubes, &mut registry, &mut export);
        assert_eq!(timeline.tracks()[0].duration(), seconds(6.0));
        assert_eq!(export.records.len(), 15);
        let clips = timeline.tracks()[0]
            .sequences_spans()
            .iter()
            .flat_map(|(_, span)| timeline.tracks()[0].clips(*span))
            .collect::<Vec<_>>();
        for (label, expected) in [
            ("CHAIN / rise", vec![0.0, 1.0, 2.0]),
            ("ALL / turn", vec![3.0; 3]),
            ("FLOW / expand", vec![4.0, 4.2, 4.4]),
        ] {
            let mut starts = clips
                .iter()
                .filter(|clip| export.records[&clip.id].label == label)
                .map(|clip| clip.start.as_secs_f64())
                .collect::<Vec<_>>();
            starts.sort_by(f64::total_cmp);
            assert_eq!(starts, expected);
        }
    }

    #[test]
    fn native_time_controls_return_to_the_initial_pose() {
        let mut world = World::new();
        let entity = world.spawn(Transform::default()).id();
        let mut registry = Registry::new();
        let mut builder = registry.create_builder::<BevyWorld>();
        let action = builder
            .act(entity, path!(<Transform>::translation), |_| Vec3::X * 3.0)
            .play(seconds(1.0));
        let mut timeline = builder.compile(action.compile());
        timeline.bake_actions(&registry, BevyWorld::from_ref(&world));
        let mut forward = Vec::new();
        for _ in 0..10 {
            timeline.advance_time(seconds(0.1));
            timeline.queue_actions();
            timeline.sample_queued_actions(&registry, BevyWorld::from_mut(&mut world));
            forward.push(world.get::<Transform>(entity).unwrap().translation);
        }
        for step in (0..10).rev() {
            timeline.rewind_time(seconds(0.1));
            timeline.queue_actions();
            timeline.sample_queued_actions(&registry, BevyWorld::from_mut(&mut world));
            let expected = if step == 0 {
                Vec3::ZERO
            } else {
                forward[step - 1]
            };
            assert!(
                world
                    .get::<Transform>(entity)
                    .unwrap()
                    .translation
                    .abs_diff_eq(expected, 0.0001)
            );
        }
        assert_eq!(timeline.curr_time(), Duration::ZERO);
    }

    #[test]
    fn generated_asset_has_a_consistent_glb_header() {
        let bytes = geometry::cube_glb();
        assert_eq!(&bytes[..4], b"glTF");
        assert_eq!(u32::from_le_bytes(bytes[4..8].try_into().unwrap()), 2);
        assert_eq!(
            u32::from_le_bytes(bytes[8..12].try_into().unwrap()) as usize,
            bytes.len()
        );
        assert_eq!(bytes.len() % 4, 0);
    }
}
