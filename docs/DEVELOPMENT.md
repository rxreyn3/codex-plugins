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

An existing target uses selective-update mode. Read [the RPIV-Pi review ledger](RPIV-PI-REVIEW.md) first. Its original upstream baseline identifies the source behind the surviving Codex implementation. Its per-skill review baseline records the newest source commit whose reachable changes were assessed for that skill; it does not imply that every change was adopted or accepted, and it is independent of the global source pin. Update only the selected skill's reviewed-through entry after its review is complete. The first actual update to a skill treats the README's historical `rpiv-pi` hash as that skill's original plugin baseline. Never replace the README hash with the moving global pin, and do not repeat a ledger disposition unless its stated reopen condition applies.

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

Plugin validation uses the repository’s [pinned official validator](../scripts/vendor/codex-plugin-validator/README.md), with its identifier helper and license, rather than a removed Codex system skill. It requires Python 3.9 or newer and `uv` for PyYAML. It checks the current legacy manifests, skill metadata and assets; behavioral and installed-plugin acceptance remain separate. When updating this validation tooling, also run `uv run --no-project --with pyyaml python -B tests/test_plugin_validator.py` for the disposable-package positive and negative cases.

Do not add repeated model evaluations or a new general test harness unless a concrete failure requires one. Manual verification remains the later fresh-task acceptance step.

## Install the development candidate

```bash
./scripts/install-dev.sh
codex
```

The installer copies RPIV from the current checkout or worktree into the primary checkout’s ignored `.local/ryan-codex-dev` directory. It gives the copy a unique version and compares it with the installed files before selecting it. Run it again after editing.

Start a fresh Codex task in an unrelated project and run the realistic and boundary prompts supplied by the port task. Record either `Pass` with the required observations or `Repair` with the exact failing prompt, observed result, expected result, candidate commit, and development version.

## Return to the installed GitHub copy

```bash
./scripts/install-dev.sh --release
codex
```

This selects the GitHub version already installed. To fetch a newer version, follow the [update commands](../README.md#update).

## Local workflow changes

A scoped local workflow change can extend the current mechanism without an upstream re-port. Keep upstream pins and per-skill review baselines unchanged. Run focused and affected consumer tests, the full suite, and plugin validation before acceptance. Do not install a candidate, commit, push, or replace the public plugin unless separately authorized.

Design persists an in-progress document before research and resumes from verified progress and approvals. Use [Design recovery scenarios](../tests/design-acceptance.md) for fresh-context behavioral checks. A native collaboration agent with no inherited conversation can load the exact candidate skill and a disposable project's design and upstream artifact to exercise recovery without installing or creating user-owned chats. Record the candidate source fingerprint, inputs, actions, output, and before/after artifacts. This establishes candidate-source behavior only; installed-plugin acceptance and user acceptance remain separate. Static wording assertions alone do not establish recovery.
