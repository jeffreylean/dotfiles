# Gotchas Log

- 2026-03-20: Exploration noise from test-heavy repos diluted architecture signal.
  - Root cause: shard planner included test packages/files.
  - Fix: exclude common test dirs/files at planning + worker instructions.
  - Promoted to SKILL.md gotcha: yes.
