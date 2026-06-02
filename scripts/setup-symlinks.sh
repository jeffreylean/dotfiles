#!/usr/bin/env bash
set -euo pipefail

# Set up selected dotfiles on macOS/Linux after cloning or pulling this repo.
# Existing conflicting files/directories/symlinks are never deleted; they are
# moved to <path>.backup.<timestamp> and reported as CONFLICT.

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
CONFLICTS=0

usage() {
  cat <<'EOF'
Usage: scripts/setup-symlinks.sh

Creates/refreshes symlinks for:
  agents, herdr, ghostty, nvim, zed

If a destination already exists and is not the expected symlink, it is moved to:
  <path>.backup.<timestamp>
EOF
}

case "${1:-}" in
  -h|--help)
    usage
    exit 0
    ;;
  "") ;;
  *)
    echo "Unknown argument: $1" >&2
    usage >&2
    exit 2
    ;;
esac

case "$(uname -s)" in
  Darwin|Linux) ;;
  *)
    echo "Unsupported OS: $(uname -s). Only macOS and Linux are supported." >&2
    exit 1
    ;;
esac

log() {
  printf '%s\n' "$*"
}

canonical_path() {
  local path="$1"

  if command -v python3 >/dev/null 2>&1; then
    python3 -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "$path"
  elif command -v realpath >/dev/null 2>&1; then
    realpath -m "$path" 2>/dev/null || realpath "$path" 2>/dev/null || printf '%s\n' "$path"
  else
    (cd "$(dirname "$path")" && printf '%s/%s\n' "$(pwd -P)" "$(basename "$path")")
  fi
}

resolved_link_target() {
  local link_path="$1"
  local target="$2"

  if [[ "$target" = /* ]]; then
    canonical_path "$target"
  else
    canonical_path "$(dirname "$link_path")/$target"
  fi
}

backup_path_for() {
  local path="$1"
  local candidate="${path}.backup.${TIMESTAMP}"
  local n=1

  while [[ -e "$candidate" || -L "$candidate" ]]; do
    candidate="${path}.backup.${TIMESTAMP}.${n}"
    n=$((n + 1))
  done

  printf '%s\n' "$candidate"
}

backup_existing() {
  local path="$1"
  local reason="$2"
  local backup

  backup="$(backup_path_for "$path")"
  CONFLICTS=$((CONFLICTS + 1))

  log "CONFLICT: $path"
  log "  reason: $reason"
  log "  backup: $backup"

  mv "$path" "$backup"
}

ensure_source_exists() {
  local src="$1"

  if [[ ! -e "$src" && ! -L "$src" ]]; then
    echo "Missing source: $src" >&2
    exit 1
  fi
}

ensure_real_dir() {
  local dir="$1"
  local current

  if [[ -L "$dir" ]]; then
    current="$(readlink "$dir")"
    backup_existing "$dir" "expected a real directory, found symlink to $current"
  elif [[ -e "$dir" && ! -d "$dir" ]]; then
    backup_existing "$dir" "expected a directory, found a file"
  fi

  mkdir -p "$dir"
}

link_path() {
  local src_rel="$1"
  local dst="$2"
  local src="${DOTFILES_DIR}/${src_rel}"
  local current

  ensure_source_exists "$src"
  mkdir -p "$(dirname "$dst")"

  if [[ -L "$dst" ]]; then
    current="$(readlink "$dst")"
    if [[ "$(resolved_link_target "$dst" "$current")" == "$(canonical_path "$src")" ]]; then
      log "ok: $dst -> $src"
      return 0
    fi

    backup_existing "$dst" "symlink points to $current, expected $src"
  elif [[ -e "$dst" ]]; then
    backup_existing "$dst" "destination already exists"
  fi

  ln -s "$src" "$dst"
  log "link: $dst -> $src"
}

link_path_if_exists() {
  local src_rel="$1"
  local dst="$2"
  local src="${DOTFILES_DIR}/${src_rel}"

  if [[ -e "$src" || -L "$src" ]]; then
    link_path "$src_rel" "$dst"
  else
    log "skip missing optional source: $src_rel"
  fi
}

link_children() {
  local src_dir_rel="$1"
  local dst_dir="$2"
  local src_dir="${DOTFILES_DIR}/${src_dir_rel}"
  local child name

  ensure_source_exists "$src_dir"
  ensure_real_dir "$dst_dir"

  for child in "$src_dir"/*; do
    [[ -e "$child" || -L "$child" ]] || continue
    name="$(basename "$child")"
    link_path "${src_dir_rel}/${name}" "${dst_dir}/${name}"
  done
}

main() {
  log "dotfiles: $DOTFILES_DIR"
  log "config:   $XDG_CONFIG_HOME"

  # App configs.
  link_path "nvim" "${XDG_CONFIG_HOME}/nvim"
  link_path "ghostty" "${XDG_CONFIG_HOME}/ghostty"
  link_path "herdr/config.toml" "${XDG_CONFIG_HOME}/herdr/config.toml"
  link_path "zed/settings.json" "${XDG_CONFIG_HOME}/zed/settings.json"
  link_path "zed/keymap.json" "${XDG_CONFIG_HOME}/zed/keymap.json"

  # Pi coding agent.
  link_path "agents/pi/AGENTS.md" "${HOME}/.pi/agent/AGENTS.md"
  link_path "agents/pi/SYSTEM.md" "${HOME}/.pi/agent/SYSTEM.md"
  link_path "agents/pi/context.md" "${HOME}/.pi/agent/context.md"
  link_path "agents/pi/package.json" "${HOME}/.pi/agent/package.json"
  link_path "agents/pi/bun.lock" "${HOME}/.pi/agent/bun.lock"
  link_path "agents/pi/agents" "${HOME}/.pi/agent/agents"
  link_path "agents/pi/extensions" "${HOME}/.pi/agent/extensions"
  link_path "agents/pi/pi-skills" "${HOME}/.pi/agent/skills"
  link_path_if_exists "agents/pi/prompts" "${HOME}/.pi/agent/prompts"

  # Claude Code.
  link_path "agents/AGENTS.md" "${HOME}/.claude/CLAUDE.md"
  link_path "agents/commands" "${HOME}/.claude/commands"
  link_path "agents/claude/rules" "${HOME}/.claude/rules"
  link_path "agents/claude/skills" "${HOME}/.claude/skills"

  # opencode.
  link_path "agents/AGENTS.md" "${XDG_CONFIG_HOME}/opencode/AGENTS.md"
  link_path "agents/commands" "${XDG_CONFIG_HOME}/opencode/command"
  link_path "agents/opencode/opencode.json" "${XDG_CONFIG_HOME}/opencode/opencode.json"
  link_path "agents/opencode/subagents" "${XDG_CONFIG_HOME}/opencode/agents"
  link_path "agents/opencode/skills" "${XDG_CONFIG_HOME}/opencode/skills"

  # Codex keeps generated/system files in ~/.codex/skills, so link shared skills one-by-one.
  link_path "agents/AGENTS.md" "${HOME}/.codex/AGENTS.md"
  link_children "agents/skills" "${HOME}/.codex/skills"

  if [[ "$CONFLICTS" -gt 0 ]]; then
    log "NOTICE: $CONFLICTS conflict(s) found. Backups were left in place."
  fi

  log "done"
}

main
