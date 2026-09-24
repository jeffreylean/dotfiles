# Gotchas Log

Capture observed failures here. Promote stable, repeated failures into `SKILL.md` Gotchas.

- Initial guardrail: old `spec-task` allowed multiple agent state dirs; this Pi skill must always use project-local `.pi/state`.
- Initial guardrail: subagents can help implement/review, but parent agent should own final state updates.
