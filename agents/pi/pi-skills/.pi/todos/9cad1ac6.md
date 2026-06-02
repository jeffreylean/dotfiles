{
  "id": "9cad1ac6",
  "title": "Assess symlink strategy for GitHub in current repo",
  "tags": [
    "advice",
    "git",
    "symlink"
  ],
  "status": "completed",
  "created_at": "2026-04-21T14:44:08.459Z"
}

Inspected current repo symlinks. Found 7 top-level symlinked skill directories, most pointing to ../../skills/* and one to an absolute path outside the repo. Need explain that Git stores symlink entries, not target contents, so external targets will not be portable on GitHub. Suggested options: replace with copied files, generate/vendored copies for publish branch, or keep symlinks only if targets are committed within same repo at portable relative paths.
