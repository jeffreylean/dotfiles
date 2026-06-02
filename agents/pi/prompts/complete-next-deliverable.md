---
description: Complete the next PRD deliverable from .pi/state using Pi subagents
argument-hint: "[spec-name] [extra constraints]"
---

Complete the next incomplete deliverable from a Pi PRD deliverables state file.

This command is curated for the `prd-deliverables` skill workflow:

```text
to-prd PRD -> prd-deliverables split -> .pi/state/<spec-name>/ -> complete next deliverable
```

User arguments:

```text
$ARGUMENTS
```

## Operating Rules

- Use project-local state only: `.pi/state/<spec-name>/`.
- Never use global state like `~/.pi/state`.
- Complete exactly one deliverable per command invocation.
- Parent agent owns final verification and state updates, even if subagents implement or review.
- Do not mark tasks `passes: true` until checks/review prove the verification steps pass.
- Preserve PRD non-goals; do not expand scope.
- Before/after writing code, check for dead code and duplicated logic.

## 1. Locate State

Treat `$1` as a `spec-name` only if `.pi/state/$1/spec.json` exists in cwd or an ancestor. Otherwise treat all arguments as extra constraints.

First determine the active project root: use `git rev-parse --show-toplevel` when available, otherwise use cwd. Do not search above that root; this prevents accidentally using `~/.pi/state` or another outer project.

1. Search only `<project-root>/.pi/state/*/spec.json`.
2. If `$1` matches one discovered spec, use it as `<spec-name>` and treat `${@:2}` as extra constraints.
3. If `$1` does not match and exactly one spec exists, use that spec and treat `$ARGUMENTS` as extra constraints.
4. If multiple specs exist and `$1` does not match, list them and ask the user which to run.
5. If none exist, stop and tell the user to first run the `prd-deliverables` SPLIT workflow from a `to-prd` PRD.

Use absolute paths after locating `<state-dir>`.

Expected files:

```text
<state-dir>/
├── prd.md
├── spec.json
└── progress.md
```

## 2. Validate and Select Next Deliverable

Find the `prd-deliverables` helper script. Prefer project/package skill paths under the active project root, then installed user skill paths. Do not scan arbitrary ancestors.

```bash
find_prd_deliverables_script() {
  local project_root
  project_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

  for candidate in \
    "$project_root/.pi/skills/prd-deliverables/scripts/prd-deliverables.js" \
    "$project_root/.agents/skills/prd-deliverables/scripts/prd-deliverables.js" \
    "$project_root/skills/prd-deliverables/scripts/prd-deliverables.js" \
    "$HOME/.pi/agent/skills/prd-deliverables/scripts/prd-deliverables.js" \
    "$HOME/.agents/skills/prd-deliverables/scripts/prd-deliverables.js" \
    "$HOME/.config/pi/skills/prd-deliverables/scripts/prd-deliverables.js"; do
    if [ -f "$candidate" ]; then echo "$candidate"; return 0; fi
  done

  return 1
}
```

If the script cannot be found, do not stop. Perform equivalent inline validation and selection from `spec.json` using the schema rules in this prompt: `schemaVersion`, `specName`, `phase`, `prd`, `deliverables`, `context`, sequential `D1..Dn`, earlier-only dependencies, task IDs, verification steps, and completion invariants.

When the script is found, run from the project root:

```bash
node <prd-deliverables-script> validate <spec-name>
node <prd-deliverables-script> next <spec-name>
```

When the script is not found, validate and select inline:

1. Ensure `schemaVersion` is `pi-prd-deliverables/v1`.
2. Ensure `phase` is `READY`, `IN_PROGRESS`, or `COMPLETE`.
3. Ensure `prd`, `deliverables`, and `context` exist.
4. Ensure deliverable IDs are sequential in array order: `D1`, `D2`, ...
5. Ensure dependencies reference only earlier deliverables.
6. Ensure every task has `id`, `category`, `description`, non-empty `steps`, and boolean `passes`.
7. Ensure `COMPLETE` deliverables have all tasks `passes: true`.
8. Select the first non-`COMPLETE` deliverable whose dependencies are `COMPLETE`.

If `next` prints `COMPLETE`, set root phase to `COMPLETE` if needed, then output exactly:

```text
<tasks>COMPLETE</tasks>
```

## 3. Get Bearings

Read, in this order:

1. `<state-dir>/progress.md` — especially `## Codebase Patterns`
2. `<state-dir>/spec.json`
3. `<state-dir>/prd.md` relevant sections
4. `git status --short`
5. recent history: `git log --oneline -10`

Identify:

- selected deliverable
- incomplete tasks in order
- verification steps
- dependencies already complete
- non-goals and out-of-scope constraints

## 4. Mark In Progress

Before implementation, update `spec.json`:

- root `phase`: `IN_PROGRESS` unless already `COMPLETE`
- selected deliverable `status`: `IN_PROGRESS`

Do not change task `passes` yet.

## 5. Delegate Implementation

Inspect available subagents before delegating.

Delegate implementation to `worker` when available. Pass a narrow task:

```text
Implement exactly one PRD deliverable.

State dir: <absolute state-dir>
Deliverable JSON: <selected D# object>
PRD excerpt: <relevant PRD sections>
Progress patterns: <Codebase Patterns from progress.md>
Extra user constraints: <arguments after spec-name, or all arguments when spec-name was inferred>

Rules:
- Implement only this deliverable.
- Satisfy each task verification step.
- Do not mark spec.json complete; parent agent updates state after checks.
- Report files changed, checks run, unresolved issues, and reusable patterns.
```

If `worker` is unavailable, implement directly but keep the same scope guardrails.

Use `scout` or `context-builder` first if you need broad codebase reconnaissance. Use `oracle` only for ambiguous architecture/domain decisions.

## 6. Verify

Run all applicable project checks before marking anything complete:

- formatter/check format
- lint
- typecheck/compile
- unit tests
- integration/e2e tests relevant to the deliverable
- any task-specific verification command from `spec.json`

If a check fails, fix and rerun. Do not mark the deliverable complete while checks fail.

## 7. Review

Delegate review to `reviewer` or `code-reviewer` when available. The review must be scoped against both the PRD and the selected `spec.json` deliverable/tasks.

```text
Review the current diff for deliverable <D#>.

Required context:
- PRD path/excerpt: <state-dir>/prd.md, only sections relevant to <D#>
- Spec path: <state-dir>/spec.json
- Selected deliverable JSON: <exact D# object, including tasks and verification steps>
- Non-goals/out-of-scope constraints: <context.nonGoals + PRD Out of Scope>

Review questions:
1. PRD alignment: Does the diff implement the relevant PRD user stories, solution, implementation decisions, and testing decisions?
2. Spec alignment: Does the diff satisfy exactly the selected deliverable and its incomplete tasks from `spec.json`?
3. Scope control: Did the implementation avoid unrelated PRD areas, future deliverables, and explicit non-goals?
4. Verification: Are all task verification steps genuinely satisfied by tests/checks/manual evidence?
5. Code health: Any dead code, duplicated methods/variables/helper logic, security issue, or maintainability issue?

Return format:
- Blocking PRD/spec alignment issues first.
- Blocking verification/code issues second.
- Non-blocking suggestions last.
- Explicitly state whether PRD and `spec.json` task scope are aligned: yes/no.
```

Fix blocking issues and rerun relevant checks.

## 8. Update State

Only after implementation, checks, and review pass:

1. Set each completed task's `passes` to `true`.
2. If all tasks in selected deliverable pass, set deliverable `status` to `COMPLETE`.
3. If all deliverables are complete, set root `phase` to `COMPLETE`.
4. Re-run validation. If the helper script is available:

```bash
node <prd-deliverables-script> validate <spec-name>
```

If the helper script is unavailable, repeat the inline validation rules from Section 2 before continuing.

## 9. Update Progress

Append to `<state-dir>/progress.md`:

```markdown
## Deliverable - <D#>: <name>

### Task - <task-id>
- Implemented:
- Files changed:
- Checks:
- Review:
- Learnings:
```

If you discovered reusable project patterns, also update `## Codebase Patterns` near the top.

## 10. Final Response

Respond concisely:

```text
=== Deliverable Complete ===
Spec: <spec-name>
Deliverable: <D#> <name>
Checks: <commands and pass/fail summary>
Review: <reviewer summary or skipped reason>
Next: <next deliverable id/name or COMPLETE>
```

If all deliverables are complete, include:

```text
<tasks>COMPLETE</tasks>
```
