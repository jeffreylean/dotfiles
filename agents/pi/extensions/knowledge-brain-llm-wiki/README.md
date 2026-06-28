# Knowledge Brain LLM-Wiki Pi Extension

Private Pi package that contributes workflow skills for maintaining this Obsidian vault as an LLM-wiki.

## Install

Global symlink install:

```bash
ln -sfn ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki ~/.pi/agent/extensions/knowledge-brain-llm-wiki

for skill in ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/skills/*; do
  ln -sfn "$skill" ~/.pi/agent/skills/"$(basename "$skill")"
done
```

This makes the `llm-wiki-*` skills available in any Pi session, not only inside one vault/repo.

## Skills

- `llm-wiki-retrieve` — search/read/summarize existing vault knowledge without editing by default.
- `llm-wiki-ingest-source` — ingest articles, books, papers, videos, transcripts, or pasted source material.
- `llm-wiki-file-answer` — save useful chat answers into durable notes.
- `llm-wiki-garden` — organize, merge, link, and refactor notes.
- `llm-wiki-lint` — audit vault health, frontmatter, links, and privacy/export risk.
- `llm-wiki-project-memory` — crystallize sessions into project pages and decision records.
- `llm-wiki-export` — create privacy-aware LLM/GitHub/export bundles.

## Vault Resolution

By default, scripts target `~/Documents/knowledge-brain` on the current machine. Override with `KNOWLEDGE_BRAIN_VAULT=/path/to/vault` or `--vault /path/to/vault`.

## Manual Edit Rule

Agents may be invoked from any project repo. When manually reading, writing, or editing knowledge notes, always use paths under `~/Documents/knowledge-brain`. Never write `10-Wiki/...`, `20-Sources/...`, `log.md`, or `index.md` relative to the current project unless the current directory is confirmed to be the vault root.

## Helper Scripts

```bash
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/search-vault.js --query "topic"
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/vault-lint.js --report ~/Documents/knowledge-brain/90-Meta/Lint-Reports/$(date +%F).md
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/export-llm-bundle.js
node ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/scripts/new-note.js --type concept --title "New Concept"
```

Agents should still read `~/Documents/knowledge-brain/AGENTS.md`, `~/Documents/knowledge-brain/LLMS.md`, and `~/Documents/knowledge-brain/index.md`; scripts only handle mechanical checks/scaffolds.
