- If there are question to user, always ask user with AskUserQuestion tool
## Context management
Whenever you are required to run tool that my include reading a lot of text like web search, documents reading, please make sure you utilize subagent to do so without polluting the main context

## Plan mode
- Don't always dive into implementation. Plan before you execute
- Make the plan extremely concise, Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

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
