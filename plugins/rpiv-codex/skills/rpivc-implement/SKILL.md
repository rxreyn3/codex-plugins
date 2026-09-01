---
name: rpivc-implement
description: Execute an approved phased plan from .rpiv/artifacts/plans/, either sequentially or as exactly one named phase, applying source changes and checking each in-scope phase against its own success criteria. Use only when explicitly invoked with $rpivc-implement. Do not use for planning or final validation.
---

# RPIV Implement for Codex

Execute an approved technical plan from `.rpiv/artifacts/plans/`. Plans contain phased source changes and explicit success criteria.

This port preserves the `implement` workflow from RPIV-Pi commit `7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7`:

```text
ready plan -> read full context -> implement one or all phases in order
           -> run the in-scope verification -> check off verified criteria
           -> stop for review -> hand off to the next phase or final validation
```

Implementation edits product source and the plan's verification checkboxes. It does not redesign the plan, perform the successor validation stage, commit, push, publish, or invoke another workflow stage.

## Input

Treat all text following `$rpivc-implement` as `<plan-path> [phase]`:

- the first token is a Markdown plan path under `.rpiv/artifacts/plans/`;
- any remaining text, such as `Phase 2`, names exactly one phase.

If the input is empty, the path is a placeholder rather than a real path, or the file is missing, ask for the plan path and stop. Do not guess among recent plans.

If the input names a phase, use **single-phase mode**. Otherwise use **sequential full-plan mode**.

A checkpoint or mismatch may span multiple turns. Resume the current phase after the developer answers; do not restart the workflow.

## File references

- In chat, render verified repository evidence as relative Markdown links: `[Orders service — line 42](src/orders.ts#L42)` for one line and `[Orders service — lines 42–55](src/orders.ts#L42-L55)` for a range. When no verified line exists, link the repository-relative path without a fragment. Use a descriptive label, never add a machine-specific absolute companion link, and keep the link outside fenced code blocks.
- In the plan, preserve parser-consumed fields such as frontmatter `files:`, `#### N. path`, `**File**: path`, phase names, and reconciliation targets as plain repository-relative values. Do not convert them to links or write machine-specific absolute paths into the artifact.
- Implement normally changes only verification checkboxes and, when required, a reconciliation directive in the current phase. It does not rewrite existing artifact citations.

## Choice response format

When a checkpoint offers two to four finite authored options, prefer native structured input without letter prefixes. If structured input is unavailable, fails, or does not display, render the same options in prose as `A.` through `D.` in their existing order. Preserve the recommended option first so it becomes `A` when a recommendation exists.

After the prose list, write `Reply with A, B, ...` using only the letters actually shown. Add `, or write another answer` only when the checkpoint already permits a custom response. Accept an uppercase or lowercase letter, the full option label, or an unambiguous natural-language answer. Reset the letters for every new question; they have no meaning outside the currently displayed choice. Do not letter open-ended requests for a feature description, path, correction, or other required free text.

## Recommended action format

When a report recommends another RPIV stage, put the bold action name outside the code fence and put only the arguments the developer should paste after selecting that skill inside a `text` fence:

````markdown
Recommended next step: **{Action}**

```text
{arguments only}
```
````

Never put `$`, a skill identifier, or explanatory prose inside the arguments fence. Put the reason after the fence. If an action takes no arguments, omit the fence. A recommendation is a handoff, never permission to invoke the stage automatically.

## Start the run

With a real plan path:

1. Read the plan completely, including its overview, ordering constraints, every phase, and all verification guidance.
2. Read the original ticket and every file the plan names. Read each relevant file completely; partial snippets are not enough context for an implementation edit.
3. Use the native plan or progress mechanism when available to track the in-scope phases and checks. Otherwise maintain concise commentary checkpoints.
4. Establish the current working-tree state before edits. Preserve unrelated developer changes and do not include them in the implementation count.
5. Start when the plan and current code agree. If they materially disagree, follow **Handle a mismatch**.

## Execution modes

### Single-phase mode

Implement only the named phase, following the plan's dependency order. Earlier phases are expected to have landed their owned files already.

Hard boundaries:

- Touch only files owned by the named phase, plus the named phase's verification checkboxes in the plan.
- Never implement, create, edit, or check off another phase's files or section, even when something appears missing.
- A missing prerequisite owned by an earlier phase is a hard error. Stop with exactly:

  ```text
  prerequisite missing: <path> (expected from an earlier phase)
  ```

  Do not create it, ask the developer to choose an alternative, or defer the named phase's own edits.
- Apply every change owned by the named phase or fail cleanly. Never silently leave part of the phase undone.
- Ignore checkmarks outside the named phase; they may represent work from another sequenced lane. Resume state comes only from checkmarks inside the named phase.
- Run only commands under the named phase's `#### Automated Verification:` section. Do not run whole-plan build or test commands; those belong to the later validation stage.
- Keep formatters and automatic fixes write-scoped to the named phase's files. A repository-wide rewrite can corrupt another lane's changes with impressive efficiency.
- Stop immediately after the named phase's own checks pass and its checkboxes are updated.

After the stop, derive the handoff from the plan's declared phase and dependency order:

- If a later implementation phase follows the named phase, recommend **Implement** for the first such phase using the standard action format.
- If the named phase is the final implementation phase, recommend **Validate** using the standard action format.
- Do not use `Manual Verification`, whole-plan success criteria, or checkmarks outside the named phase to decide whether implementation phases remain. Those checks belong to final validation or another sequenced lane.
- If the plan's phase order is missing or internally inconsistent, report the mismatch and stop rather than guessing the next phase.

A suggested handoff is informational. Never invoke the next phase or validation automatically.

### Sequential full-plan mode

Implement every phase sequentially in dependency order:

1. Trust completed in-scope work unless current evidence contradicts it.
2. Resume at the first unchecked item.
3. Complete one phase fully before starting the next.
4. After each phase, run the plan's whole-plan success-criteria commands from its project `# Commands` table, including its recorded build and test commands.
5. Fix failures before advancing, then update the completed phase's verification checkboxes.

Plans guide the implementation, but current code is evidence. Adapt mechanically when names or locations have moved without changing intent. A choice that changes behavior, scope, or architecture is a mismatch, not implementation discretion.

## Scratch files

Repository-located scratch belongs under `.rpiv/tmp/`, nowhere else. This includes probe scripts, fixtures, and captured payloads not declared in the current phase's `files:` list. The downstream scope check includes untracked files, so a forgotten root-level probe is still a write. Delete scratch when it is no longer needed.

## Reconciliation directives

In single-phase mode, the named phase may correctly invalidate an expectation in a test owned by a sibling phase. Do not edit that sibling file. Add a `#### Reconciliation` directive to the named phase's own section:

```markdown
#### Reconciliation
- `path/to/x.test.ts`: replace `expect(r).toBe(3)` → `expect(r).toBe(4)` — <one-line rationale>
```

The directive is a machine-findable literal replacement:

- target one co-located `*.test.ts`, `*.test.tsx`, `*.test.js`, or `*.test.jsx` file;
- keep the target repository-relative and ensure the `find` substring exists;
- never target snapshots, fixtures, golden masters, or other extensions;
- record only a concrete one-file replacement.

Anything requiring restructuring or a non-test target is plan-level work for the `$rpivc-revise` stage.

## Verification and plan state

After each in-scope phase:

1. Run the commands required by the active execution mode.
2. Fix issues before continuing.
3. Update both native progress and the plan.
4. Flip only the corresponding `#### Automated Verification:` items from `- [ ]` to `- [x]` after their commands pass.
5. Anchor every checkbox edit on the full unique line, including its command, path, or phase-specific criterion. Never edit by matching only the repeated checkbox prefix.

Implement owns verification checkboxes, not plan content. Do not rewrite steps, code fences, criteria, decisions, phase ownership, or architecture from inside this stage. A plan-level change belongs to the `$rpivc-revise <plan-path>` stage.

## Handle a mismatch

When the plan cannot be followed against current code, stop before choosing new behavior and present:

```text
Issue in Phase {N}:
Expected: {what the plan says}
Found: {actual situation}
Why this matters: {explanation}
```

Classify the mismatch before choosing the handoff:

- A **confirmed plan-owned problem** requires changing plan content that Implement cannot own. Examples include an unavailable or invalid verification command, contradictory phase ownership, an impossible success criterion, or a required behavior, scope, or architecture decision. Do not ask the generic mismatch question. Stop and render:

  ````markdown
  Implementation paused at Phase {N}.

  The plan must be revised before implementation can continue.

  Recommended next step: **Revise**

  ```text
  <plan-path> "<specific plan correction grounded in the observed mismatch>"
  ```
  ````

  Make the feedback concrete enough that Revise can propose the surgical correction without rediscovering the failure. Do not invoke Revise automatically.
- An **implementation ambiguity** exists when more than one valid in-scope response remains, such as mechanically adapting the planned approach to moved code or intentionally omitting a change.

For an implementation ambiguity:

Ask exactly one focused question with header `Mismatch` and these options:

- `Follow the plan` — adapt the planned approach to the current code state while preserving its intended behavior.
- `Skip this change` — omit this planned change, accepting that the phase may remain incomplete.
- `Revise the plan` — stop implementation and show a Revise handoff in the recommended-action format before continuing.

Use native structured input when available and keep its header at sixteen characters or fewer. If the structured-input call succeeds, wait for that answer.

When structured input is unavailable, fails, or does not actually display an input surface, end the response with this direct fallback and stop:

```text
What should I do about this mismatch?

A. Follow the plan — adapt the planned approach to the current code state while preserving its intended behavior.
B. Skip this change — omit this planned change, accepting that the phase may remain incomplete.
C. Revise the plan — stop implementation and show a Revise handoff in the recommended-action format before continuing.

Reply with A, B, or C.
```

A mismatch response is incomplete unless the developer receives either the successful structured-input surface or the direct question with all three options. Never refer to a "displayed prompt", dialog, panel, or input surface unless that surface was successfully created in the current response. After the answer, state the selected consequence plainly before continuing. If the developer selects `Revise the plan`, stop and render `Recommended next step: **Revise**` followed by an arguments-only `text` fence containing `<plan-path> "<specific feedback>"`.

Do not use this mismatch flow for a missing earlier-phase prerequisite in single-phase mode; that case always uses the exact hard-error message above.

## Completion and pause reports

When single-phase mode completes and a later implementation phase remains, render this report as ordinary Markdown without a surrounding code fence:

````markdown
Phase {N} complete:
[Implementation plan](.rpiv/artifacts/plans/{filename}.md)

1 phase completed in this run, {M} files changed, {T} tests passing.
Phase {N} outstanding: none.
Implementation phases remaining: {remaining phase names in declared order}.

Please review the diff and let me know if anything should reopen this phase.

---

💬 Follow-up: route confirmed plan-owned problems directly to **Revise** using the recommended-action format. Use the Mismatch choice (Follow the plan / Skip this change / Revise the plan) only for genuine implementation ambiguity; for a session pause use the future **Create Handoff** stage.

Recommended next step: **Implement**

```text
.rpiv/artifacts/plans/{filename}.md {next phase}
```

Implement the next phase in the plan's declared dependency order.

Tip: start a fresh task first; chained skills work best with a clean context window.
````

When sequential full-plan mode completes, or single-phase mode completes the final implementation phase, render this report as ordinary Markdown without a surrounding code fence:

````markdown
Implementation complete:
[Implementation plan](.rpiv/artifacts/plans/{filename}.md)

{P} phases completed in this run, {M} files changed, {T} tests passing.
Implementation phases remaining: none.

Please review the diff and let me know if anything should reopen a phase.

---

💬 Follow-up: route confirmed plan-owned problems directly to **Revise** using the recommended-action format. Use the Mismatch choice (Follow the plan / Skip this change / Revise the plan) only for genuine implementation ambiguity; for a session pause use the future **Create Handoff** stage.

Recommended next step: **Validate**

```text
.rpiv/artifacts/plans/{filename}.md
```

Verify the implementation against the plan's success criteria before committing.

Tip: start a fresh task first; chained skills work best with a clean context window.
````

If implementation pauses mid-plan, render this report as ordinary Markdown without a surrounding code fence:

````markdown
Implementation paused at Phase {N}:
[Implementation plan](.rpiv/artifacts/plans/{filename}.md)

{P} phases completed, {M} files changed, {T} tests passing.
Outstanding: {unchecked items and blockers}.

Please review what landed and let me know if anything needs to change before resuming.

---

💬 Follow-up: route confirmed plan-owned problems directly to **Revise** using the recommended-action format. Use the Mismatch choice (Follow the plan / Skip this change / Revise the plan) only for genuine implementation ambiguity.

Recommended next step: **Create Handoff**

Capture the in-flight state for a clean resume.

Tip: start a fresh task first; chained skills work best with a clean context window.
````

If a named successor skill is not installed, say so plainly. Successor names are handoffs, not permission to invoke or port them.

## Non-negotiable boundaries

- Read the complete plan and referenced implementation files before editing.
- Preserve single-phase file ownership and stop after the named phase.
- In single-phase mode, run only that phase's automated verification commands.
- In full-plan mode, execute phases sequentially and run the plan's whole-plan commands after each phase.
- Hand a completed non-final named phase to the next declared phase; suggest validation only when no implementation phase remains.
- Check off only commands that passed, using full unique line anchors.
- Keep scratch under `.rpiv/tmp/` and remove it after use.
- Never redesign plan content from inside implementation.
- Route a confirmed plan-owned problem to a concrete **Revise** handoff using the recommended-action format; do not ask a choice whose other outcomes cannot validly continue.
- Never invoke a successor skill, commit, push, publish, or continue into another workflow stage.
