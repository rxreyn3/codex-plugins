#!/usr/bin/env bash
set -euo pipefail

repository_root="$(git rev-parse --show-toplevel)"
codex_root="${CODEX_HOME:-${HOME}/.codex}"
validator="$codex_root/skills/.system/plugin-creator/scripts/validate_plugin.py"

if [[ ! -f "$validator" ]]; then
  printf 'Codex plugin validator not found at %s\n' "$validator" >&2
  exit 1
fi
if ! command -v uv >/dev/null 2>&1; then
  printf 'uv is required to run the Codex plugin validator with PyYAML.\n' >&2
  exit 1
fi

uv run --no-project --with pyyaml python "$validator" "$repository_root/plugins/rpiv-codex"
