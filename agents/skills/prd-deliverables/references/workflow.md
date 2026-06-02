# Workflow Details

## 1. Generate PRD

Use `to-prd` from the current conversation or issue context. It should produce a PRD with problem, solution, user stories, implementation decisions, testing decisions, out of scope, and notes.

## 2. Initialize State

```bash
# Run from the target project root. Use the absolute path to this skill's script.
node /path/to/skills/prd-deliverables/scripts/prd-deliverables.js init <name> --prd <prd.md>
```

This creates `.pi/state/<name>/prd.md`, `spec.json`, and `progress.md`.

## 3. Split PRD

Create deliverables by slicing the PRD into independently shippable increments. A good deliverable usually has:

- one clear user-visible or developer-visible outcome
- explicit dependencies
- 1-5 tasks
- task verification steps that can be checked objectively
- non-goals copied into context when relevant

## 4. Validate

```bash
node /path/to/skills/prd-deliverables/scripts/prd-deliverables.js validate <name>
```

Fix schema errors before implementation.

## 5. Complete Next Deliverable

```bash
node /path/to/skills/prd-deliverables/scripts/prd-deliverables.js next <name>
```

Delegate implementation to `worker`, review to `reviewer`, run project checks, then update state.

## 6. Continue Until Complete

Repeat next-deliverable execution until all deliverables are `COMPLETE` and root phase is `COMPLETE`.
