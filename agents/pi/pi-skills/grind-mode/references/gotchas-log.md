# grind-mode gotchas log

Failures found while building and using the skill. Recurring or high-impact ones get promoted to `## Gotchas` in SKILL.md.

## 2026-10-20: initial build and smoke test (herdr 0.9.5, pi 1.3.0)

- **The soft-limit nudge fired on the final turn.** The worker had already written a DONE report, and the steer message bought one extra turn that replied `GRIND_PAUSED`. Fix: nudge only on `turn_end` events that have tool results. Chief rule: a report wins over `paused`.
- **`herdr worktree create --cwd <repo>` opened an extra primary workspace** because no herdr workspace was open for that repo yet. Fixes: use `--workspace <chief>` when the chief's workspace is the same repo, record any side-effect workspaces in `run.json`, and have `teardown` close them when they contain only a shell.
- **Confirmed behaviour:** pane tokens reported with `pane report-metadata` appear in both `agent get` and `agent list` as `.tokens`. Session paths from the pi integration appear as `.agent_session.value`.
- **Confirmed behaviour:** `agent prompt "/grind-session <file>" --wait --until working` returns in about 1s, and a new session path is reported straight away.
- **Confirmed behaviour:** `--append-system-prompt <file>` survives `newSession()`. The protocol stays loaded after a rotation.
- **Confirmed behaviour:** rotating while the worker is working (Esc, then handoff, then `/grind-session`) resumed correctly. The new session finished the remaining step and reported to the same path.
- **`agent start` right after `tab create` failed with `agent_pane_busy`**, because the new shell had not reached its prompt yet. Fix: `spawn` retries on `agent_pane_busy` every 500ms, for up to 10s.
- **E2E:** a gpt-6-sol chief given only SKILL.md ran a 2-task goal (one checkout worker, one worktree worker) through init, spawn, assign, wait, collect, verify, merge, teardown, and notify with zero grind errors in about 2.5 minutes.

## 2026-10-21: herdr-native rewrite (herdr 0.9.5, pi-intercom 0.13.0)

- **The wrapper script was not needed.** `grind.mjs` only wrapped herdr commands, and its `wait` held the chief's turn for up to 20 minutes, so the user could not talk to the chief while workers ran. Removed. Workers are started with `herdr agent start --kind pi` and report over pi-intercom, which wakes the chief.
- **Confirmed behaviour:** `herdr agent start g-probe --kind pi --pane <id> -- --name g-probe --model claude-bridge/claude-opus-5-5 --thinking high` starts pi, and `intercom list` then shows the session as `g-probe` with its context use.
- **Confirmed behaviour:** `herdr agent prompt <name> "/quit"` ends pi; the name is freed and the pane is back at its shell, ready for another `agent start`.
- **Defaults changed:** the handoff threshold is 30% of the context window, the worker model is asked for (default `claude-bridge/claude-opus-5-5`, thinking `high`), and the chief asks the user before starting any worker. Workers report in plain words, without status labels or report files.
- **E2E probe:** a worker started with the full SKILL.md args and `--grind-limit 1` ran its task, got the limit nudge after its first tool turn, wrote a handoff and reported over intercom in plain words, all in about 20 seconds. Its message woke the chief mid-turn.
- **Handoff names vary.** The probe named its handoff after the task, not itself. The chief continues from whatever path the worker sends, so the protocol no longer fixes a name.
- **`/new` keeps the worker, `/name` keeps its address.** Tested: `/new` then `/name g-probe` gave a fresh session (0% context) in the same process, and intercom listed it as `g-probe` again a few seconds later. Restarting with `/quit` + `agent start` was used before and cost a failed start: after `/quit` sent by name, herdr no longer resolved `g-fix`, and only the pane ID reached it.
- **Builds fill the disk.** On hamlet, a run of four `make check` commits (each re-run by the chief) grew `target/` from 134 GB to 166 GB and filled the machine (144 MiB free). Check `df` before a run and between tasks; for long runs on a tight disk, build with `CARGO_INCREMENTAL=0` and delete only `target/debug/incremental` when space runs out.
