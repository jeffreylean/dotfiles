# Installation

From a clone of this repository on Linux or macOS:

```sh
# Inspect first. --backup shows how conflicting paths would be preserved.
./scripts/installation.sh --dry-run --backup

# Link the app configuration.
./scripts/installation.sh --backup

# Subsequent runs normally need no flags.
./scripts/installation.sh
```

Run it from any working directory; the checkout need not be at `~/Projects/dotfiles`.

## Scope

The installer links app configuration only: Neovim, Ghostty, Rex, tmux, Herdr, and Zed.
macOS tmux files go to `~/.tmux`; Linux tmux files go to `$XDG_CONFIG_HOME/tmux`.
It does not inspect or remove `~/.tmux.conf`, or install Omarchy integrations.
Install **Node.js 22+** first. The Bash entry point delegates to a dependency-free
Node helper.

## Coding agents

Everything under `agents/` belongs to the `agents` CLI, driven by
`agents/agents.toml`: skill and instruction links for Claude Code, Pi, Codex and
OpenCode, Pi packages, and Claude plugins.

```sh
agents sync --dry-run   # show what would change
agents sync             # apply it
agents status           # what each agent sees, and any drift
```

The installer never touches paths under `agents/`. On its first run after the
split it drops its old agent entries from its state without removing those links.

`agents/claude/settings.json` is a template for manually merging Atuin hooks into
the machine-local `~/.claude/settings.json`; it is not linked.

## Safety and repeatability

```sh
./scripts/installation.sh --dry-run     # No writes
./scripts/installation.sh --check       # Exit 1 on drift/conflicts; otherwise 0
```

- Correct links are no-ops. Obsolete owned links are removed.
- Conflicting local paths stop setup before link changes. `--backup` opts into
  moving conflicts to timestamped backups under the local state directory's
  `backups/` folder. Nothing is merged back into Git.
- A replaced obsolete link is left untouched and reported for manual review.
- Only relative symlinks that resolve within the checkout are portable source
  content. Generated home links use the current checkout's absolute path, so rerun
  setup after moving the checkout.

Ownership lives at `$XDG_STATE_HOME/dotfiles/installation.json` (default
`~/.local/state/dotfiles`). Do not commit it. An installation lock prevents
overlapping runs; after a crash, inspect `installation.lock` in that directory
before removing a stale lock.

## Tests

```sh
node --test scripts/install.test.mjs
```

Tests use disposable homes and checkouts.
