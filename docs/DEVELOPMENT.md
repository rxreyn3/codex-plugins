# Development workflow

RPIV Codex ports one RPIV-Pi skill at a time. The repository orchestration skill owns the behavioral port; these scripts only make testing and installation repeatable.

```text
branch -> port one skill -> focused tests -> full tests -> candidate commit
       -> development install -> fresh-task acceptance -> repair or accept
```

## Port one skill

Start from a clean branch named for the skill. Candidate branches may be pushed for backup or review, but do not merge or push plugin changes to `main` before a release version is prepared:

```bash
git switch -c codex/port-<skill>
```

In a fresh Codex task rooted in this repository, invoke `port-rpiv-skill` with exactly one upstream skill name. Follow its dependency tracing, porting, and candidate-commit gates.

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

The installer rebuilds `.local/rpiv-codex-dev`, adds a cache-buster only to that ignored copy, installs it from the `rpiv-codex-dev` marketplace, and byte-compares the installed cache with the candidate. It never edits the tracked public manifest.

Start a fresh Codex task in an unrelated project and run the realistic and boundary prompts supplied by the port task. Record either `Pass` with the required observations or `Repair` with the exact failing prompt, observed result, expected result, candidate commit, and development version.

The public and development plugins can both be installed, but they expose the same skill names. Use a fresh task and confirm the loaded plugin version before treating the result as acceptance evidence.

## Restore the public plugin after testing

```bash
codex plugin remove rpiv-codex@rpiv-codex-dev
codex plugin marketplace remove rpiv-codex-dev
codex plugin marketplace upgrade rpiv-codex
codex plugin add rpiv-codex@rpiv-codex
```

The ignored `.local/` copy may remain for the next iteration; the installer rebuilds it from scratch.
