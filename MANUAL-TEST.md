# Manual checkpoint: `rpivc-discover`

Discovery has two manual harnesses: one proves the simplest no-agent path, and one proves the highest-risk brownfield agent path. Use [the shared forward-testing guide](/Users/ryan.reynolds/Projects/rpiv-codex/tests/FORWARD-TESTING.md) when running a single-pass evaluation goal; this file contains only the discovery-specific entry points and safety checks.

## Prerequisite

Open a fresh Codex task rooted at `/Users/ryan.reynolds/Projects/rpiv-codex` so the repository-local skill and agents are loaded. Do not install or copy them globally.

Open one harness and paste only its **Paste this prompt into the Codex editor** block. Keep the harness open, but do not show it to the task under test. Supply the closest locked answer only when the corresponding question is asked, and perform operator steps outside the task conversation.

Use [the discovery rubric](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/RUBRIC.md) and [the parity matrix](/Users/ryan.reynolds/Projects/rpiv-codex/PARITY.md) to review each run. RPIV is a pinned, read-only behavioral reference; do not run it or compare outputs line by line.

## The two harnesses

| Harness | What it proves | Expected probe |
|---|---|---|
| [01 — no-probe discovery](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/01-no-probe-discovery.md) | Intent capture, adaptive pacing, artifact quality, and the final conversational gate | None |
| [02 — brownfield agent gates](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/02-brownfield-agent-gates.md) | Progressive locator/analyzer gates, repository drift, evidence reconciliation, clickable Markdown links, and final review | Locator first; analyzer only when locator evidence justifies it |

The first harness absorbs the former terminal-spinner regression. The second absorbs the former clickable-link, contradictory-evidence, and context-drift regressions. Two tests, many sharp edges; a pleasingly small blast radius.

## Running a harness manually

1. Start from a recorded Git and `.rpiv-codex/` baseline.
2. Create a fresh task and paste only the harness's exact prompt.
3. Send locked answers one at a time when asked. Do not volunteer later answers or pass conditions.
4. Make only the gate decisions specified by the harness.
5. For the brownfield harness, create and remove its unique drift marker at the exact instructed points. Do this outside the subject task so the workflow must detect the repository change itself.
6. Save the raw transcript, agent-task records, repository snapshots, final artifact, validation output, and filesystem diff before cleanup.
7. Score the run with the rubric, then delete only paths created by that run.

For a repeatable evaluation, copy the **Suggested discovery goal** from [the forward-testing guide](/Users/ryan.reynolds/Projects/rpiv-codex/tests/FORWARD-TESTING.md). It runs each harness once in a fresh task, asks two independent reviewers to judge raw evidence, may apply one bounded correction set, validates, reports **PASS** or **FAIL**, and stops. Any behavioral edit requires a new user-triggered evaluation before it can pass.

## Filesystem and scope checks

- A completed discovery may add only `.rpiv-codex/artifacts/discover/<timestamp>_<topic>.md`.
- `.rpiv-codex/dispatch/` and `.rpiv-codex/approvals/` must not appear.
- Source files, `.gitignore`, Git history, and remote state must remain unchanged except for deliberate evaluation changes made by the orchestrator.
- Cleanup must remove only artifacts and drift markers created after the recorded baseline; preserve all pre-existing artifacts and unrelated dirty files.
- `.agents/skills/rpivc-research/` must not exist.

## Stop checkpoint

Stop after one evaluation. Report **PASS** only when both discovery harnesses pass, both independent reviewers have no verified material finding, no applicable preserved behavior or unexplained parity gap remains, deterministic checks pass, and evaluation-created state is cleaned. If a behavioral correction was applied, report **FAIL — candidate fixes applied; rerun required**. Do not rerun either harness or implement research or another workflow stage.
