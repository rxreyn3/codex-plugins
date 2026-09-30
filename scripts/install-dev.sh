#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf '%s\n' \
    'Usage: scripts/install-dev.sh' \
    '' \
    'Build and install an ignored, cache-busted development copy of RPIV Codex.' \
    'The tracked plugin manifest and public marketplace are not changed.'
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi
if [[ "$#" -ne 0 ]]; then
  usage >&2
  exit 2
fi

repository_root="$(git rev-parse --show-toplevel)"
cd "$repository_root"
candidate_commit="$(git rev-parse HEAD)"
build_json="$(RPIV_CODEX_CANDIDATE_COMMIT="$candidate_commit" node scripts/prepare-dev-marketplace.mjs)"
development_root="$(printf '%s' "$build_json" | node -e 'let input=""; process.stdin.on("data", chunk => input += chunk); process.stdin.on("end", () => process.stdout.write(JSON.parse(input).developmentRoot));')"
development_version="$(printf '%s' "$build_json" | node -e 'let input=""; process.stdin.on("data", chunk => input += chunk); process.stdin.on("end", () => process.stdout.write(JSON.parse(input).version));')"

configured_root="$(codex plugin marketplace list --json | node -e '
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const match = JSON.parse(input).marketplaces.find(item => item.name === "ryan-codex-dev");
  if (match) process.stdout.write(match.root);
});
')"

if [[ -n "$configured_root" && "$configured_root" != "$development_root" ]]; then
  printf 'The ryan-codex-dev marketplace already points somewhere else:\n%s\n' "$configured_root" >&2
  printf 'Remove it explicitly before retrying: codex plugin marketplace remove ryan-codex-dev\n' >&2
  exit 1
fi

if [[ -z "$configured_root" ]]; then
  codex plugin marketplace add "$development_root"
fi

install_json="$(codex plugin add rpiv-codex@ryan-codex-dev --json)"
installed_root="$(printf '%s' "$install_json" | node -e '
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const result = JSON.parse(input);
  if (!result.installedPath) process.exit(1);
  process.stdout.write(result.installedPath);
});
')"

diff -qr "$development_root/plugins/rpiv-codex" "$installed_root"

printf '\nDevelopment plugin installed and byte-verified.\n'
printf 'Candidate commit: %s\n' "$candidate_commit"
printf 'Development version: %s\n' "$development_version"
printf 'Candidate root: %s\n' "$development_root/plugins/rpiv-codex"
printf 'Installed root: %s\n' "$installed_root"
printf '\nStart a fresh Codex task in an unrelated project for acceptance testing.\n'
printf 'Use the realistic and boundary prompts from the completed port task.\n'
