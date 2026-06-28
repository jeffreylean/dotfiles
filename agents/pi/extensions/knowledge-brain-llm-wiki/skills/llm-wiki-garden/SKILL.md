---
name: llm-wiki-garden
description: Use when the user asks to garden, organize, clean up, refactor, triage, merge, link, or improve the Knowledge Brain Obsidian LLM-wiki.
---

# LLM-Wiki Garden

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

- The user says “garden my vault”, “clean this up”, “organize notes”, “triage inbox”, or “refactor the wiki”.
- Notes have weak links, missing summaries, duplicate concepts, or stale structure.
- Inbox/source/output notes need to be distilled into durable wiki pages.

## Commands

From any working directory; helper scripts default to `~/Documents/knowledge-brain`:

```bash
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/vault-lint.js
```

Skill-local wrapper:

```bash
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/skills/llm-wiki-garden/scripts/llm-wiki-garden.js
```

## Workflow

1. Read `~/Documents/knowledge-brain/AGENTS.md`, `~/Documents/knowledge-brain/LLMS.md`, and `~/Documents/knowledge-brain/index.md`.
2. Check `git -C ~/Documents/knowledge-brain status --short` before editing vault notes.
3. Choose a narrow garden scope unless the user asked for full-vault cleanup.
4. Triage `00-Inbox/` first.
5. Merge duplicates by picking a canonical page and adding aliases.
6. Add summaries/frontmatter to valuable notes.
7. Add backlinks and update MOCs.
8. Move notes to correct folders.
9. Record unresolved cleanup in a lint report or project task.
10. Append meaningful changes to `~/Documents/knowledge-brain/log.md`.

## Output Contract

Return:

- Scope cleaned.
- Notes moved/merged/updated.
- Dead/orphan notes resolved or remaining.
- MOCs/index/log updates.
- Residual risks or next cleanup tasks.

## Gotchas

- Do not manually write vault files using relative paths from the current project repo.
- Do not rewrite personal notes into generic AI prose.
- Do not over-organize temporary inbox material.
- Do not merge concepts if meaningful distinctions would be lost.
- Do not leave redirects/aliases unrecorded after a merge.
- Do not garden `Private/` unless explicitly requested.

## Iteration Log

- 2026-06-04: Initial skill created for Knowledge Brain LLM-wiki extension.
