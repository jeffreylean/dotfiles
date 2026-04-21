# Pi subagents (pi-subagents format)

These agents are in `pi-subagents` markdown format (YAML frontmatter + prompt body).

## Files

- `agents/code-reviewer.md`
- `agents/librarian.md`
- `agents/opencode-expert.md`
- `agents/oracle.md`

## Install location expected by pi-subagents

User scope:
- `~/.pi/agent/agents/{name}.md`

Project scope:
- `.pi/agents/{name}.md`

## Quick install (user scope)

```bash
mkdir -p ~/.pi/agent/agents
cp /Users/jeffreylean/dotfiles/agents/pi/agents/*.md ~/.pi/agent/agents/
```

Then use them with the `subagent` tool or slash commands (`/run`, `/chain`, `/parallel`) from the `pi-subagents` extension.
