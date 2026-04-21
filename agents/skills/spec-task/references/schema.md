# Spec JSON Schema

Complete reference for `spec.json` format.

## Root Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `specName` | string | Yes | Unique identifier from spec title (kebab-case) |
| `ticketId` | string | Yes | JIRA ticket number (e.g., "ARCH-123") |
| `phase` | string | Yes | Current execution phase: "READY", "IN_PROGRESS", "COMPLETE" |
| `deliverables` | array | Yes | List of deliverable objects |
| `context` | object | Yes | Reusable patterns, key files, non-goals |

## Deliverable Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Deliverable ID: "D1", "D2", etc. |
| `name` | string | Yes | Human-readable deliverable name |
| `effort` | string | Yes | S/M/L/XL from spec |
| `status` | string | Yes | "PENDING", "IN_PROGRESS", "COMPLETE" |
| `dependsOn` | string[] | Yes | IDs of blocking deliverables (can be empty) |
| `tasks` | array | Yes | List of task objects |

## Task Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique ID: "D1-1", "D1-2", etc. |
| `category` | string | Yes | Grouping: "file-conversion", "setup", "testing", etc. |
| `description` | string | Yes | What the task achieves |
| `steps` | string[] | Yes | Verification steps - how to test it works |
| `passes` | boolean | Yes | Set to `true` when ALL steps verified |

## Category Values

Common categories for spec tasks:

| Category | Use For |
|----------|---------|
| `file-conversion` | Converting file formats (pyproject.toml, Makefile, etc.) |
| `setup` | Environment setup, tool installation |
| `skill-creation` | Building agent skills |
| `documentation` | Writing guides, README updates |
| `testing` | Validation, E2E tests |
| `cleanup` | Deleting old files, removing deprecated code |

## Phase Values

| Phase | Meaning |
|-------|---------|
| `READY` | Spec converted, ready to start execution |
| `IN_PROGRESS` | Some deliverables in progress |
| `COMPLETE` | All deliverables complete |

## Status Values

| Status | Meaning |
|--------|---------|
| `PENDING` | Not started yet |
| `IN_PROGRESS` | Currently being worked on |
| `COMPLETE` | All tasks pass verification |

## Example

```json
{
  "specName": "uv-migration",
  "ticketId": "ARCH-123",
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
            "Dependencies use PEP 440 versions"
          ],
          "passes": false
        }
      ]
    }
  ],
  "context": {
    "patterns": [],
    "keyFiles": [],
    "nonGoals": []
  }
}
```

## Validation Rules

1. **All deliverables must have unique IDs** (D1, D2, ...)
2. **Task IDs must follow pattern** `<deliverable-id>-<number>`
3. **Dependencies must reference existing deliverable IDs**
4. **No circular dependencies allowed**
5. **Effort must be one of**: S, M, L, XL
6. **Verification steps must be testable** (not implementation instructions)
