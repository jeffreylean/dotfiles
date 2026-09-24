# Pi Subagent Delegation Pattern

Use subagents to keep the parent context clean while preserving a single source of truth in `.pi/state/<spec-name>/spec.json`.

## Roles

| Role | Suggested agent | Responsibility |
| --- | --- | --- |
| Recon | `scout` or `context-builder` | Summarize repo patterns, related files, prior tests |
| Decomposition | `planner` | Challenge deliverable boundaries and dependencies |
| Implementation | `worker` | Modify code for exactly one deliverable |
| Review | `reviewer` or `code-reviewer` | Review diff against PRD and verification steps |
| Escalation | `oracle` | Resolve ambiguous architecture or domain decisions |

## Parent Agent Responsibilities

- Inspect configured agents before executing subagents.
- Pass narrow, explicit tasks to subagents.
- Keep `spec.json` and `progress.md` updates in parent control.
- Run final checks in parent context.
- Reject subagent output that expands scope beyond the PRD.

## Worker Prompt Shape

```text
Implement one PRD deliverable.

State dir: <absolute .pi/state/spec-name>
Deliverable JSON: <D# object>
PRD excerpt: <relevant PRD sections>
Progress patterns: <Codebase Patterns from progress.md>

Rules:
- Implement only this deliverable.
- Satisfy each task verification step.
- Do not mark spec.json complete; parent agent will update state after checks.
- Report files changed, checks run, and any unresolved issues.
```

## Reviewer Prompt Shape

```text
Review the current diff for deliverable <D#>.

Criteria:
- Matches PRD user stories and implementation decisions.
- All task verification steps are genuinely satisfied.
- No unrelated scope creep.
- No dead code or duplicated helper logic.
- Tests/checks are appropriate.

Return blocking issues first, then non-blocking suggestions.
```
