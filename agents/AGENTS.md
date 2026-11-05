## Code review
- Everytime you have done writing code, Please ALWAYS ask yourself these few questions:
    - Are there dead code ?
    - Are there any duplication on methods/ variable that I just created ?

## Git worktrees
- Create every git worktree under `~/Projects/worktree/<project>/`, where `<project>` is the repository's directory name. Example for rubrix: `git worktree add ~/Projects/worktree/rubrix/<branch> <branch>`.
- Do not create worktrees inside the repository or anywhere else.

## Cloudflare
- When interacting with Cloudflare, use the cf CLI unless the project has a Wrangler configuration file.
