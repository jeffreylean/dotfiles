---
name: skill-creator
description: Use when creating or iteratively improving skills; scaffolds trigger-oriented SKILL.md, Node/Bun scripts, progressive disclosure folders, and Gotchas guardrails.
---

# Skill Creator

Create and refine skills using a practical pattern: trigger-focused metadata, script-backed execution, progressive disclosure, and iterative gotcha capture.

## When to Use

- Creating a new skill from scratch
- Iteratively improving an existing/original skill
- Adding runnable helper scripts so agent composes code instead of re-deriving boilerplate
- Standardizing skill quality across a repo/team

## Skill Categories (pick one primary)

- `knowledge` — libraries/SDK usage + edge cases
- `verification` — test drivers/assertion workflows
- `data` — metrics/query/dashboards workflows
- `workflow` — repetitive automation
- `scaffold` — boilerplate generation
- `quality` — review/style/testing practices
- `deploy` — release and operations rollout
- `debugging` — symptom → investigation report
- `ops` — maintenance/cost/dependency procedures

## Core Output Contract

For each create/improve task, produce:

1. `SKILL.md` with valid frontmatter (`name`, `description`).
2. Trigger-oriented `description` (should clearly signal invocation conditions).
3. Required section: `## Gotchas` with concrete anti-patterns and failure modes.
4. Runnable JS helper scripts (`#!/usr/bin/env node`) for `./script`, `node`, and `bun` execution.
5. Progressive disclosure structure (`references/`, `assets/`, `scripts/`).
6. Validation evidence + iteration notes (what changed, why).

## Required SKILL.md Sections

- `## When to Use`
- `## Commands`
- `## Output Contract`
- `## Gotchas`

Recommended:
- `## Setup`
- `## File Layout`
- `## Iteration Log`

## Iterative Improvement Loop

1. Baseline: validate original skill.
2. Fix smallest high-impact gap first (trigger clarity, gotchas, command UX).
3. Re-validate.
4. Capture new failures in `references/gotchas-log.md`.
5. Promote stable failures into `## Gotchas` bullets.
6. Final review: remove dead code + remove duplicated logic.

## Optional Hooks Pattern

If your agent platform supports skill-scoped hooks, keep them opt-in and narrow.
Examples: destructive-command guardrails, write-scope freezing, pre-tool instrumentation.

## Progressive Disclosure Pattern

Keep `SKILL.md` concise; put depth in files:

- `references/README.md`, `references/api.md`, `references/examples.md`
- `references/gotchas-log.md` for iterative failure capture
- `assets/output-template.md` for output structure
- `config.example.json` for setup contract
- `state/` for optional local memory/logs (prefer stable external path in config)

## Commands

```bash
cd {baseDir}/skill-creator

# Create a new skill scaffold
node {baseDir}/skill-create.js my-skill --category workflow
bun {baseDir}/skill-create.js my-skill --category workflow

# Validate any skill
node {baseDir}/skill-validate.js ../my-skill
bun {baseDir}/skill-validate.js ../my-skill

# Improve existing skill baseline (dry-run)
node {baseDir}/skill-improve.js ../my-skill

# Apply improvements
node {baseDir}/skill-improve.js ../my-skill --write
```

## Output Contract

- Produces scaffolded skill files or targeted baseline improvements.
- Enforces required sections and Gotchas guardrails via validator.
- Reports warnings for trigger clarity and progressive-disclosure gaps.

## Gotchas (Do Not Do)

- Don’t write non-triggering descriptions like generic summaries.
- Don’t treat a skill as only one markdown file; include scripts/references/assets.
- Don’t omit `## Gotchas` or leave it vague; list concrete mistakes.
- Don’t overfit instructions to one scenario; preserve adaptability.
- Don’t let skills stagnate; update gotchas from real failures.
