#!/usr/bin/env bash
set -euo pipefail

repository_root="$(git rev-parse --show-toplevel)"
validator="$repository_root/scripts/vendor/codex-plugin-validator/validate_plugin.py"

if [[ ! -f "$validator" ]]; then
  printf 'Repository plugin validator not found at %s\n' "$validator" >&2
  exit 1
fi
if ! command -v uv >/dev/null 2>&1; then
  printf 'uv is required to run the Codex plugin validator with PyYAML.\n' >&2
  exit 1
fi

for plugin in rpiv-codex codex-advisor; do
  uv run --no-project --with pyyaml python -B "$validator" "$repository_root/plugins/$plugin"
done
