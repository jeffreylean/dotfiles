---
name: agents-sync
description: Sync this machine's coding-agent setup (skills, instruction files, links, plugins, Pi packages) from the dotfiles repo with the `agents` CLI, and check that machines match. Use when the user says "sync my agents", "agents sync", "pull the latest agent config", "align this machine with <host>", or after a skill or instruction file under the dotfiles `agents/` folder is added, pulled, renamed or removed.
---

# Sync the agent setup

The `agents` CLI reads `agents.toml` in the dotfiles repo and makes this machine match it: links for skills and instruction files in each agent's home (Claude Code, Pi, Codex, OpenCode), the generated `~/.codex/AGENTS.md`, Claude plugins and Pi packages.

A change in the repo reaches the agents only after `agents sync` runs. That includes a new, renamed or removed skill, because every skills folder, `~/.agents/skills` included, holds one link per skill.

## Steps

1. **Find the repo.** Run `agents status`. Its first line is `repo <path>`, the folder that holds `agents.toml`. The path differs per machine, so read it and do not assume it. `status` exits 1 when there is work to do; the output is still valid.
2. **Pull**, when the user wants the latest config: `git -C <repo> pull --ff-only`. If the pull is not a fast-forward, or the repo has local changes that conflict, stop and tell the user. Do not stash, reset or merge for them.
3. **Preview:** `agents sync --dry-run`. It prints each change and writes nothing.
4. **Apply:** `agents sync`. Exit 0 means done. Exit 1 means it refused because of a conflict and wrote nothing. Exit 2 means the manifest or the repo is wrong; the message names the file.
5. **Verify:** `agents sync --dry-run` must end with `0 changes`, and `agents status` must exit 0.
6. **Report** what changed, what you did not touch, and any uncommitted files in the repo (`git -C <repo> status --short`). Commit or push only when the user asks.

`--links-only` skips Claude plugins, Pi packages and npm. Use it when the network is down or the user only wants links.

## When sync refuses

Sync prints each conflict with the commands that resolve it. Choose with the user. Never pass `--overwrite` on your own: it deletes the live copy and keeps no backup.

| Message | Meaning | Fix |
|---|---|---|
| `real directory, differs from <repo path>` | An agent or a tool edited a copy outside the repo. | `agents adopt <path>` keeps the live copy. `--overwrite` keeps the repo copy. |
| `generated from …, edited by hand` | Someone edited `~/.codex/AGENTS.md`. | Move the edit into the repo source, then `agents sync --overwrite`. |
| `link to …` or `file not made by agents` | Something else owns the path. | Ask the user. `--overwrite` deletes it. |
| `lacks the line @~/.agents/AGENTS.md` | An instruction file would lose the shared prompt. | Add the include in the repo, then sync again. |
| `<dir> is a symlink or a file` | A skills folder is a link, and `agents` never writes through one. | Make it a real directory, then sync again. |
| `<path> resolves outside the repo` | A skill inside the repo folder is a link to somewhere else. | Move that link to `~/.agents/skills` on this machine, then sync again. |

## Skills the repo does not have

`agents status` lists what tools installed on this machine only:

- `untracked  name/  (agents adopt)` is a real skill folder. It stays on this machine. To share it with every machine, run `agents adopt <path>`, which moves it into the repo and links it back. Then commit it.
- `unmanaged  name` is anything else, such as a skill the operating system ships as a link. Leave it alone.

Neither one is an error, and sync never touches them.

## Another machine

Run the same steps on that machine. In a Rex terminal, `rex hosts` lists the machines, and `rex -S <host> run --wait --keep-open -- sh -c '<command>'` followed by `rex -S <host> capture` runs a command there and reads its output. Otherwise use `ssh`.

Two machines match when both are on the same commit (`git -C <repo> rev-parse HEAD`), both end `agents sync --dry-run` with `0 changes`, and `agents status` shows the same skill counts. Different `untracked` and `unmanaged` entries are expected.

## When the CLI is too old

If `agents.toml` uses something the installed CLI rejects, update the CLI. `grep '"agents ' ~/.cargo/.crates2.json` shows the checkout it was built from. In that checkout run `git pull --ff-only`, then `cargo install --path .`.
