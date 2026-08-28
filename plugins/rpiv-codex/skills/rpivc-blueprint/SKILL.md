---
name: rpivc-blueprint
description: Plan a complex feature as sequential vertical slices with developer checkpoints between phases, then write an implement-ready plan under .rpiv/artifacts/plans/. Use when a research or solutions artifact should become one phased plan, or when a smaller well-scoped feature still benefits from mid-flight review. Do not use for implementation.
---

# RPIV Blueprint for Codex

Shape a feature into sequential vertical slices, generate complete implementation code for each slice, checkpoint every architectural decision and slice with the developer, and persist one implement-ready phased plan.

This port preserves the `blueprint` workflow from RPIV-Pi commit `7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7`:

```text
input -> targeted research -> dimension sweep -> design checkpoint
      -> holistic slices -> generate / verify / approve each slice
      -> finalize -> independent review -> developer triage -> ready plan
```

The stage writes only its plan artifact. It must not edit product source, invoke implementation, or start another workflow stage.

## Input

Treat all text following `$rpivc-blueprint` as one input:

- a `.md` path under `.rpiv/artifacts/research/` or `.rpiv/artifacts/solutions/`;
- a free-text feature description;
- or no argument, which triggers recent-artifact selection.

When an artifact path is supplied, require frontmatter `status: ready`. Read the artifact completely, including Developer Context and Open Questions, before any collaboration-agent dispatch. If the file is missing, unreadable, or not ready, report the exact problem and stop.

A checkpoint may span multiple turns. Resume the current step after the developer answers; do not restart the workflow.

## Metadata

Resolve the blueprint skill root as the directory containing this loaded `SKILL.md`. Never infer it from the caller's working directory. Run these bundled helpers once during input handling and retain their outputs:

```bash
node <blueprint-skill-root>/scripts/now.mjs
echo
node <blueprint-skill-root>/scripts/git-context.mjs
echo
echo "recent research:"
node <blueprint-skill-root>/scripts/list-recent.mjs .rpiv/artifacts/research 4
echo
echo "recent solutions:"
node <blueprint-skill-root>/scripts/list-recent.mjs .rpiv/artifacts/solutions 4
```

The first helper returns `<iso>\t<slug>`. Copy the timezone offset verbatim. The Git helper returns labeled repository metadata with explicit fallbacks.

## Workflow

Follow every numbered step in order.

### 1. Handle input

#### Artifact input

Read the artifact fully and extract:

- Summary;
- Code References;
- Integration Points;
- Architecture Insights;
- Precedents & Lessons;
- Developer Context;
- Open Questions.

Read every key source file named by Code References completely, especially hooks, shared utilities, types, and integration points the plan will depend on. Existing Developer Context answers are inherited decisions and must not be re-asked. Open Questions enter the ambiguity queue for Step 3.

Read any additional ticket, design, or implementation file named by the input completely.

#### No argument

Use the retained recent listings:

- If both are empty, ask for a free-text feature description and stop for the answer.
- If exactly one file exists across both listings, ask `Blueprint from this artifact?` with `Blueprint from [research|solutions] <filename> (Recommended)` and `Pick a different path`.
- If two or more files exist, offer up to four newest entries across both lists, each visibly labeled `[research]` or `[solutions]`.

Use native structured input when available. Otherwise ask the same concise question directly and stop. The custom-response field supplies unlisted choices; never author an `Other` option.

#### Free text or another input form

Treat it as the feature topic. Do not pretend it is an upstream artifact. Step 2 must fill any missing integration and precedent context.

### 2. Run targeted research

This is depth-oriented planning research, not a broad discovery sweep.

Before dispatch, read each required role prompt completely and include its full operational instructions and output contract in that native collaboration-agent task. Every role is read-only and returns findings inline; none writes files.

- Always read [Codebase Pattern Finder](references/codebase-pattern-finder.md) and dispatch it to find the implementation pattern to model.
- If the input artifact lacks a usable Integration Points section, read [Integration Scanner](references/integration-scanner.md) and dispatch one integration scan.
- If the artifact lacks usable Precedents & Lessons and the topic touches authentication, migrations, schema changes, hot paths, or performance-sensitive code, read [Precedent Locator](references/precedent-locator.md) and dispatch it.
- For an external application programming interface, software development kit, library, service, protocol, or wire format not already used in the repository, read [Web Search Researcher](references/web-search-researcher.md) and dispatch it with native web access.

Dispatch independent roles concurrently, within the available collaboration-agent slots, and wait for every role before synthesizing. If capacity requires waves, finish all waves before Step 3. Do not use detached work that cannot resume this task.

If collaboration agents are unavailable, report that the required role separation cannot be preserved and stop. If current web evidence is required but unavailable, report the evidence gap and stop rather than fabricating it.

After every role returns:

1. read all key files it identifies completely;
2. cross-check its findings against files read in Step 1;
3. note discrepancies and assumptions;
4. determine the actual change surface from current code.

### 3. Sweep architectural dimensions

Walk the evidence and inherited questions through these six dimensions, plus migration only when persisted schema changes:

1. Data model — types, schemas, and entities.
2. Application programming interface surface — signatures, exports, and routes.
3. Integration wiring — mount points, dependency injection, events, and configuration.
4. Scope — included work and explicit deferrals.
5. Verification — tests, assertions, and risk-bearing behavior.
6. Performance — load paths, caching, and repeated-query risks.
7. Migration, when applicable — persisted data, compatibility, rollout, and rollback.

Classify every finding:

- **simple**: only one valid option is supported by current code. Record the decision with `file:line` evidence and do not ask.
- **directional**: one option fits, but adopting it propagates a convention or chooses extend versus replace. Queue it for one batched directional confirmation.
- **genuine ambiguity**: multiple valid options, conflicting patterns, scope uncertainty, or a novel choice. Queue it for one-at-a-time questions.

Pre-validate every option against current runtime behavior and inherited constraints. Eliminate or clearly caveat invalid choices. Every Step 2 file read must appear in a decision, directional confirmation, or ambiguity, and every dimension must be addressed.

### 4. Run the developer checkpoint

Prefix each visible decision question with `❓ Question:`. Every question must contain observed behavior, at least one current `file:line` reference, why the choice matters, and two to four concrete options. Keep structured-input headers at sixteen characters or fewer.

For every checkpoint in this workflow, render each option as both a short label and a plain-language description. The description must explain:

1. what choosing the option causes the plan to do;
2. what existing ownership, behavior, or scope remains unchanged; and
3. the material scope, cost, or trade-off compared with the other options.

Do not present bare labels and expect the developer to translate architecture terms such as “capability boundary,” “shared subsystem,” “pattern,” or “slice” unaided. A checkpoint is incomplete if its options could not be understood without rereading the preceding research. Keep each description to one or two direct sentences; this is decision support, not a second design document.

#### Directional confirmations

Clear directional findings first, batching up to four independent confirmations:

```text
About to follow {pattern} (`file:line`, used N times) across {new surface}. Confirm that direction, or are we moving off it?
```

Offer both options with concrete consequences:

- `Follow {pattern}` — explain which existing components keep their current responsibility and what narrow surface the plan adds or extends.
- `Moving off {pattern}` — explain which responsibility or abstraction would be consolidated, replaced, or newly shared, and why that makes the plan materially larger or different.

Do not mark Follow as recommended. A move-off answer becomes a genuine ambiguity.

#### Genuine ambiguities

Ask one dependent question at a time, highest architectural impact first. Independent questions may be batched up to four. Ground pattern conflicts, missing patterns, scope boundaries, integration choices, and novel approaches in real evidence. Each answer becomes fixed Developer Context unless the developer explicitly revisits it.

Classify responses as:

- decision — record the chosen option;
- correction — read [Codebase Analyzer](references/codebase-analyzer.md), dispatch at most two targeted rescans, and update the evidence;
- scope adjustment — record it and change the included or deferred surface.

When all ambiguities are resolved, present a design summary under fifteen lines:

```text
Design: {feature}
Approach: {one or two sentences}

Decisions:
- {decision} — modeled after `file:line`

Scope: {included} | Not building: {excluded}
Files: {N} new, {M} modified
```

Ask `Ready to proceed to decomposition?` with `Proceed (Recommended)`, `Adjust decisions`, and `Change scope`. Wait for explicit Proceed.

### 5. Decompose the feature and create the skeleton

Define all vertical slices, dependencies, ordering, and files before generating code. A slice is one complete concern across types, implementation, wiring, and tests. Keep slices sequential, roughly 512–1024 generated-code tokens each, and put foundational types or interfaces first.

Present:

```text
Feature Breakdown: {feature}

Slice 1: {name} — {end-to-end outcome}
  Files: path.ext (NEW), other.ext (MODIFY)
  Depends on: nothing
```

Ask `{N} slices for {feature}. Approve decomposition?` with `Approve (Recommended)`, `Adjust slices`, and `Change scope`. Wait for approval.

Immediately after approval, create exactly one skeleton artifact at:

```text
.rpiv/artifacts/plans/<slug>_<brief-kebab-topic>.md
```

Use retained metadata: `date` and `last_updated` are exact `<iso>`; `repository`, `branch`, and `commit` come from matching Git labels; `author` and `last_updated_by` use `author`, falling back to `unknown`.

The frontmatter must contain:

```yaml
---
date: <iso>
author: <author>
commit: <commit>
branch: <branch>
repository: <repo>
topic: <topic>
tags: [plan, blueprint]
status: in-progress
parent: <artifact path or null>
phase_count: <N>
phases: []
unresolved_phase_count: <N>
last_updated: <iso>
last_updated_by: <author>
---
```

Fill these body sections from Steps 1–5 before any slice generation:

- `# {Feature} Implementation Plan`
- `## Overview`
- `## Requirements`
- `## Current State Analysis`, including `### Key Discoveries` with evidence
- `## Desired End State`, with consumer-facing usage examples
- `## What We're NOT Doing`
- `## Decisions`, with evidence and explored options where relevant
- one `## Phase N: {slice name}` per slice
- `## Ordering Constraints`
- `## Verification Notes`
- `## Performance Considerations`
- `## Migration Notes`
- `## Pattern References`
- `## Precedents & Lessons`
- `## Developer Context`
- `## Plan History`
- `## References`

Each phase begins with:

```markdown
## Phase N: {slice name}

### Overview
{outcome and dependency or parallelism note}

### Changes Required:

#### 1. path/to/file.ext
**File**: path/to/file.ext
**Changes**: NEW — {purpose}

```{language}
```

### Success Criteria:

#### Automated Verification:

#### Manual Verification:
```

For MODIFY entries, include the line range in the heading when known and later store only added or modified code. Plan History starts every phase as `pending`.

### 6. Generate, verify, and checkpoint each slice

Process exactly one phase at a time. Locked earlier phases are the source of truth.

#### 6.1 Generate code and criteria internally

Before Phase 1, dispatch additional Codebase Pattern Finder roles concurrently only for slices whose file kind or layer lacks a pattern from Step 2. Reuse one result for sibling shapes.

Generate complete copy-pasteable code and complete Success Criteria, but hold both from the developer-facing checkpoint:

- NEW files include imports, types, implementation, and exports.
- MODIFY files contain only the exact added or modified sections.
- Test files contain complete tests following current patterns.
- Wiring shows the actual mount or registration point.
- No pseudocode, placeholder, or unfinished task marker is allowed.

Success Criteria use `- [ ]` bullets. Phase checks must be atomic and write-scoped to that phase's own files. Read-only repository-wide checks are allowed; whole-repository build and test checks belong only to the final whole-plan verification. Prefer one self-contained command per automated bullet that exits zero on success.

After Phase 1, re-read any prior artifact phase that touches the current files before generating. Extend the locked emitted state rather than conversation memory.

#### 6.2 Verify every phase

Run the bundled overlap helper by absolute path from the skill root:

```bash
node <blueprint-skill-root>/scripts/slice-overlap.mjs "<artifact_path>" "Phase N"
```

Read [Slice Verifier](references/slice-verifier.md) completely and dispatch one collaboration agent with the full role plus:

- `artifact_path`;
- `slice_id: Phase N`;
- `current_slice_code`, verbatim, including every per-file code fence and both Success Criteria subsections;
- `target_files`, including key prior files;
- the helper's `overlapping:` phase identifiers.

Wait for its working notes and final `Decisions / Cross-slice / Research` rows. On a real violation, repair and re-dispatch until clear. If a finding is plausibly intentional, carry the verbatim violation and one-line rationale into the developer checkpoint; never hide it.

#### 6.3 Present one developer micro-checkpoint

Show a condensed review, not all generated code:

- each file's one- or two-sentence summary;
- public signatures;
- key factory, wiring, or non-obvious blocks;
- test case names only;
- a mandatory Fit line naming reused helpers and conventions with `file:line` evidence, plus any new abstraction.

For MODIFY files, show a focused diff with about three lines of context. Show complete code only when requested.

Ask `Slice N/M: {name} — {files}. Approve?` with:

- `Approve (Recommended)`;
- `Revise this slice`;
- `Rethink remaining slices` or, on the final slice, `Reopen earlier phase`;
- `Revisit a decision`.

On the final slice, prepend the verifier's Cross-slice result and state that approval automatically runs finalization and independent review, then pauses at triage.

#### 6.4 Apply the response

- **Approve**: immediately replace only this phase's empty fences and criteria with the generated content; verify no duplicate definitions or imports; mark Plan History approved; decrement `unresolved_phase_count`.
- **Revise**: regenerate, re-run the verifier, and re-present. Do not touch the artifact before approval.
- **Rethink**: update and reconfirm remaining decomposition. If a locked phase is affected, explicitly offer cascade reopening.
- **Revisit**: return to Step 4 for that decision, then cascade to decomposition when necessary.

A later phase that changes a file from an earlier phase gets its own incremental subsection. Never mutate the earlier locked code fence.

### 7. Finalize the plan

After every phase is approved:

1. Verify every per-file fence and both criteria subsections are non-empty. If not, return to Step 6.
2. Require `unresolved_phase_count: 0` and make `phase_count` equal the number of Phase headings.
3. Rebuild `phases:` from body headings in body order:

```yaml
phases:
  - { n: 1, title: Schema layer, files: [src/schema.ts], depends_on: [] }
  - { n: 2, title: Runtime wiring, files: [src/runtime.ts], depends_on: [1] }
```

4. Change `status: in-progress` to `status: in-review`.
5. Verify every required section and artifact format from Step 5. Never silently fill an unapproved phase at finalization.

### 8. Run independent review

Verify the exact artifact path still exists. Read [Artifact Code Reviewer](references/artifact-code-reviewer.md) and [Artifact Coverage Reviewer](references/artifact-coverage-reviewer.md) completely. Dispatch both collaboration agents concurrently against the finalized artifact and live repository at current `HEAD`; wait for both.

Merge their finding tables under:

```markdown
## Plan Review (Step 8)

_Independent post-finalization review. Findings are triaged in Step 9._

| source | plan-loc | codebase-loc | severity | dimension | finding | recommendation | resolution |
| --- | --- | --- | --- | --- | --- | --- | --- |
```

Set source to `code` or `coverage`. Sort blocker, concern, suggestion; within each severity put code before coverage while preserving each role's emitted order. Leave resolution blank. If both roles find nothing, persist `_No findings — both reviewers cleared the artifact._`.

If one role fails, persist the other and append a one-line failure note. If both fail, persist both failure notes. Record unavailable review coverage in Developer Context and continue. Do not invent rows.

### 9. Triage findings and mark ready

Do not auto-apply reviewer findings. Present counts for blockers, concerns, and suggestions. For each row, the developer chooses:

- `applied` — edit the named phase code or criterion, then record `applied: {summary}`;
- `deferred` — record the developer's scope or follow-up reason;
- `dismissed` — record why the finding does not apply.

Triage blockers sequentially. Batch up to four independent concerns or suggestions. Use structured input when available; otherwise ask the same grounded choice directly and stop. Every row must receive a resolution.

After all rows are resolved, change `status: in-review` to `status: ready`. Report the artifact path, fixed-decision count, phase count, new and modified file counts, generation revisions, and triage totals. Then present this handoff and stop:

```text
Next step: $rpivc-implement .rpiv/artifacts/plans/{filename}.md Phase 1
```

The successor name is a handoff, not permission to invoke or port it. If that skill is not installed yet, say so plainly.

### 10. Handle follow-ups

For a surgical change to the plan produced in this task:

1. edit the existing artifact in place;
2. refresh `last_updated`, `last_updated_by`, and `last_updated_note` using `now.mjs`;
3. keep Decisions and phase code synchronized, with code as the source of truth;
4. return to Step 4 when a new ambiguity appears;
5. re-run affected verification and review before restoring `status: ready`.

Prefer the future `$rpivc-revise <plan-path>` handoff once that skill exists. Re-run `$rpivc-blueprint` only when the underlying research changed materially. Never start either stage automatically.

## Non-negotiable boundaries

- Read supplied artifacts and referenced source files before agent dispatch.
- Finish every required research role before the dimension sweep.
- Resolve architectural ambiguity before decomposition.
- Confirm holistic decomposition before creating the skeleton.
- Verify and checkpoint every phase separately; approval is the only event that writes its code and criteria.
- Finalize only when all phases are approved and counters agree.
- Run both independent reviewers before developer triage.
- Keep `status: in-review` until every finding is resolved.
- Preserve artifact directories, filenames, frontmatter fields, phase headings, and Success Criteria shape for downstream compatibility.
- Never edit product source. This skill produces a plan document containing proposed code.
- Never invoke a successor skill, push, publish, or continue into another workflow stage.
