# Shared LLM-Wiki Workflow

Vault root: `~/Documents/knowledge-brain`.

This workflow can be invoked from any project directory. For manual reads/writes/edits targeting knowledge memory, use paths under the vault root. Do not assume the current working directory is the vault.

1. Read `~/Documents/knowledge-brain/AGENTS.md`, `~/Documents/knowledge-brain/LLMS.md`, and `~/Documents/knowledge-brain/index.md`.
2. Check `git -C ~/Documents/knowledge-brain status --short` before substantial edits.
3. Search existing vault notes before creating a new page.
4. Prefer canonical pages and aliases over duplicates.
5. Update relevant MOCs and `~/Documents/knowledge-brain/index.md` when durable pages are added.
6. Append meaningful changes to `~/Documents/knowledge-brain/log.md`.
7. Respect `Private/`, `private: true`, and `llm_include: false`.
8. Before finishing, check for dead notes and duplicated concepts.
