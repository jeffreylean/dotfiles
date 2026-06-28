---
name: llm-wiki-project-memory
description: Use when the user wants to update project memory after a coding, research, planning, or debugging session in the Knowledge Brain Obsidian LLM-wiki.
---

# LLM-Wiki Project Memory

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

- A session ends and project state should be preserved.
- The user says “update project memory”, “save this to the project page”, or “crystallize this session”.
- Research/debugging/planning decisions should become durable project knowledge.

## Commands

From any working directory; helper scripts default to `~/Documents/knowledge-brain`:

```bash
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/new-note.js --type project --title "Project Name"
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/new-note.js --type decision --title "Decision Title"
```

Skill-local wrapper:

```bash
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/skills/llm-wiki-project-memory/scripts/llm-wiki-project-memory.js --title "Project Name"
```

## Workflow

1. Read `~/Documents/knowledge-brain/AGENTS.md`, `~/Documents/knowledge-brain/LLMS.md`, `~/Documents/knowledge-brain/index.md`, and `~/Documents/knowledge-brain/10-Wiki/MOC - Projects.md`.
2. Check `git -C ~/Documents/knowledge-brain status --short` before editing vault notes.
3. Find the existing project page or create one under `10-Wiki/Projects/`.
4. Update:
   - goal/current state
   - decisions made
   - files/repos/sources touched
   - next actions
   - open questions
5. Create decision notes for durable architectural/product decisions.
6. Link to sources, outputs, concepts, and related projects.
7. Update project MOC/index if needed.
8. Append to `~/Documents/knowledge-brain/log.md`.

## Output Contract

Return:

- Project page updated.
- Decision notes created/updated.
- Current state and next actions.
- Links to sources/outputs/concepts.
- Log entry summary.

## Gotchas

- Do not manually write vault files using relative paths from the current project repo.
- Do not turn every transient implementation detail into a durable decision.
- Do not lose next actions; they are often the most valuable project memory.
- Do not create multiple pages for the same project under variant names.
- Do not include secrets, private repo credentials, or sensitive customer data.
- Do not claim work was completed without evidence from files/tests/session output.

## Iteration Log

- 2026-06-04: Initial skill created for Knowledge Brain LLM-wiki extension.
