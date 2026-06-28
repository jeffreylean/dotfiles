# Install

Global symlink install:

```bash
mkdir -p ~/.pi/agent/extensions ~/.pi/agent/skills
ln -sfn ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki ~/.pi/agent/extensions/knowledge-brain-llm-wiki

for skill in ~/Projects/dotfiles/agents/pi/extensions/knowledge-brain-llm-wiki/skills/*; do
  ln -sfn "$skill" ~/.pi/agent/skills/"$(basename "$skill")"
done
```

The extension directory symlink is kept for discoverability. The individual skill symlinks are what make the six `llm-wiki-*` skills load globally through normal Pi skill discovery.

No vault-local `.pi/settings.json` is required.

Default vault resolution is `~/Documents/knowledge-brain` on the current machine. Override with `KNOWLEDGE_BRAIN_VAULT=/path/to/vault` or `--vault /path/to/vault`.
