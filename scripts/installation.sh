#!/usr/bin/env bash
set -euo pipefail

# Run from any directory; resolve this checkout rather than a machine-specific path.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 22+ is required. Install Node.js, npm, and Pi before running installation.sh." >&2
  exit 1
fi
exec node "${SCRIPT_DIR}/install.mjs" "$@"
