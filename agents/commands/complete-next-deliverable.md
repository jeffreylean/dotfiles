---
description: Complete the next incomplete deliverable from a spec
---

Complete one deliverable from a spec file. Implements all tasks within the next pending deliverable, runs feedback loops, and commits.

## Usage

```
/complete-next-deliverable <spec-name>
```

Where `<spec-name>` matches `.<agent>/state/<spec-name>/spec.json`

## Agent Detection

Detect which agent is running to determine the state directory:
- Claude Code → `<cwd>/.claude/state/`
- OpenCode → `<cwd>/.opencode/state/`
- Pi → `<cwd>/.pi/state/`
- Codex → `<cwd>/.codex/state/`
- Default: `<cwd>/.agents/state/`

## File Locations

**IMPORTANT**: The state directory may not be at cwd. Search for it:

1. Start at cwd
2. Check if `.<agent>/state/<spec-name>/spec.json` exists
3. If not, go up one directory
4. Repeat until found or reaching filesystem root

Use this bash to find the state directory:

```bash
find_state() {
  local agent="$1"  # e.g. .claude, .opencode, .pi, .codex, .agents
  local spec="$2"
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/$agent/state/$spec/spec.json" ]]; then
      echo "$dir/$agent/state/$spec"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}
```

Once found, use **absolute paths** for all file operations:

```
<state-dir>/
├── spec.md        # Copy of markdown spec
├── spec.json      # Task list with passes field
└── progress.txt   # Cross-iteration memory
```

## Process

### 1. Get Bearings

- Read progress file - **CHECK 'Codebase Patterns' SECTION FIRST**
- Read spec.json - find next deliverable to work on:
  1. Filter deliverables with `status` != `"COMPLETE"`
  2. Among those, pick the first whose `dependsOn` are all `"COMPLETE"`
  3. Within that deliverable, find tasks with `passes: false`
- Check recent history (`git log --oneline -10`)

### 2. Initialize Progress (if needed)

If progress.txt is empty, initialize it:

```markdown
# Progress Log
Spec: <specName from spec>
Started: <YYYY-MM-DD>

## Codebase Patterns
<!-- Consolidate reusable patterns here -->

---
<!-- Task logs below - APPEND ONLY -->
```

### 3. Branch Setup

Extract `specName` from spec, then:
- `git checkout -b <specName>` (or checkout if exists)

### 4. Update Deliverable Status

Set the deliverable's `status` to `"IN_PROGRESS"` in spec.json.

If `phase` is still `"READY"`, set it to `"IN_PROGRESS"`.

### 5. Implement Tasks

Work through each task in the deliverable (in order) until all verification steps pass.

For each task:
1. Implement the change
2. Verify steps pass
3. Set `passes: true` in spec.json

### 6. Feedback Loops (REQUIRED)

Before committing, run ALL applicable:
- Type checking
- Tests
- Linting
- Formatting

**Do NOT commit if any fail.** Fix issues first.

### 7. Mark Deliverable Complete

Once all tasks in the deliverable have `passes: true`:
- Set the deliverable's `status` to `"COMPLETE"` in spec.json
- If ALL deliverables are now `"COMPLETE"`, set top-level `phase` to `"COMPLETE"`

### 8. Update Progress

Append to progress.txt:

```markdown
## Deliverable - [deliverable.id]: [deliverable.name]

### Task - [task.id]
- What was implemented
- Files changed
- **Learnings:** patterns, gotchas

### Task - [task.id]
- ...
```

If you discover a **reusable pattern**, also add to `## Codebase Patterns` at the TOP.

### 9. Commit

- `git add -A && git commit -m 'feat(<scope>): <description>'`

## Completion

If all deliverables have `status: "COMPLETE"`, output:

```
<tasks>COMPLETE</tasks>
```

## Philosophy

This codebase will outlive you. Every shortcut becomes someone else's burden. Patterns you establish will be copied. Corners you cut will be cut again.

Fight entropy. Leave the codebase better than you found it.

<user-request>
$ARGUMENTS
</user-request>
