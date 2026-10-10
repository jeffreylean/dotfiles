# Validation and delivery

## Validation ladder

Report each layer independently. Never upgrade a lower-level pass into a higher-level claim.

| Layer | Evidence | Does not prove |
| --- | --- | --- |
| Helper audit | Files exist, stay inside project, GLB header length, manifest consistency, hashes | Valid RON, editor compatibility, visuals |
| Rust tests | Compiled combinator timing, real time-control sampling, geometry assertions | Whole saved-project load or aesthetics |
| Native/export parity | Dense transform comparisons and backward seeks after serialized scene roundtrip | Reflected world reconstruction or loaded assets |
| Actual `.mox` import | World seed, entity spawning, compile/stage, dependency load, finite sampled transforms | Pleasant motion or readable typography |
| Rendered stills/excerpt | Images produced from the saved project | Correct complete-video cadence or final byte limit |
| Decoded video | Codec/dimensions/duration, all frames/PTS, compression-sensitive readability | Manual editor UI behavior |
| Manual Moxie review | Real File > Open and visible editor playback | Other machines' asset paths or runtimes |

The generated author writes `evidence/native-export.json`. The preview writes `evidence/import.json`. Keep full command exit statuses and logs: a process that emits PASS text or images and subsequently crashes is not a successful run.

## Preview first

Render selected times around boundaries and handoffs:

```sh
cargo run --bin preview -- "$PWD" --stills '0,0.5,1.5,3.5,4.5,5.9'
```

Those times fit the unmodified six-second starter. Derive new sample times from the changed scene. Inspect both composition and transitions: source shape, overlap, particle release, formation, reversal, and closing state. Ask for user direction when the visual concept itself is disputed rather than doing many expensive full renders of an unreviewed idea.

The preview samples a target time, waits several render updates for propagation, requests a screenshot, and waits for completion before advancing. Reading the same stale GPU frame repeatedly can create a seemingly regular-timestamp video with poor motion. A headless renderer still requires an operational GPU/backend; report environment failures without weakening asset security or modifying the editor.

## Full frames and encoding

```sh
cargo run --bin preview -- "$PWD" --frames
# Half-open subset, if those indices are valid for the manifest:
cargo run --bin preview -- "$PWD" --frames 30:90
```

The manifest supplies duration, dimensions, fps, and frame count. Use the same values for frame rendering, encoding, time counters, still selection, and validation. After shortening a film, archive/remove stale tail frames in the owned output directory rather than accidentally encoding them.

For the unmodified starter, optional FFmpeg commands are:

```sh
ffmpeg -n -framerate 30 -i preview/frames/%04d.png -frames:v 180 -c:v libx264 -pix_fmt yuv420p -movflags +faststart preview.mp4
ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=codec_name,width,height,avg_frame_rate,nb_read_frames:format=duration,size -of json preview.mp4
ffmpeg -v error -i preview.mp4 -f null -
```

Change frame count/fps from the manifest after altering the scene. `-n` prevents silently replacing an existing video. For a repeated revision, choose a new filename or explicitly archive/replace the old artifact. Do not install an encoder automatically if the user has not authorized environment changes.

A rough silent-video budget is `bitrate <= byte_limit * 8 / duration_seconds`, less container/keyframe margin. This is an estimate, not enforcement. Check the final file size in bytes; do not confuse decimal MB with MiB. Preserve a high-quality master and evaluate a smaller sharing copy separately, especially for fine particles and thin lettering.

If using AVFoundation, address exact video frames with rational timestamps, e.g. `CMTime(value: frameIndex, timescale: fps)`. Repeated floating-point seconds converted with truncation can select the previous frame and make a comparison report look like it contains duplicate frames.

## Reversal and continuity

- Compare exact source and exported transforms before encoding.
- Compare mirrored decoded video images with explicit compression tolerance, excluding captions that intentionally change direction.
- Check every presentation timestamp is consistent with the intended fps.
- Check raw or decoded content changes during intended moving phases. A final brand hold, invisible motion inside a solid voxel, or a stable reversal endpoint is not automatically a dropped frame.
- Assess perceptual speed and material continuity separately. Transform finiteness and parity can both pass while the animation still feels abrupt or empty.

## Handoff

Deliver the `.mox`, assets, source and Cargo.lock, manifest, actual check reports, selected previews, and hashes. Describe editor granularity and baked/controller limits. Record native/export, loader, image, video, and UI checks separately. Do not say the editor was manually opened if only the equivalent loader was tested.

Treat absolute asset references as a relocation limitation. Bump asset-bundle revision names when geometry changes so a still-open editor does not serve old handles. Retain prior source/asset pairs when preserving revisions.
