# Development workflow

RPIV Codex ports or updates one RPIV-Pi skill at a time. The repository orchestration skill owns the behavioral work; these scripts only make testing and installation repeatable.

```text
branch -> port one skill -> focused tests -> full tests -> candidate commit
       -> development install -> fresh-task acceptance -> repair or accept
```

## Port one skill

Start from a clean branch named for the skill. Candidate branches may be pushed for backup or review, but do not merge or push plugin changes to `main` before a release version is prepared:

```bash
git switch -c codex/port-<skill>
```

In a fresh Codex task rooted in this repository, invoke `port-rpiv-skill` with exactly one upstream skill name:

```text
$port-rpiv-skill research
$port-rpiv-skill research --latest
```

The ordinary form uses the recorded fixed source pin. `--latest` requires a clean RPIV-Codex worktree, successfully fetches `upstream/main`, freezes that fetched commit for the invocation, and may advance the fixed pin in a separate commit before handling only the named skill. If an unfinished candidate exists, resume it with ordinary pinned mode; `--latest` stops before fetching. Neither form requires the sibling `rpiv-mono` working tree to be clean or checked out at the selected revision, and neither may mutate that source working tree.

An existing target uses selective-update mode. Its original upstream baseline identifies the source behind the surviving Codex implementation. Its per-skill review baseline records the newest source commit whose reachable changes were assessed for that skill; it does not imply that every change was adopted or accepted, and it is independent of the global source pin. The first actual update to a skill treats the README's historical `rpiv-pi` hash as that skill's original plugin baseline, then records a per-skill reviewed-through baseline. Never replace the README hash with the moving global pin.

## Test the source candidate

During development, run the named skill test together with the shared packaging checks:

```bash
scripts/test.sh research
```

Before candidate acceptance, run the complete dependency-free Node.js suite:

```bash
scripts/test.sh
scripts/validate-plugin.sh
```

Do not add repeated model evaluations or a new general test harness unless a concrete failure requires one. Manual verification remains the later fresh-task acceptance step.

## Install the development candidate

```bash
scripts/install-dev.sh
```

The installer copies only the RPIV workflow plugin into `.local/ryan-codex-dev`, adds a cache-buster only to that ignored copy, installs it from the `ryan-codex-dev` marketplace, and byte-compares the installed cache with the candidate. Its catalog contains only that copied plugin. It never edits the tracked public manifest.

Start a fresh Codex task in an unrelated project and run the realistic and boundary prompts supplied by the port task. Record either `Pass` with the required observations or `Repair` with the exact failing prompt, observed result, expected result, candidate commit, and development version.

The public and development plugins can both be installed, but they expose the same skill names. Use a fresh task and confirm the loaded plugin version before treating the result as acceptance evidence.

## Restore the public plugin after testing

```bash
codex plugin marketplace upgrade ryan-codex
codex plugin add rpiv-codex@ryan-codex
codex plugin list --json
```

Confirm the public replacement is installed and enabled, then remove the development copy:

```bash
codex plugin remove rpiv-codex@ryan-codex-dev
codex plugin marketplace remove ryan-codex-dev
```

If replacement installation or verification fails, preserve the development installation. The ignored `.local/` copy may remain for the next iteration; the installer rebuilds it from scratch. See the [marketplace migration instructions](../README.md#migrate-from-the-previous-marketplace-names) for installations using the older names.
