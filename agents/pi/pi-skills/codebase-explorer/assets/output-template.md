# {repo-name} — Codebase Map

- Generated: {timestamp}
- Repo path: {repo-path}
- Mode: {onboarding | deep-dive:{area}}

## 1) What this repository does

{summary}

## 2) High-level architecture map (ASCII)

```text
[Entrypoints] -> [Orchestrators/Services] -> [Domain Modules] -> [Data/External I/O]
```

## 3) Core execution flow (ASCII)

```text
[Input] -> [Entry handler] -> [Validation/Auth] -> [Business logic] -> [Persistence/External] -> [Output]
```

## 4) Navigation table

| Goal | File/Dir | Why |
|---|---|---|
| Startup path | `{path}` | `{reason}` |
| Core logic | `{path}` | `{reason}` |
| Integrations | `{path}` | `{reason}` |

## 5) Key modules/packages

| Module | Purpose | Key files |
|---|---|---|
| `{name}` | `{purpose}` | `{paths}` |

## 6) Interesting implementations

- Type: performance/abstraction/concurrency/error-handling/security/DX/design-pattern
- Location: `{path}`
- Why: {insight}
- Tradeoff: {tradeoff}

## 7) Entry points and reading order

1. `{entry}`
2. `{core}`
3. `{io boundary}`
4. `{tests/examples}`

## 8) Optional: Data model/schema map

{only if meaningful}

## 9) Optional: Build/deploy/test map

{only if meaningful}
