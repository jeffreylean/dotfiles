# PRD Deliverables State Schema

`spec.json` intentionally keeps the same core shape as the older `spec-task` state so existing completion habits still transfer, but it adds PRD and subagent metadata for Pi.

## Root Object

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `schemaVersion` | string | Yes | Use `pi-prd-deliverables/v1` |
| `specName` | string | Yes | Kebab-case identifier used under `.pi/state/<specName>` |
| `phase` | string | Yes | `READY`, `IN_PROGRESS`, `COMPLETE` |
| `prd` | object | Yes | PRD provenance from `to-prd` |
| `deliverables` | array | Yes | Ordered deliverable list |
| `context` | object | Yes | Patterns, key files, non-goals |
| `subagents` | object | No | Preferred Pi agent roles |

## `prd` Object

| Field | Type | Description |
| --- | --- | --- |
| `title` | string | Human title from PRD |
| `generatedBy` | string | Usually `to-prd` |
| `issue` | string | Issue URL/ID if published |
| `sourcePath` | string | Usually `prd.md` |

## Deliverable Object

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | Yes | `D1`, `D2`, ... |
| `name` | string | Yes | Human-readable increment |
| `effort` | string | Yes | `S`, `M`, `L`, `XL` |
| `status` | string | Yes | `PENDING`, `IN_PROGRESS`, `COMPLETE` |
| `dependsOn` | string[] | Yes | Blocking deliverable IDs |
| `tasks` | array | Yes | Verifiable task objects |

## Task Object

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | Yes | `<deliverable-id>-<number>` |
| `category` | string | Yes | `setup`, `backend`, `frontend`, `testing`, `docs`, etc. |
| `description` | string | Yes | Outcome to achieve |
| `steps` | string[] | Yes | Observable verification criteria |
| `passes` | boolean | Yes | `true` only after verification |

## Validation Rules

1. Deliverable IDs are unique and sequential in array order: `D1`, `D2`, ...
2. Task IDs start with their deliverable ID.
3. Dependencies reference existing earlier deliverables only; no forward references.
4. Dependency graph is acyclic and schedulable.
5. No deliverable is marked complete unless all tasks pass.
6. Verification steps are testable by commands, UI checks, API checks, or code review.
7. Context preserves PRD non-goals so worker subagents do not expand scope.
