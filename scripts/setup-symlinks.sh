#!/usr/bin/env bash
set -euo pipefail

# Set up selected dotfiles on macOS/Linux after cloning or pulling this repo.
# Existing conflicting files/directories/symlinks are never deleted. When safe,
# their content is merged into this repo first, then the old path is moved to
# <path>.backup.<timestamp> before the symlink is created.

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
OS_NAME="$(uname -s)"
MERGE_EXISTING=1
MERGES=0
BACKUPS=0
CONFLICTS=0

usage() {
  cat <<'EOF'
Usage: scripts/setup-symlinks.sh [--no-merge]

Creates/refreshes symlinks for:
  agents, herdr, ghostty, nvim, tmux, zed

Default conflict behavior is merge-aware:
  - existing repo-managed directories are merged into the repo source by copying
    missing files/directories/symlinks without overwriting repo content
  - extensible local directories like agent skills/extensions stay real dirs;
    repo-managed children are symlinked one-by-one so local-only entries can
    coexist without being tracked
  - JSON object files are merged by adding local-only keys while keeping repo
    values when both sides define different values for the same key
  - unsupported or partial conflicts are still moved to:
      <path>.backup.<timestamp>

Options:
  --no-merge  Disable merge attempts and only back up conflicting destinations.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --no-merge)
      MERGE_EXISTING=0
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

case "$OS_NAME" in
  Darwin|Linux) ;;
  *)
    echo "Unsupported OS: $OS_NAME. Only macOS and Linux are supported." >&2
    exit 1
    ;;
esac

log() {
  printf '%s\n' "$*"
}

path_exists() {
  [[ -e "$1" || -L "$1" ]]
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

same_path() {
  local left="$1"
  local right="$2"

  path_exists "$left" && path_exists "$right" && [[ "$(canonical_path "$left")" == "$(canonical_path "$right")" ]]
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

move_existing_to_backup() {
  local path="$1"
  local reason="$2"
  local label="$3"
  local backup

  backup="$(backup_path_for "$path")"
  BACKUPS=$((BACKUPS + 1))

  if [[ "$label" == "CONFLICT" ]]; then
    CONFLICTS=$((CONFLICTS + 1))
  fi

  log "$label: $path"
  log "  reason: $reason"
  log "  backup: $backup"

  mv "$path" "$backup"
}

backup_existing() {
  local path="$1"
  local reason="$2"

  move_existing_to_backup "$path" "$reason" "CONFLICT"
}

adopt_dir_children_as_links() {
  local from_dir="$1"
  local dst_dir="$2"
  local reason="$3"
  local item name target adopted restore_dotglob restore_nullglob

  [[ "$MERGE_EXISTING" -eq 1 ]] || return 0
  [[ -d "$from_dir" && -d "$dst_dir" ]] || return 0

  adopted=0
  restore_dotglob="$(shopt -p dotglob || true)"
  restore_nullglob="$(shopt -p nullglob || true)"
  shopt -s dotglob nullglob

  for item in "$from_dir"/*; do
    [[ -e "$item" || -L "$item" ]] || continue
    name="$(basename "$item")"
    target="${dst_dir}/${name}"

    if path_exists "$target"; then
      continue
    fi

    if [[ "$adopted" -eq 0 ]]; then
      log "ADOPT: $from_dir -> $dst_dir"
      log "  reason: $reason"
      adopted=1
    fi

    ln -s "$(canonical_path "$item")" "$target"
    log "  adopt-local-link: $name -> $(canonical_path "$item")"
  done

  eval "$restore_dotglob"
  eval "$restore_nullglob"

  if [[ "$adopted" -eq 1 ]]; then
    MERGES=$((MERGES + 1))
  fi
}

merge_json_files() {
  local local_file="$1"
  local repo_file="$2"

  command -v python3 >/dev/null 2>&1 || return 1

  python3 - "$local_file" "$repo_file" <<'PY'
import json
import sys
from pathlib import Path

local_path = Path(sys.argv[1])
repo_path = Path(sys.argv[2])

try:
    local_data = json.loads(local_path.read_text())
    repo_data = json.loads(repo_path.read_text())
except Exception:
    sys.exit(1)

if not isinstance(local_data, dict) or not isinstance(repo_data, dict):
    sys.exit(1)

added = []
conflicts = []


def dotted(parts):
    return ".".join(parts) if parts else "<root>"


def merge(local_obj, repo_obj, path):
    changed = False
    merged = dict(repo_obj)

    for key, local_value in local_obj.items():
        next_path = path + [str(key)]

        if key not in merged:
            merged[key] = local_value
            added.append(dotted(next_path))
            changed = True
            continue

        repo_value = merged[key]
        if isinstance(local_value, dict) and isinstance(repo_value, dict):
            nested, nested_changed = merge(local_value, repo_value, next_path)
            if nested_changed:
                merged[key] = nested
                changed = True
        elif repo_value == local_value:
            continue
        else:
            conflicts.append(dotted(next_path))

    return merged, changed


merged_data, changed = merge(local_data, repo_data, [])

if changed:
    repo_path.write_text(json.dumps(merged_data, indent=2) + "\n")
    for key in added:
        print(f"  add-json-key: {key}")

for key in conflicts:
    print(f"  keep-repo-json-key: {key}")

if conflicts:
    sys.exit(2)

sys.exit(0)
PY
}

merge_file_into_source() {
  local merge_from="$1"
  local src="$2"
  local reason="$3"
  local status

  [[ "$MERGE_EXISTING" -eq 1 ]] || return 1
  [[ -f "$merge_from" && -f "$src" ]] || return 1

  if cmp -s "$merge_from" "$src"; then
    log "MERGE: $merge_from -> $src"
    log "  reason: $reason"
    log "  result: files already identical"
    return 0
  fi

  if [[ -L "$src" ]]; then
    return 1
  fi

  log "MERGE: $merge_from -> $src"
  log "  reason: $reason"

  if merge_json_files "$merge_from" "$src"; then
    MERGES=$((MERGES + 1))
    return 0
  else
    status=$?
    if [[ "$status" -eq 2 ]]; then
      MERGES=$((MERGES + 1))
      return 2
    fi
  fi

  log "  result: no safe automatic file merge available"
  return 1
}

MERGE_DIR_COPIED=0
MERGE_DIR_SKIPPED=0

merge_dir_children() {
  local merge_from="$1"
  local src="$2"
  local prefix="$3"
  local item name target link_target status

  for item in "$merge_from"/*; do
    name="$(basename "$item")"
    target="${src}/${name}"

    if [[ -d "$item" && ! -L "$item" ]]; then
      if ! path_exists "$target"; then
        cp -a "$item" "$target"
        MERGE_DIR_COPIED=1
        log "  add-dir: ${prefix}${name}"
      elif [[ -d "$target" && ! -L "$target" ]]; then
        merge_dir_children "$item" "$target" "${prefix}${name}/"
      elif [[ -d "$target" ]] && same_path "$item" "$target"; then
        :
      else
        MERGE_DIR_SKIPPED=1
        log "  skip: ${prefix}${name} (destination exists with different type)"
      fi
    elif [[ -L "$item" ]]; then
      link_target="$(readlink "$item")"

      if ! path_exists "$target"; then
        cp -a "$item" "$target"
        MERGE_DIR_COPIED=1
        log "  add-link: ${prefix}${name} -> $link_target"
      elif [[ -L "$target" && "$(readlink "$target")" == "$link_target" ]]; then
        :
      elif same_path "$item" "$target"; then
        :
      else
        MERGE_DIR_SKIPPED=1
        log "  skip: ${prefix}${name} (destination exists)"
      fi
    elif [[ -f "$item" ]]; then
      if ! path_exists "$target"; then
        cp -p "$item" "$target"
        MERGE_DIR_COPIED=1
        log "  add-file: ${prefix}${name}"
      elif [[ -f "$target" ]] && cmp -s "$item" "$target"; then
        :
      elif [[ -f "$target" && ! -L "$target" ]]; then
        if merge_json_files "$item" "$target"; then
          MERGE_DIR_COPIED=1
          log "  merge-json: ${prefix}${name}"
        else
          status=$?
          if [[ "$status" -eq 2 ]]; then
            MERGE_DIR_COPIED=1
            MERGE_DIR_SKIPPED=1
            log "  partial-json: ${prefix}${name}"
          else
            MERGE_DIR_SKIPPED=1
            log "  skip: ${prefix}${name} (destination file differs)"
          fi
        fi
      else
        MERGE_DIR_SKIPPED=1
        log "  skip: ${prefix}${name} (destination exists with different type)"
      fi
    else
      MERGE_DIR_SKIPPED=1
      log "  skip: ${prefix}${name} (unsupported file type)"
    fi
  done
}

merge_directory_into_source() {
  local merge_from="$1"
  local src="$2"
  local reason="$3"
  local restore_dotglob restore_nullglob

  [[ "$MERGE_EXISTING" -eq 1 ]] || return 1
  [[ -d "$merge_from" && -d "$src" ]] || return 1

  if same_path "$merge_from" "$src"; then
    return 0
  fi

  log "MERGE: $merge_from -> $src"
  log "  reason: $reason"

  MERGE_DIR_COPIED=0
  MERGE_DIR_SKIPPED=0
  restore_dotglob="$(shopt -p dotglob || true)"
  restore_nullglob="$(shopt -p nullglob || true)"
  shopt -s dotglob nullglob
  merge_dir_children "$merge_from" "$src" ""
  eval "$restore_dotglob"
  eval "$restore_nullglob"

  if [[ "$MERGE_DIR_COPIED" -eq 1 ]]; then
    MERGES=$((MERGES + 1))
  fi

  if [[ "$MERGE_DIR_SKIPPED" -eq 1 ]]; then
    log "  result: partial merge; backup keeps unmerged entries"
    return 2
  fi

  if [[ "$MERGE_DIR_COPIED" -eq 0 ]]; then
    log "  result: no missing entries found"
  fi

  return 0
}

merge_existing_into_source() {
  local existing="$1"
  local src="$2"
  local reason="$3"
  local merge_from current

  [[ "$MERGE_EXISTING" -eq 1 ]] || return 1

  merge_from="$existing"
  if [[ -L "$existing" ]]; then
    current="$(readlink "$existing")"
    merge_from="$(resolved_link_target "$existing" "$current")"
    path_exists "$merge_from" || return 1
  fi

  if [[ -d "$merge_from" && -d "$src" ]]; then
    merge_directory_into_source "$merge_from" "$src" "$reason"
  elif [[ -f "$merge_from" && -f "$src" ]]; then
    merge_file_into_source "$merge_from" "$src" "$reason"
  else
    return 1
  fi
}

backup_or_merge_existing() {
  local path="$1"
  local reason="$2"
  local src="$3"
  local status

  if merge_existing_into_source "$path" "$src" "$reason"; then
    move_existing_to_backup "$path" "merged/adopted into $src" "BACKUP"
  else
    status=$?
    if [[ "$status" -eq 2 ]]; then
      move_existing_to_backup "$path" "partially merged into $src; backup keeps unmerged entries" "CONFLICT"
    else
      move_existing_to_backup "$path" "$reason" "CONFLICT"
    fi
  fi
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
  local current previous_target

  previous_target=""

  if [[ -L "$dir" ]]; then
    current="$(readlink "$dir")"
    previous_target="$(resolved_link_target "$dir" "$current")"
    move_existing_to_backup "$dir" "replacing symlink to $current with real directory for local-only entries" "BACKUP"
  elif [[ -e "$dir" && ! -d "$dir" ]]; then
    backup_existing "$dir" "expected a directory, found a file"
  fi

  mkdir -p "$dir"

  if [[ -n "$previous_target" && -d "$previous_target" ]]; then
    adopt_dir_children_as_links "$previous_target" "$dir" "preserve entries visible through previous symlink"
  fi
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

    backup_or_merge_existing "$dst" "symlink points to $current, expected $src" "$src"
  elif [[ -e "$dst" ]]; then
    backup_or_merge_existing "$dst" "destination already exists" "$src"
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
  local child name restore_dotglob restore_nullglob

  ensure_source_exists "$src_dir"
  ensure_real_dir "$dst_dir"

  restore_dotglob="$(shopt -p dotglob || true)"
  restore_nullglob="$(shopt -p nullglob || true)"
  shopt -s dotglob nullglob

  for child in "$src_dir"/*; do
    [[ -e "$child" || -L "$child" ]] || continue
    name="$(basename "$child")"
    link_path "${src_dir_rel}/${name}" "${dst_dir}/${name}"
  done

  eval "$restore_dotglob"
  eval "$restore_nullglob"
}

link_optional_local_path() {
  local src="$1"
  local dst="$2"
  local label="$3"
  local current

  if ! path_exists "$src"; then
    log "skip missing optional local ${label}: $src"
    return 0
  fi

  mkdir -p "$(dirname "$dst")"

  if [[ -L "$dst" ]]; then
    current="$(readlink "$dst")"
    if [[ "$(resolved_link_target "$dst" "$current")" == "$(canonical_path "$src")" ]]; then
      log "ok local: $dst -> $src"
      return 0
    fi

    backup_existing "$dst" "local ${label} symlink points to $current, expected $src"
  elif [[ -e "$dst" ]]; then
    if [[ -f "$dst" && -f "$src" ]] && cmp -s "$dst" "$src"; then
      move_existing_to_backup "$dst" "local ${label} file is identical to $src" "BACKUP"
    else
      backup_existing "$dst" "local ${label} destination already exists"
    fi
  fi

  ln -s "$src" "$dst"
  log "link local: $dst -> $src"
}

is_omarchy() {
  [[ "$OS_NAME" == "Linux" && -d "${HOME}/.local/share/omarchy" ]]
}

remove_legacy_tmux_conf() {
  local legacy="${HOME}/.tmux.conf"
  local current

  if [[ -L "$legacy" ]]; then
    current="$(readlink "$legacy")"
    rm "$legacy"
    log "remove legacy: $legacy -> $current"
  elif [[ -e "$legacy" ]]; then
    backup_existing "$legacy" "legacy tmux config; Omarchy uses ${XDG_CONFIG_HOME}/tmux/tmux.conf"
  fi
}

link_tmux_config() {
  case "$OS_NAME" in
    Darwin)
      link_children "tmux" "${HOME}/.tmux"
      ;;
    Linux)
      link_children "tmux" "${XDG_CONFIG_HOME}/tmux"
      if is_omarchy; then
        remove_legacy_tmux_conf
      fi
      ;;
  esac
}

install_omarchy_local_integrations() {
  local omarchy_skill="${HOME}/.local/share/omarchy/default/omarchy-skill"
  local pi_theme_extension="${HOME}/.local/share/omarchy/default/pi/agent/extensions/omarchy-system-theme.ts"

  if path_exists "$omarchy_skill"; then
    link_optional_local_path "$omarchy_skill" "${HOME}/.pi/agent/skills/omarchy" "Omarchy Pi skill"
    link_optional_local_path "$omarchy_skill" "${HOME}/.claude/skills/omarchy" "Omarchy Claude skill"
    link_optional_local_path "$omarchy_skill" "${XDG_CONFIG_HOME}/opencode/skills/omarchy" "Omarchy opencode skill"
  fi

  if path_exists "$pi_theme_extension"; then
    link_optional_local_path "$pi_theme_extension" "${HOME}/.pi/agent/extensions/omarchy-system-theme.ts" "Omarchy Pi theme extension"
  fi
}

main() {
  log "dotfiles: $DOTFILES_DIR"
  log "config:   $XDG_CONFIG_HOME"

  # App configs.
  link_path "nvim" "${XDG_CONFIG_HOME}/nvim"
  link_path "ghostty" "${XDG_CONFIG_HOME}/ghostty"
  link_tmux_config
  link_path "herdr/config.toml" "${XDG_CONFIG_HOME}/herdr/config.toml"
  link_path "zed/settings.json" "${XDG_CONFIG_HOME}/zed/settings.json"
  link_path "zed/keymap.json" "${XDG_CONFIG_HOME}/zed/keymap.json"

  # Pi coding agent.
  link_path "agents/pi/AGENTS.md" "${HOME}/.pi/agent/AGENTS.md"
  link_path "agents/pi/SYSTEM.md" "${HOME}/.pi/agent/SYSTEM.md"
  link_path "agents/pi/context.md" "${HOME}/.pi/agent/context.md"
  link_path "agents/pi/package.json" "${HOME}/.pi/agent/package.json"
  link_path "agents/pi/bun.lock" "${HOME}/.pi/agent/bun.lock"
  link_path "agents/pi/keybindings.json" "${HOME}/.pi/agent/keybindings.json"
  link_path "agents/pi/agents" "${HOME}/.pi/agent/agents"
  # Skills/extensions stay real local directories so machine-specific entries
  # like Omarchy can coexist without being tracked in this repo.
  link_children "agents/pi/extensions" "${HOME}/.pi/agent/extensions"
  link_children "agents/pi/pi-skills" "${HOME}/.pi/agent/skills"
  link_path_if_exists "agents/pi/prompts" "${HOME}/.pi/agent/prompts"

  # Claude Code.
  link_path "agents/AGENTS.md" "${HOME}/.claude/CLAUDE.md"
  link_path "agents/commands" "${HOME}/.claude/commands"
  link_path "agents/claude/rules" "${HOME}/.claude/rules"
  link_children "agents/claude/skills" "${HOME}/.claude/skills"

  # opencode.
  link_path "agents/AGENTS.md" "${XDG_CONFIG_HOME}/opencode/AGENTS.md"
  link_path "agents/commands" "${XDG_CONFIG_HOME}/opencode/command"
  link_path "agents/opencode/opencode.json" "${XDG_CONFIG_HOME}/opencode/opencode.json"
  link_path "agents/opencode/subagents" "${XDG_CONFIG_HOME}/opencode/agents"
  link_children "agents/opencode/skills" "${XDG_CONFIG_HOME}/opencode/skills"

  # Machine-local integrations. These are intentionally not created inside the
  # dotfiles repo, even when they are useful on this host.
  install_omarchy_local_integrations

  # Codex keeps generated/system files in ~/.codex/skills, so link shared skills one-by-one.
  link_path "agents/AGENTS.md" "${HOME}/.codex/AGENTS.md"
  link_children "agents/skills" "${HOME}/.codex/skills"

  if [[ "$MERGES" -gt 0 ]]; then
    log "NOTICE: $MERGES merge/adoption(s) applied."
  fi

  if [[ "$BACKUPS" -gt 0 ]]; then
    log "NOTICE: $BACKUPS backup(s) left in place for replaced paths."
  fi

  if [[ "$CONFLICTS" -gt 0 ]]; then
    log "NOTICE: $CONFLICTS unresolved conflict(s) found. Check backups for anything not merged."
  fi

  log "done"
}

main
