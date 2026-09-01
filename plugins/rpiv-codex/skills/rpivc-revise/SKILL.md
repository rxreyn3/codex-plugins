---
name: rpivc-revise
description: Surgically update one existing implementation plan under .rpiv/artifacts/plans/ from review findings, implementation discoveries, or changed constraints. Preserve the plan's useful structure and history, verify new technical claims, and require approval before editing. Do not implement product code or rewrite the plan wholesale.
---

# RPIV Revise for Codex

Update one existing implementation plan from explicit feedback while preserving its useful structure, artifact history, and downstream compatibility.

This port preserves the `revise` workflow from RPIV-Pi commit `7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7`:

```text
input -> research only if needed -> proposed edits -> developer approval
      -> surgical plan update -> review and implementation handoff
```

This stage edits only the selected plan artifact. It must not edit a review artifact, change product source, commit, invoke implementation, or start another workflow stage.

## Input

Treat all text following `$rpivc-revise` as `<plan-path> <feedback>`, for example `$rpivc-revise .rpiv/artifacts/plans/2026-08-30_09-00-00_feature.md "Split Phase 2 into backend and frontend phases"`.

Feedback may cite one or more review artifacts. Read every distinct cited review completely and synthesize its findings into the feedback set before proposing changes. Revise still edits exactly one plan.

A checkpoint may span several turns. Resume the current step after the developer answers; do not restart input handling or repeat completed research.

## Metadata

Resolve the revise skill root as the directory containing this loaded `SKILL.md`; do not infer it from the caller's working directory. During input handling, run these bundled helpers by absolute path from that root:

```bash
node <revise-skill-root>/scripts/now.mjs
echo
echo "### recent (read only in case of empty user input)"
echo "recent plans:"
node <revise-skill-root>/scripts/list-recent.mjs .rpiv/artifacts/plans 10
```

The first helper returns `<iso>\t<slug>` without a trailing newline. Retain the exact `<iso>` value, including its timezone offset, for the later plan update.

## File references

- **Chat and human-readable plan prose:** render newly verified repository evidence as relative Markdown links. Use `[Orders handler — line 42](src/orders.ts#L42)` for one line and `[Orders handler — lines 42–55](src/orders.ts#L42-L55)` for a range. When no verified line exists, link the repository-relative path without a fragment.
- Keep link targets repository-relative and outside fenced code blocks. Never add a machine-specific absolute companion path.
- **Structural plan fields:** preserve frontmatter paths, `files:` values, phase headings, `#### N. path`, `**File**: path`, commands, and other parser-consumed values as plain repository-relative text.
- Do not rewrite unaffected existing citations merely to change their presentation. Normalize only new or modified human-facing evidence.

Raw role output is evidence input. Verify and normalize it at the parent boundary before presenting it or writing it into the plan.

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

## Workflow

Follow every numbered step in order.

### 1. Resolve the plan and feedback

Parse the first plan-looking token as the plan path and the remaining text as feedback.

If the supplied positional path is under `.rpiv/artifacts/reviews/`, reply with this adapted guard and stop:

```text
`rpivc-revise` updates implementation plans, not review artifacts.

Provide the target plan path plus the changes to make. For example:
$rpivc-revise .rpiv/artifacts/plans/2026-08-30_09-00-00_feature.md "Address the findings from .rpiv/artifacts/reviews/2026-08-30_10-00-00_feature.md by tightening Phase 2 validation."
```

If no plan path was supplied, use the retained recent-plan listing:

- **No entries:** report that `.rpiv/artifacts/plans/` has no plan to revise. Render `Recommended next step: **Plan**` if that future stage is installed; otherwise render `Recommended next step: **Blueprint**` and note that it can create a compatible phased plan. Neither action has concrete arguments here, so omit the fence. Stop.
- **Exactly one entry:** ask `Revise this plan?` with `Revise <filename> (Recommended)` and `Pick a different path`.
- **Two or more entries:** offer the four newest filenames and ask the developer to choose one.

Use native structured input when available. Keep its header at sixteen characters or fewer, put the recommended option first, and rely on the control's custom-response field instead of authoring `Other`. If structured input is unavailable or fails to display, use the lettered prose choice format, permit another written answer, and stop.

If a plan path exists but feedback is empty, ask what should change and stop. Give brief examples such as adding a migration phase, splitting a phase, tightening success criteria, or excluding a scope item.

When feedback cites one or more review artifacts as evidence, read every distinct review completely before treating its findings as part of the feedback set.

#### Read the artifact

With one real plan path and a feedback set:

1. verify that the plan exists under `.rpiv/artifacts/plans/`;
2. read the entire plan, including frontmatter, every phase, success criteria, Plan History, and existing Follow-up sections;
3. identify the exact sections and acceptance claims the feedback affects;
4. build a bounded **plan-consistency cone** for any factual invariant in the feedback, such as an executable, command convention, path, dependency, environment assumption, or repeated acceptance claim:
   - search the entire plan for the same literal and clearly equivalent occurrences;
   - classify each occurrence as the same correction, unrelated context, or unresolved;
   - include every same-correction occurrence in the proposed revision, even when it appears in another phase;
   - ask one focused question before proposing edits when an occurrence cannot be classified safely;
5. determine whether the change needs new technical evidence.

Never infer the plan's structure from a partial read.

The consistency cone is not a general plan audit and does not authorize edits. It prevents a plan-wide invariant discovered in one phase from being repaired one phase at a time. Implementation phase ownership does not limit this scan because Revise owns the single plan artifact; the developer's later approval still controls every proposed edit.

### 2. Research only when needed

Skip this step for a purely editorial or structural change whose feasibility is already established by the plan and feedback.

When the requested revision requires new technical understanding, use only the roles needed for that new surface:

- For code investigation, read [Codebase Locator](references/codebase-locator.md), [Codebase Analyzer](references/codebase-analyzer.md), and [Codebase Pattern Finder](references/codebase-pattern-finder.md) completely.
- For historical artifact context, read [Artifacts Locator](references/artifacts-locator.md) and [Artifacts Analyzer](references/artifacts-analyzer.md) completely.

These roles are organizational delegation. They bound searches and apply specialist evidence contracts, but the parent reads relevant files and verifies every finding before it can change the plan.

When native collaboration agents are available, dispatch the required independent roles concurrently within the available slots. Include the complete role prompt, exact repository working directory, affected plan sections, feedback, search boundary, and required output in each task. Wait for every role before synthesizing.

When collaboration agents are unavailable, execute the same required roles as separately labeled, bounded inline tasks. Keep each role's search, file-read, evidence, and output limits; do not collapse them into one broad repository sweep. Finish every inline role before synthesis.

Retain which carrier ran. Report `Research carrier: collaboration agents`, `Research carrier: bounded inline`, or `Research carrier: not used` in the proposed-revision summary.

After the roles finish:

1. read every newly relevant implementation or artifact file completely;
2. cross-check role claims against the live checkout;
3. verify every new line reference against the current file;
4. identify conflicts between feedback, current code, and existing plan decisions;
5. keep unresolved choices out of the proposed edit until the developer answers them.

### 3. Present the proposed revision and gate the edit

Before editing, present:

```text
Based on the feedback, I understand the plan should:
- {specific change}
- {specific change}

Evidence that affects the revision:
- {verified current constraint or "No new research needed"}

Plan consistency scan:
- {same-correction occurrences by phase and section, or "No analogous occurrences found"}

Research carrier: {collaboration agents | bounded inline | not used}

Proposed edits:
1. {specific section and modification}
2. {success criteria, scope, or phase metadata update}
```

Point out vague, conflicting, or technically invalid feedback plainly. Ask one focused clarification question and stop whenever a material issue remains unresolved.

When the consistency cone finds same-correction occurrences outside the phase or section named in the feedback, list them explicitly in `Plan consistency scan` and include them in `Proposed edits`. This expands the proposal, not the edit authorization. Never change an analogous occurrence unless the developer approves that listed modification.

When the proposal is actionable, ask `{short summary}. Proceed with these edits?` using header `Changes` and these options:

- `Proceed (Recommended)` — apply the listed changes to the existing plan.
- `Adjust approach` — change what will be edited before touching the file.
- `Show me first` — present the exact patch or replacement text without applying it.

Use native structured input when available. If unavailable or unsuccessful, use the lettered prose choice format without a custom-answer suffix and stop. Do not edit until the developer chooses Proceed. After `Show me first`, display the exact proposed text and repeat the gate with fresh `A` through `C` letters; after `Adjust approach`, ask one focused open-ended question and revise the proposal.

### 4. Update the plan surgically

Use the available patch or edit mechanism against the existing plan. Never overwrite the full file to make a local change.

Apply only the approved modifications:

- preserve unaffected structure, decisions, code blocks, criteria, and history;
- apply every analogous correction explicitly listed in the approved proposal, across all affected phases;
- keep new file references accurate and measurable;
- update `## What We're NOT Doing` when scope changes;
- update the implementation approach or decision section when the approach changes;
- preserve separate `#### Automated Verification:` and `#### Manual Verification:` subsections;
- use the project's actual commands for new automated criteria;
- keep the existing `status` unless the approved feedback explicitly changes it.

#### Invalidate stale completion state

When editing a phase that contains checked `- [x]` items, change each affected item back to `- [ ]` whenever the previous implementation no longer guarantees the revised step, sub-step, or success criterion. Leave a checkmark intact only when current implementation still satisfies the revised wording.

This is mandatory. `$rpivc-implement` trusts phase checkmarks when resuming, so a stale checkmark can silently skip the new work.

#### Synchronize frontmatter

If YAML frontmatter exists:

- set `last_updated` to the exact retained `<iso>` value;
- set `last_updated_by: Codex`;
- set `last_updated_note` to a one-line summary of this revision;
- when `phases:` exists, rebuild its body-order entries from the final `## Phase N: {title}` headings so every heading has one `{ n, title }` entry and no removed heading remains.

Do not invent frontmatter when the plan has none.

#### Preserve revision history

Append one new `## Follow-up {ISO 8601 timestamp}` section for this invocation. Summarize the feedback applied, affected phases or sections, and any checkmarks reopened. Never collapse or rewrite earlier Follow-up sections.

After editing, re-read the complete plan and verify:

1. the approved feedback is fully represented;
2. phase numbering, headings, and any `phases:` array agree;
3. changed work is unchecked where required;
4. automated and manual success criteria remain distinct and measurable;
5. no unresolved question, placeholder, or contradictory scope statement remains;
6. no product source or second artifact changed.

### 5. Report the update and stop

Render the completion report as ordinary Markdown:

````markdown
Plan updated at:
[Updated implementation plan](.rpiv/artifacts/plans/{filename}.md)

Changes made:
- {specific change}
- {specific change}

The revised plan now:
- {key improvement}
- {reopened work or metadata synchronization}

Let me know if you want another surgical revision; each Revise invocation appends a timestamped Follow-up section.

---

Recommended next step: **Implement**

```text
.rpiv/artifacts/plans/{filename}.md Phase {N}
```

Resume at the affected phase. Omit `Phase {N}` only when all phases should run sequentially.

Tip: start a fresh task first; chained skills work best with a clean context window.
````

If no single affected phase can be named, use the full-plan handoff without a phase argument. The successor name is a handoff, not permission to invoke it. Stop after the report.

## Non-negotiable boundaries

- Update exactly one existing plan artifact per invocation.
- Read the complete plan and every referenced review artifact before proposing edits.
- Research only the new technical surface the feedback introduces.
- Resolve every material question before editing.
- Scan the complete plan for analogous occurrences of the same factual invariant before proposing edits; do not inherit an implementation phase's ownership boundary as the revision boundary.
- Require explicit approval after presenting the proposed revision.
- Make surgical edits; never rewrite the plan wholesale.
- Reopen affected checked work and synchronize phase frontmatter.
- Preserve prior Follow-up history and append one new timestamped section.
- Never edit product source, a review artifact, or another plan.
- Never commit, invoke implementation, push, publish, or begin another workflow stage.
