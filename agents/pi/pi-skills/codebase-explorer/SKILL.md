---
name: codebase-explorer
description: Use when user asks to understand a repository, generate a navigation map, explain architecture/execution flow, or surface interesting core implementations. Produces timestamped report in ~/.pi/codebase and uses parallel subagents (max 4) plus ast-grep.
version: 1.0.0
---

# Codebase Explorer

Explore a repo deeply and output an onboarding-first map report.

## When to Use

- “What does this repo do?”
- “Give me architecture / flow overview”
- “Map the codebase so I can navigate it quickly”
- “Find interesting implementations in the core”
- “Deep dive into X area/module”

## Setup

`ast-grep` (`sg`) is required.

```bash
sg --version
```

If missing, stop and ask user to install before continuing.

## Commands

```bash
# Resolve target: github URL | path | cwd
node pi-skills/codebase-explorer/scripts/resolve-repo-target.js "<target-optional>"

# Build LOC shard plan (max parallel workers = 4)
node pi-skills/codebase-explorer/scripts/loc-shard-plan.js "<repoPath>" --max-workers 4 --split-loc 2500

# Build timestamped output path in ~/.pi/codebase
node pi-skills/codebase-explorer/scripts/report-path.js "<repoName>"
```

## Workflow

### 1) Resolve target

Priority:
1. GitHub URL -> clone into `/Users/jeffreylean/Project/personal/opensource/<repo>`
2. Local path -> use path
3. Else -> current working directory

### 2) Inventory and shard

- Gather source files + LOC
- Exclude test packages/files from exploration scope
  - dirs: `test`, `tests`, `__tests__`, `e2e`, `cypress`, `__snapshots__`
  - files: `*.test.*`, `*.spec.*`, `*_test.*`, `test_*.*`, `conftest.py`
- Module/package grouping
- Split oversized modules by LOC
- Batch shards with max concurrency = **4**

### 3) Use @agents worker/synthesizer (preferred)

Use permanent named agents from `@agents/`:
- `codebase-explorer-worker`
- `codebase-explorer-synthesizer`

Worker baseline:
- `model`: `gpt-5.3-codex`
- `thinking`: `medium`
- `tools`: `read,bash`

Synthesizer baseline:
- `model`: `gpt-5.3-codex`
- `thinking`: `medium`
- `tools`: `read,write`

Fallback (only if agents missing): dynamically create temporary agents with same model/thinking/tooling.

### 4) Parallel exploration

Run workers in batches of 4. Each worker returns:
- shard summary
- key files + why
- entry/call/data-flow clues
- interesting implementation findings (perf, abstraction, concurrency, error handling, security, DX, design patterns)
- uncertainties

### 5) Synthesize + write report

Write exactly one report:

`~/.pi/codebase/{repo-name}-{YYYYMMDD-HHmmss}.md`

Default: onboarding length. If user asked specific area, add deep-dive section for that area.

### 6) Cleanup

If fallback dynamic agents were created, delete them after report generation.
Permanent `@agents/` definitions remain installed.

## Output Contract

Use template: `assets/output-template.md`

Required sections:
1. What this repository does
2. High-level architecture map (**ASCII**)
3. Core execution flow (**ASCII**)
4. Key modules/packages + navigation table
5. Interesting core implementations (+ rationale + paths)
6. Entry points + recommended reading order

Scope rule: focus on runtime/production code by default; ignore tests unless user explicitly asks for testing architecture.

Optional sections (when meaningful):
- Data model / schema map
- Build/deploy/test map

## Gotchas

- Never run without `sg`.
- Never exceed 4 parallel workers.
- Never use Mermaid (ASCII only).
- Avoid raw tree dumps; provide navigable map.
- Keep onboarding default; deep-dive only on requested area.
- Do not explore test packages/files unless user explicitly asks.
- Always include file path evidence for key claims.
