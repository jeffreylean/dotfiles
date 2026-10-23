## Code review
- Everytime you have done writing code, Please ALWAYS ask yourself these few questions:
    - Are there dead code ?
    - Are there any duplication on methods/ variable that I just created ?

## Model cost
- Fable is very expensive. Don't use it (subagents with model `fable`, the `fable-reviewer` agent) for routine reviews, checks or lookups.
- Use Fable only for genuinely complex work (hard design questions, subtle correctness reviews), or when I explicitly ask for it.
- Don't rerun a Fable review on your own after it stops or fails: ask me first.

## Language-specific rules
When working in any of the following languages, refer to the corresponding rules directory for coding style, patterns, security, testing, and hooks guidelines:
- Go: @rules/golang/
- TypeScript: @rules/typescript/
- Rust: @rules/rust/

## Cloudflare
- When interacting with Cloudflare, use the cf CLI unless the project has a Wrangler configuration file.
