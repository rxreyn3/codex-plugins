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

- **Chat and human-readable plan prose:** render verified repository evidence as relative Markdown links. Use `[Orders handler — line 42](src/orders.ts#L42)` for one line and `[Orders handler — lines 42–55](src/orders.ts#L42-L55)` for a range. When no verified line exists, link the repository-relative path without a fragment. Never add a machine-specific absolute companion path.
- **Structural plan fields:** keep frontmatter values, `files:` entries, phase names, `#### N. path`, `**File**: path`, commands, artifact filenames, and handoff arguments as plain repository-relative text.
- Normalize raw reviewer citations at the parent boundary before presenting them or writing the review table.

## Choice response format

When a checkpoint offers two to four finite authored options, prefer native structured input without letter prefixes. If structured input is unavailable, fails, or does not display, render the same options in prose as `A.` through `D.` in their existing order. Preserve the recommended option first so it becomes `A` when a recommendation exists.

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

Design decisions, slice boundaries, and Success Criteria are fixed inputs. Flag a defect and route it back to Design; do not patch it silently in Plan.

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

If the developer wants different boundaries, stop and recommend returning to Design.

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

If one reviewer fails after dispatch, persist the other's rows and append `_Step 4 {code|coverage} review failed: {one-line cause}._`. If both fail, persist both notes. Add `Step 4 {code|coverage} review unavailable; proceeded to developer review without {role} findings.` to Developer Context. Never invent a finding.

Normalize any human-facing live-code location to the relative Markdown-link format before writing it. Keep `<n/a>` literal.

### 5. Triage findings and mark ready

Do not auto-apply any finding. Count blockers, concerns, and suggestions, then present exactly one unresolved row per response. The developer chooses:

- `Apply` — edit the recommendation's named phase code fence, Success Criteria block, or both, then record `applied: {summary}`;
- `Defer` — leave plan content unchanged and record `deferred: {developer reason}`;
- `Dismiss` — leave plan content unchanged and record `dismissed: {developer reason}`.

Use present-tense `Apply / Defer / Dismiss` for pending decisions and past tense only in stored resolutions. Prefer native structured input. Otherwise render `A. Apply`, `B. Defer`, and `C. Dismiss` with their consequences, then write `Reply with A, B, or C.` Ask only one triage question per response.

When a code finding's cause lives in the design Architecture, recommend returning to Design for the clean upstream repair. A plan-local tactical fix is allowed only after the developer chooses Apply; annotate it `applied (plan-local; design follow-up: <design path>): {summary}`.

After every finding has a resolution, rebuild `phase_count` and `phases:` from the body. Then change `status: in-review` to `status: ready`.

Report the plan as a repository-relative Markdown link, phase and unique-file counts, review availability, and triage totals. Ask the developer to review phase worktree scope, Success Criteria specificity, and any desired boundary change. A requested boundary change routes back to Design because Plan must preserve slice boundaries.

End with this handoff and stop:

````markdown
Recommended next step: **Implement**

```text
.rpiv/artifacts/plans/{filename}.md Phase 1
```
````

Never invoke Implement automatically.

### 6. Handle follow-ups

For a follow-up about the plan created in this task:

1. edit the same plan in place;
2. refresh `last_updated`, `last_updated_by`, and `last_updated_note` using `now.mjs`;
3. keep phase code, Success Criteria, `phase_count`, and `phases:` synchronized;
4. return to Design when the request changes a fixed design decision, slice boundary, Architecture entry, or Success Criteria;
5. re-run affected independent review before restoring `status: ready`.

Prefer a **Revise** handoff for surgical plan edits once the initial Plan run is complete. Re-run Plan only when the underlying design changed materially. Never start either stage automatically.

## Compatibility rules

- Plan consumes only a ready Design artifact and produces one plan under `.rpiv/artifacts/plans/`.
- Phase headings, frontmatter `phases:`, `phase_count`, plain `files:` paths, `depends_on`, and both Success Criteria subsections remain compatible with Implement and Validate.
- Every per-phase automated command must already be write-scoped to that phase's files or read-only. Whole-repository write commands are a design defect. Whole-plan build and test checks belong to Validate.
- Every promised final gate must be achievable on the base tree plus this plan's changes. Record unrelated base debt as context, never as a criterion this plan cannot satisfy.
- Never edit product source. The artifact contains proposed code, not applied code.
- Never auto-apply reviewer findings or invoke a successor stage.
