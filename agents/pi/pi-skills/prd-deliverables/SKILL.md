---
name: prd-deliverables
description: Use when a Pi user has a PRD, especially from to-prd, and needs to split it into executable deliverables or complete the next deliverable with Pi subagents.
---

# PRD Deliverables

Turn a `to-prd` PRD into project-local Pi execution state, then complete one deliverable at a time with Pi subagents while the parent agent owns validation and state updates.

This is the Pi-native successor to the OpenCode/Claude-oriented `spec-task` + `complete-next-deliverable` workflow.

## When to Use

Use this skill when the user says:

- "split this PRD into tasks/deliverables"
- "create deliverables from this PRD"
- "complete the next deliverable"
- "continue the PRD implementation"
- "use subagents to implement the next task"

Expected upstream step: `to-prd` has created or summarized a PRD. If no PRD exists, first use `to-prd` to synthesize one from the current conversation.

## Workflow

```
to-prd PRD ──► SPLIT ──► VALIDATE ──► EXECUTE NEXT ──► REVIEW ──► UPDATE STATE
```

State is always project-local:

```text
<project>/.pi/state/<spec-name>/
├── prd.md        # PRD copy/snapshot from to-prd
├── spec.json     # executable deliverables + task verification
└── progress.md   # append-only cross-iteration memory
```

Never write state to global paths like `~/.pi/state`.

## Commands

Run from the target project root so state lands in that project's `.pi/state`. Use the script path from this skill checkout:

```bash
# Initialize project-local state from a PRD file
node <path-to-skills>/prd-deliverables/scripts/prd-deliverables.js init <name> --prd <path-to-prd.md>

# Validate the generated deliverable state
node <path-to-skills>/prd-deliverables/scripts/prd-deliverables.js validate <spec-name>

# Print the next unblocked deliverable
node <path-to-skills>/prd-deliverables/scripts/prd-deliverables.js next <spec-name>
```

The agent, not the script, performs semantic PRD splitting. The script only initializes, validates, and selects deterministic state. Below, `<prd-deliverables-script>` means the absolute path to `skills/prd-deliverables/scripts/prd-deliverables.js`; run it from the target project root.

## SPLIT: PRD to Deliverables

1. Read `prd.md` or the PRD issue content.
2. If repo context is needed, delegate reconnaissance to `scout` or `context-builder` instead of loading excessive files in the parent context.
3. Optionally delegate decomposition critique to `planner`.
4. Parent agent writes `spec.json`.
5. Run `node <prd-deliverables-script> validate <spec-name>`.
6. Present a concise summary and next command.

Deliverables should be ordered, independently reviewable increments. Tasks under a deliverable should describe outcomes and verifiable checks, not step-by-step coding instructions.

## EXECUTE NEXT: Subagent-Curated Completion

Before delegating, inspect available agents with the subagent list action.

1. Run `node <prd-deliverables-script> next <spec-name>`.
2. Read `progress.md`, especially `## Codebase Patterns`.
3. Mark selected deliverable `IN_PROGRESS`; set root `phase` to `IN_PROGRESS`.
4. Delegate implementation to `worker` with:
   - state directory path
   - exact deliverable JSON
   - relevant PRD excerpt
   - progress patterns
   - instruction to satisfy verification steps only, not expand scope
5. Run checks in parent context: format, lint, typecheck, tests, or project equivalents.
6. Delegate review to `reviewer` or `code-reviewer` with the diff and verification criteria.
7. Fix review/check failures.
8. Parent updates `spec.json` only after verification:
   - each completed task: `passes: true`
   - deliverable: `status: COMPLETE`
   - root `phase: COMPLETE` only when all deliverables complete
9. Append to `progress.md` with files changed, checks run, learnings, and reusable patterns.

Parent agent remains accountable for final correctness even when subagents implement or review.

## Output Contract

After SPLIT, output:

```text
=== PRD Deliverables Ready ===
State: .pi/state/<spec-name>/
Deliverables: <count>
- D1: <name> (<effort>) - <task-count> tasks
- D2: <name> (<effort>) - depends on: D1
Next: complete next deliverable for <spec-name>
```

After EXECUTE NEXT, output:

```text
=== Deliverable Complete ===
Spec: <spec-name>
Deliverable: <id> <name>
Checks: <commands and result>
Review: <subagent reviewer summary or skipped reason>
Next: <next deliverable id/name or COMPLETE>
```

If all deliverables are complete, output exactly once:

```text
<tasks>COMPLETE</tasks>
```

## File Layout

- `SKILL.md` — core workflow and guardrails
- `scripts/prd-deliverables.js` — initialize, validate, select next deliverable
- `references/schema.md` — `spec.json` contract
- `references/subagents.md` — delegation patterns
- `assets/spec-template.json` — example deliverable state
- `assets/progress-template.md` — progress file shape
- `config.example.json` — configurable defaults

## Gotchas

- Do not copy the old OpenCode flow verbatim; Pi state is `.pi/state` and Pi subagents are first-class workflow participants.
- Do not let worker subagents update final state without parent verification; parent owns `spec.json` truth.
- Do not turn tasks into implementation recipes; tasks need observable verification steps.
- Do not mark `passes: true` before checks/review prove the behavior.
- Do not load large docs/code into the parent context when a `scout`, `context-builder`, or `planner` subagent can summarize.
- Do not create deliverables that span unrelated concerns; each deliverable should be reviewable and reversible.
