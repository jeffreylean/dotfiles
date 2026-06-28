# State

Optional local memory for this skill (logs/checkpoints/cache).

Guidelines:
- Do not store secrets in plain text.
- Keep volatile state minimal.
- If skill upgrades wipe local files, point to a stable external path via config (dataPath).
