## Code review
- Everytime you have done writing code, Please ALWAYS ask yourself these few questions:
    - Are there dead code ?
    - Are there any duplication on methods/ variable that I just created ?

## Git worktrees
- Create every git worktree under `~/Projects/worktree/<project>/`, where `<project>` is the repository's directory name. Example for rubrix: `git worktree add ~/Projects/worktree/rubrix/<branch> <branch>`.
- Do not create worktrees inside the repository or anywhere else.

## Referring to PRs and issues
- When you mention a PR or issue by number, add a short label in parentheses that says what it is, every time. Examples: `#21(test-trim)`, `#22(rich-no-nan)`.
- For a PR or issue in another repository, also name the repository: `voxell-tech/fynix#84(rich)`.

## Cloudflare
- When interacting with Cloudflare, use the cf CLI unless the project has a Wrangler configuration file.
