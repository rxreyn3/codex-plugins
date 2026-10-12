# Durable Design creation progress

Read this reference completely for Start, Resume, and every creation checkpoint. This extends the existing design artifact; it is not a separate checkpoint store. The document must support continuation without conversation history.

## Saved state

Frontmatter `workflow_step` accepts only `input`, `research`, `dimensions`, `decisions`, `decomposition`, `slices`, `finalization`, or `complete`. It names the current unfinished step (or complete), not an approval. Keep `status: in-progress` until finalization succeeds.

Use `## Workflow Progress` with these explicit records:

- **Completed work:** input validation and complete upstream read; each required research role's verified completion or permitted skip; each applicable dimension's coverage; resolved checkpoint identifiers; architecture-summary and decomposition approvals tied to their exact proposals; slice approval identifiers. Distinguish complete, unfinished, and invalidated work. Do not record an approval merely because its question was asked.
- **Next action:** one concrete action and its owning step, including what blocks it.
- **Evidence baseline:** upstream path and content fingerprint (`git hash-object -- <path>` where available), relevant source paths and fingerprints, repository revision, verified claims and references, and what each source supports. Fingerprint content even when files are uncommitted; a repository commit alone misses working-tree drift. When hashing is unavailable, retain exact relevant excerpts or another verifiable content baseline and disclose the limit.
- **Outstanding gaps:** incomplete roles, unchecked dimensions, unresolved choices, stale evidence and missing capabilities. Record `none` only when established.
- **Pending checkpoint:** `none` or a stable identifier and kind (directional, architectural choice, architecture summary, decomposition, or slice), exact question, ordered option labels and consequences, supporting references, and exact proposal being approved. Mark proposals `unapproved` until answered. Keep proposed slice implementation code and verification criteria out of this record and every other artifact section until approval; retain only a descriptive condensed review (excluding code blocks, diffs, and criteria) and the regeneration requirement.

Keep concise verified role summaries under Current State Analysis, with role name, completion state, findings, reasoning, references, discrepancies, assumptions, and remaining gaps. Record dimension coverage there or in Workflow Progress, including applicable/inapplicable state, decision or checkpoint identifiers, and source references. Preserve enough reasoning to continue; raw tool transcripts add bulk without establishing truth.

Use Developer Context as the question and answer ledger. Each record has an identifier, exact question and ordered options, evidence, proposal, state (`unanswered`, `answered`, or `superseded`), original answer, interpretation and resulting decision identifiers. Preserve the original answer when superseded and append the replacement, why it changed, its evidence, and affected dependencies. Decisions records the current choice and rationale while linking its original and superseding records. Architecture-summary and decomposition approval records identify the exact approved summary or breakdown; a generic `approved` without its object is insufficient.

## Save protocol

1. Before presenting a checkpoint, write its exact question, options, references, unapproved proposal, pending identifier, next action, and current step. Do not save unverified findings as completed.
2. After an unambiguous answer, make one coherent edit updating the question record, current decisions, affected approval state, pending checkpoint, completed work, and next action. Preserve earlier answers and append corrections. Clear only the checkpoint actually answered; other unresolved questions remain open.
3. Run the Design `now.mjs` helper again for each edit and update `last_updated` with its exact timestamp and `last_updated_by` with the current author (or `unknown`). Retain original creation metadata. Do not pretend the old modification time describes a new save.
4. Read back the written affected sections and metadata, verify they agree, and only then advance or report them saved. For slice approval also perform the required exact payload byte check; for finalization read the complete document.
5. If writing or readback fails, report the specific failure and stop dependent work. Preserve existing evidence and history. Never proceed on the assumption that an in-memory answer is durably saved; reconcile any partial write against the approved answer before retrying.

Repeated resume without an answer or relevant drift must recover the same pending checkpoint and settled choices. It must not manufacture another approval, duplicate question history, or move the workflow forward.

## Consistency before routing

Read the entire document and validate:

- `workflow_step` agrees with completed work and the first unfinished step. Research cannot be complete with an unfinished required role; dimensions cannot be complete with unchecked applicable coverage.
- Pending checkpoint identifier, exact question, options, proposal, and unanswered state agree across Workflow Progress and Developer Context. A resolved answer must have its resulting decision and any affected approval state recorded.
- Current Decisions agree with unsuperseded answers and inherited constraints. Superseding records explicitly identify which dependent work remains valid or reopened.
- Architecture-summary approval precedes decomposition approval. Approved decomposition matches the slice names, order, dependencies, and files; Architecture, Slices, and Design History agree. Each approved slice has its code and complete criteria; pending slices have no unapproved payload persisted.
- Finalization has at least one valid slice, all slice approvals, complete required sections, and no pending checkpoint or revision. `complete` must agree with `status: ready`; a ready document with an unfinished modern step is inconsistent.

If any of these conflict, preserve the document, report the specific discrepancy, and resolve it before advancing. Do not guess from timestamps or the most advanced field. Ask a focused clarification when evidence cannot resolve the conflict. A hint never supplies missing approval. A partial save needs reconciliation, not optimistic routing.

For legacy documents without `workflow_step`, use only the existing slice route when decomposition approval, Architecture, Slices, and Design History establish a coherent skeleton. Do not require new metadata merely to read a valid legacy ready design in Plan. Missing or contradictory state requires clarification; an empty Slices section never authorizes automatic finalization.

When continuing a coherent legacy in-progress skeleton, enrich that same document with Workflow Progress before the next save, deriving approvals, decisions and slice state only from existing records. Label unavailable historical role summaries or dimension coverage `not recorded in legacy artifact`; do not claim verified completion or reopen creation solely to reconstruct new-format history. Record this legacy bridge explicitly: these historical unknowns are not unfinished modern research roles for routing. Record the current evidence baseline and checks actually performed, remaining evidence limitations, pending checkpoint, and next slice or finalization action. Apply normal save/readback and finalization checks, including recorded architecture-summary and decomposition approval; missing approval or contradictory slice state still requires clarification. Relevant current evidence gaps still block dependent work. This bridge permits later saves and finalization to include Workflow Progress and the appropriate `workflow_step` without inventing historical findings.

## Relevant source drift

Read the upstream artifact completely and compare the saved baseline with relevant current source on resume. Identify which verified claims and dependent work each change invalidates. Changes to unrelated files or branch names alone are not grounds to repeat research. Reuse unaffected completed roles and settled decisions; rerun only unfinished or invalidated roles, then update their verified summaries and baseline using the save protocol.

Relevant drift may reopen evidence gathering, dimensions, and dependent proposals or approvals. It cannot silently replace a developer decision. Preserve the original choice and explain the changed evidence; ask the affected question when the choice no longer fits. If the ready upstream artifact is missing, unreadable, no longer ready, or materially conflicts with inherited requirements, stop and resolve that discrepancy before advancing.

## Reconsideration during creation

Before decomposition approval, an explicit request to reconsider an earlier answer stays in Design, even when the answer was saved. Record the replacement (or save a new pending question when the replacement is unclear), preserve the original answer, and identify dependent decisions, dimension coverage, research, summary approval, and decomposition proposal. Reopen only affected work; retain independent settled choices and verified evidence. A saved decision is not a revision boundary.

For example, changing a cache choice may invalidate the performance decision and summary while retaining verified integration wiring and a settled storage interface. Record that dependency explicitly rather than restarting every research role.

Changes to approved slice material or completed designs use Revise and its lifecycle rules. Pending Revise updates or revision review take precedence over Design continuation. A design stays immutable after authority transfers to a ready plan. These rules do not relax independent slice verification, slice approval, or the mandatory fresh-task boundary after each approved non-final slice.
