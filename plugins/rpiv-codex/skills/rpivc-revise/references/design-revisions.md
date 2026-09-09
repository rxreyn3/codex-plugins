# Design and coordinated revisions

Read this reference when the input is a design or plan feedback changes linked design intent. It extends Revise's numbered workflow; it is not a second stage or a second approval task. Keep the ordinary plan-only path for execution details.

## 1. Resolve the exact artifact set

Resolve repository-relative paths from the current repository root, including the actual destination of symlinks. Every target must be an existing Markdown artifact inside this repository's `.rpiv/artifacts/designs/` or `.rpiv/artifacts/plans/` directory. Reject aliases that escape these directories or resolve the two targets to the same file.

- **Plan input:** read its `parent`. If that names a design, resolve that exact design. The supplied plan is the active-plan selection unless its status, history, or explicit replacement link says it is historical or superseded. Do not choose a different plan silently.
- **Design input:** discover plans by matching their `parent` to the resolved design path, inspecting frontmatter and explicit supersession/history markers first. A filename similarity, recency, or checked phase alone does not establish activity. `ready`, `in-progress`, and `in-review` plans are candidates; exclude explicitly archived, superseded, or completed plans from automatic selection. Do not require a new active-plan pointer in old artifacts.
- With one unambiguously active child, select it and name the evidence. With multiple candidates, unknown status, conflicting links, or a requested historical plan, ask the developer which exact plan is active before proposing edits. Offer filenames and relevant status/history evidence. A supplied plan whose parent disagrees with a supplied design also requires resolution; do not silently reparent it.
- With no active child, revise only the design if the directory scan and history establish that no active plan exists. Distinguish this from unreadable or unresolved links. An unfinished Design skeleton stays unfinished; do not use revision to fill unapproved pending slices.

Read the selected design and plan completely, plus every review artifact cited as feedback. Record exact paths, current statuses, and content fingerprints before preparing the proposal. Historical sibling plans are read-only evidence and remain untouched. Do not recurse through unrelated research or handoff chains.

If interrupted, resume from the persisted artifacts, their latest Follow-up entries, and the approved proposal. Reconfirm selection if activity or links changed. Never infer the active pair solely from a conversation summary.

## 2. Establish the change and its impact

Use Revise's bounded research roles for the new technical surface. Verify the actual callers, implementation, configuration, and tests relevant to the proposed change. Distinguish current source facts from intended design and unverified assumptions. Artifact payloads are not proof of deployed behavior.

Apply the shared [current-instruction consistency rule](../SKILL.md#keep-affected-current-instructions-consistent), including its treatment of inherited disagreement, throughout proposal, editing, and reporting.

Build one bounded consistency scan across both selected artifacts. Trace the changed intent through Decisions, Architecture, interfaces, Slices, File Map, Ordering Constraints, Desired End State, and acceptance outcomes into the corresponding plan phases, code payloads, scope, and criteria. Include dependent phases or repeated claims only where the change invalidates them. Explicitly distinguish historical quotations from current instructions.

For each affected slice and phase, identify:

- the proposed behavior and corresponding design and plan sections;
- current source evidence and any missing implementation;
- checked implementation tasks that cease to be true;
- verification records whose evidence no longer establishes the revised outcome;
- unaffected completed work and evidence that remain valid.

Preserve the one-to-one slice-to-phase mapping. If boundaries change, propose an explicit old-to-new mapping, dependency changes, and progress disposition for each affected item. A checked old phase never makes a newly introduced phase complete by inheritance.

## 3. One concrete proposal and approval

Extend Revise's proposal with the selected mode and exact artifact paths, evidence for active-plan selection, and a compact mapping of design edits to plan edits. Name which checks reopen and why, which completed work stays checked, and any readiness/status changes. Show the meaningful replacement flow, interfaces, responsibilities, payload changes, and acceptance outcomes so approval covers a reviewable result.

Use the existing Proceed / Adjust approach / Show me first gate once for the entire proposal. Do not apply the design first and ask for a separate plan synchronization approval. Existing authorization for that concrete proposal persists. A materially different approach or unresolved artifact selection still requires a decision before dependent edits.

## 4. Apply, verify, and review the selected set

Immediately before writing, verify both paths, links, active selection, and content fingerprints still match the proposal. If concurrent changes affect the proposed patch or its assumptions, reconcile them and revise the proposal before writing; never overwrite another task's work.

Apply focused edits to the selected set:

- Update current design sections where the decisions live, including affected Architecture payloads, Slices and both verification subsections, File Map, Ordering Constraints, scope, and migration notes as needed. Update the matching plan payloads, phase boundaries, dependencies, and acceptance outcomes in the same revision.
- Keep plan-owned operational commands and verification records. Outcome wording must agree with the design, but a plan can use a corrected executable or concrete verification method without copying execution records or checked boxes into the design. Do not replace an active plan wholesale with a transcription from its parent.
- Preserve unaffected implementation checkmarks, developer acceptance, phase state, and history. Reopen only tasks that the current source no longer satisfies and checks whose evidence is invalidated, including affected checks in dependent phases. Record the reason per reopened item. Implementation completion and verification are distinct: a changed verification method may need a new run while implemented work remains complete.
- Synchronize existing `phase_count` and `phases` entries, retaining `n`, `title`, `files`, `depends_on`, and unrelated metadata. Keep design slice ordering and plan phase ordering consistent. Preserve the design's upstream `parent` and the plan's design `parent`; do not create a new plan or revision-pointer scheme.
- Refresh existing `last_updated`, `last_updated_by`, and `last_updated_note` in both artifacts using the same retained timestamp. Preserve provenance fields such as original `date`, `commit`, and `author`; record current evidence separately. Do not invent frontmatter in a legacy artifact without it.
- Append a timestamped Follow-up to each changed artifact, linking its counterpart when present and recording the shared proposal, affected sections, reopened checks, and prior decision supersession. Preserve Design History, Plan History, prior review records, and previous Follow-ups. Update stale authority claims in current sections; retain old decisions as dated history with the new entry explaining what supersedes them. Never solve disagreement by adding a broad claim that the plan overrides its parent design.

This is a coordinated edit, not a filesystem transaction. Record that affected design approval is pending in the new Follow-up and hold its status at `in-progress`; hold the affected plan at `in-review` until revision review completes. If writing the second file fails or the task stops midway, report the exact partial state and retain the proposal so the next turn can finish it. Do not report a synchronized or ready pair. Preserve unrelated edits when recovering.

Re-read both complete artifacts and compare the actual changes with the approved proposal. Verify the mapping, payloads, criteria, metadata, history, reopened checks, and unchanged progress. Then read [Revision Reviewer](revision-reviewer.md) completely and dispatch an independent read-only collaboration agent with the approved proposal, before/after artifacts, current source root, and affected slice/phase map. The reviewer may follow a bounded dependency when needed to verify the affected material; it must not audit unrelated scope.

If independent review is unavailable or fails, keep the pending status and report the missing review. Do not simulate an independent clearance inline. Verify each returned finding against source and the pair. Repair deviations from the approved proposal, then re-review changed material. Present findings that require a new decision one at a time; do not silently expand the proposal. Unresolved correctness findings block readiness.

After the affected review clears, record its scope, result, and remaining runtime checks in each new Follow-up. Mark affected design approvals current without erasing previous approval history. In an existing review table, record an applied resolution only for findings actually addressed by the approved and reviewed change, retaining their original text and linking the revision record. Other unresolved rows stay unresolved. Restore `ready` only when the whole artifact is otherwise ready: pending unapproved slices, unfinished initial plan review, or other pre-existing unresolved work stay pending. Review of this revision does not waive those gates. Artifact readiness means the instructions are usable, not that implementation or acceptance has passed.

## 5. Report and stop

Link every updated artifact. Report the coordinated changes, preserved progress, reopened tasks/checks, metadata updates, review result, and actual statuses. Do not claim product implementation or runtime validation from an artifact edit.

For a ready pair, recommend Implement at the earliest phase with reopened implementation or automated verification work. If only manual acceptance remains, recommend Validate with the plan path. If all work remains complete, report that without inventing an implementation task. For a ready design without an active plan, recommend Plan. When review or an earlier creation gate remains pending, report that next action instead of an implementation handoff. Never invoke another stage automatically.

## Example: public startup to private conversation tokens

This is a workflow example, not a product specification or authorization to edit any real project.

A user supplies an active plan and asks to replace public agent startup with backend-issued private conversation tokens. Current source still calls the public startup path. The coordinated proposal updates design Decisions, the startup flow, backend responsibilities, client interface, affected Architecture payloads, slice files/dependencies, and acceptance outcomes. The plan mirrors the new endpoint and client wiring, with project-specific commands and explicit pending implementation.

Completed unrelated screen layout stays checked. Public-startup implementation tasks reopen if they no longer satisfy the flow; previous end-to-end startup verification also reopens even if recorded in a later phase. Unchanged teardown implementation may remain checked while a teardown check that depended on the replaced startup flow needs another run. The design expresses intended private-token behavior; source still proves public startup until implementation changes. Old rationale remains dated history, and historical sibling plans are not rewritten.
