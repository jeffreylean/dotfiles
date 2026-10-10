//! Loads and renders the saved .mox project.
use std::path::PathBuf;
use std::time::Duration;

use bevy::app::ScheduleRunnerPlugin;
use bevy::asset::{LoadFromPath, UnapprovedPathMode};
use bevy::camera::RenderTarget;
use bevy::prelude::*;
use bevy::reflect::TypeRegistry;
use bevy::render::render_resource::{TextureFormat, TextureUsages};
use bevy::render::view::screenshot::{Screenshot, ScreenshotCaptured};
use bevy::window::ExitCondition;
use bevy::world_serialization::DynamicWorld;
use bevy::world_serialization::serde::WorldDeserializer;
use bevy_motiongfx::BevyMotionGfxPlugin;
use bevy_motiongfx::prelude::{MotionGfxManager, TimelineId};
use bevy_motiongfx::scene::asset::MotionGfxScene;
use bevy_motiongfx::scene::backend::{Backend, default_scene_registry};
use motiongfx_scene::scene::Scene;
use serde::Deserializer;
use serde::de::{DeserializeSeed, MapAccess, Visitor};

struct Project {
    world: DynamicWorld,
    scene: Scene<Backend>,
}
struct ProjectSeed<'a> {
    registry: &'a TypeRegistry,
    assets: &'a mut dyn LoadFromPath,
}

impl<'de> DeserializeSeed<'de> for ProjectSeed<'_> {
    type Value = Project;
    fn deserialize<D: Deserializer<'de>>(self, d: D) -> Result<Project, D::Error> {
        d.deserialize_struct("Project", &["world", "scene", "bookmarks"], self)
    }
}

impl<'de> Visitor<'de> for ProjectSeed<'_> {
    type Value = Project;
    fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
        formatter.write_str("a Moxie project")
    }
    fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Project, A::Error> {
        let mut world = None;
        let mut scene = None;
        while let Some(key) = map.next_key::<String>()? {
            match key.as_str() {
                "world" => {
                    world = Some(map.next_value_seed(WorldDeserializer {
                        type_registry: self.registry,
                        load_from_path: self.assets,
                    })?)
                }
                "scene" => scene = Some(map.next_value()?),
                _ => {
                    map.next_value::<serde::de::IgnoredAny>()?;
                }
            }
        }
        Ok(Project {
            world: world.ok_or_else(|| serde::de::Error::missing_field("world"))?,
            scene: scene.ok_or_else(|| serde::de::Error::missing_field("scene"))?,
        })
    }
}

#[derive(Resource)]
struct Film {
    root: PathBuf,
    mode: String,
    project: String,
    duration: f64,
    fps: u32,
    width: u32,
    height: u32,
    times: Vec<f64>,
    timeline: Option<TimelineId>,
    target: Option<Handle<Image>>,
    index: usize,
    warmup: usize,
    settle: usize,
    waiting: bool,
    checked: bool,
}

fn main() {
    let args = std::env::args().collect::<Vec<_>>();
    let root = PathBuf::from(
        args.get(1)
            .expect("usage: preview ROOT [--check|--stills|--frames] [times|start:end]"),
    )
    .canonicalize()
    .unwrap();
    let mode = args.get(2).cloned().unwrap_or("--stills".into());
    assert!(
        ["--check", "--stills", "--frames"].contains(&mode.as_str()),
        "unknown preview mode"
    );
    let manifest = serde_json::from_slice::<serde_json::Value>(
        &std::fs::read(root.join("manifest.json")).unwrap(),
    )
    .unwrap();
    let duration = manifest["duration_seconds"].as_f64().unwrap();
    let fps = manifest["fps"].as_u64().unwrap() as u32;
    let width = manifest["width"].as_u64().unwrap() as u32;
    let height = manifest["height"].as_u64().unwrap() as u32;
    let count = manifest["frame_count"].as_u64().unwrap() as usize;
    assert!(duration > 0.0 && fps > 0 && width > 0 && height > 0);
    assert_eq!(count, (duration * fps as f64).ceil() as usize);
    let project = manifest["project"].as_str().unwrap().to_owned();
    assert_eq!(
        project, "scene.mox",
        "update the loader deliberately if renaming the project"
    );
    let times = if mode == "--frames" {
        let range = args
            .get(3)
            .map(|s| {
                s.split(':')
                    .map(|n| n.parse::<usize>().unwrap())
                    .collect::<Vec<_>>()
            })
            .unwrap_or(vec![0, count]);
        assert!(range.len() == 2 && range[0] < range[1] && range[1] <= count);
        (range[0]..range[1])
            .map(|i| i as f64 / fps as f64)
            .collect::<Vec<_>>()
    } else if let Some(times) = args.get(3) {
        times
            .split(',')
            .map(|time| time.parse::<f64>().unwrap())
            .collect::<Vec<_>>()
    } else {
        [0.0, 0.1, 0.3, 0.55, 0.75, 0.95]
            .map(|ratio| duration * ratio)
            .to_vec()
    };
    assert!(
        times
            .iter()
            .all(|time| time.is_finite() && *time >= 0.0 && *time <= duration)
    );
    for directory in ["preview/stills", "preview/frames", "evidence"] {
        std::fs::create_dir_all(root.join(directory)).unwrap();
    }
    if mode == "--stills" {
        std::fs::write(
            root.join("preview/stills/times.json"),
            serde_json::to_vec(&times).unwrap(),
        )
        .unwrap();
    }
    let mut app = App::new();
    let assets = root.join("assets").to_string_lossy().into_owned();
    app.insert_resource(Film {
        root,
        mode,
        project,
        duration,
        fps,
        width,
        height,
        times,
        timeline: None,
        target: None,
        index: 0,
        warmup: 0,
        settle: 0,
        waiting: false,
        checked: false,
    });
    app.add_plugins((
        moxie_asset::register_absolute_source,
        DefaultPlugins
            .set(AssetPlugin {
                file_path: assets,
                unapproved_path_mode: UnapprovedPathMode::Deny,
                ..default()
            })
            .set(WindowPlugin {
                primary_window: None,
                exit_condition: ExitCondition::DontExit,
                ..default()
            })
            .disable::<bevy::winit::WinitPlugin>(),
        ScheduleRunnerPlugin::run_loop(Duration::from_secs_f64(1.0 / 120.0)),
    ));
    app.add_plugins((BevyMotionGfxPlugin, moxie_asset::MoxieAssetPlugin));
    app.register_type::<moxie::SceneRoot>()
        .add_systems(Startup, load)
        .add_systems(Update, drive)
        .run();
}

fn load(world: &mut World) {
    let film = world.resource::<Film>();
    let text = std::fs::read_to_string(film.root.join(&film.project)).unwrap();
    let (width, height) = (film.width, film.height);
    let registry = world.resource::<AppTypeRegistry>().clone();
    let mut assets = world.resource::<AssetServer>().clone();
    let mut de = ron::de::Deserializer::from_str(&text).unwrap();
    let project = ProjectSeed {
        registry: &registry.read(),
        assets: &mut assets,
    }
    .deserialize(&mut de)
    .expect("deserialize .mox");
    project
        .world
        .write_to_world_with(world, &mut default(), &registry.read())
        .expect("spawn reflected project");
    let mut target = Image::new_target_texture(width, height, TextureFormat::Rgba8UnormSrgb, None);
    target.texture_descriptor.usage |= TextureUsages::COPY_SRC;
    let target = world.resource_mut::<Assets<Image>>().add(target);
    world.resource_mut::<Film>().target = Some(target.clone());
    world.spawn((
        Camera {
            order: 0,
            clear_color: Color::WHITE.into(),
            ..default()
        },
        Camera3d::default(),
        RenderTarget::Image(target.into()),
        Transform::from_xyz(0.0, 2.0, 14.0).looking_at(Vec3::ZERO, Vec3::Y),
    ));
    let scene = MotionGfxScene(project.scene);
    let registry = default_scene_registry();
    let timeline = world.resource_scope::<MotionGfxManager, _>(|world, mut manager| {
        let id = scene
            .compile(&registry, &mut manager)
            .expect("compile .mox");
        scene.stage(&registry, world).expect("stage .mox");
        manager.load_pending_timelines(world);
        id
    });
    world.resource_mut::<Film>().timeline = Some(timeline);
}

fn sample(world: &mut World, time: f64) {
    let id = world.resource::<Film>().timeline.unwrap();
    world.resource_scope::<MotionGfxManager, _>(|world, mut manager| {
        let timeline = manager.get_timeline_mut(&id).unwrap();
        timeline.set_target_track(0);
        timeline.set_target_time(Duration::from_secs_f64(time));
        manager.sample_timelines(world);
    });
}

fn poses(world: &mut World) -> Vec<(Entity, Transform)> {
    world
        .query::<(Entity, &Transform)>()
        .iter(world)
        .map(|(e, t)| (e, *t))
        .collect()
}

fn validate(world: &mut World) {
    let duration = world.resource::<Film>().duration;
    let mut count = 0;
    for tick in 0..=60 {
        sample(world, duration * tick as f64 / 60.0);
        for (_, p) in poses(world) {
            assert!(p.translation.is_finite() && p.scale.is_finite() && p.rotation.is_finite());
            assert!((p.rotation.length() - 1.0).abs() < 0.002);
            count += 1;
        }
    }
    sample(world, duration * 0.25);
    let before = poses(world);
    sample(world, duration * 0.9);
    sample(world, duration * 0.25);
    for ((a, first), (b, second)) in before.into_iter().zip(poses(world)) {
        assert_eq!(a, b);
        assert!(first.translation.abs_diff_eq(second.translation, 0.002));
        assert!(first.rotation.abs_diff_eq(second.rotation, 0.002));
        assert!(first.scale.abs_diff_eq(second.scale, 0.002));
    }
    let report = serde_json::json!({"status": "pass", "transform_checks": count,
        "scope": "actual .mox deserialization, reflected spawning, compile, stage, dependency loading, finite poses and backward seek; visual review still required"});
    std::fs::write(
        world.resource::<Film>().root.join("evidence/import.json"),
        serde_json::to_vec_pretty(&report).unwrap(),
    )
    .unwrap();
    println!("{report}");
}

fn drive(world: &mut World) {
    world.resource_mut::<Film>().warmup += 1;
    if world.resource::<Film>().warmup < 120 {
        return;
    }
    assert!(
        world.resource::<Film>().warmup < 18000,
        "asset/render budget exceeded"
    );
    let handles = world
        .query::<(&Mesh3d, &MeshMaterial3d<StandardMaterial>)>()
        .iter(world)
        .map(|(mesh, material)| (mesh.0.id(), material.0.id()))
        .collect::<Vec<_>>();
    let assets = world.resource::<AssetServer>();
    if !handles.iter().all(|(mesh, material)| {
        assets.is_loaded_with_dependencies(*mesh) && assets.is_loaded_with_dependencies(*material)
    }) {
        return;
    }
    if !world.resource::<Film>().checked {
        validate(world);
        world.resource_mut::<Film>().checked = true;
        if world.resource::<Film>().mode == "--check" {
            world.write_message(AppExit::Success);
            return;
        }
    }
    let film = world.resource::<Film>();
    if film.waiting {
        return;
    }
    if film.index == film.times.len() {
        world.write_message(AppExit::Success);
        return;
    }
    let time = film.times[film.index];
    if film.settle == 0 {
        sample(world, time);
    }
    world.resource_mut::<Film>().settle += 1;
    if world.resource::<Film>().settle < 3 {
        return;
    }
    world.resource_mut::<Film>().waiting = true;
    let target = world.resource::<Film>().target.as_ref().unwrap().clone();
    world.spawn(Screenshot::image(target)).observe(captured);
}

fn captured(event: On<ScreenshotCaptured>, mut film: ResMut<Film>) {
    let frames = film.mode == "--frames";
    let index = if frames {
        (film.times[film.index] * film.fps as f64).round() as usize
    } else {
        film.index
    };
    let path = film
        .root
        .join(if frames {
            "preview/frames"
        } else {
            "preview/stills"
        })
        .join(format!("{index:04}.png"));
    event
        .image
        .clone()
        .try_into_dynamic()
        .unwrap()
        .save(&path)
        .unwrap();
    println!(
        "Rendered {:.3}s -> {}",
        film.times[film.index],
        path.display()
    );
    film.index += 1;
    film.settle = 0;
    film.waiting = false;
}
