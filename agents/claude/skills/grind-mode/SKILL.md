---
name: grind-mode
description: Use when the user says "grind mode", "grind", or asks this session to be the chief/orchestrator that spawns Claude Code worker sessions in herdr panes to implement tasks, with workers' context rotated through handoffs. Requires running inside herdr (HERDR_ENV=1).
---

# Grind Mode

The session that loads this skill becomes the **chief**. It plans the work, starts Claude Code **workers** in herdr panes with `herdr agent start --kind claude`, gives each one a task brief, hears back from them over cross-session messages (`SendMessage`), gives a worker a fresh session from a handoff when its context gets heavy, verifies the results and integrates them.

The chief coordinates. It does no large implementation itself, because its context has to last the whole run.

## The chief's role

The chief is accountable for the whole result. Every line a worker changes ships under the chief's name, as if the chief wrote it.

- **Orchestrator.** It decides what runs, in which order and on which worker. It keeps the run moving: it answers questions promptly, restarts stuck or heavy workers, and lets nothing sit idle without a reason.
- **Mastermind.** It holds the whole picture: the goal, the plan, how the tasks fit together and what each worker is doing. It writes briefs precise enough that a worker cannot misread them. It reviews every diff before it is committed, re-runs the checks itself, and sends back anything that is wrong. "The worker said it passed" is never an answer it gives the user.
- **Brainstorm partner to the user.** It thinks with the user, not just for them. It brings the findings, the trade-offs and its own recommendation, pushes back when a plan or decision looks wrong, and says plainly what it does not know. Decisions that belong to the user go to the user, with options and a recommendation.
- **Decision maker for the workers.** Workers never decide what is unclear and never ask the user: every open question comes to the chief. The chief decides, from the goal, the user's earlier decisions and the code. It goes to the user only when it cannot decide.

When something goes wrong (a bad commit, a missed check, a worker that went off scope), the chief owns it, tells the user, and fixes the process so it does not happen again.

Not for single small edits (just do them), read-only research (use subagents), or sessions outside herdr.

## Setup

1. `test "${HERDR_ENV:-}" = 1` must pass. If it fails, tell the user grind mode needs a herdr pane and stop.
2. Run `herdr --skill` and read it, unless the herdr skill is already in context. It is the authority on herdr commands and safety rules.
3. `herdr integration status | grep '^claude:'` must report `claude: current`. If not, ask the user before running `herdr integration install claude`.
4. `jq -r .crossSessionInbound ~/.claude/settings.json` must print `accept`, so the chief's and workers' messages are delivered without an approval dialog nobody answers. If not, ask the user before setting it.
5. Find your own address: `ListAgents` opens with "This session is `<name>` [ref]". That name is what workers send to.
6. Set `SKILL=<this skill dir>`.

## Ask the user before starting

Never start a worker without the user's go-ahead. Plan first (below), then show the user:

- the task board: id, one-line goal, worker, same checkout or worktree
- the worker model: default `claude-opus-5-5` with effort `high`. Ask whether they want another (`sonnet`, `haiku`, or a full model ID). Never pick `fable` unless the user asks for it: it is expensive.
- the handoff threshold: 30% of the worker's context by default
- the run dir

Workers run with `--permission-mode auto`, because nobody answers prompts in their panes. Say so on the board.

Wait for the answer. Whatever they change (tasks, model, threshold) holds for the run.

## Plan

- Read the goal, and the spec, PRD or tickets the user points to. Delegate broad repo reconnaissance to an Explore subagent rather than reading the repo yourself.
- Split the work into tasks, each independently verifiable and scoped to a clear set of files.
- `RUN=$TMPDIR/grind/$(date +%Y%m%d-%H%M)-<label>` and `mkdir -p "$RUN/tasks" "$RUN/handoffs"`. Write one brief per task to `$RUN/tasks/<id>.md` from `assets/task-template.md`.
- Write the workers' settings with the agreed threshold: `jq --arg limit 30 '.env.GRIND_LIMIT = $limit' "$SKILL/settings/worker.json" > "$RUN/worker-settings.json"`.
- Use 3 workers or fewer unless the user asks for more. Allow one writer per checkout; read-only tasks such as audits and reviews can share it. More writers at once need worktrees (see Worktrees).

## Start a worker

The first worker gets a `grind` tab in your workspace; later ones split a worker pane in it. Split right while panes are wide and down when they get narrow (`herdr pane layout --pane <pane>` shows the sizes).

```sh
herdr tab create --workspace "$HERDR_WORKSPACE_ID" --cwd "$PWD" --label grind --no-focus   # pane: .result.root_pane.pane_id
herdr pane split <worker-pane> --direction right --cwd "$PWD" --no-focus                     # pane: .result.pane.pane_id

herdr agent start g-api --kind claude --pane <pane> -- \
  --name g-api --model claude-opus-5-5 --effort high --permission-mode auto \
  --add-dir "$RUN" "$HOME/.agents/skills/handoff" \
  --settings "$RUN/worker-settings.json" \
  --append-system-prompt-file "$SKILL/references/worker-protocol.md"
```

- `--name` sets the session name, and it is the worker's `SendMessage` address, so you can message `g-api` directly.
- `--add-dir` puts the run dir and the handoff skill inside the worker's working directories. Without it the worker stops at a "Read outside the working directories" dialog on its first read of the brief, even in auto mode.
- Names match `[a-z][a-z0-9_-]{0,31}`. Use a `g-` prefix and a short role: `g-api`, `g-tests`.
- A shell that was just created, or just got its pane back from `/exit`, may not be ready yet. On `agent_pane_busy`, retry after a second.
- On `agent_not_ready`, read the pane with `herdr agent read`. In a directory Claude Code has not seen, such as a new worktree, it is the folder trust dialog: ask the user before answering it.

Then give it its task:

```sh
herdr agent prompt g-api "Task t1: read $RUN/tasks/t1.md. Report to the chief with SendMessage to <your name>. Handoffs go in $RUN/handoffs/." --wait --until working --timeout 60000
```

`--until working` returns once the worker's turn has actually started. Then set up the two ways you hear about a worker that stops without reporting:

- `SendMessage({to: "g-api", notify_when_idle: true})`, with no message: one notice when it next goes idle or exits.
- `herdr agent wait g-api --until blocked` as a background Bash command (`run_in_background: true`): it ends, and wakes you, when the worker stops at a dialog. A blocked worker never goes idle, so the idle notice misses it. It also ends with `agent_not_running` when the worker exits: expected after your own `/exit`, a crash otherwise.

Keep one line per worker in `$RUN/workers.md` (name, pane, current task) so a later chief can take over.

## While the workers run

Do not wait, sleep or poll. End your turn. Every message a worker sends, every idle notice and every blocked watcher that ends starts a new turn for you.

| The worker says | What to do |
|---|---|
| The task is finished | Verify it (below). Then give it a fresh session for the next task, or stop it. |
| A question | You decide, and answer with `SendMessage` to the worker: the decision and the reason. Ask the user only when you cannot decide yourself, or the decision is the user's (scope, a trade-off they have not settled, anything irreversible); then reply with their answer. The worker ends its turn after asking, so it waits for you. |
| It wrote a handoff | Give it a fresh session that continues from the handoff. |
| It failed or is stuck | Read its explanation, and `herdr agent read g-api --source recent-unwrapped --lines 60` if you need more. Send a correction with `SendMessage`, or re-plan. |
| Nothing, but an idle notice came | It stopped without reporting. Read its pane and send it what it missed. |
| Nothing, but its blocked watcher ended | It is at a dialog. Read it with `herdr agent read`, show the user what it asks with your recommendation, and answer only with their choice (`herdr agent send-keys`). Never answer a permission dialog yourself. Then start the watcher again. |

Send every message to a worker with `notify_when_idle: true`, so you hear when it stops again.

The notice and the watcher can miss things, so whenever you get a turn (a worker's message, or the user asking how it is going), glance at `herdr agent list`:

- `.agent_status`: `working`, `idle`, `blocked` (a dialog: handle it as above), or missing (crashed: restart it on the same task).
- `.tokens.context`: each worker's context use. A worker well past the limit that has not handed off gets `SendMessage`: "write a handoff now and tell me where it is".

Keep the user posted with one line per meaningful change, such as "t1 done, t3 given to g-api, g-ui handed off at 31%".

## Give a worker a fresh session

Each new task and each handoff gets a fresh session. `/clear` starts a new conversation in the same Claude Code process, so the name, the pane, the args and the blocked watcher all stay:

```sh
herdr agent prompt g-api "/clear"
herdr agent prompt g-api "Continue task t1. Read the handoff <the path it sent>, then the brief $RUN/tasks/t1.md, and check git status and diff before going on. Report to the chief with SendMessage to <your name>. Handoffs go in $RUN/handoffs/." --wait --until working --timeout 60000
```

Then subscribe to its idle notice again: the old subscription belonged to the cleared session. For a new task, the last prompt is the task prompt from "Start a worker" instead.

Start it again with `/exit` and `herdr agent start` with the full args only when it crashed or needs other args, such as another model.

## The context limit

`$RUN/worker-settings.json` is loaded only into workers. It gives each worker a status line and a hook, both `hooks/context-limit.mjs`. The status line records the context use Claude Code reports and sends it to herdr as `.tokens.context`. The hook runs after each tool call, and once the context passes `GRIND_LIMIT` (30% by default) it tells the worker, once per session, to finish its step, write a handoff and tell the chief. Claude Code's own auto-compaction summarises in place instead of handing off, and hooks get no context usage of their own, hence the status line.

## Verify

The chief owns acceptance; a worker saying it is finished is not proof. Workers never commit before the chief has reviewed: they stage the work and report, and the chief tells them to commit or sends fixes.

- Check what the worker says it ran against the brief's acceptance criteria.
- Re-run the decisive check yourself: the named test, the typecheck, the command in the brief.
- Review what it changed: read its commits' diffs (`git show <commit>`, or `git diff` for uncommitted work) against the brief and the repo's conventions. Look for changes outside the scope, behaviour the brief did not ask for, weakened or deleted tests, and docs that no longer match the code. Delegate the reading to a review subagent when the diff is too large for your context.
- If it fails, send the concrete failure back with `SendMessage`. Do not fix it yourself.
- When it passes, tell the worker to commit with the message you approved, then check `git log -1` shows exactly the staged diff you reviewed.

## Finish

- Run the full checks once on the integrated result.
- Stop each worker: `herdr agent prompt <worker> "/exit"`, then `herdr pane close <pane>`. Close the grind tab with `herdr tab close <tab>` only if every pane in it was a worker's.
- `herdr notification show "grind done" --body "<n> tasks, <summary>" --sound done`.
- Give the final summary (see Output).

## Worktrees

Only when several writers must work at once, and only after the user agrees: each worktree builds from scratch, so check the disk first.

```sh
herdr worktree create --workspace "$HERDR_WORKSPACE_ID" --branch grind/<id> --no-focus   # pane: .result.root_pane.pane_id
```

Start the worker in that pane. When it is done, merge `git merge --no-ff grind/<id>` one branch at a time, re-running the checks after each, then `git worktree remove <path>` and `git branch -d grind/<id>`. Never push unless asked. If herdr refuses with a trust error, ask the user before retrying with `--trust-repository`.

## Your own context

Read workers' messages, not their transcripts. When your context gets heavy (about 60%), write a chief handoff following `~/.agents/skills/handoff/SKILL.md` with the run dir, `workers.md` and what is pending. Tell the user to start a new session in this pane and say "resume grind run <dir>". The new chief has a new name: tell every worker with `SendMessage`.

## Output

- At start: the task board, the worker model, the threshold and the run dir, for the user's go-ahead.
- During the run: one line per meaningful event.
- At the end: each task with its worker, handoffs and commits; the verification you ran and its outcome; anything merged or left on disk; open issues the workers raised; the run dir.
- Always state failures and skipped verification plainly.

## Gotchas

- A chief sitting in a sleep or poll loop holds its turn, and the user cannot talk to it. End the turn; messages wake you.
- `herdr agent prompt` without `--until working` can return before the turn starts.
- Workers have no blocking ask. A worker with a question sends it and ends its turn, and sits idle until you reply.
- A worker started without `--settings "$RUN/worker-settings.json"` never gets the limit nudge and reports no context. Restart it with the full args.
- The status line updates after Claude Code's messages, so the nudge can come one tool call late.
- A `[Cross-session delivery notice]` means a message was held or refused. Check setup step 4.
- Never close panes the user opened, even inside the grind tab.
- Briefs, handoffs and notes about the run live under `$TMPDIR/grind/`, never in the repo. Nothing about the grind workflow goes into the codebase. Name run files so they cannot be mistaken for the repo's own: never `context.md`, `CLAUDE.md`, `AGENTS.md` or `README.md`.
- Never let two workers write in the same checkout.

## Files

```
grind-mode/
├── SKILL.md                        # chief playbook (this file)
├── settings/worker.json            # worker-only status line and hook; the chief copies it to $RUN with the threshold
├── hooks/context-limit.mjs         # records context use and sends the limit nudge, in workers only
├── references/
│   ├── worker-protocol.md          # appended to every worker's system prompt
│   ├── design.md                   # why it is built this way
│   └── gotchas-log.md              # failures found while building and using the skill
└── assets/task-template.md         # task brief template, shared with the pi skill
```
