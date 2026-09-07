#!/usr/bin/env bash
# Legacy Claude Code destination adapter. Replacement preserves a backup.
set -euo pipefail
if [ -z "${KESSEL_RUN_VAULT:-}" ] || [ ! -d "$KESSEL_RUN_VAULT" ]; then
  echo 'error: set KESSEL_RUN_VAULT to an existing vault directory' >&2
  exit 1
fi
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/install-skills.mjs" --destination "$KESSEL_RUN_VAULT/.claude/skills" "$@"
