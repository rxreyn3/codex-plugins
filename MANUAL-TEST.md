# Manual checkpoint: `rpivc-discover`

These fixtures are the manual regression surface for discovery. Update them whenever an interaction contract changes, then exercise the affected fixture before considering the discovery unit ready.

## Prerequisite

Open a fresh Codex task rooted at `/Users/ryan.reynolds/Projects/rpiv-codex` so the repository-local skill and project agents are loaded. Do not install or copy them globally.

Open the chosen fixture, copy only its **Paste this prompt into the Codex editor** block, and submit it. Keep the fixture open afterward so you can give its locked answers one at a time. Do not paste the answer section or volunteer later answers early.

Use [the scoring rubric](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/RUBRIC.md) for every run.

## Fixture catalog

| Fixture | What it exercises | Expected probe |
|---|---|---|
| [01 — vague greenfield](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/01-vague-greenfield.md) | Intent refinement without implementation leakage | None unless a product repository is later established |
| [02 — narrow brownfield](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/02-narrow-brownfield-addition.md) | Small additive command change | Smallest evidence-backed roster |
| [03 — cross-cutting brownfield](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/03-cross-cutting-brownfield.md) | Propagation across integration boundaries | Locator, then separately gated analysis if justified |
| [04 — artifact refinement](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/04-existing-artifact-refinement.md) | Preserving a supplied artifact while refining decisions | Only when repository evidence can change a live decision |
| [05 — terminal spinner](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/05-terminal-spinner.md) | No-probe pacing and the earlier bucket-filling regression | None |
| [06 — clickable source links](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/06-clickable-source-links.md) | Brownfield conversational dispatch and link rendering | Locator first; analyzer only through a new gate |
| [07 — evidence contradiction](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/07-evidence-contradiction.md) | Evidence correcting or cancelling the proposed feature | Smallest probe needed to establish the contradiction |
| [08 — context drift](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/08-context-drift-regate.md) | Re-gating a card after repository state changes | Locator must remain undispatched under stale context |

## Core run: no-probe discovery

Copy the prompt block from [05 — terminal spinner](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/05-terminal-spinner.md), then use its locked answers only when asked.

Confirm that discovery:

1. Establishes that the idea is a hypothetical script and not an `rpiv-codex` feature.
2. Captures what the user can run and observe, then declares `no probe justified`.
3. Batches independent routine details instead of asking a long procession of single questions.
4. Creates one Feature Requirements Document and no dispatch or approval file.
5. Presents a clickable artifact link and asks **Accept / Revise / Stop**.
6. On **Accept**, creates no additional file and starts no later stage.

## Core run: conversational agent round trip

Copy the prompt block from [06 — clickable source links](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/06-clickable-source-links.md), then use its locked answers only when asked.

Confirm that discovery:

1. Treats `rpiv-codex` as the already-resolved target.
2. Displays only the locator card first unless exact analyzer anchors already exist.
3. Shows the role, exact prompt, inputs, repository snapshot, model, reasoning level, requested sandbox, inherited-parent enforcement, behavioral permissions, budget, evidence schema, and stop condition.
4. Runs nothing before **Run**. **Edit** shows the whole revised card; **Omit** removes the role; **Stop** ends discovery.
5. Rechecks the repository snapshot immediately before dispatch.
6. Runs the approved locator with the displayed contract, no inherited conversation beyond named inputs, and no child agent.
7. Reports what locator evidence was incorporated or excluded.
8. If analysis is justified, displays a new analyzer-only card with actual locator anchors and waits for another decision.
9. Records actual runtime sandbox observations separately from behavioral read-only compliance.
10. Produces clickable Markdown links for artifact, lineage, dispatch-ledger, and source references without long path tables.

## Targeted regression: contradictory evidence

Run [07 — evidence contradiction](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/07-evidence-contradiction.md).

The run passes only if discovery distinguishes scripts invoking the helper from scripts consuming conversational prose, asks what fails with multiline JavaScript Object Notation, and accepts that no feature is needed. It must not manufacture a compact-output requirement merely to leave the interview carrying an implementation-shaped souvenir.

## Targeted regression: repository drift

Follow the operator steps in [08 — context drift](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/08-context-drift-regate.md).

The run passes only if the stale **Run** dispatches nothing, the complete card is refreshed with the new working-tree hash, and a new **Run / Edit / Omit / Stop** decision is required.

## Filesystem checks

After each run:

- A completed discovery may add only `.rpiv-codex/artifacts/discover/<timestamp>_<topic>.md`.
- `.rpiv-codex/dispatch/` and `.rpiv-codex/approvals/` must not appear.
- Source files, `.gitignore`, Git history, and remote state must remain unchanged except for the deliberate temporary edit in fixture 08, which the operator restores.
- `.agents/skills/rpivc-research/` must not exist.

## Stop checkpoint

Stop after the affected fixtures have been manually exercised and record the rubric scores, agent-card decisions, evidence incorporated or rejected, context-drift behavior, artifact path, and final **Accept / Revise / Stop** decision. Do not implement research until Ryan explicitly approves the next unit.
