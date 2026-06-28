---
name: llm-wiki-ingest-source
description: Use when the user provides a URL, article, book, paper, video, transcript, pasted source, or asks to ingest research into the Knowledge Brain Obsidian LLM-wiki.
---

# LLM-Wiki Ingest Source

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

- The user says “ingest this”, “add this source”, “summarize this into my vault”, or pastes a source/URL.
- A note in `00-Inbox/` should become a source-backed wiki update.
- Research should become durable source notes plus updated concept/project pages.

## Commands

From any working directory; helper scripts default to `~/Documents/knowledge-brain`:

```bash
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/new-note.js --type source --title "Source Title"
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/vault-lint.js
```

Skill-local wrapper:

```bash
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/skills/llm-wiki-ingest-source/scripts/llm-wiki-ingest-source.js --title "Source Title"
```

## Workflow

1. Read `~/Documents/knowledge-brain/AGENTS.md`, `~/Documents/knowledge-brain/LLMS.md`, and `~/Documents/knowledge-brain/index.md`.
2. Check `git -C ~/Documents/knowledge-brain status --short` before editing vault notes.
3. Search existing source/concept/project notes before creating new files.
4. Create or update a source note under `20-Sources/`.
5. Preserve provenance: URL, author, published date, accessed date, retrieval method.
6. Separate `## Source Claims` from `## Synthesis`.
7. Update existing concept/project/tool/person pages that the source affects.
8. Create new canonical pages only for recurring/high-value concepts.
9. Update relevant MOCs and `index.md` if the source/page is durable.
10. Append a concise entry to `~/Documents/knowledge-brain/log.md`.

## Output Contract

Return:

- Source note path created/updated.
- Concept/project pages updated.
- MOCs/index/log updated.
- Open questions or contradictions found.
- Any source limitations or provenance gaps.

## Gotchas

- Do not manually write vault files using relative paths from the current project repo.
- Do not dump a source summary without updating relevant durable wiki pages.
- Do not invent source metadata or citations; mark unknowns explicitly.
- Do not overwrite raw source claims with your interpretation.
- Do not create duplicate concept pages when an alias on an existing page is enough.
- Do not ingest `Private/` or `private: true` material unless explicitly requested.

## Iteration Log

- 2026-06-04: Initial skill created for Knowledge Brain LLM-wiki extension.
