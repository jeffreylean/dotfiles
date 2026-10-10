# Reading map

1. [mox-format.md](mox-format.md): verify the current checkout's project envelope, stable IDs, asset paths, and registry limits.
2. [authoring.md](authoring.md): native composition, editable scene organization, continuous transitions, and honest time-control bakes.
3. [rendering.md](rendering.md): validation ladder, actual-project previews, encoding, cadence, byte limits, and handoff.
4. [gotchas-log.md](gotchas-log.md): observed failure history and guardrails worth preserving.
5. [validation.md](validation.md): what this skill and its starter were actually tested against.

Start implementation from `../assets/starter/` through the safe `init` helper. It owns its own export adapter and renderer; it does not copy or depend on a prior promotional-film project at runtime.
