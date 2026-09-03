#!/usr/bin/env bash
set -euo pipefail

repository_root="$(git rev-parse --show-toplevel)"
cd "$repository_root"

usage() {
  printf '%s\n' \
    'Usage: scripts/test.sh [skill]' \
    '' \
    'With no argument, run the complete repository suite.' \
    'With a skill, run its focused test plus the plugin packaging test.' \
    '' \
    'Skills: blueprint, code-review, commit, create-handoff, design, discover, implement, research, resume-handoff, revise, validate'
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ "$#" -gt 1 ]]; then
  usage >&2
  exit 2
fi

case "${1:-all}" in
  all)
    node --test tests/*.test.mjs
    ;;
  blueprint|code-review|commit|create-handoff|design|discover|implement|research|resume-handoff|revise|validate)
    node --test "tests/${1}.test.mjs" tests/plugin.test.mjs
    ;;
  *)
    printf 'Unknown skill: %s\n\n' "$1" >&2
    usage >&2
    exit 2
    ;;
esac
