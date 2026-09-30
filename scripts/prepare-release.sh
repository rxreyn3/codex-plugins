#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf '%s\n' \
    'Usage: scripts/prepare-release.sh X.Y.Z' \
    '' \
    'Verify a clean, synchronized main branch and prepare the manifest version.' \
    'This command does not commit, tag, push, or create a GitHub release.'
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi
if [[ "$#" -ne 1 ]]; then
  usage >&2
  exit 2
fi

version="$1"
repository_root="$(git rev-parse --show-toplevel)"
cd "$repository_root"

if [[ ! "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$ ]]; then
  printf 'Expected a clean semantic version such as 0.3.0; build metadata is not allowed.\n' >&2
  exit 2
fi

if [[ "$(git branch --show-current)" != "main" ]]; then
  printf 'Release preparation must start on main.\n' >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  printf 'Release preparation requires a clean worktree.\n' >&2
  exit 1
fi
if [[ "$(git remote get-url origin)" != "https://github.com/rxreyn3/codex-plugins.git" ]]; then
  printf 'Unexpected origin URL: %s\n' "$(git remote get-url origin)" >&2
  exit 1
fi

git fetch origin main --tags
if ! git merge-base --is-ancestor origin/main HEAD; then
  printf 'Local main must contain origin/main before preparing a release.\n' >&2
  exit 1
fi
origin_version="$(git show origin/main:plugins/rpiv-codex/.codex-plugin/plugin.json | node -e 'let input=""; process.stdin.on("data", chunk => input += chunk); process.stdin.on("end", () => process.stdout.write(JSON.parse(input).version));')"
if [[ "$origin_version" == "$version" ]]; then
  printf 'Release version %s is already present on origin/main. Choose a new version.\n' "$version" >&2
  exit 1
fi
if git rev-parse -q --verify "refs/tags/v$version" >/dev/null; then
  printf 'Local tag v%s already exists.\n' "$version" >&2
  exit 1
fi
if git ls-remote --exit-code --tags origin "refs/tags/v$version" >/dev/null 2>&1; then
  printf 'Remote tag v%s already exists.\n' "$version" >&2
  exit 1
fi

scripts/test.sh
scripts/validate-plugin.sh
node scripts/set-plugin-version.mjs "$version"
scripts/test.sh
scripts/validate-plugin.sh

printf '\nRelease %s is prepared but not published.\n' "$version"
printf 'Review the manifest diff, then commit it with:\n\n'
printf 'git add plugins/rpiv-codex/.codex-plugin/plugin.json\n'
printf 'git commit -m "Release RPIV Codex %s"\n\n' "$version"
printf 'After reviewing that commit, publish explicitly with:\n\n'
printf 'scripts/publish-release.sh %s --github-user rxreyn3 --yes\n' "$version"
