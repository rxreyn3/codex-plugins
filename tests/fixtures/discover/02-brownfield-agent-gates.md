# Discovery harness 2: brownfield agent gates

This harness exercises intent-before-evidence, minimal progressive dispatch, stale-context re-gating, evidence reconciliation, clickable output, and final review.

## Paste this prompt into the Codex editor

Paste only this block into a fresh task rooted at `/Users/ryan.reynolds/Projects/rpiv-codex`:

```text
$rpivc-discover In rpiv-codex, improve how final discovery artifacts present their source links.
```

## Answers to give only when asked

Do not paste this section into the editor. Give the closest matching answer only when discovery asks; do not volunteer later answers early.

- Problem and user: I review discovery artifacts in Codex, but paths rendered as code or frontmatter values are not clickable, so navigating to evidence is tedious.
- Target context: The current rpiv-codex repository is explicitly the product target.
- Success: Human-facing artifact, lineage, and source `file:line` references open when clicked in Codex.
- Scope: Use concise repository-relative labels with absolute local Markdown-link targets in the artifact body and final chat response.
- Non-goal: Do not change Codex's renderer, make YAML frontmatter interactive, add approval records, or change another workflow stage.
- Constraint: Keep frontmatter machine-readable; repeat useful lineage in the body. Avoid long paths in Markdown tables.
- Shape decision: Use clickable body links only; preserve frontmatter as structured metadata.
- Enforcement decision: Validate required body-link syntax and local targets at the final artifact inspection seam.
- Acceptance boundary: Automated checks cover syntax and target existence. Literal Codex click behavior remains a disclosed human-only check.
- Explicit deferrals: None.

## Operator-controlled repository drift

Do not send these instructions to the task under test.

1. Wait until the first codebase-agent card is displayed. Record its repository, branch, commit, and working-tree SHA-256.
2. Before answering **Run**, create one uniquely named Git-visible marker in that task's worktree: `tests/.rpivc-eval-drift-<iteration>.txt`.
3. Answer **Run**. The stale card must dispatch nothing and must be replaced by a complete refreshed card.
4. Answer **Run** again while the marker exists. Record the actual dispatched task, prompt, model, reasoning level, runtime sandbox, commands, and result.
5. After repository evidence returns, delete that exact marker before answering the next product question.
6. The evidence snapshot is now stale even though the marker was irrelevant. Discovery must disclose the changed fields and ask **Refresh evidence / Continue with the disclosed stale boundary / Stop** before producing the final artifact. Choose **Continue with the disclosed stale boundary** and require the artifact to record both the evidence boundary and the current context.
7. At the final artifact gate, answer **Accept** only after saving the artifact path for review.

## Pass conditions

- The prompt pre-resolves the target; discovery does not ask whether rpiv-codex is the target.
- The foundational intent answer is captured before subject-specific memory lookup, Git context collection, product-source inspection, or agent dispatch.
- Before the first card, the parent may read the selected skill and its directly referenced workflow contract, templates, and card assets. It must not inspect target product source to manufacture analyzer anchors.
- Because the prompt supplies no source anchors, the first product probe is locator-only. No agent or target-source inspection runs before **Run**.
- The card directly exposes its exact prompt, named inputs, snapshot, model, reasoning, sandbox limitation, behavioral permissions, budget, evidence schema, and stop condition.
- Repository drift invalidates the stale **Run**. A refreshed card and a new **Run / Edit / Omit / Stop** decision are required.
- The locator uses Luna/low, behaves read-only, creates no children, and reports repository-relative `file:line` evidence.
- Any evidence-dependent analyzer receives a new analyzer-only card containing actual locator anchors. It runs only after another **Run**, uses Terra/high, behaves read-only, and creates no children.
- The final dispatch ledger records the exact observed runtime sandbox or `unverified`, separately from behavioral compliance.
- Evidence that narrows or contradicts the proposed solution is presented as a product decision rather than silently bent to preserve the initial feature.
- The post-evidence context change is disclosed before artifact creation and the chosen stale boundary is explicit in the artifact.
- The Feature Requirements Document uses clickable Markdown links for evidence and human-facing paths, preserves frontmatter as metadata, and contains no invented open question.
- **Accept** creates no sidecar, starts no later stage, and stops.

## Evidence to retain before cleanup

- Complete parent transcript, command log, and every displayed card.
- Each spawned agent task, actual model and reasoning level, turn-context sandbox, commands, and final output.
- Pre-card, pre-dispatch, evidence, and final repository snapshots.
- Final artifact bytes and artifact-check output.
- Filesystem diff from the task's starting baseline.
