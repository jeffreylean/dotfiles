---
name: spec-task
description: Convert markdown specs to executable JSON format for autonomous task completion. Use AFTER spec-planner produces a complete spec to generate spec.json with verification steps. Triggers: "break this down into tasks", "convert spec to JSON", "create executable tasks from spec".
---

# Spec Task

Convert implementation-ready specs to executable JSON format for autonomous task completion.

The spec defines the **end state** via deliverables with verification steps. The agent decides HOW to get there.

Based on [Anthropic's research on long-running agents](https://www.anthropic.com/engineering/effective-harnesses-long-running-agents).

---

## Workflow Phases

```
PARSE ──[extract]──► CONVERT ──[output]──► VALIDATE
   │                       │                   │
   └──[unstructured]──◄────┴────[invalid]──────┘
```

**State phase at end of every response:**
```
---
Phase: PARSE | Status: extracting deliverables
```

---

## Phase 1: PARSE (Automatic)

Read and extract structured content from markdown specs.

1. **Determine state directory (PROJECT-LOCAL, not global):**
   - Use current working directory (cwd) as the project root
   - Claude Code → `<cwd>/.claude/state/`
   - OpenCode → `<cwd>/.opencode/state/`
   - Pi → `<cwd>/.pi/state/`
   - Codex → `<cwd>/.codex/state/`
   - Default: `<cwd>/.agents/state/`

   **IMPORTANT:** NEVER use global directories like `~/.<agent>/state/` - always use the project's local state directory.

2. **Read the markdown spec** (must follow spec-planner format)

3. **Extract sections:**
   - Deliverables (ordered list with D1, D2, etc.)
   - Success Metrics / Acceptance Criteria
   - Open Questions
   - Context (key files, patterns, non-goals)

**Transition:** Spec structure understood → CONVERT

---

## Phase 2: CONVERT (Automatic)

Transform spec content into executable JSON.

**Generate JSON structure:**
```json
{
  "specName": "<kebab-case-from-spec-title>",
  "phase": "READY",
  "deliverables": [
    {
      "id": "D1",
      "name": "Scaffolding Template Migration",
      "effort": "M",
      "status": "PENDING",
      "dependsOn": [],
      "tasks": [
        {
          "id": "D1-1",
          "category": "file-conversion",
          "description": "Convert pyproject.toml to PEP 621 format",
          "steps": [
            "[tool.poetry] replaced with [project]",
            "Jinja2 variables preserved",
            "Dependencies use PEP 440 versions",
            "File validates with tomllib"
          ],
          "passes": false
        }
      ]
    }
  ],
  "context": {
    "patterns": ["existing code patterns"],
    "keyFiles": ["important file paths"],
    "nonGoals": ["explicitly out of scope"]
  }
}
```

**Output files (in PROJECT's state directory):**
```
<cwd>/.<agent>/state/<spec-name>/
├── spec.md       # Copy of markdown spec (original retained at source location)
├── spec.json     # Generated executable JSON
└── progress.txt  # Empty file to track execution progress
```

**Example:** If converting `specs/my-feature.md` in `/home/user/myproject` using Claude Code:
- `/home/user/myproject/.claude/state/my-feature/spec.md`
- `/home/user/myproject/.claude/state/my-feature/spec.json`
- `/home/user/myproject/.claude/state/my-feature/progress.txt`

**Transition:** JSON generated → VALIDATE

---

## Phase 3: VALIDATE (Automatic + User Confirmation)

Verify the conversion and present to user.

**Check for:**
- All deliverables extracted with correct ordering
- Dependencies between deliverables mapped correctly
- Tasks have verifiable steps (not implementation instructions)
- Categories are appropriate (file-conversion, setup, testing, etc.)
- Context preserved from spec

**Present summary:**
```
Spec converted and saved to <state-dir>/<spec-name>/
  - spec.md (copied from <original-path>, original retained)
  - spec.json (generated)
  - progress.txt (empty)

Spec: <spec-name>
Deliverables: X total
  - D1: <name> (M) - N tasks
  - D2: <name> (L) - N tasks

Dependencies: <ordered list>
Non-goals (excluded): <list>

To complete deliverables:
   /complete-next-deliverable <spec-name>

This will:
  1. Read current progress
  2. Choose next pending deliverable
  3. Complete all tasks until verification passes
  4. Mark deliverable complete
  5. Update progress
```

**Transition:** User confirms → DONE

---

## Phase 4: DONE

### Final Output

```
=== Spec Conversion Complete ===

Phase: DONE
Spec: <spec-name>
Status: Ready for execution

Deliverables: X total
- D1: <name> (M) - N tasks
- D2: <name> (L) - N tasks  [depends on: D1]

Total Tasks: N
Execution Order: <D1 → D2 → D3>

Next Step:
  /complete-next-deliverable <spec-name>
```

---

## Input Format

Expects markdown specs in spec-planner format:

```markdown
# Spec: <Feature Name>

**Date:** YYYY-MM-DD
**Status:** APPROVED
**Effort:** L
**Type:** Feature Plan
**Phase:** APPROVED

## Deliverables Summary (Ordered)

1. **[D1]** First Deliverable (M) - No dependencies
   - Task A
   - Task B

2. **[D2]** Second Deliverable (L) - Depends on: D1
   - Task C
   - Task D

## Implementation Plan

### Deliverable 1: First Deliverable (M)

#### Task 1.1: Description [category]
Detailed description.

**Verification:**
- [ ] Step 1
- [ ] Step 2

#### Task 1.2: Description [category]

**Verification:**
- [ ] Step 3
- [ ] Step 4

## Success Metrics

- [ ] Criteria 1
- [ ] Criteria 2

## Context

### Key Files
- `path/to/file.ts`

### Patterns
- Pattern description

### Non-Goals
- Out of scope item
```

---

## Output Format

### spec.json Schema

| Field | Type | Description |
|-------|------|-------------|
| `specName` | string | Unique identifier from spec title (kebab-case) |
| `phase` | string | Current execution phase: "READY", "IN_PROGRESS", "COMPLETE" |
| `deliverables` | array | List of deliverable objects |
| `context` | object | Reusable patterns, key files, non-goals |

### Deliverable Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Deliverable ID: "D1", "D2", etc. |
| `name` | string | Human-readable deliverable name |
| `effort` | string | S/M/L/XL from spec |
| `status` | string | "PENDING", "IN_PROGRESS", "COMPLETE" |
| `dependsOn` | string[] | IDs of blocking deliverables |
| `tasks` | array | List of task objects |

### Task Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique ID: "D1-1", "D1-2", etc. |
| `category` | string | Grouping: "file-conversion", "setup", "testing", "documentation", etc. |
| `description` | string | What the task achieves |
| `steps` | string[] | **Verification steps** - how to test it works |
| `passes` | boolean | Set to `true` when ALL steps verified |

---

## Conversion Rules

### Task Sizing

Keep tasks small and focused:
- One logical change per task
- If a deliverable section feels too large, break into multiple tasks
- Prefer many small tasks over few large ones

Quality over speed. Small steps compound into big progress.

### From Markdown to JSON

1. **Deliverables** from `## Deliverables Summary (Ordered)`
   - Parse numbered list items starting with **[D1]**, **[D2]**, etc.
   - Extract effort (S/M/L/XL) from parentheses
   - Extract dependencies from "depends on:" text

2. **Tasks** from `#### Task X.Y: Name [category]`
   - Generate ID as `<deliverable-id>-<number>`
   - Category from bracket notation [category]
   - Description from task title and body

3. **Verification Steps** from `**Verification:**` sections
   - Convert checklist items to array of strings
   - Remove `- [ ]` markdown syntax
   - Steps describe HOW TO TEST, not how to build

4. **Context** preserved from spec:
   - `context.patterns` - from `### Patterns`
   - `context.keyFiles` - from `### Key Files`
   - `context.nonGoals` - from `### Non-Goals` or `## Non-Goals`

---

## Field Rules

**READ-ONLY except:**
- `phase`: Update when deliverable status changes
- `deliverables[].status`: Update as work progresses
- `deliverables[].tasks[].passes`: Set to `true` when ALL verification steps pass

**NEVER edit or remove deliverables/tasks** - This could lead to missing functionality.

---

## Example

### Input: uv-migration.md

```markdown
# Spec: UV Migration

**Date:** 2026-02-12
**Status:** APPROVED
**Effort:** L
**Type:** Feature Plan

## Deliverables Summary (Ordered)

1. **[D1]** Scaffolding Template Migration (M) - No dependencies
2. **[D2]** Create Agent Skill (L) - No dependencies
3. **[D3]** Test on bpbg-ai-hub (M) - Depends on: D2

### Deliverable 1: Scaffolding Template Migration (M)

#### Task 1.1: pyproject.toml [file-conversion]
Convert Poetry format to PEP 621.

**Verification:**
- [ ] `[tool.poetry]` replaced with `[project]`
- [ ] Jinja2 variables preserved
- [ ] File validates with tomllib
```

### Output: spec.json

```json
{
  "specName": "uv-migration",
  "phase": "READY",
  "deliverables": [
    {
      "id": "D1",
      "name": "Scaffolding Template Migration",
      "effort": "M",
      "status": "PENDING",
      "dependsOn": [],
      "tasks": [
        {
          "id": "D1-1",
          "category": "file-conversion",
          "description": "Convert pyproject.toml from Poetry format to PEP 621",
          "steps": [
            "[tool.poetry] replaced with [project]",
            "Jinja2 variables preserved",
            "File validates with tomllib"
          ],
          "passes": false
        }
      ]
    },
    {
      "id": "D2",
      "name": "Create Agent Skill",
      "effort": "L",
      "status": "PENDING",
      "dependsOn": [],
      "tasks": []
    },
    {
      "id": "D3",
      "name": "Test on bpbg-ai-hub",
      "effort": "M",
      "status": "PENDING",
      "dependsOn": ["D2"],
      "tasks": []
    }
  ],
  "context": {
    "patterns": [],
    "keyFiles": [],
    "nonGoals": []
  }
}
```

---

## Agent Detection & State Directory

**CRITICAL:** The state directory is PROJECT-LOCAL, not global.

Detect which agent is running and use the PROJECT's local state directory:
- Claude Code → `<cwd>/.claude/state/`
- OpenCode → `<cwd>/.opencode/state/`
- Pi → `<cwd>/.pi/state/`
- Codex → `<cwd>/.codex/state/`
- Default: `<cwd>/.agents/state/`

**NEVER use global directories like `~/.<agent>/state/`**

State folder structure (in project directory):
```
<cwd>/.<agent>/state/<spec-name>/
├── spec.md       # Copy of markdown spec (original retained at source)
├── spec.json     # Converted JSON
└── progress.txt  # Execution progress
```

---

## Commands

### Convert Spec
```
Load spec-task skill and convert specs/my-spec.md
```

### Complete Deliverable
```
/complete-next-deliverable <spec-name>
```

### Check Progress
```
# Read from PROJECT's local state directory
Read <cwd>/.<agent>/state/<spec-name>/progress.txt
```

---

## Philosophy

This codebase will outlive you. Every shortcut becomes someone else's burden. Every hack compounds into technical debt that slows the whole team down.

You are not just writing code. You are shaping the future of this project. The patterns you establish will be copied. The corners you cut will be cut again.

Fight entropy. Leave the codebase better than you found it.
