# Pi subagents

The definitions in [`agents/`](./agents/) use the `pi-subagents` Markdown format: YAML frontmatter followed by the agent prompt. Treat that directory as the current inventory rather than maintaining a duplicate filename list here.

## Installation

The repository [installation script](../../scripts/installation.sh) links the directory at user scope:

```text
~/.pi/agent/agents -> <dotfiles>/agents/pi/agents
```

Project-specific definitions may instead live under `.pi/agents/`.

Use installed agents through the `subagent` tool. Inspect the available-agent registry before selecting an agent; choose by capability instead of assuming a particular agent name exists.

Third-party Pi extensions are pinned in [`packages.json`](./packages.json). Add or
update an entry and rerun `./scripts/installation.sh` from the repository root.
See the [installation guide](../../scripts/README.md) for preview, backup, dependency,
and idempotency behavior. Machine-local skills and Omarchy are not imported.
