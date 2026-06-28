# CodeCrafter Gotchas Log

## 2026-06-05

- Converted from a prompt to a skill so it can be invoked by trigger rather than slash-command prompt.
- Main failure mode to watch: assistant writes production code too eagerly instead of tests/guidance.
- Secondary failure mode: tests are too large and remove the user's chance to make meaningful design choices.
