# RPIV-Pi review checkpoint

## Current checkpoint

- **Reviewed source:** `packages/rpiv-pi` in [`rpiv-mono` commit `68d9a0014b70006d7b04b57933752338a2716db7`](https://github.com/juicesharp/rpiv-mono/tree/68d9a0014b70006d7b04b57933752338a2716db7/packages/rpiv-pi), dated 2026-09-30 (`feat(rpiv-site): v2.12 release-notes post - a challenger for build`).
- **Comparison floor for this audit:** original RPIV-Codex source snapshot `7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7`. Research also had a recorded selective review through `d74b1c99830a565f3df3f37e0a36616d17ffc574`; this full sweep includes that earlier interval. Per-skill original implementation origins remain preserved in their port histories.
- **Outcome:** reviewed the reachable source changes for every existing Codex port through the checkpoint. No further source behavior is selected for porting. There are no outstanding deferrals.

The source pin is a ceiling, not a shared lower bound. Each existing port below has been reviewed through this checkpoint. A later review starts at `68d9a0014b70006d7b04b57933752338a2716db7` for that skill and compares only newly reachable upstream changes, while still checking the current Codex implementation and any newly recorded deferrals.

## Per-skill baselines

The source skill on the left is the lineage used for future comparison; the Codex name on the right is its current counterpart. This table records the review endpoint, not a claim that each skill was first ported from the same source commit.

| RPIV-Pi source skill | RPIV-Codex skill | Reviewed through |
|---|---|---|
| `discover` | `rpivc-discover` | `68d9a0014b70006d7b04b57933752338a2716db7` |
| `research` | `rpivc-research` | `68d9a0014b70006d7b04b57933752338a2716db7` |
| `blueprint` | `rpivc-blueprint` | `68d9a0014b70006d7b04b57933752338a2716db7` |
| `design` | `rpivc-design` | `68d9a0014b70006d7b04b57933752338a2716db7` |
| `plan` | `rpivc-plan` | `68d9a0014b70006d7b04b57933752338a2716db7` |
| `amend` | `rpivc-revise` | `68d9a0014b70006d7b04b57933752338a2716db7` |
| `implement` | `rpivc-implement` | `68d9a0014b70006d7b04b57933752338a2716db7` |
| `validate` | `rpivc-validate` | `68d9a0014b70006d7b04b57933752338a2716db7` |
| `code-review` | `rpivc-code-review` | `68d9a0014b70006d7b04b57933752338a2716db7` |
| `commit` | `rpivc-commit` | `68d9a0014b70006d7b04b57933752338a2716db7` |
| `create-handoff` | `rpivc-create-handoff` | `68d9a0014b70006d7b04b57933752338a2716db7` |
| `resume-handoff` | `rpivc-resume-handoff` | `68d9a0014b70006d7b04b57933752338a2716db7` |

## Settled dispositions

These are closed decisions. Do not bring them back as open port suggestions in the next sync. Reopen only when one of the conditions below applies.

| Upstream change or capability | Disposition | Reason and reopen condition |
|---|---|---|
| Research progress markers and citation wording (`research/SKILL.md`; source commits `43d9b3e5`, `2fb6b07b`) | **Retain the current Codex adaptation.** | Codex already reports workflow progress in commentary and uses verified, navigable citations. Reconsider only if a concrete Codex research failure shows a missing progress boundary or citation guarantee. The earlier adaptation is recorded in commit `e78cf6804895a9a276c5107360b154395458b7c3`. |
| Slice research aliases and citation guidance (`slice/SKILL.md`), plus the `slice_n` / `slice-N` filename identity guard (`design-slice/SKILL.md`; `fcd66400`) | **No separate port.** | Codex design owns vertical-slice decomposition in its consolidated design artifact; there is no standalone slice workflow or Pi filename contract to preserve. Reconsider if Codex adds a separate slice stage or a demonstrated identity collision. |
| Acceptance inventory and acceptance lineage (`quick-plan`, `synthesize`, `amend`; source commits `71b2b899`, `676337c7`, `30916f1c`) | **Declined for the current Codex product.** | The proposed workflow is tied to goal-artifact acceptance. The user has decided that workflow is not used for these ports. Do not add the Acceptance skill or its inventory/lineage behavior. Reopen only if the user changes that product decision or Codex adopts a goal-artifact workflow. This is a product-scope decision, not a claim that an Acceptance port was tested or accepted. |
| Pi implementation write-set, reconciliation grammar, live-byte, and lint mechanics (`implement/SKILL.md`; `_shared/reconcile-lint.mjs`) | **Retain the existing Codex implementation.** | Pi host mechanics have no direct Codex runtime equivalent, and the current Codex skill defines its own bounded edit grammar. Reconsider only after a reproducible implementation failure establishes a specific missing guard. |
| Pi elaboration and stitching (`elaborate/SKILL.md`; `_shared/stitch-elaborations.mjs`) | **No separate port.** | There is no matching Codex elaboration-and-stitching stage in the current workflow. Reconsider if such a stage is introduced or a current artifact contract starts depending on it. |
| Acceptance commands and acceptance-derived rebound behavior (`validate/SKILL.md`) | **Declined with the Acceptance product decision.** | These checks depend on the goal-artifact workflow the user has declined. Keep current validation behavior. Reopen only with a changed product decision or a concrete validation gap unrelated to merely having different Pi commands. |
| Grading policy and separate `lens-grade` skill, including the comment-only severity adjustment (`grade/SKILL.md`, `lens-grade/SKILL.md`; `cd3078c8`, `f584fca0`) | **No port.** | The Pi grader and lens workflow are part of the Pi host and `meta` flow; Codex code review is a different workflow. Reconsider only if a measured Codex review defect identifies a matching need. |
| Shared reconciliation, agent fan-out, retry, and host gates | **Retain Codex-native behavior.** | These are Pi runtime orchestration mechanisms, not standalone prompt features. Do not copy host instructions without a Codex failure that requires them. |
| Other inspected existing skills (`discover`, `blueprint`, `design`, `plan`, `revise`, `code-review`, `commit`, `create-handoff`, `resume-handoff`) | **No source change to port.** | The selected source skill files do not add a relevant behavior for these Codex stages through the checkpoint. Reopen when their source files or reachable dependencies change after this checkpoint. |

There is a source-document inconsistency in `amend/SKILL.md` around its `--acceptance` flag exclusion list at this snapshot. It does not change the Codex decision above; leave upstream source untouched and do not import the inconsistency.

## Rules for the next sync

1. Keep the one-skill-at-a-time port boundary.
2. Read this ledger, then freeze one source commit. Compare the selected skill's source and reachable dependencies from its `Reviewed through` commit to the frozen commit. Do not re-audit older history as if it were new.
3. Also compare the surviving Codex behavior and history, and reconsider only deferrals explicitly listed here or added by a later review.
4. A closed disposition stays closed unless its row's reopen condition is met, the user explicitly changes direction, or a correctness issue is demonstrated. A newer commit that merely repeats an already-reviewed idea does not reopen it.
5. After completing a later review, advance only that skill's reviewed-through value and record the new evidence, disposition, and reopen condition here. Advance the global source pin separately.

## Outstanding deferrals

None.
