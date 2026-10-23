# grind-mode gotchas log (Claude Code)

Failures found while building and using the skill. Recurring or high-impact ones get promoted to `## Gotchas` in SKILL.md. The pi skill's log is `agents/pi/pi-skills/grind-mode/references/gotchas-log.md`.

## 2026-10-21: port from the pi skill (herdr 0.9.5, Claude Code 2.1.304)

- **herdr's Claude integration was not installed.** `herdr integration install claude` added only a SessionStart hook to `~/.claude/settings.json`, which reports the session to herdr. Without it `herdr agent start --kind claude` still works but `.agent_session` stays empty.
- **Confirmed behaviour:** `herdr agent start g-probe --kind claude --pane <id> -- --name g-probe ...` starts Claude Code, and `ListAgents` in the chief lists it as `g-probe`. `--name` is the `SendMessage` address.
- **Confirmed behaviour:** worker to chief and chief to worker messages both arrive. A message to an idle worker starts a new turn there. Both sessions ran with `crossSessionInbound: accept` from the user settings and in `auto` mode.
- **Confirmed behaviour:** `herdr agent prompt <name> "/exit"` ends Claude Code; the name is freed and the pane is back at its shell, ready for another `agent start`.
- **Confirmed behaviour:** hooks and the status line from `--settings <file>` are merged with the user's: herdr's SessionStart hook still reported the session. The file's `env` block reaches both hooks and the status line.
- **Hooks get no context usage.** PostToolUse input has `session_id`, `transcript_path`, `permission_mode`, `effort` and the tool fields only. The status line's `context_window.used_percentage` is the only source, so the status line records it for the hook.
- **Confirmed behaviour:** the status line reported 4% for a fresh worker of about 46k tokens: a 1M window, so the 30% default leaves room to work. `used_percentage` is null until the first response.
- **Confirmed behaviour:** `herdr pane report-metadata <pane> --source grind --token context=4%` shows in `herdr agent get` and `agent list` as `.tokens.context`.
- **E2E probe:** a worker with `GRIND_LIMIT=1` got the `[grind]` nudge after its first tool call and quoted it back over `SendMessage`.
- **`--append-system-prompt-file` fails fast on a missing file**, and `herdr agent start` then times out waiting for the agent. Read the pane on a startup timeout.
- **The first E2E worker stopped at "Read outside the working directories"** on its first read of `$RUN/tasks/t1.md`, in auto mode, and sat there unseen: a blocked session never goes idle, so the idle notice never came. Fixes: start workers with `--add-dir "$RUN" "$HOME/.agents/skills/handoff"`, and have the chief run `herdr agent wait <name> --until blocked` in the background. With both, the rerun read the brief and reported with no dialog.
- **Confirmed behaviour:** a `notify_when_idle` subscription reports either "is idle now" or "has exited before going idle", and wakes the chief between its turns.
- **Confirmed behaviour:** `herdr agent wait --until blocked` returns at once for a worker that is already blocked, and ends with `agent_not_running` when the worker exits.
- **`agent start` right after `/exit` failed with `agent_pane_busy`**: Claude Code was still exiting. Retry after a second, as after `tab create`.
- **Switched rotation from `/exit` and restart to `/clear`.** Confirmed with a probe: after `herdr agent prompt g-probe "/clear"`, `ListAgents` still listed `g-probe`; a `SendMessage` to it woke the new session, which replied from the same process. herdr's `.agent_session` moved to the new session ID, the nudge fired again under that ID, `.tokens.context` came from the new session, and the worker protocol was still in its system prompt. An idle subscription made before `/clear` belongs to the old session: subscribe again.
- **herdr's state can lag the screen.** After Esc closed a dialog, `agent prompt` was refused with `agent_blocked` for a moment while the pane already showed the prompt.
