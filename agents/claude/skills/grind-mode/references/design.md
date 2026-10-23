# grind-mode design (Claude Code)

The Claude Code port of `agents/pi/pi-skills/grind-mode`. Same roles and flow; pi-intercom is replaced by Claude Code's cross-session messages, and the pi extension by a worker-only status line and hook.

## Roles

| Role | Where | Does |
|---|---|---|
| Chief | The Claude Code session that loaded the skill | Plans tasks, writes briefs, starts workers and clears their sessions with herdr, answers them with `SendMessage`, verifies, integrates, reports |
| Worker | Claude Code in a herdr pane, started with `herdr agent start --kind claude` | Reads one brief, implements, verifies, tells the chief with `SendMessage`, hands off when its context gets heavy |

## Built from what herdr and Claude Code already do

There is no wrapper script. Each piece is a native command:

| Need | Native piece |
|---|---|
| A pane for a worker | `herdr tab create`, `herdr pane split --no-focus`, or `herdr worktree create` |
| Start Claude Code there | `herdr agent start <name> --kind claude --pane <id> -- <claude args>` |
| Give it a task | `herdr agent prompt <name> "<text>" --wait --until working` |
| Hear back, answer questions | `SendMessage` between local sessions. `claude --name <name>` makes the session name the worker's address. A message to an idle session starts a new turn there. |
| Notice a worker that stops silently | `SendMessage` with `notify_when_idle: true`: one notice when it next goes idle or exits |
| Notice a worker stopped at a dialog | `herdr agent wait <name> --until blocked` as a background Bash command; its exit wakes the chief |
| Let it read the brief and write handoffs | `claude --add-dir "$RUN" "$HOME/.agents/skills/handoff"`: everything outside its working directories asks first, even in auto mode |
| See its state | `herdr agent list`: `.agent_status` (working, idle, blocked, missing) and `.tokens.context` (from the worker's status line) |
| Fresh session | `herdr agent prompt <name> "/clear"`: a new conversation in the same process |
| Worker-only config | `claude --settings "$RUN/worker-settings.json"`: merged over the user's settings, so herdr's own SessionStart hook still runs |
| Hand off | the `handoff` skill, read as a file (it has `disable-model-invocation`) |

Messages wake the chief, so it never blocks in a wait loop and the user can talk to it while workers run. Unlike pi-intercom there is no blocking ask: a worker sends its question and ends its turn, and the chief's reply starts its next one.

## Why `/clear` instead of a restart

The pi skill restarts its workers because pi's `/new` drops the session name, and with it the intercom address. Claude Code's `/clear` keeps it: the process, its `--name` and so its `SendMessage` address stay, and only the conversation is new. One command replaces `/exit` and `agent start`, with no startup wait, no `agent_pane_busy` retry and no args to repeat. The settings, `--add-dir` and the appended worker protocol stay loaded. The herdr agent never exits, so the blocked watcher keeps running. The new session ID gives the hook a fresh once-per-session nudge, and herdr's SessionStart hook reports the new session.

A full restart is left for a crashed worker, or one that needs other args.

## Why a status line and a hook

The handoff threshold has to fire inside the worker, mid-run, when nothing reaches the chief. Claude Code's auto-compaction summarises in place instead of handing off, and hooks get no context usage. Only the status line does (`context_window.used_percentage`). So `hooks/context-limit.mjs` runs twice over:

- as the worker's status line, it writes the percentage to `$TMPDIR/grind/context/<session_id>.json` and reports it to herdr as the pane's `context` token when it changes;
- as a PostToolUse hook, it reads that file and, once past `GRIND_LIMIT`, returns `additionalContext` telling the worker, once per session, to finish its step, write a handoff and tell the chief. It skips `SendMessage` calls, since a report usually ends the turn.

The threshold travels in the settings' `env` block, which reaches both. `herdr worktree create` has no `--env`, so the pane environment is not used.

## Sequences

### Start and assign

```
chief                                   herdr                         worker
  | tab create / pane split --no-focus    |                              |
  | agent start g-api --kind claude -- --name g-api --settings ...       |
  |-------------------------------------->|----------------------------->| claude starts, named g-api
  | agent prompt "Task t1: ..." --wait --until working                   |
  |-------------------------------------->|----------------------------->| works
  | SendMessage g-api notify_when_idle                                   |
  | ends its turn                                                        |
  |<------------------- SendMessage: what it did, checks, issues --------|
  |<------------------- idle notice -------------------------------------|
```

### Handoff

```
worker: tool call, status line says context >= limit
  -> hook additionalContext: finish the step, write handoff, tell the chief
  -> SendMessage "handoff at <path>", ends turn
chief: agent prompt "/clear";
       agent prompt "Continue task t1. Read the handoff <path> ..." --wait --until working;
       SendMessage g-api notify_when_idle
```
