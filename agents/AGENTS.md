## Code review
After writing code, check your diff for:
- dead code it creates or leaves behind
- duplicated methods or variables; merge them with existing ones instead of adding near-copies
Fix these inside the files you touched. Report, without fixing, problems you notice elsewhere.

## Finishing work
- Don't end a turn while work you were asked to do remains. Work through ordinary obstacles such as failing tests, a missing dependency or a wrong path before you stop.
- Stop and ask only when you are actually blocked: on a decision that is mine to make, missing access, or an action that needs approval.

## Git worktrees
- Create every git worktree under `~/Projects/worktree/<project>/`, where `<project>` is the repository's directory name. Example for rubrix: `git worktree add ~/Projects/worktree/rubrix/<branch> <branch>`.
- Do not create worktrees inside the repository or anywhere else.

## Referring to PRs and issues
- When you mention a PR or issue by number, add a short label in parentheses that says what it is, every time. Examples: `#21(test-trim)`, `#22(rich-no-nan)`.
- For a PR or issue in another repository, also name the repository: `voxell-tech/fynix#84(rich)`.

## Cloudflare
- When interacting with Cloudflare, use the cf CLI unless the project has a Wrangler configuration file.
