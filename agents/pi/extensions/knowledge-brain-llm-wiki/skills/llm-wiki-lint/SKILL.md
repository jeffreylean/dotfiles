---
name: llm-wiki-lint
description: Use when the user asks to lint, audit, check health, find broken links, find missing metadata, or review privacy/export risk in the Knowledge Brain Obsidian LLM-wiki.
---

# LLM-Wiki Lint

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

- The user says “lint vault”, “audit my wiki”, “check links”, “check privacy”, or “health check”.
- Before exporting, publishing, or pushing a major vault update.
- After large ingest/gardening sessions.

## Commands

From any working directory; helper scripts default to `~/Documents/knowledge-brain`:

```bash
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/vault-lint.js
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/vault-lint.js --report ~/Documents/knowledge-brain/90-Meta/Lint-Reports/$(date +%F).md
```

Skill-local wrapper:

```bash
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/skills/llm-wiki-lint/scripts/llm-wiki-lint.js --report ~/Documents/knowledge-brain/90-Meta/Lint-Reports/$(date +%F).md
```

## Workflow

1. Read `~/Documents/knowledge-brain/AGENTS.md`, `~/Documents/knowledge-brain/LLMS.md`, and `~/Documents/knowledge-brain/90-Meta/Export Policy.md`.
2. Run the helper lint script.
3. Manually inspect high-risk categories: privacy, duplicates, source provenance, orphan pages.
4. Write or update a lint report in `~/Documents/knowledge-brain/90-Meta/Lint-Reports/`.
5. If requested, fix issues in a bounded pass.
6. Append report/fixes to `~/Documents/knowledge-brain/log.md`.

## Output Contract

Return:

- Lint report path.
- Issue counts by category.
- Critical privacy/export risks first.
- Fixes applied, if any.
- Recommended next cleanup tasks.

## Gotchas

- Do not manually write vault files using relative paths from the current project repo.
- Do not treat script output as complete; it is a mechanical baseline only.
- Do not expose private note contents in lint reports.
- Do not fix large structural issues without preserving backlinks/aliases.
- Do not ignore generated/package markdown that should be excluded from wiki lint/export.
- Do not push/export until privacy risks are resolved.

## Iteration Log

- 2026-06-04: Initial skill created for Knowledge Brain LLM-wiki extension.
