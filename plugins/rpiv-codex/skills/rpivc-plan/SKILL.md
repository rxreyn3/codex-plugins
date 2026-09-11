---
name: rpivc-plan
description: Convert one ready RPIV design artifact into an implement-ready phased plan under .rpiv/artifacts/plans/, preserving every verified design slice and its success criteria one-to-one, then run independent code and coverage review before developer triage. Use only after rpivc-design; do not redesign or implement the feature.
---

# RPIV Plan for Codex

Convert one ready design artifact into a reviewed implementation plan. The design already contains the architecture, slice boundaries, ordering constraints, and per-slice Success Criteria. Plan transforms that material; it does not invent or reconsider it.

This port preserves the `plan` workflow from RPIV-Pi commit `7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7`:

```text
ready design -> inherit slices as phases one-to-one -> write plan incrementally
             -> independent code and coverage review -> developer triage
             -> ready plan -> implementation handoff
```

The stage writes only its plan artifact. Never edit product source, invoke implementation, push, publish, or start another workflow stage.

## Revision ownership

The design owns intended behavior, architecture, interfaces, slice boundaries, and acceptance outcomes while this initial plan is `in-progress` or `in-review`. When the plan first reaches `ready`, authority transfers once: the plan becomes the sole current specification for intent and execution, while the design remains immutable provenance. A later revision returning the plan to `in-review` does not reactivate design authority. Current source is evidence of implemented behavior.

To change an existing plan, use **Revise** with `<plan-path> <feedback>`. Before the first ready transition, architectural feedback may update the design and candidate plan together. After transfer, all revisions update the plan only and record material intent changes as Decision Amendments. A fundamental rethink that needs renewed architectural exploration creates a successor design and plan instead of rewriting the frozen design or discarding the current plan's history.

## Input

Treat all text following `$rpivc-plan` as one design artifact path under `.rpiv/artifacts/designs/`.

- Require a readable Markdown file with frontmatter `status: ready`.
- Read it completely, including Architecture, Slices, File Map, Ordering Constraints, Verification Notes, Performance Considerations, Migration Notes, Scope, Developer Context, and References.
- Read every additional research document, ticket, or other contextual artifact named in References completely.
- If the design contains unresolved questions or its `## Slices` section is missing or empty, stop and tell the developer to return to Design. Do not create a partial plan.
- If the path is missing, outside `.rpiv/artifacts/designs/`, unreadable, or not ready, report the exact problem and stop. With no argument, ask for a design artifact path and explain that Plan has no standalone mode.

A checkpoint may span several turns. Resume the current step after the developer answers; do not restart the workflow.

## Metadata

Resolve the Plan skill root as the directory containing this loaded `SKILL.md`; never infer it from the caller's working directory. Run these bundled helpers once after validating the input:

```bash
node <plan-skill-root>/scripts/now.mjs
echo
node <plan-skill-root>/scripts/git-context.mjs
```

The first helper returns `<iso>\t<slug>` without a trailing newline. Copy the timezone offset verbatim. The Git helper returns labeled caller-repository metadata with explicit fallbacks.

## File references

- **Codex Desktop chat and completion reports:** resolve local files against the caller's Git root and use absolute Markdown targets ending in the verified starting line, such as `[Orders handler — lines 42–55](/absolute/repository/src/orders.ts:42)`. Keep ranges only in labels. When no line is verified, link the absolute path without a suffix. Wrap targets containing spaces in angle brackets.
- **Other chat clients:** follow the active host and repository instructions instead of assuming a Codex Desktop or GitHub link form.
- **Human-readable plan prose:** use repository-relative Markdown links such as `[Orders handler — lines 42–55](src/orders.ts#L42-L55)`. When no verified line exists, link the repository-relative path without a fragment. Never write an absolute machine path into the plan.
- **Structural plan fields:** keep frontmatter values, `files:` entries, phase names, `#### N. path`, `**File**: path`, commands, artifact filenames, and handoff arguments as plain repository-relative text.
- Normalize raw reviewer citations separately at the chat boundary and the artifact-writing boundary.

## Choice response format

When a checkpoint offers two to four finite authored options, prefer native structured input without letter prefixes. If structured input is unavailable, fails, or does not display, render the same options in prose as `A.` through `D.` in their existing order. Preserve the recommended option first so it becomes `A` when a recommendation exists.

In a prose fallback, put one option on each line as `A. **Label (Recommended)** — consequence.` and `B. **Label** — consequence.` Keep `(Recommended)` inside the bold label and never detach it after the explanation. Omit the dash and consequence when the label is already self-explanatory.

After the prose list, write `Reply with A, B, ...` using only the letters actually shown. Add `, or write another answer` only when the checkpoint already permits a custom response. Accept an uppercase or lowercase letter, the full option label, or an unambiguous natural-language answer. Reset the letters for every new question; they have no meaning outside the currently displayed choice. Do not letter open-ended requests for a path, correction, reason, or other required free text.

## Recommended action format

When a report recommends another RPIV stage, put the bold action name outside the code fence and put only the arguments the developer should paste after selecting that skill inside a `text` fence:

````markdown
Recommended next step: **{Action}**

```text
{arguments only}
```
````

Never put `$`, a skill identifier, or explanatory prose inside the arguments fence. Put the reason after the fence. If an action takes no arguments, omit the fence. A recommendation is a handoff, never permission to invoke the stage automatically.

## Workflow

Follow every numbered step in order.

Use the native plan or progress mechanism when available to track input validation, phase transcription, both reviewer results, and every unresolved triage row. Otherwise maintain concise commentary checkpoints. Mark work complete only after the artifact reaches `status: ready`.

### 1. Validate and read the design

After resolving one real input path:

1. verify the file is under `.rpiv/artifacts/designs/` and has `status: ready`;
2. read the artifact in full;
3. extract every `### Slice N: {name}`, its `**Files**:` list, and both Success Criteria subsections;
4. map each slice to the corresponding Architecture entries;
5. extract semantic dependencies and permitted parallelism from Ordering Constraints;
6. stop if any question remains open, any slice is incomplete, an Architecture entry cannot be assigned to its declared slice, or the design's phase contract is internally inconsistent.
7. retain `git hash-object -- <design-path>` as the initial design content fingerprint; this is a content identifier, not proof that the design was committed.

Design decisions, slice boundaries, and Success Criteria are fixed inputs. Flag a defect and route it to Revise with the design path before a plan exists, or the plan path once created; do not patch it silently in Plan.

### 2. Inherit phase boundaries

Slice is phase, one-to-one. Each `### Slice N: {name}` becomes `## Phase N: {name}` in the same order with exactly the same `**Files**:` values and Success Criteria. Never merge, split, reorder, reauthor, or re-derive them.

Carry forward parallelism only when the design's Ordering Constraints say slices have no semantic dependency. Present a concise confirmation and continue without asking a question:

```text
Inheriting {N} slices from {design path} as {N} phases (1:1):

1. {name} — {outcome} ({file count} files)
2. {name} — {outcome} ({file count} files)

Parallelism: {design-derived statement}.
Total: {unique file count} files across {N} phases. Success Criteria pass through unchanged.

Proceeding to write the plan artifact.
```

If the developer wants different boundaries, stop and recommend Revise with the design path and concrete feedback.

### 3. Write the plan incrementally

Create `.rpiv/artifacts/plans/<slug>_<brief-kebab-topic>.md` using the retained metadata. Write the skeleton first, then insert Architecture code one phase at a time. Do not leave placeholders or empty required sections.

The frontmatter must contain:

```yaml
---
date: <iso>
author: <author>
commit: <commit>
branch: <branch>
repository: <repo>
topic: <topic>
tags: [plan, <relevant components>]
status: in-progress
parent: <plain design artifact path>
phase_count: <number of Phase headings>
phases:
  - { n: 1, title: <Phase 1 title>, files: [<plain repository-relative paths>], depends_on: [] }
last_updated: <same iso>
last_updated_by: <author>
---
```

Create these sections:

- `# {Feature} Implementation Plan`
- `## Overview`
- `## Desired End State`
- `## Accepted Design Decisions`
- `## What We're NOT Doing`
- one `## Phase N: {slice name}` per design slice
- `## Testing Strategy`
- `## Performance Considerations`
- `## Migration Notes`
- `## Developer Context`
- `## References`

Each phase uses this structure:

```markdown
## Phase N: {slice name}

### Overview
{outcome and dependency or parallelism note}

### Changes Required:

#### 1. {component or file group}
**File**: path/to/file.ext
**Changes**: {NEW or MODIFY and concise purpose}

```language
{complete code copied from the matching design Architecture entry}
```

### Success Criteria:

#### Automated Verification:
{verbatim bullets from the matching design slice}

#### Manual Verification:
{verbatim bullets from the matching design slice}
```

Populate `phases:` in body order. Each entry's `files:` is the complete set of plain paths in that phase's `### Changes Required:` section. `depends_on` contains only lower phase numbers supported by semantic Ordering Constraints; shared-file sequencing alone does not invent a semantic dependency.

The plan's code comes only from the matching design Architecture entries. The Success Criteria come only from the matching design slice and remain byte-for-byte unchanged. Verification Notes may be summarized under Testing Strategy for context but do not replace the load-bearing per-phase criteria.

Populate `## Accepted Design Decisions` with only the settled choices, interface constraints, and compact rationale needed to understand or revise the implementation later. Do not copy deliberation history or rejected alternatives. This section makes the ready plan self-contained without turning historical Design context into a routine downstream dependency.

### 4. Run independent Plan review

After the plan is complete:

1. verify the exact artifact path still exists;
2. change frontmatter `status: in-progress` to `status: in-review`;
3. read [Artifact Code Reviewer](references/artifact-code-reviewer.md) and [Artifact Coverage Reviewer](references/artifact-coverage-reviewer.md) completely;
4. dispatch both native collaboration agents concurrently against the finalized artifact and the live repository at current `HEAD`, including each role's complete operational instructions and output contract;
5. wait for both results before continuing.

Both roles require semantic isolation. If native collaboration agents are unavailable, stop with the artifact still `in-review`; do not simulate two independent judgments inline. If one dispatched reviewer errors, persist the successful side and its failure note as described below. If both dispatch but fail, persist both failure notes and continue to developer review.

Neither reviewer may write files. The parent task alone merges and persists results under:

```markdown
## Plan Review (Step 4)

_Independent post-finalization review. Findings are triaged in Step 5._

| source | plan-loc | codebase-loc | severity | dimension | finding | recommendation | resolution |
| --- | --- | --- | --- | --- | --- | --- | --- |
```

Set source to `code` or `coverage`. Sort blocker, concern, suggestion; within each severity put code before coverage while preserving each role's emitted order. Leave resolution blank. If both roles return no findings, persist `_No findings — both reviewers cleared the artifact._`.

Before merging coverage-reviewer rows, enforce the reviewer's ownership boundary. A row targeting purely operational guidance already actionable in its owning section—such as a tool prohibition, workflow policy, or reviewer instruction—is malformed reviewer output: exclude it from the findings table and counts rather than asking the developer to duplicate it into Success Criteria. Do not exclude product or runtime prohibitions such as a no-prefetch or no-retry constraint; those remain verification intents because implementation can violate them.

If one reviewer fails after dispatch, persist the other's rows and append `_Step 4 {code|coverage} review failed: {one-line cause}._`. If both fail, persist both notes. Add `Step 4 {code|coverage} review unavailable; proceeded to developer review without {role} findings.` to Developer Context. Never invent a finding.

Normalize any human-facing live-code location to the relative Markdown-link format before writing it. Keep `<n/a>` literal.

### 5. Triage findings and mark ready

Do not auto-apply any finding. Count blockers, concerns, and suggestions, then present exactly one unresolved row per response. Classify ownership before offering Apply: a change to intended design must use the coordinated Revise handoff below, not a plan-local patch. The developer chooses:

- `Apply` — edit the recommendation's named phase code fence, Success Criteria block, or both, then record `applied: {summary}`;
- `Defer` — leave plan content unchanged and record `deferred: {developer reason}`;
- `Dismiss` — leave plan content unchanged and record `dismissed: {developer reason}`.

Use present-tense `Apply / Defer / Dismiss` for pending decisions and past tense only in stored resolutions. Prefer native structured input. Otherwise use the choice response format with those labels in that order and their consequences, then write `Reply with A, B, or C.` Ask only one triage question per response.

When a finding changes intended behavior, Architecture, interfaces, slice boundaries, or acceptance outcomes, keep the plan `in-review` and recommend **Revise** with `<this-plan-path> <specific finding and evidence>`. Apply means pursue that coordinated proposal; it does not authorize a tactical plan-only divergence. Leave the finding unresolved until the pair is reviewed and reconciled. Do not annotate the plan as overriding a stale design. Execution-only findings can use the plan-local Apply path above.

After every finding has a resolution, rebuild `phase_count` and `phases:` from the body. Immediately before the first ready transition, recompute `git hash-object -- <design-path>` and compare it with the fingerprint retained in Step 1. If it changed, stop and reconcile the candidate plan before transferring authority. Otherwise run the bundled `now.mjs` helper again, retain its exact ISO timestamp, add `design_fingerprint: "git-blob:<hash>"` and `materialized_at: <iso>` to plan frontmatter, and change `status: in-review` to `status: ready`. These fields record the frozen provenance boundary; they do not modify the design or require its future synchronization.

Report the plan using the active chat-surface link format, phase and unique-file counts, review availability, triage totals, the design fingerprint, and the authority transfer. Ask the developer to review phase worktree scope, Success Criteria specificity, and any desired boundary change. Later changes route to Revise with the plan path; the frozen design is consulted only when a specific rationale or provenance question requires it.

End with this handoff and stop:

````markdown
Recommended next step: **Implement**

```text
.rpiv/artifacts/plans/{filename}.md Phase 1
```
````

Never invoke Implement automatically.

### 6. Handle follow-ups

For a follow-up during initial review, retain the review and triage rules above; design and candidate plan have not transferred authority yet. Once the plan has reached ready, hand off **Revise** with this plan's path and concrete feedback. Revise updates that plan alone, including later intent changes, and preserves the frozen design as provenance. Do not restart Plan over existing progress. Never start Revise automatically.

## Compatibility rules

- Plan consumes only a ready Design artifact and produces one plan under `.rpiv/artifacts/plans/`.
- Phase headings, frontmatter `phases:`, `phase_count`, plain `files:` paths, `depends_on`, and both Success Criteria subsections remain compatible with Implement and Validate.
- Every per-phase automated command must already be write-scoped to that phase's files or read-only. Whole-repository write commands are a design defect. Whole-plan build and test checks belong to Validate.
- Every promised final gate must be achievable on the base tree plus this plan's changes. Record unrelated base debt as context, never as a criterion this plan cannot satisfy.
- Never edit product source. The artifact contains proposed code, not applied code.
- Never auto-apply reviewer findings or invoke a successor stage.
