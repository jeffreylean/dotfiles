---
name: codebase-explorer
description: Use when user asks to understand a repository, generate a navigation map, explain architecture/execution flow, or surface interesting core implementations. Produces timestamped report in ~/Documents/my-brain/codebase. Uses a 5-phase divide-and-conquer strategy: scout → semantic partitioning → parallel workers → hierarchical reduction → cross-cutting validation.
version: 2.0.0
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
node pi-skills/codebase-explorer/scripts/loc-shard-plan.js "<repoPath>" --max-workers 4 --split-loc 5000

# Build timestamped output path in ~/Documents/my-brain/codebase
node pi-skills/codebase-explorer/scripts/report-path.js "<repoName>"
```

## Workflow

All subagents use the built-in `Agent` tool (`subagent_type=code`). Max concurrency = **4** at every phase.

### 1) Resolve target

Priority:
1. GitHub URL -> clone into `/Users/jeffreylean/Project/personal/opensource/<repo>`
2. Local path -> use path
3. Else -> current working directory

### 2) Inventory

Run the file inventory script (produces file list + LOC per module — used as scout input, not as final partitioning):

```bash
node pi-skills/codebase-explorer/scripts/loc-shard-plan.js "<repoPath>" --max-workers 4 --split-loc 5000
node pi-skills/codebase-explorer/scripts/report-path.js "<repoName>"
```

Exclude test packages/files from exploration scope:
- dirs: `test`, `tests`, `__tests__`, `e2e`, `cypress`, `__snapshots__`
- files: `*.test.*`, `*.spec.*`, `*_test.*`, `test_*.*`, `conftest.py`

### 3) Phase 0 — Scout

Launch **one scout subagent**. Its job is to understand the repo shape and output a semantic concern map.

Scout prompt:
```
You are a codebase scout. Your job is NOT to explore deeply — it is to understand the repo's shape quickly and partition it into coherent concern areas for specialist workers.

Repo path: {repoPath}
File inventory (JSON): {inventoryJSON}

Steps:
1. Read root manifests: README.md, package.json / go.mod / Cargo.toml / pyproject.toml / Makefile (whichever exist).
2. Read the top-level directory listing (ls {repoPath}).
3. Identify likely entry points (main.go, index.ts, cmd/, app.py, server.*, etc.) and read them.
4. Sample 2–3 of the most heavily imported files (look for files imported by many others via sg or grep).
5. Do NOT read everything — skim broadly, not deeply.

Output a JSON object with:
- repoSummary: string (1–2 sentences on what this repo does)
- primaryLanguage: string
- entryPoints: [path]
- concerns: [
    {
      id: string,           // e.g. "api-layer", "core-domain", "data-access", "infra"
      name: string,
      focusQuestion: string, // e.g. "How does an HTTP request get routed and handled?"
      files: [relativePath], // all source files belonging to this concern
      relatedConcerns: [id]  // concerns this one calls into
    }
  ]
- uncertainties: [string]

Rules:
- Aim for 3–8 concerns. Never more than 8.
- Partition by semantic role (API surface, domain logic, data access, infra/config, CLI, etc.) — not by directory or LOC.
- Every source file must appear in exactly one concern.
- Files that are truly cross-cutting (shared utils, types) go into the concern that uses them most.
```

### 4) Phase 1 — Divide

Parse the scout's concern map. Each concern becomes one worker assignment.

If total concerns > 4: batch them into groups of 4 and run batches sequentially.
If total concerns ≤ 4: run all workers in one parallel batch.

### 5) Phase 2 — Conquer (parallel workers)

For each batch, spawn up to 4 worker subagents **in parallel**. Each worker gets one concern.

Worker prompt:
```
You are a codebase explorer worker focused on one concern area.

Repo path: {repoPath}
Concern: {concern.name}
Focus question: {concern.focusQuestion}
Related concerns (for cross-reference): {concern.relatedConcerns}

Files to read (read ALL of them — do not skip any):
{absolute paths, one per line}

Steps:
1. Read every file listed. Do not skip files due to size or count.
2. Answer the focus question as your primary objective.
3. Use `sg` (ast-grep) to find structural patterns when helpful:
   sg --pattern '$PATTERN' --lang {primaryLanguage} {repoPath}
4. Note all calls/imports that reach into related concerns.

Return a JSON object:
- concernId: string
- concernName: string
- focusAnswer: string  // direct answer to the focus question, 3–5 sentences
- summary: string      // what this concern does overall, 2–3 sentences
- keyFiles: [{path, purpose, notable}]
- entryPoints: [path]
- dataFlow: ["A -> B -> C"]
- crossConcernCalls: [{from, toConcernId, symbol, why}]
- patterns: [{type, location, insight, tradeoff}]
  // type = perf | abstraction | concurrency | error-handling | security | DX | design-pattern
- uncertainties: [string]
```

Collect all worker JSON outputs before proceeding.

### 6) Phase 3 — Reduce

**If total concerns ≤ 4:** skip L1 reduction, go straight to final synthesizer.

**If total concerns > 4:** run L1 group mergers first.

Group related concerns together (use `relatedConcerns` links from scout output). Launch up to 4 merger subagents in parallel, each merging a cluster of 2–3 worker outputs:

Merger prompt:
```
You are merging worker reports for related concern areas into one group summary.

Concerns in this group: {concernNames}
Worker reports: {workerJSONs}

Produce a single JSON:
- groupId: string
- concerns: [concernId]
- groupSummary: string (3–5 sentences)
- keyFiles: [{path, purpose}]
- dataFlow: ["A -> B -> C"]
- crossGroupCalls: [{fromConcernId, toGroupId, why}]
- patterns: [{type, location, insight, tradeoff}]
- resolvedUncertainties: [string]
- remainingUncertainties: [string]
```

### 7) Phase 4 — Synthesize

Launch **one final synthesizer subagent**:

```
You are the final codebase synthesizer.

Repo: {repoName}
Path: {repoPath}
Report destination: {reportPath}
Scout summary: {scout.repoSummary}
Entry points: {scout.entryPoints}

Group/concern reports (JSON):
{all L1 group outputs OR all worker outputs if no L1 step}

Instructions:
1. Merge summaries; resolve all remaining uncertainties where evidence allows.
2. Build ASCII architecture map (shows concern groups and their relationships).
3. Build ASCII core execution flow (entry → ... → output, using real file/function names).
4. Rank concerns by importance to a new contributor.
5. Identify the 3–7 most interesting implementations across all concerns.
6. Follow assets/output-template.md exactly.
7. Write the report to {reportPath} using the Write tool.
```

### 8) Phase 5 — Cross-cutting pass

After the report is written, launch **one cross-cutting subagent** to validate the architecture with a real end-to-end trace:

```
You are validating the architecture report for {repoName}.

Report path: {reportPath}
Entry points: {scout.entryPoints}
Key files identified across concerns: {top 2–3 keyFiles per concern}

Steps:
1. Read the report.
2. Pick the most important execution path described in the report.
3. Trace it by reading the actual files: entry → handler → business logic → data/IO → response.
4. Verify the ASCII flow diagram is accurate.
5. If discrepancies found: edit the report in place using the Edit tool (correct the specific section only).
6. If accurate: append a one-line validation note at the end of the report:
   `> Cross-cutting pass: execution flow verified. ({date})`
```

Write exactly one report: `~/Documents/my-brain/codebase/{repo-name}-{YYYYMMDD-HHmmss}.md`

Default: onboarding length. If user asked about a specific area, add a deep-dive section for that area.

### 9) Display report inline

After the cross-cutting pass completes, read the final report and print its full contents to the conversation so the user can read it immediately without opening any file.

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
- Never exceed 4 parallel subagents at any phase.
- Never use Mermaid (ASCII only).
- Scout must skim broadly — stop it from deep-reading; that's workers' job.
- Never more than 8 concerns from scout; push back and merge if scout returns more.
- Every source file must belong to exactly one concern — no orphans, no duplicates.
- Workers must read ALL files in their concern — do not skip files due to size or count.
- Avoid raw tree dumps; provide navigable map.
- Keep onboarding default; deep-dive only on requested area.
- Do not explore test packages/files unless user explicitly asks.
- Always include file path evidence for key claims.
