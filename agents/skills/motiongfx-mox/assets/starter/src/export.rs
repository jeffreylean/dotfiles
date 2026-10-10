use std::collections::BTreeMap;
use std::path::Path;
use std::time::Duration;

use bevy::prelude::*;
use bevy::reflect::TypeRegistry;
use bevy::world_serialization::serde::DynamicWorldSerializer;
use bevy::world_serialization::{DynamicWorld, DynamicWorldBuilder, WorldFilter};
use bevy_motiongfx::motiongfx::action::{ActionId, InterpActionBuilder};
use bevy_motiongfx::prelude::*;
use bevy_motiongfx::scene::backend::{AnimEase, AnimInterp, AnimOp, Backend, field_ref};
use bevy_motiongfx::scene::id::{EntityUid, SceneUid};
use bevy_motiongfx::scene::value_pool::ValuePool;
use motiongfx_scene::prelude::{
    ActionCmd, Block, Combinator, FieldRef, FieldSeed, Node, Scene, Stage, Subject, ValueColumn,
};
use serde::ser::SerializeStruct;
use serde::{Serialize, Serializer};

#[derive(Clone, Copy, Debug)]
pub enum Value {
    Vector(Vec3),
    Rotation(Quat),
}

#[derive(Clone, Copy, Debug)]
pub enum Field {
    Translation,
    Rotation,
    Scale,
}

impl Field {
    fn reference(self) -> FieldRef {
        match self {
            Self::Translation => field_ref(path!(<Transform>::translation)),
            Self::Rotation => field_ref(path!(<Transform>::rotation)),
            Self::Scale => field_ref(path!(<Transform>::scale)),
        }
    }

    fn initial(self, transform: &Transform) -> Value {
        match self {
            Self::Translation => Value::Vector(transform.translation),
            Self::Rotation => Value::Rotation(transform.rotation),
            Self::Scale => Value::Vector(transform.scale),
        }
    }
}

impl Value {
    fn insert(self, pool: &mut ValuePool) -> bevy::asset::uuid::Uuid {
        match self {
            Self::Vector(v) => <ValuePool as ValueColumn<_, Vec3>>::insert(pool, v),
            Self::Rotation(q) => <ValuePool as ValueColumn<_, Quat>>::insert(pool, q),
        }
    }
}

pub struct Record {
    pub entity: Entity,
    pub field: Field,
    pub value: Value,
    pub label: String,
    pub ease: AnimEase,
}

#[derive(Default)]
pub struct Export {
    pub records: BTreeMap<ActionId, Record>,
}

impl Export {
    pub fn capture<T>(
        &mut self,
        action: InterpActionBuilder<'_, T>,
        entity: Entity,
        field: Field,
        value: Value,
        seconds: f64,
        label: &str,
    ) -> TrackFragment {
        self.records.insert(
            action.id(),
            Record {
                entity,
                field,
                value,
                label: label.to_owned(),
                ease: AnimEase::CubicEaseInOut,
            },
        );
        action.play(Duration::from_secs_f64(seconds))
    }

    pub fn capture_linear<T>(
        &mut self,
        action: InterpActionBuilder<'_, T>,
        entity: Entity,
        field: Field,
        value: Value,
        seconds: f64,
        label: &str,
    ) -> TrackFragment {
        let id = action.id();
        let fragment = self.capture(
            action.with_ease(ease::linear),
            entity,
            field,
            value,
            seconds,
            label,
        );
        self.records.get_mut(&id).unwrap().ease = AnimEase::Linear;
        fragment
    }

    pub fn scene(&self, timeline: &BevyTimeline, world: &World, root: &Path) -> Scene<Backend> {
        let mut values = ValuePool::default();
        let mut subjects = BTreeMap::<EntityUid, Vec<FieldSeed<Backend>>>::new();
        let mut tracks = Vec::new();
        let mut timing = Vec::new();
        let track = &timeline.tracks()[0];
        let mut count = 0;
        for (_, span) in track.sequences_spans() {
            let clips = track.clips(*span);
            let first = &self.records[&clips[0].id];
            let subject = *world.get::<EntityUid>(first.entity).unwrap();
            let name = world.get::<Name>(first.entity).unwrap().as_str();
            let initial = first
                .field
                .initial(world.get::<Transform>(first.entity).unwrap());
            subjects.entry(subject).or_default().push(FieldSeed {
                field: first.field.reference(),
                value: initial.insert(&mut values),
            });
            let mut children = Vec::new();
            let mut previous = Duration::ZERO;
            for clip in clips {
                let record = &self.records[&clip.id];
                assert_eq!(record.entity, first.entity);
                assert!(clip.start >= previous, "overlapping export track: {name}");
                let node = Node::action(ActionCmd {
                    subject: SceneUid::Entity(subject),
                    field: record.field.reference(),
                    op: AnimOp::To,
                    value: record.value.insert(&mut values),
                    duration: clip.duration,
                    ease: Some(record.ease),
                    interp: Some(AnimInterp::Linear),
                    name: Some(record.label.clone()),
                });
                children.push(node.delay(clip.start - previous));
                previous = clip.end();
                count += 1;
                timing.push(serde_json::json!({"entity": name, "field": format!("{:?}", record.field), "label": record.label,
                    "start": clip.start.as_secs_f64(), "duration": clip.duration.as_secs_f64(), "ease": format!("{:?}", record.ease)}));
            }
            tracks.push(Node::block(Block {
                name: Some(format!("{name} / {:?}", first.field)),
                combinator: Combinator::Chain,
                children,
            }));
        }
        assert_eq!(
            count,
            self.records.len(),
            "MotionGfx dropped a conflicting authored action"
        );
        tracks.push(Node::draft(track.duration()));
        std::fs::write(
            root.join("evidence/compiled-timing.json"),
            serde_json::to_vec_pretty(&timing).unwrap(),
        )
        .unwrap();
        Scene {
            stage: Stage {
                subjects: subjects
                    .into_iter()
                    .map(|(id, fields)| Subject {
                        id: SceneUid::Entity(id),
                        fields,
                    })
                    .collect(),
            },
            values,
            animation: Block {
                name: Some("MotionGfx / Rust-authored scene".into()),
                combinator: Combinator::All,
                children: tracks,
            },
        }
    }
}

struct Document<'a> {
    world: &'a DynamicWorld,
    scene: &'a Scene<Backend>,
    registry: &'a TypeRegistry,
    bookmarks: &'a [std::path::PathBuf],
}

impl Serialize for Document<'_> {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut project = serializer.serialize_struct("Project", 3)?;
        project.serialize_field(
            "world",
            &DynamicWorldSerializer::new(self.world, self.registry),
        )?;
        project.serialize_field("scene", self.scene)?;
        project.serialize_field("bookmarks", self.bookmarks)?;
        project.end()
    }
}

pub fn save(world: &mut World, scene: &Scene<Backend>, root: &Path) {
    let entities = world
        .query_filtered::<Entity, Or<(With<EntityUid>, With<moxie::SceneRoot>)>>()
        .iter(world)
        .collect::<Vec<_>>();
    let registry = world.resource::<AppTypeRegistry>().clone();
    let registry = registry.read();
    let dynamic = DynamicWorldBuilder::from_world(world, &registry)
        .with_component_filter(
            WorldFilter::deny_all()
                .allow::<moxie::SceneRoot>()
                .allow::<EntityUid>()
                .allow::<Name>()
                .allow::<Transform>()
                .allow::<Visibility>()
                .allow::<Children>()
                .allow::<ChildOf>()
                .allow::<Mesh3d>()
                .allow::<MeshMaterial3d<StandardMaterial>>(),
        )
        .extract_entities(entities.into_iter())
        .build();
    let bookmarks = [root.join("assets")];
    let document = Document {
        world: &dynamic,
        scene,
        registry: &registry,
        bookmarks: &bookmarks,
    };
    let ron = ron::ser::to_string_pretty(&document, ron::ser::PrettyConfig::default())
        .expect("serialize .mox with Bevy reflection");
    std::fs::write(root.join(crate::PROJECT), ron).expect("write .mox");
}
