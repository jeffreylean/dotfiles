# AGENTS.md

Scope: `~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/`.

This directory is a Pi package, not normal wiki content.

## Rules

- Keep skill descriptions trigger-oriented.
- Every skill must have `SKILL.md` with `## When to Use`, `## Commands`, `## Output Contract`, and `## Gotchas`.
- Keep helper scripts dependency-free unless there is a clear reason.
- Validate skills with `~/.pi/agent/skills/skill-creator/skill-validate.js`.
- Do not put secrets or private note content in skill docs, fixtures, or script output.
- Avoid duplicating workflow logic: use shared scripts in `scripts/` and skill docs for judgment.
