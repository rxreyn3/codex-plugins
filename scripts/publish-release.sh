#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf '%s\n' \
    'Usage: scripts/publish-release.sh X.Y.Z --github-user USERNAME --yes' \
    '' \
    'Create an annotated tag, atomically push main and the tag, then create' \
    'the GitHub release using USERNAME credentials already stored by gh.' \
    'Pushing main is the public plugin release boundary.'
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi
if [[ "$#" -ne 4 || "$2" != "--github-user" || -z "$3" || "$4" != "--yes" ]]; then
  usage >&2
  exit 2
fi

version="$1"
github_user="$3"
repository_root="$(git rev-parse --show-toplevel)"
cd "$repository_root"

if [[ ! "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$ ]]; then
  printf 'Expected a clean semantic version such as 0.3.0; build metadata is not allowed.\n' >&2
  exit 2
fi
if [[ ! "$github_user" =~ ^[A-Za-z0-9]([A-Za-z0-9-]{0,37}[A-Za-z0-9])?$ ]]; then
  printf 'Invalid GitHub username: %s\n' "$github_user" >&2
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

if ! command -v gh >/dev/null 2>&1; then
  printf 'GitHub CLI is required to select the publishing identity.\n' >&2
  exit 1
fi
if ! github_token="$(gh auth token --hostname github.com --user "$github_user")"; then
  printf 'No GitHub CLI credential is available for %s on github.com.\n' "$github_user" >&2
  exit 1
fi
if ! authenticated_user="$(GH_TOKEN="$github_token" gh api user --jq .login)"; then
  printf 'Could not verify the GitHub credential for %s.\n' "$github_user" >&2
  exit 1
fi
if [[ "$authenticated_user" != "$github_user" ]]; then
  printf 'The selected credential authenticates as %s, not %s.\n' "$authenticated_user" "$github_user" >&2
  exit 1
fi

git_with_github_identity() {
  GH_TOKEN="$github_token" git \
    -c credential.helper= \
    -c 'credential.helper=!gh auth git-credential' \
    "$@"
}

git_with_github_identity fetch origin main --tags
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

if ! git_with_github_identity push --atomic origin main "refs/tags/v$version"; then
  git tag -d "v$version" >/dev/null
  printf 'Atomic push failed; the local unpublished tag was removed.\n' >&2
  exit 1
fi

if ! GH_TOKEN="$github_token" gh release create "v$version" --title "RPIV Codex $version" --generate-notes; then
  printf 'Main and v%s are public, but GitHub release creation failed. Retry with:\n' "$version" >&2
  printf 'GH_TOKEN="$(gh auth token --hostname github.com --user %s)" gh release create v%s --title "RPIV Codex %s" --generate-notes\n' "$github_user" "$version" "$version" >&2
  exit 1
fi

printf 'Published RPIV Codex %s. Users can now upgrade and reinstall from the rpiv-codex marketplace.\n' "$version"
