---
name: rpivc-design
description: Design a complex feature from a ready RPIV research or solutions artifact by fixing architectural decisions, decomposing the work into vertical slices, and generating and verifying one slice per task. Writes a resumable design artifact under .rpiv/artifacts/designs/. Use before Plan when architecture and decomposition need developer checkpoints. Do not use for implementation.
---

# RPIV Design for Codex

Design how code will be shaped for a complex feature. Resolve architectural ambiguity, decompose the feature into sequential vertical slices, generate complete proposed code and Success Criteria one slice at a time, and persist the result as a resumable design artifact.

This port preserves the `design` workflow from RPIV-Pi commit `7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7`:

```text
input -> targeted research -> dimension sweep -> developer checkpoint
      -> holistic decomposition -> generate / verify / approve one slice
      -> fresh-task resume until complete -> ready design -> Plan handoff
```

The stage writes only its design artifact. It must not edit product source, invoke Plan or implementation, push, or publish.

## Revision ownership

The design owns intended behavior, architecture, interfaces, slice boundaries, and acceptance outcomes. Its implementation plan owns execution progress, operational commands, and verification records; current source establishes what is implemented.

For revisions to an existing design, use **Revise** with `<design-path> <feedback>`. Revise resolves the active linked plan and proposes both updates together. Do not edit a design alone once it has an active plan or ask the developer to synchronize two separate tasks. Start and Resume below remain the creation workflow.

## Input

Treat all text following `$rpivc-design` as one of exactly two forms:

1. **Start** — one `.md` path under `.rpiv/artifacts/research/` or `.rpiv/artifacts/solutions/`. Require frontmatter `status: ready`.
2. **Resume** — `--resume <path>` where the path is one `.md` file under `.rpiv/artifacts/designs/` with frontmatter `status: in-progress`.

Design has no standalone free-text mode. It requires a ready upstream artifact. A checkpoint may span multiple turns; continue the current step after the developer answers instead of restarting the workflow.

## Metadata

Resolve the Design skill root as the directory containing this loaded `SKILL.md`. Never infer it from the caller's working directory. Run these bundled helpers once during input handling and retain their output:

```bash
node <design-skill-root>/scripts/now.mjs
echo
node <design-skill-root>/scripts/git-context.mjs
echo
echo "recent research:"
node <design-skill-root>/scripts/list-recent.mjs .rpiv/artifacts/research 4
echo
echo "recent solutions:"
node <design-skill-root>/scripts/list-recent.mjs .rpiv/artifacts/solutions 4
```

The first helper returns `<iso>\t<slug>` without a trailing newline. Copy the timezone offset verbatim. The Git helper returns labeled repository metadata with explicit fallbacks.

## Navigable file references

Preserve the meaning of source evidence while adapting its representation to the output surface:

- **Chat responses and human-readable design prose:** render verified repository evidence as relative Markdown links. Use `[descriptive label — line 42](backend/path/to/file.py#L42)` for one line and `[descriptive label — lines 42–55](backend/path/to/file.py#L42-L55)` for a range. When no verified line exists, link the repository-relative path without a fragment.
- Keep every target repository-relative, use a descriptive label, and never add a machine-specific absolute companion link. Render links as ordinary Markdown, not inside fenced code blocks.
- **Structural artifact fields:** keep frontmatter values, filenames, `**Files**:` values, Architecture headings, File Map paths, and other parser-consumed fields as plain repository-relative paths.

Normalize every role's raw `file:line` output at the parent boundary before presenting it or writing human-readable artifact prose.

## Choice response format

When a checkpoint offers two to four finite authored options, prefer native structured input without letter prefixes. If structured input is unavailable, fails, or does not display, render the same options in prose as `A.` through `D.` in their existing order. Preserve the recommended option first so it becomes `A` when a recommendation exists.

After the prose list, write `Reply with A, B, ...` using only the letters actually shown. Add `, or write another answer` only when the checkpoint already permits a custom response. Accept an uppercase or lowercase letter, the full option label, or an unambiguous natural-language answer. Reset the letters for every new question; they have no meaning outside the currently displayed choice. Do not letter open-ended requests for a path, correction, or required free text.

Never author an `Other` option when the structured control supplies its own custom-response row.

## Recommended action format

When a report recommends another RPIV stage or a fresh-task resume, put the bold action name outside the code fence and put only the arguments the developer should paste after selecting that skill inside a `text` fence:

````markdown
Recommended next step: **{Action}**

```text
{arguments only}
```
````

Never put `$`, a skill identifier, or explanatory prose inside the arguments fence. Put the reason after the fence. A recommendation is a handoff, never permission to invoke the action automatically.

## Workflow

Follow every numbered step in order.

### 1. Handle input

Run the Metadata helpers, then check resume mode before start mode.

#### Resume mode

When the input contains `--resume`:

1. Parse exactly one design artifact path after the flag. If it is missing, has extra arguments, is outside `.rpiv/artifacts/designs/`, is unreadable, or is not `status: in-progress`, report the specific error and stop.
2. Read the design artifact completely. Extract Decisions, Architecture, Slices, Verification Notes, Developer Context, and Design History.
   If its latest Follow-up records an unfinished Revise update or pending revision review, hand off to **Revise** with this design path and the unfinished revision description, then stop. Do not treat historic slice approvals as clearance to finalize a pending coordinated revision.
3. Find the first Design History entry still marked `pending`. Treat every earlier `approved` entry and its persisted Architecture code and Success Criteria as locked. The artifact, not conversation memory or a task summary, is authoritative.
4. Read the current source files for the pending slice completely, plus Architecture entries for files shared with locked predecessors.
5. Skip Steps 2–5 and enter Step 6 at that pending slice. If no slice is pending, go directly to Step 7.

#### Start mode

When one artifact path is supplied:

1. Require a `.md` file under `.rpiv/artifacts/research/` or `.rpiv/artifacts/solutions/` with `status: ready`. If it is missing, unreadable, outside those directories, or not ready, report the exact problem and stop.
2. Read the artifact completely. Extract Summary, Code References, Integration Points, Architecture Insights, Precedents & Lessons, Developer Context, and Open Questions.
3. Read every key source file named by Code References completely, especially hooks, shared utilities, types, and integration points the design will depend on.
4. Treat existing Developer Context answers as inherited decisions and never re-ask them. Filter Open Questions by architectural relevance in Step 3.
5. Read any additional ticket, related design, or implementation file named by the input completely.

#### No argument

Use the retained recent listings:

- If both are empty, explain that Design requires upstream evidence. Recommend **Research** for investigation or **Explore** for comparing solutions, and stop without creating an artifact.
- If exactly one file exists across both listings, ask `Design from this artifact?` with `Design from [research|solutions] <filename> (Recommended)` and `Pick a different path`.
- If two or more files exist, offer up to four newest entries across both lists, each visibly labeled `[research]` or `[solutions]`.

Use native structured input when available. Otherwise use the lettered prose choice format, permit another written answer, and stop.

### 2. Run targeted research

This is depth-oriented design research, not a broad discovery sweep.

Before dispatch, read each required bundled role prompt completely and include its full operational instructions and output contract in the native collaboration-agent task. Every role is read-only and returns findings inline; none writes files.

Always run these four independent roles:

- [Codebase Pattern Finder](references/codebase-pattern-finder.md) — find the current implementation pattern to model for the feature type.
- [Codebase Analyzer](references/codebase-analyzer.md) — trace how the relevant integration point works in detail.
- [Integration Scanner](references/integration-scanner.md) — map inbound references, outbound dependencies, configuration, dependency injection, events, routes, and tests.
- [Precedent Locator](references/precedent-locator.md) — find similar historical changes, blast radius, follow-up fixes, and lessons when Git metadata reports a real commit. When metadata reports `no-commit`, skip this role and record `git history unavailable` in Verification Notes.

For an external application programming interface, software development kit, library, service, protocol, or wire format not already used in the repository, also read [Web Search Researcher](references/web-search-researcher.md) and run it with native web access. Require direct links in its result.

These research roles use separate context for bounded search and clean output, but their separation is organizational rather than a trust boundary because the parent re-reads and verifies their evidence. Prefer native collaboration agents. Dispatch independent roles concurrently within available capacity; if capacity requires waves, finish every wave before Step 3. Never use detached work that cannot resume this task.

If collaboration agents are unavailable, run the same research roles inline, one at a time, using each bundled prompt's task, read/search limits, tool requirements, and output contract. Use an inline role only when the main task exposes every capability it requires. If a required repository, Git, or web capability is absent, report the specific evidence gap and stop.

After every role returns:

1. read all key files it identifies completely;
2. cross-check its findings against files read in Step 1;
3. record discrepancies and assumptions;
4. determine the actual change surface from current code.

### 3. Sweep architectural dimensions

Walk the Step 2 evidence, inherited decisions, and carried Open Questions through these six dimensions, plus migration only when persisted schema changes:

1. Data model — types, schemas, and entities.
2. Application programming interface surface — signatures, exports, and routes.
3. Integration wiring — mount points, dependency injection, events, and configuration.
4. Scope — included work and explicit deferrals.
5. Verification — tests, assertions, and risk-bearing behavior.
6. Performance — load paths, caching, repeated-query risks, and other hot paths.
7. Migration, when applicable — persisted data, compatibility, rollout, rollback, and existing-data handling.

Classify every finding:

- **simple** — one valid option is supported by current code. Record it in Decisions with navigable evidence and do not ask.
- **directional** — one option fits, but adopting it propagates a convention or chooses extend versus replace. Queue it for directional confirmation.
- **genuine ambiguity** — multiple valid options, conflicting patterns, scope uncertainty, or a novel choice. Queue it for the developer checkpoint.

Inherited research answers are simple unless directional. Keep architectural Open Questions and defer implementation-detail questions. Pre-validate every option against upstream constraints and current runtime behavior; remove or clearly caveat invalid choices.

Coverage is complete only when every Step 2 file read appears in a decision, directional confirmation, or ambiguity and every applicable dimension is addressed. A silently resolved dimension is valid; an unchecked one is not.

### 4. Run the developer checkpoint

Prefix each visible question with `❓ Question:`. Every question must state observed behavior, cite at least one navigable current-code reference, explain why the choice matters, and offer two to four concrete options. Keep structured-input headers at sixteen characters or fewer.

#### Directional confirmations

Clear directional findings before genuine ambiguities. Batch independent confirmations only when the native control supports them, up to four at a time; otherwise ask them in waves. Do not mark the follow option as recommended.

Use this shape:

```text
About to follow {pattern} ({navigable reference}, used N times) across {new surface}. Confirm that direction, or are we moving off it?
```

Each option description must state the concrete ownership and scope consequence:

- `Follow {pattern}` — propagate the existing convention while keeping current responsibilities intact.
- `Moving off {pattern}` — promote the finding to a genuine ambiguity and examine the larger replacement or consolidation.

#### Genuine ambiguities

Ask exactly one dependent ambiguity at a time, highest architectural impact first, and wait for the answer. Concrete patterns include:

- a conflict between two current patterns and their behavioral difference;
- a missing internal pattern with two evidence-backed approaches;
- a scope boundary between included and deferred behavior;
- two viable wiring points and the responsibilities each keeps;
- a novel approach grounded in current code or primary web evidence.

Every option description must explain what Design will do, what current ownership remains unchanged, and the material scope or trade-off. Each answer becomes a fixed decision unless the developer explicitly revisits it.

Record each checkpoint question exactly as asked in Developer Context, including its evidence links. Classify responses as:

- **decision** — record the chosen option in Developer Context and Decisions;
- **correction** — read the Codebase Analyzer role again, run at most two targeted rescans on the newly named area, and update the evidence;
- **scope adjustment** — record it and update included and deferred work.

After every ambiguity is resolved, present a design summary under fifteen lines:

```text
Design: {feature}
Approach: {one or two sentences}

Decisions:
- {decision} — modeled after {navigable reference}

Scope: {included} | Not building: {excluded}
Files: {N} new, {M} modified
```

Ask `Ready to proceed to decomposition?` with `Proceed (Recommended)`, `Adjust decisions`, and `Change scope`. Use the lettered prose choice format when necessary and wait for explicit Proceed.

### 5. Decompose the feature and create the skeleton

Define all vertical slices, dependencies, ordering, and files before generating any code. Each slice must be a complete concern across types, implementation, wiring, and tests; remain independently verifiable before later slices; and contain roughly 512–1024 generated-code tokens. Put foundational types or interfaces first and keep dependencies sequential.

Present the complete breakdown:

```text
Feature Breakdown: {feature}

Slice 1: {name} — {end-to-end outcome}
  Files: path.ext (NEW), other.ext (MODIFY)
  Depends on: nothing
```

Ask `{N} slices for {feature}. Approve decomposition?` with `Approve (Recommended)`, `Adjust slices`, and `Change scope`. Use the lettered prose choice format when necessary and wait for approval.

Immediately after approval, create exactly one skeleton artifact at:

```text
.rpiv/artifacts/designs/<slug>_<brief-kebab-topic>.md
```

Use retained metadata: `date` and `last_updated` are exact `<iso>`; `repository`, `branch`, and `commit` come from matching Git labels; `author` and `last_updated_by` use `author`, falling back to `unknown`. Keep `parent` as the literal upstream artifact path.

The frontmatter must contain:

```yaml
---
date: <iso>
author: <author>
commit: <commit>
branch: <branch>
repository: <repo>
topic: <topic>
tags: [design, <relevant tags>]
status: in-progress
parent: <upstream artifact path>
last_updated: <iso>
last_updated_by: <author>
---
```

Fill every prose section from Steps 1–5 before generating a slice:

- `# Design: {Feature}`
- `## Summary`
- `## Requirements`
- `## Current State Analysis`, including `### Key Discoveries` with evidence
- `## Scope`, including `### Building` and `### Not Building`
- `## Decisions`
- `## Architecture`
- `## Slices`
- `## Desired End State`
- `## File Map`
- `## Ordering Constraints`
- `## Verification Notes`
- `## Performance Considerations`
- `## Migration Notes`
- `## Pattern References`
- `## Developer Context`
- `## Design History`
- `## References`

Write the sections with the source contract's content, not merely the headings:

- Summary states the settled architecture in two or three sentences; Requirements come from the upstream artifact and developer input.
- Current State Analysis records what exists, what is missing, and Key Discoveries with patterns and constraints.
- Scope separates concrete Building deliverables from developer exclusions and likely scope-creep paths under Not Building.
- Decisions records evidence, explored options with consequences for genuine ambiguities, and the fixed choice.
- Desired End State contains concrete consumer-facing usage code. File Map lists each literal path, NEW or MODIFY status, and purpose.
- Ordering Constraints records dependencies and safe parallelism. Verification Notes converts inherited risks and precedent lessons into verifiable commands, searches, or inspections.
- Performance Considerations records hot-path consequences. Migration Notes records data, rollback, and compatibility requirements when applicable and remains present but empty otherwise.
- Pattern References records the implementation template and why it fits, with navigable evidence. Developer Context contains every checkpoint question and answer. References links the upstream artifact, tickets, and comparable implementations.

Architecture contains one heading and one-line purpose per decomposed file. For a new file, use `### path/to/file.ext — NEW` plus an empty code fence. For a modified file, use `### path/to/file.ext:line-range — MODIFY` plus an empty fence; later store only added or modified code, never a copy of the unchanged file.

Slices contains exactly one subsection per slice:

```markdown
### Slice N: {name}

**Files**: `path/to/file.ext`, `path/to/other.ext`

#### Automated Verification:

#### Manual Verification:
```

Design History starts every slice as `pending`. The empty Architecture fences and Success Criteria are placeholders gated by Step 6 approval, not permission to fill them during finalization.

### 6. Generate, verify, and checkpoint one slice

Process slices sequentially. Locked earlier slices in the artifact are the source of truth.

#### 6.1 Generate code and Success Criteria internally

Generate complete, copy-pasteable code and complete Success Criteria for the current slice, but do not show all code to the developer by default:

- New files include imports, types, implementation, exports, and complete tests.
- Modified files contain only the exact added or modified sections after reading the current file completely.
- Wiring shows the actual mount, registration, route, event, or dependency-injection point.
- No pseudocode, unfinished task marker, or placeholder is allowed.
- Automated and Manual Verification use `- [ ]` bullets and are atomic for this slice. Do not require a symbol, file, or behavior introduced by a later slice.
- Derive criteria from this slice's code and its applicable Verification Notes. Put whole-repository baseline build and test commands only on the terminal slice.

After Slice 2, re-read the artifact's Architecture entries for files this slice touches and the Slices entries for locked predecessors. Extend the persisted emitted state, not conversation memory.

If one specific implementation anchor remains unclear, read the Codebase Analyzer role and run at most one targeted organizational analysis, using the same inline fallback rules as Step 2.

#### 6.2 Verify every slice

Read [Slice Verifier](references/slice-verifier.md) completely and dispatch one native collaboration agent with the full role plus:

- `artifact_path`, the absolute path of the in-progress design artifact;
- `slice_id: Slice N`;
- `current_slice_code`, verbatim, including every Architecture code fence and both Success Criteria subsections for this slice;
- `target_files`, including every file this slice modifies or assumes and key files from locked predecessors.

The Slice Verifier is a semantic-isolation dependency: its independent adversarial context is required to trust the gate. If native collaboration is unavailable, report that the mandatory verifier cannot run and stop with the artifact still `in-progress`; do not simulate approval inline.

Wait for its working notes and final `Decisions / Cross-slice / Research` rows. On a real Decisions or Cross-slice violation, repair the proposed slice and re-dispatch until clear. A Research warning is advisory. When a violation is plausibly intentional, carry its final row verbatim plus a one-line rationale into Step 6.3 for developer ratification. Never hide a violation.

#### 6.3 Present one developer micro-checkpoint

Show a condensed review, not all generated code:

1. each file's one- or two-sentence summary;
2. public types, interfaces, and exported function signatures;
3. key factory, wiring, or non-obvious code blocks;
4. test case names only;
5. a mandatory Fit line naming reused helpers and types, the new public surface, and the naming/error/logging convention with navigable evidence.

If the slice introduces an abstraction where an existing one would serve, or reuses nothing, say so plainly. For modified files, show a focused diff with about three lines of context. Show complete code only when the developer requests it.

Ask `Slice N/M: {name} — {files}. {one-line summary}. Approve?` with:

- `Approve (Recommended)` — lock the exact code and criteria in the artifact, then stop at the fresh-task boundary when another slice remains;
- `Revise this slice` — change the proposed code, re-run the verifier, and re-present without touching the artifact;
- `Rethink remaining slices` — revisit the decomposition and explicitly handle any conflict with a locked slice;
- `Revisit a decision` — return to the affected Step 4 decision before regenerating.

Use the lettered prose choice format when native structured input is unavailable and wait for one answer.

#### 6.4 Apply the response

- **Approve** — immediately replace this slice's empty Architecture fences and Success Criteria placeholders with the exact approved payload. If this slice extends a file already filled by an earlier slice, rewrite that file's one Architecture fence with the merged result; do not create a duplicate fence. Deduplicate imports and definitions, keep exports complete, record the question and answer in Developer Context, and mark Design History `approved as generated` or `approved revised: {summary}`.
- **Revise this slice** — update the held payload, re-run Step 6.2, and re-present. Do not write unapproved code or criteria to the artifact.
- **Rethink remaining slices** — update and reconfirm the remaining decomposition. If a locked slice is affected, flag the conflict and ask whether to reopen it before changing the artifact.
- **Revisit a decision** — return to Step 4 for that decision, cascade through decomposition when necessary, and re-run the verifier before re-presenting.

After approval, re-read the written Architecture code and Success Criteria and verify they byte-match the approved payload, or the exact approved merged result for a file shared with an earlier slice. A mismatch keeps the slice in progress and must be corrected.

If another slice remains, stop the task immediately after that byte check. Report the locked slice and artifact, then hand off a fresh-task resume:

````markdown
Recommended next step: **Design**

```text
--resume .rpiv/artifacts/designs/{filename}.md
```
````

Explain that the persisted artifact is the handoff and the next slice must start in a fresh task. Do not research, generate, or verify the next slice in the current task.

Only when the approved slice was final may the current task continue to Step 7.

### 7. Finalize the design

After every slice is approved:

1. Verify every Architecture heading has a non-empty code fence. If any is empty, return to Step 6; never fill it during finalization.
2. Verify every Slice subsection has its `**Files**:` line and non-empty Automated and Manual Verification subsections. If any is empty, return to Step 6.
3. For every file touched by multiple slices, verify its single Architecture fence contains the final merged code.
4. Change frontmatter `status: in-progress` to `status: ready`. Design has no `in-review` state and owns no post-finalization review.
5. Verify every required Step 5 section is present and complete. Preserve `last_updated` and `last_updated_by` unless a follow-up changes the artifact.

### 8. Present the design artifact

Report the artifact as a repository-relative Markdown link, the fixed-decision count, new and modified file counts, slice count, and generation revision count. State that Success Criteria were authored with each slice and independently verified before lock.

Invite review of the architecture, code shape, missing integration points, and edge cases. Explain that revisions use Revise to update this artifact and its active plan together. If evidence is materially stale, establish the missing research before proposing a revision; do not silently abandon the active plan or its progress.

Then hand off and stop:

````markdown
Recommended next step: **Plan**

```text
.rpiv/artifacts/designs/{filename}.md
```
````

Plan consumes the ready design, preserves Slice-to-Phase boundaries one-to-one, copies Success Criteria unchanged, and owns the post-finalization code and coverage review that Design deliberately does not run. If Plan is not installed, say so plainly. Never invoke or port it automatically.

### 9. Handle follow-ups

For a change to already approved design material, hand off one **Revise** invocation and stop:

```text
.rpiv/artifacts/designs/{filename}.md {specific feedback}
```

Revise owns pair resolution, the coordinated proposal, source verification, progress preservation, and affected review. Before an active plan exists, it can revise the design alone. Pending slice generation and its unapproved payload still use Step 6; they are not revisions to approved design material. Never invoke Plan, implementation, or Revise automatically.

## Artifact compatibility

The ready Design artifact is load-bearing input for Plan:

- each `### Slice N: {name}` becomes `## Phase N: {name}` one-to-one and in order;
- each slice's literal `**Files**:` list remains parser-readable;
- Automated and Manual Verification bullets pass through unchanged;
- Architecture code supplies the proposed implementation for those files;
- Decisions are fixed and are not re-opened by Plan;
- unresolved questions or missing/empty Slices make the artifact invalid for Plan.

## Non-negotiable boundaries

- Always read input artifacts and referenced source files completely before research.
- Finish every required research role before the dimension sweep.
- Resolve architectural ambiguity before decomposition.
- Confirm the entire decomposition before creating the skeleton.
- Generate, independently verify, and checkpoint exactly one slice at a time.
- Approval is the only event that writes slice code and Success Criteria.
- Stop after persisting and byte-checking any approved non-final slice; resume only in a fresh task from the artifact.
- Finalize only when every slice is approved and every fence and criterion is filled.
- Never edit product source. All proposed code lives in the design document.
- Never invoke Plan, implementation, another successor skill, push, publish, or continue past a required developer decision.
