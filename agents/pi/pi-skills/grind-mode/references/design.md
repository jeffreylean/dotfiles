# grind-mode design

## Roles

| Role | Where | Does |
|---|---|---|
| Chief | The pi session that loaded the skill | Plans tasks, writes briefs, starts and restarts workers with herdr, answers them over intercom, verifies, integrates, reports |
| Worker | pi in a herdr pane, started with `herdr agent start --kind pi` | Reads one brief, implements, verifies, tells the chief over intercom, hands off when its context gets heavy |

## Built from what herdr and pi already do

There is no wrapper script. Each piece is a native command:

| Need | Native piece |
|---|---|
| A pane for a worker | `herdr tab create`, `herdr pane split --no-focus`, or `herdr worktree create` |
| Start pi there | `herdr agent start <name> --kind pi --pane <id> -- <pi args>` |
| Give it a task | `herdr agent prompt <name> "<text>" --wait --until working` |
| Hear back, answer questions | pi-intercom, loaded in every pi session. `pi --name <name>` makes the session name the worker's intercom address. |
| See its state | `herdr agent list` (working, idle, blocked, missing) and `intercom list` (context use per session) |
| Fresh session | `/new`, then `/name <worker>` so the intercom address stays |
| Hand off | the `handoff` skill |

Intercom messages wake the chief, so it never blocks in a wait loop and the user can talk to it while workers run. A worker's `intercom ask` blocks the worker until the chief replies, which fits a decision it cannot make alone.

## Why a new session, not a new process

`/new` then `/name <worker>` gives the worker a clean context in the same process: the pane, the herdr name, the model, the thinking level, the extension and the appended protocol all stay. A session name belongs to its session, so without `/name` the new session would have no name and its intercom address would change. Restarting the process (`/quit`, then `herdr agent start`) is only for a crashed or hung pi: it is slower, and the herdr name can be lost on the way, after which only the pane ID reaches it.

## Why one small extension

The handoff threshold has to fire inside the worker, mid-run, when nothing reaches the chief. pi's own compaction threshold is a global setting and summarises in place instead of handing off. So `grind-worker.ts` checks `getContextUsage()` after each turn with tool calls, and once past `--grind-limit` (30% by default) steers the worker, once per session, to finish its step, write a handoff and tell the chief. Turns without tool calls are skipped, since they end the run anyway.

## Sequences

### Start and assign

```
chief                                 herdr                         worker
  | tab create / pane split --no-focus  |                              |
  | agent start g-api --kind pi -- --name g-api ...                    |
  |------------------------------------>|----------------------------->| pi starts, named g-api
  | agent prompt "Task t1: ..." --wait --until working                 |
  |------------------------------------>|----------------------------->| works
  | ends its turn                                                      |
  |<------------------- intercom send: what it did, checks, issues ----|
```

### Handoff

```
worker: turn_end with tool calls, context >= limit
  -> steer: finish the step, write handoff, tell the chief
  -> intercom send "handoff at <path>", ends turn
chief: agent prompt "/new"; agent prompt "/name g-api";
       agent prompt "Continue task t1. Read the handoff <path> ..." --wait --until working
```
