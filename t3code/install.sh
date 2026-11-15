#!/bin/sh
# Copy every theme in this folder into T3 Code. T3 Code watches the folder and
# picks up changes immediately. It refuses symlinked theme files, so copy, don't link.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
dest=${T3_THEMES_DIR:-$HOME/.t3/userdata/themes}
mkdir -p "$dest"
for theme in "$here"/*/theme.json; do
  id=$(basename "$(dirname "$theme")")
  cp "$theme" "$dest/$id.json"
  echo "installed $id -> $dest/$id.json"
done
