---
name: llm-wiki-export
description: Use when the user asks to export the Knowledge Brain vault for LLM context, prepare a GitHub-safe bundle, review publishability, or package notes while respecting privacy flags.
---

# LLM-Wiki Export

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

- The user says “export for LLM”, “make an llms bundle”, “prepare for GitHub”, or “publish/export subset”.
- Before pushing/publishing a major vault snapshot.
- A model needs a compact context bundle from the vault.

## Commands

From any working directory; helper scripts default to `~/Documents/knowledge-brain`:

```bash
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/export-llm-bundle.js
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/vault-lint.js --report ~/Documents/knowledge-brain/90-Meta/Lint-Reports/$(date +%F)-pre-export.md
```

Skill-local wrapper:

```bash
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/skills/llm-wiki-export/scripts/llm-wiki-export.js
```

## Workflow

1. Read `~/Documents/knowledge-brain/AGENTS.md`, `~/Documents/knowledge-brain/LLMS.md`, and `~/Documents/knowledge-brain/90-Meta/Export Policy.md`.
2. Run a pre-export lint/privacy check.
3. Exclude:
   - `Private/`
   - `private: true`
   - `llm_include: false`
   - `.obsidian/workspace*.json`
   - generated/cache directories
   - secrets or sensitive attachments
4. Generate bundle or manifest.
5. Review bundle summary before sharing/publishing.
6. Append export event to `~/Documents/knowledge-brain/log.md` if meaningful.

## Output Contract

Return:

- Export path(s).
- Included/excluded counts.
- Privacy checks performed.
- Any blocked files or risks.
- Next step for GitHub/publishing if requested.

## Gotchas

- Do not manually write vault files using relative paths from the current project repo.
- Do not include private notes by default.
- Do not assume private GitHub means all content is safe to export elsewhere.
- Do not export copied source text if licensing is unclear.
- Do not include `.obsidian/workspace.json` or local plugin state.
- Do not skip lint before public or cross-agent export.

## Iteration Log

- 2026-06-04: Initial skill created for Knowledge Brain LLM-wiki extension.
