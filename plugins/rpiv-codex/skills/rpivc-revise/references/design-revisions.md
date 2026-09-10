# Design lifecycle and authority transfer

Read this reference for every design input and every plan with a design `parent`. It extends Revise's numbered workflow by selecting the live authority. It does not create a second revision stage.

## 1. Resolve the lifecycle

Resolve repository-relative paths from the current repository root, including symlink destinations. Targets must be existing Markdown artifacts under this repository's `.rpiv/artifacts/designs/` or `.rpiv/artifacts/plans/` directory.

- **Plan input:** use the supplied plan. Resolve its design `parent` only far enough to verify provenance and lifecycle. `materialized_at` plus `design_fingerprint` establishes a transferred plan. For legacy artifacts, a current or historical `ready` state, implementation progress, validation child, or explicit implementation handoff establishes that the plan already crossed the transfer boundary. A later `in-review` state does not reactivate the design.
- **Design input:** discover child plans by exact `parent` match. Inspect frontmatter and explicit supersession markers before choosing. A filename similarity or modification time is not activity evidence. With one transferred active child, route the revision to that plan and keep the design byte-identical. With one initial `in-progress` or `in-review` child that has never been ready, select the pre-transfer pair. With no child, select the design alone. With multiple plausible active children or unclear legacy state, ask the developer to select before writing.
- **Historical input:** do not reparent or mutate an explicitly superseded design or plan. Resolve its active successor when the artifacts identify one; otherwise report that the supplied artifact is historical and ask for the intended live target.

Record exact paths, statuses, transfer evidence, and content fingerprints before preparing the proposal. Do not recurse through unrelated research, handoff, or sibling-plan chains.

## 2. Select the revision mode

### Design only

Before a child plan exists, revise the design alone. Preserve its creation and slice-approval workflow. A pending, unapproved slice remains Design work rather than a revision shortcut.

### Pre-transfer candidate pair

While the first plan is `in-progress` or in its initial `in-review`, Design remains authoritative. Read both selected artifacts completely. Trace an intended-behavior change through design decisions, Architecture, interfaces, Slices, File Map, Ordering Constraints, acceptance outcomes, and corresponding candidate-plan phases. Present one proposal and, after approval, update both artifacts so the candidate can still materialize the design accurately.

Preserve unaffected content and any valid candidate review work. If the change invalidates review findings or plan payloads, update them explicitly. Do not mark the plan ready until initial Plan review and the transfer checks complete.

### Transferred plan

After the plan has reached ready, the plan is the sole live specification. Read and edit the plan; do not read or compare the frozen design by default. Its `parent` and `design_fingerprint` are provenance, not an instruction to synchronize.

Read only the relevant frozen-design sections when the requested revision depends on original rationale, a rejected alternative, or a provenance dispute that the plan's `## Accepted Design Decisions` and prior Decision Amendments do not answer. State which sections were consulted and why. Never edit the frozen design.

For a material change to behavior, architecture, interfaces, phase boundaries, or acceptance outcomes:

1. show the replacement flow and affected plan sections in the proposal;
2. identify current source, preserved implementation, invalidated work, and verification evidence;
3. append a compact `## Decision Amendment {ISO 8601 timestamp}` with old intent, new intent, rationale and evidence, affected phases, and reopened checks;
4. temporarily hold a previously ready plan at `in-review` while the affected revision review runs;
5. restore `ready` only after the review clears and the rest of the plan remains ready.

A command correction, evidence update, or verification-method change that preserves intent remains an ordinary plan-only revision and does not need a Decision Amendment or independent architectural review.

## 3. Escalate a fundamental rethink

Recommend a successor Design followed by a successor Plan when the request reopens unresolved architectural exploration, changes the feature's overall goal, or invalidates the decomposition so broadly that preserving the existing phase lineage would obscure rather than explain the work. Do not use this route merely because a change is architectural or touches several phases.

Preserve the current pair as historical provenance. Do not create the successor automatically; present the boundary and hand off to Design only after the developer chooses that direction.

## 4. Review and report

For a pre-transfer pair, re-read both complete artifacts after editing and dispatch [Revision Reviewer](revision-reviewer.md) against the approved proposal, before/after artifacts, current source, and affected slice-to-phase map. If review is unavailable or fails, keep the design `in-progress` and candidate plan `in-review`; do not report transfer or readiness.

For a material transferred-plan revision, re-read the complete plan and dispatch the same reviewer against the approved proposal, before/after plan, Decision Amendment, current source, and frozen-design fingerprint. The reviewer receives frozen-design excerpts only when the proposal actually relied on them. If review is unavailable or fails, keep the plan `in-review` and report the missing review.

Verify every finding against source and the live artifact set. Repair deviations from the approved proposal and re-review changed material. A finding requiring a new developer decision expands neither the approved scope nor edit authority.

After review clears, record its scope, result, and remaining runtime checks in the new Follow-up. Artifact readiness means the current instructions are usable; it does not prove implementation or runtime acceptance.

Report the exact live artifact, lifecycle mode, preserved progress, reopened checks, metadata updates, review result, and actual status. For transferred plans, state that the design remained byte-identical and whether any frozen rationale was consulted. Recommend Implement at the earliest phase with reopened implementation or automated work, Validate when only manual acceptance remains, or Plan for a ready design without a child. Never invoke another stage automatically.
