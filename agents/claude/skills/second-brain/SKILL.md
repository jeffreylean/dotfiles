---
name: second-brain
description: Knowledge retrieval from the user's Obsidian vault (my-brain). Use when user asks "what do I know about X", "find my notes on Y", "what's tagged Z", "show me notes in folder X", or wants to explore/retrieve/connect knowledge from their second brain.
version: 1.0.0
---

# Second Brain

Retrieve and synthesize knowledge from the Obsidian vault `my-brain` at `~/Documents/my-brain`.

## When to Use

- "What do I know about X?"
- "Find my notes on Y"
- "What notes are tagged #Z?"
- "Show me everything in folder X"
- "What have I written about [topic]?"
- "Are there any notes related to X?"
- "Summarize what I know about X"

## Setup

Vault name: `my-brain`
All commands must include `vault=my-brain`.

Verify CLI is available:
```bash
obsidian version vault=my-brain
```

## Command Reference

```bash
# Full-text search with context lines (primary retrieval tool)
obsidian search:context query="<text>" vault=my-brain format=json
obsidian search:context query="<text>" vault=my-brain path=<folder> format=json

# Plain search (file list only — use when you only need filenames)
obsidian search query="<text>" vault=my-brain format=json

# Read a note's full content
obsidian read file="<name>" vault=my-brain
obsidian read path="<folder/note.md>" vault=my-brain

# Note structure (headings only — read this before reading full content)
obsidian outline file="<name>" vault=my-brain format=json

# Graph traversal
obsidian backlinks file="<name>" vault=my-brain format=json
obsidian links file="<name>" vault=my-brain format=json

# Tag-based discovery
obsidian tags vault=my-brain counts sort=count format=json
obsidian tag name="<tag>" vault=my-brain verbose

# Browse by folder
obsidian files vault=my-brain folder="<path>"
obsidian folders vault=my-brain

# Frontmatter properties
obsidian properties vault=my-brain format=json
obsidian property:read name="<property>" file="<name>" vault=my-brain

# Structured data (Obsidian Bases)
obsidian bases vault=my-brain
obsidian base:query file="<name>" vault=my-brain format=json

# Recent files
obsidian recents vault=my-brain
```

## Workflow

### 1) Classify the query

| Query type | Primary command |
|---|---|
| "What do I know about X" | `search:context` |
| Tagged with X | `tag name=X verbose` |
| In a specific folder | `files folder=X` |
| Structured / database-like | `bases` → `base:query` |
| Recent work | `recents` |
| Everything related to X | `search:context` + graph traversal |

### 2) Retrieve

Run the primary command for the query type. For `search:context`, use `format=json` to get structured results.

If the query is broad or ambiguous, also run `tags vault=my-brain counts sort=count` to see if a matching tag exists — tag-based retrieval is often more precise than full-text search.

### 3) Rank and select

From the search results, identify the 3–5 most relevant notes. Prioritise:
1. Notes whose **title** matches the query
2. Notes with **multiple matches** in the context output
3. Notes in a **relevant folder**

### 4) Read selectively

For each selected note:
1. First run `outline` to get the heading structure — this tells you if the note is worth reading in full.
2. Then run `read` to get the full content.

Do not read every result — read the top 3–5 most relevant notes only.

### 5) Follow the graph (when query is exploratory)

If the user wants to understand connections or related notes:
- Run `backlinks` on key notes — these are notes that *reference* the retrieved note
- Run `links` on key notes — these are notes the retrieved note *points to*
- Read 1–2 hops only; do not traverse more than 2 levels deep

### 6) Synthesize and present

Present the findings as a direct answer. Structure:

```
## [Topic]

[2–4 sentence synthesis of what the vault contains on this topic]

### Key notes
- `[note name]` — [one-line summary of what it covers]
- `[note name]` — [one-line summary]

### Connections
[Only if graph traversal was done — brief description of how notes link together]

### Gaps
[Only if relevant — things the user asked about that weren't found in the vault]
```

Always include note names so the user can navigate directly in Obsidian.

## Gotchas

- Always include `vault=my-brain` in every command.
- Use `search:context` over `search` — context lines make ranking much more accurate.
- Run `outline` before `read` for large notes — avoid reading 500-line notes blindly.
- Never traverse more than 2 graph hops — the graph can be very large.
- Do not dump raw note content — always synthesize into a readable answer.
- If search returns no results, try a shorter/broader query or check tags.
