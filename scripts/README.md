# Installation

From a clone of this repository on Linux or macOS:

```sh
# Inspect first. --backup shows how conflicting paths would be preserved.
./scripts/installation.sh --dry-run --backup

# Install links, declared Pi packages, and skill/extension npm dependencies.
./scripts/installation.sh --backup

# Subsequent runs normally need no flags.
./scripts/installation.sh
```

This replaces `setup-symlinks.sh`. Run it from any working directory; the checkout
need not be at `~/Projects/dotfiles`.

## Prerequisites and scope

Install **Node.js 22+**, **npm**, and **Pi** first. Harness executables, login,
credentials, and arbitrary system tools mentioned in skill prose are not installed
by this script. The Bash entry point delegates filesystem/JSON reconciliation to a
dependency-free Node helper.

The installer retains the previous script's app configuration mappings (Neovim,
Ghostty, tmux, Herdr, and Zed), plus agent configuration. macOS tmux files go to
`~/.tmux`; Linux tmux files go to `$XDG_CONFIG_HOME/tmux`. It does not inspect or
remove `~/.tmux.conf`, or install Omarchy integrations.

**Only checkout content and explicitly declared packages are installation sources.**
No skills are collected from the current machine. Omarchy, personal skills, auth
files, sessions, and machine-local settings are not copied into the checkout or
replicated onto another machine.

## Skill and extension layout

| Source | Destination |
| --- | --- |
| `agents/skills/` | `~/.agents/skills` (whole-directory link) |
| Shared skills plus `agents/claude/skills/` | Individual links in `~/.claude/skills/` |
| `agents/opencode/skills/` | Individual links in `$XDG_CONFIG_HOME/opencode/skills/` |
| `agents/pi/pi-skills/` | Individual links in `~/.pi/agent/skills/` |
| `agents/pi/extensions/` | Individual links in `~/.pi/agent/extensions/` |
| `agents/pi/extensions/*/skills/` | Individual links in `~/.pi/agent/skills/` |

Pi and OpenCode discover the shared root directly. Claude gets explicit shared
skill links. OpenCode also supports Claude-compatible discovery locations, so a
Claude directory is not an isolation guarantee.

Add a skill with a `SKILL.md` in the appropriate source directory; no install list
needs updating. Shared skills immediately appear through the shared root; rerun
installation to refresh the per-harness links. Duplicate destination names with
different sources fail rather than silently choosing an override.

Only relative symlinks that resolve within the checkout are portable source
content; external source targets are rejected. Generated home links use the
current checkout's absolute path. Rerun setup after moving the checkout.

## Third-party Pi extensions

`agents/pi/packages.json` contains the desired npm packages, pinned to the versions
observed on the original machine. Add an entry such as:

```json
"npm:pi-example@1.2.3"
```

Then rerun installation. The installer checks both Pi's declaration and the
installed version. Missing or changed packages are installed using `pi install`;
matching packages are skipped. It does not run a global Pi update.

Only pinned npm sources are supported by this manifest. For a deliberate upgrade,
edit the version and rerun. Custom Pi resource-filter objects are preserved;
if such a package needs installation or a pin change, setup asks you to reconcile
it manually instead of silently broadening enabled resources.

Removing an entry stops managing it; it does **not** uninstall that package.
Use `pi remove <source>` explicitly if you also want it removed from that machine.
Unlisted installed packages remain untouched and are not replicated elsewhere.
Pi settings and credentials remain machine-local, not symlinked into Git.

## Local npm dependencies

The installer checks `dependencies` in the Pi root package, repo skill packages,
and repo extension packages. Metadata-only packages are skipped.

- With `package-lock.json`: use `npm ci --omit=dev`.
- Without an npm lockfile: use `npm install` without saving manifests/locks and
  without automatically installing peer dependencies. This does **not** reproduce
  Bun's lock resolution, and transitive versions may differ across machines.
- Record the manifest/lock/platform/Node-major fingerprint in machine-local state.
- Skip unchanged, healthy installs; reinstall after dependency changes or missing
  modules. Failed installs are not marked complete.

Dependencies are generated in ignored `node_modules` beside the source packages,
where Node resolves symlinked skills' imports. The installer does not merge local
configuration into source files or change tracked manifests/locks. npm lifecycle
scripts still execute: install only trusted code. `browser-tools` uses Puppeteer,
which may download a browser. Set `PUPPETEER_SKIP_DOWNLOAD=true` if managing the
browser separately.

## Safety and repeatability

```sh
./scripts/installation.sh --dry-run     # No writes or package installation
./scripts/installation.sh --check       # Exit 1 on drift/conflicts; otherwise 0
./scripts/installation.sh --links-only  # Skip all package/dependency installation
```

- Correct links are no-ops; additions are discovered automatically.
- Obsolete owned links are removed, including deleted/renamed extensions.
- Existing unrelated local files, skills, and packages stay where they are; they
  are never imported or installed on another machine.
- Conflicting local paths stop setup before link changes. `--backup` opts into
  moving conflicts to timestamped backups under the local state directory's
  `backups/` folder, outside skill discovery roots. Nothing is merged back into
  Git. If that directory is on another filesystem and the move fails, relocate
  the conflicting file manually before retrying; setup does not delete it.
- A replaced obsolete link is left untouched and reported for manual review.
- Shared `~/.agents/skills` is repo-owned. If it is an existing real directory,
  `--backup` preserves the entire directory before linking the repo; those local
  entries are not merged or kept active within the new shared root.
- Per-tool skill/extension directories must be real directories. A symlinked
  parent requires manual migration; setup will not write through it.

Ownership and successful dependency fingerprints live at
`$XDG_STATE_HOME/dotfiles/installation.json` (default `~/.local/state/dotfiles`).
Do not commit this machine-local state. The first run recognizes legacy links into
this repo's managed skill/extension trees; it does not adopt external links.
An installation lock prevents overlapping apply phases. After a crash, inspect
`installation.lock` in that state directory before removing a stale lock.

The installer targets `~/.pi/agent`; an alternate `PI_CODING_AGENT_DIR` is rejected
rather than installing packages into a different location from the links.

Remember to commit and push new/moved skills, the installer, and package-list
changes. Another machine only receives what is present in its checkout.

## Tests

```sh
node --test scripts/install.test.mjs
```

Tests use disposable homes/checkouts and fake package-manager commands. They cover
repeat runs, additions, removals, conflicts, ownership, no local imports, platform
layout, package pinning, dependency changes, and failure/retry behavior. They do
not download third-party packages or substitute for native macOS smoke testing.
