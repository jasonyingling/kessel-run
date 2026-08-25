#!/usr/bin/env bash
# Copy Kessel Run skills into an Obsidian vault's project-scoped skill directory,
# where Claude Code running in that vault picks them up.
#
# Usage:  KESSEL_RUN_VAULT="/path/to/vault" npm run skills:install [skill-name ...]
#
# With no skill names, installs every kessel-run-* skill. Copies only — it never
# deletes anything in the vault, because vault rules forbid agents deleting notes
# and the same caution is worth applying to a script.
set -euo pipefail

SKILLS_DIR="src/mastra/skills"

if [ -z "${KESSEL_RUN_VAULT:-}" ]; then
  echo "error: set KESSEL_RUN_VAULT to your vault path, e.g." >&2
  echo "  KESSEL_RUN_VAULT=\"\$HOME/The Rock\" npm run skills:install" >&2
  exit 1
fi

if [ ! -f "$KESSEL_RUN_VAULT/CLAUDE.md" ]; then
  echo "error: $KESSEL_RUN_VAULT does not look like a Claude Code project (no CLAUDE.md)" >&2
  exit 1
fi

DEST="$KESSEL_RUN_VAULT/.claude/skills"
mkdir -p "$DEST"

if [ "$#" -gt 0 ]; then
  names=("$@")
else
  names=()
  for dir in "$SKILLS_DIR"/kessel-run-*/; do
    names+=("$(basename "$dir")")
  done
fi

for name in "${names[@]}"; do
  src="$SKILLS_DIR/$name"
  [ -f "$src/SKILL.md" ] || { echo "error: no such skill: $name" >&2; exit 1; }
  rm -rf "$DEST/$name.incoming"
  cp -R "$src" "$DEST/$name.incoming"
  rm -rf "$DEST/$name"
  mv "$DEST/$name.incoming" "$DEST/$name"
  echo "installed $name -> $DEST/$name"
done

echo
echo "Done. Open Claude Code in $KESSEL_RUN_VAULT and the skills are live."
