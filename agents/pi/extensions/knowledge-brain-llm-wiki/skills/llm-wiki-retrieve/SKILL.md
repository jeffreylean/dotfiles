---
name: llm-wiki-retrieve
description: Use when the user asks what they know about a topic, wants to search/read/summarize the Knowledge Brain vault, answer from notes, find related notes, or retrieve project/source/concept memory without necessarily editing the vault.
---

# LLM-Wiki Retrieve

## Vault Root

Default knowledge vault root: `~/Documents/knowledge-brain`.

This skill may be invoked from any project directory. Do **not** assume the current working directory is the vault.

For all manual `read`, `bash`, and optional follow-up `write`/`edit` operations that target knowledge memory, use home-relative or absolute paths under the vault root:

- `~/Documents/knowledge-brain/index.md`
- `~/Documents/knowledge-brain/LLMS.md`
- `~/Documents/knowledge-brain/10-Wiki/...`
- `~/Documents/knowledge-brain/20-Sources/...`

Never read/write vault notes relative to the current project repo unless you first verify that the current directory resolves to `~/Documents/knowledge-brain`.

Helper scripts use this resolution order:

1. `--vault /path/to/vault` when provided
2. `KNOWLEDGE_BRAIN_VAULT=/path/to/vault` when set
3. `~/Documents/knowledge-brain`

## When to Use

Use this skill when:

- The user asks “what do I know about X?”, “search my vault for X”, “find notes related to X”, or “answer from my knowledge brain”.
- The user wants project/source/concept memory retrieved from `~/Documents/knowledge-brain`.
- You need to understand existing vault knowledge before coding, planning, research, or writing.

Default mode is **read-only**. Only write back to the vault if the user explicitly asks to save/file/update, or if a paired write skill is invoked.

## Commands

From any working directory; helper scripts default to `~/Documents/knowledge-brain`:

```bash
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/search-vault.js --query "topic"
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/search-vault.js --query "topic" --path 10-Wiki --limit 5 --json
```

Skill-local wrapper:

```bash
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/skills/llm-wiki-retrieve/scripts/llm-wiki-retrieve.js --query "topic"
```

Useful manual commands:

```bash
rg -n "topic" ~/Documents/knowledge-brain --glob '*.md' --glob '!Private/**' --glob '!.obsidian/**'
sed -n '1,120p' ~/Documents/knowledge-brain/index.md
```

## Workflow

1. Read `~/Documents/knowledge-brain/LLMS.md` and `~/Documents/knowledge-brain/index.md` first for orientation.
2. Search narrowly with `search-vault.js`, `rg`, or semantic retrieval tools if available.
3. Prioritize canonical pages in `10-Wiki/`, then source notes in `20-Sources/`, then outputs in `30-Outputs/`.
4. Read only the top relevant notes; avoid dumping the entire vault into context.
5. Follow wikilinks/backlinks one hop when useful.
6. Answer with concise synthesis and cite/link note paths or wikilinks.
7. If the answer reveals a gap or useful new synthesis, offer to file it using `llm-wiki-file-answer`; do not auto-write by default.

## Output Contract

Return:

- Direct answer or synthesis.
- Notes consulted, using paths or wikilinks.
- Confidence/coverage: whether the answer is well-supported by the vault or sparse.
- Related notes/concepts worth reading next.
- Optional: suggested vault update, if the answer should be filed back.

## Gotchas

- Do not manually read/write vault files using relative paths from the current project repo.
- Do not retrieve from the legacy `my-brain` vault or `second-brain` skill.
- Do not read every search result; rank and read selectively.
- Do not expose `Private/`, `private: true`, or `llm_include: false` notes unless explicitly requested.
- Do not treat search snippets as full context when a canonical page needs to be read.
- Do not auto-edit the vault during retrieval unless the user asked to save/update/file.

## Iteration Log

- 2026-06-04: Initial retrieval skill created for Knowledge Brain LLM-wiki extension.
