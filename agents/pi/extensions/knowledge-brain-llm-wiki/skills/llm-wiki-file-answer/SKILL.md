---
name: llm-wiki-file-answer
description: Use when the user asks to save, file, preserve, convert, or crystallize a useful chat answer or conversation into the Knowledge Brain Obsidian LLM-wiki.
---

# LLM-Wiki File Answer

## Vault Root

Default knowledge vault root: `~/Documents/knowledge-brain`.

This skill may be invoked from any project directory. Do **not** assume the current working directory is the vault.

For all manual `read`, `write`, `edit`, and `bash` operations that target knowledge memory, use home-relative or absolute paths under the vault root:

- `~/Documents/knowledge-brain/index.md`
- `~/Documents/knowledge-brain/log.md`
- `~/Documents/knowledge-brain/10-Wiki/Projects/...`
- `~/Documents/knowledge-brain/20-Sources/...`

Never write vault notes relative to the current project repo unless you first verify that the current directory resolves to `~/Documents/knowledge-brain`.

Helper scripts use this resolution order:

1. `--vault /path/to/vault` when provided
2. `KNOWLEDGE_BRAIN_VAULT=/path/to/vault` when set
3. `~/Documents/knowledge-brain`

## When to Use

Use this skill when:

- The user says “save this”, “file this answer”, “turn this into a note”, or “add to my vault”.
- A chat answer contains reusable knowledge, a decision, a plan, or a research synthesis.
- The current conversation should become durable wiki/project/output material.

## Commands

From any working directory; helper scripts default to `~/Documents/knowledge-brain`:

```bash
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/new-note.js --type output --title "Output Title"
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/new-note.js --type concept --title "Concept Title"
```

Skill-local wrapper:

```bash
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/skills/llm-wiki-file-answer/scripts/llm-wiki-file-answer.js --title "Saved Answer" --type output
```

## Workflow

1. Read `~/Documents/knowledge-brain/AGENTS.md`, `~/Documents/knowledge-brain/LLMS.md`, and `~/Documents/knowledge-brain/index.md`.
2. Check `git -C ~/Documents/knowledge-brain status --short` before editing vault notes.
3. Decide destination:
   - `10-Wiki/Concepts/` for durable ideas.
   - `10-Wiki/Projects/` for project state.
   - `10-Wiki/Decisions/` for durable decisions.
   - `30-Outputs/` for reusable generated artifacts.
   - `00-Inbox/` if still messy.
4. Search for existing pages before creating new ones.
5. Preserve context: what question was answered and why it matters.
6. Link to source/project/concept pages.
7. Update MOCs/index if durable.
8. Append to `~/Documents/knowledge-brain/log.md`.

## Output Contract

Return:

- Destination note path.
- Existing pages updated instead of duplicated.
- Links/MOCs/log updated.
- Any follow-up questions.

## Gotchas

- Do not manually write vault files using relative paths from the current project repo.
- Do not save every chat answer; save reusable knowledge, decisions, or project state.
- Do not create a new note if a canonical page should be updated.
- Do not strip uncertainty or context that makes the answer meaningful.
- Do not file sensitive chat content outside `Private/` without explicit approval.
- Do not forget `log.md` for meaningful changes.

## Iteration Log

- 2026-06-04: Initial skill created for Knowledge Brain LLM-wiki extension.
