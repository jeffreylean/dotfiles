use bevy::mesh::VertexAttributeValues;
use bevy::prelude::*;
use serde_json::json;

pub const BUNDLE: &str = "scene-r1.glb";

pub fn cube_glb() -> Vec<u8> {
    let mesh = Cuboid::default().mesh().build();
    let Some(VertexAttributeValues::Float32x3(points)) = mesh.attribute(Mesh::ATTRIBUTE_POSITION)
    else {
        panic!("cube positions");
    };
    let Some(VertexAttributeValues::Float32x3(normals)) = mesh.attribute(Mesh::ATTRIBUTE_NORMAL)
    else {
        panic!("cube normals");
    };
    let indices = mesh.indices().unwrap().iter().collect::<Vec<_>>();
    let positions = indices.iter().flat_map(|i| points[*i]).collect::<Vec<_>>();
    let normals = indices.iter().flat_map(|i| normals[*i]).collect::<Vec<_>>();
    let colors = normals
        .chunks_exact(3)
        .flat_map(|normal| {
            let shade = if normal[1] > 0.5 {
                1.0
            } else if normal[0].abs() > 0.5 {
                0.42
            } else {
                0.7
            };
            [shade, shade, shade, 1.0_f32]
        })
        .collect::<Vec<_>>();
    let mut data = Vec::new();
    let mut views = Vec::new();
    for values in [&positions, &normals, &colors] {
        let offset = data.len();
        data.extend(values.iter().flat_map(|value| value.to_le_bytes()));
        views.push(json!({"buffer": 0, "byteOffset": offset, "byteLength": data.len() - offset}));
    }
    let count = indices.len();
    let material = |color| {
        json!({
            "pbrMetallicRoughness": {"baseColorFactor": color, "metallicFactor": 0, "roughnessFactor": 1},
            "doubleSided": true, "extensions": {"KHR_materials_unlit": {}}
        })
    };
    let doc = json!({
        "asset": {"version": "2.0", "generator": "MotionGfx .mox starter"},
        "extensionsUsed": ["KHR_materials_unlit"],
        "buffers": [{"byteLength": data.len()}],
        "bufferViews": views,
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": count, "type": "VEC3", "min": [-0.5, -0.5, -0.5], "max": [0.5, 0.5, 0.5]},
            {"bufferView": 1, "componentType": 5126, "count": count, "type": "VEC3"},
            {"bufferView": 2, "componentType": 5126, "count": count, "type": "VEC4"}
        ],
        "materials": [material([0.012, 0.06, 0.85, 1.0]), material([0.96, 0.96, 0.94, 1.0])],
        "meshes": [
            {"name": "Shared shaded cube", "primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1, "COLOR_0": 2}, "material": 0, "mode": 4}]},
            {"name": "Paper cube", "primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1}, "material": 1, "mode": 4}]}
        ]
    });
    let mut header = serde_json::to_vec(&doc).unwrap();
    while header.len() % 4 != 0 {
        header.push(b' ');
    }
    let mut bytes = Vec::new();
    for value in [
        0x46546c67_u32,
        2,
        (28 + header.len() + data.len()) as u32,
        header.len() as u32,
        0x4e4f534a,
    ] {
        bytes.extend(value.to_le_bytes());
    }
    bytes.extend(header);
    bytes.extend((data.len() as u32).to_le_bytes());
    bytes.extend(0x004e4942_u32.to_le_bytes());
    bytes.extend(data);
    bytes
}
