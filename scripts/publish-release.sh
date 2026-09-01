#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf '%s\n' \
    'Usage: scripts/publish-release.sh X.Y.Z --yes' \
    '' \
    'Create an annotated tag, atomically push main and the tag, then create' \
    'the GitHub release. Pushing main is the public plugin release boundary.'
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi
if [[ "$#" -ne 2 || "$2" != "--yes" ]]; then
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
manifest_version="$(node -p 'require("./plugins/rpiv-codex/.codex-plugin/plugin.json").version')"
if [[ "$manifest_version" != "$version" ]]; then
  printf 'Manifest version is %s, not %s.\n' "$manifest_version" "$version" >&2
  exit 1
fi
if [[ "$(git branch --show-current)" != "main" || -n "$(git status --porcelain)" ]]; then
  printf 'Publishing requires a clean main branch containing the release commit.\n' >&2
  exit 1
fi
if [[ "$(git remote get-url origin)" != "https://github.com/rxreyn3/rpiv-codex.git" ]]; then
  printf 'Unexpected origin URL: %s\n' "$(git remote get-url origin)" >&2
  exit 1
fi

git fetch origin main --tags
if ! git merge-base --is-ancestor origin/main HEAD; then
  printf 'origin/main is not an ancestor of the release commit.\n' >&2
  exit 1
fi
if [[ "$(git rev-list --count origin/main..HEAD)" -lt 1 ]]; then
  printf 'Expected reviewed release commits ahead of origin/main.\n' >&2
  exit 1
fi
origin_version="$(git show origin/main:plugins/rpiv-codex/.codex-plugin/plugin.json | node -e 'let input=""; process.stdin.on("data", chunk => input += chunk); process.stdin.on("end", () => process.stdout.write(JSON.parse(input).version));')"
if [[ "$origin_version" == "$version" ]]; then
  printf 'Release version %s is already present on origin/main. Choose a new version.\n' "$version" >&2
  exit 1
fi
if git rev-parse -q --verify "refs/tags/v$version" >/dev/null; then
  printf 'Tag v%s already exists.\n' "$version" >&2
  exit 1
fi

scripts/test.sh
scripts/validate-plugin.sh
git tag -a "v$version" -m "RPIV Codex $version"

if ! git push --atomic origin main "refs/tags/v$version"; then
  git tag -d "v$version" >/dev/null
  printf 'Atomic push failed; the local unpublished tag was removed.\n' >&2
  exit 1
fi

if ! gh release create "v$version" --title "RPIV Codex $version" --generate-notes; then
  printf 'Main and v%s are public, but GitHub release creation failed. Retry with:\n' "$version" >&2
  printf 'gh release create v%s --title "RPIV Codex %s" --generate-notes\n' "$version" "$version" >&2
  exit 1
fi

printf 'Published RPIV Codex %s. Users can now upgrade and reinstall from the rpiv-codex marketplace.\n' "$version"
