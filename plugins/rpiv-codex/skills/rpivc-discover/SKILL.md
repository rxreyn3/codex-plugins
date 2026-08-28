---
name: rpivc-discover
description: Turn a feature idea or existing product artifact into a complete, evidence-aware Feature Requirements Document using RPIV's intent-first discovery interview. Use for greenfield or existing-system feature definition before repository research or implementation; do not use to design, research broadly, or change source code.
---

# RPIV Discover for Codex

Interview the developer one decision at a time, ground later questions with a narrow repository probe, and write a new research-compatible Feature Requirements Document under `.rpiv/artifacts/discover/`.

This port preserves the `discover` workflow from RPIV-Pi commit `7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7`:

```text
input -> intent -> narrow probe -> lazy decision tree -> interview -> document -> handoff
```

Two invariants control the workflow:

1. **Intent before agents.** Ask and answer the foundational intent question before any repository probe.
2. **Lazy plus confirm.** Expand decisions one layer at a time and confirm evidence-based inferences with the developer instead of silently recording them.

## Input

Treat the text following `$rpivc-discover` as either a free-text feature description or a path to an existing Feature Requirements Document, ticket, or Markdown document.

When there is no argument, reply with exactly this choice and stop for input:

```text
I'll capture feature intent into a Feature Requirements Document. Provide one of:

$rpivc-discover [free-text feature description]  — fresh interview and new document
$rpivc-discover [existing artifact path]         — fresh interview informed by an existing document
```

If the argument resolves to a readable file, read it completely as baseline context. Read every other user-mentioned file and explicit `path:line` reference completely before asking the intent question. Do not dispatch an agent during input handling.

Every invocation writes a new timestamp-distinct artifact. Never append to or overwrite an earlier discovery artifact.

## Metadata

Resolve the discovery skill root as the directory containing this loaded `SKILL.md`; do not infer it from the caller's working directory. Run these bundled helpers by absolute path from that root:

```bash
node <discovery-skill-root>/scripts/now.mjs
node <discovery-skill-root>/scripts/git-context.mjs
```

The first helper returns `<iso>\t<slug>`. Copy the timezone offset verbatim. The second returns labeled repository metadata with explicit fallbacks.

## Workflow

Follow these steps in order. Never skip the developer-facing interview; it is the work, not decorative ceremony.

### 1. Ask the foundational intent question

Before any repository probe, ask one open-ended question tailored to the proposed feature: what problem is being solved, who experiences it, and what success looks like for that person today.

- This is an `intent` question. Do not recommend an answer and do not cite source code.
- When structured user input is available without forcing a recommendation, use one question with open routing choices such as `End user`, `Maintainer`, or `Operator`; rely on its custom-response field for the developer's actual framing.
- If the structured control requires a `(Recommended)` label, do not use it for intent. Ask one concise direct question and stop for the answer.
- Capture the answer in the developer's own words. Preserve it verbatim where possible for `Problem & Intent`.
- If the answer does not identify a narrow probe slice, ask one more intent question. Cap intent at three questions, then proceed with the narrowest honest scope available.

Do not dispatch an agent until this answer makes the probe intent-shaped.

### 2. Run the lightweight repository probe

First inspect the repository file inventory with native read-only listing, preferring `rg --files`. If the repository contains no project files, record `no codebase precedent`, skip role execution, and continue to Step 3. An empty greenfield repository is already decisive probe evidence; it does not need an agent to discover its own absence.

Otherwise choose the locator, analyzer, or both. Use no other role and execute no more than two roles for the initial probe.

Before dispatching a role, read its bundled prompt completely:

- [Codebase Locator Role](references/codebase-locator.md) finds and ranks where the narrow slice lives.
- [Codebase Analyzer Role](references/codebase-analyzer.md) explains how a named component or seam works.

For each chosen role:

1. Draft a narrow task from the developer's stated intent, not merely the raw invocation text.
2. Include the entire role prompt's operational instructions and required output contract in the native collaboration-agent task or inline fallback.
3. Name one component or one seam. Avoid breadth requests such as “everything related to X.”
4. Keep the task repository-read-only.

Use native collaboration agents when they are available, dispatching the chosen roles in parallel and waiting for all of them. For this probe, locator and analyzer separation is organizational rather than semantic: their reports are evidence input that the main skill verifies and the developer later confirms. If collaboration agents are unavailable, execute each chosen role inline under its complete bundled prompt and the same narrow task contract. Run inline roles sequentially, preserve their read-only boundaries and required output shapes, and do not broaden the search merely because isolation is unavailable.

After the chosen role reports are available, read at most five clearly relevant files in the main context. Files already read by an inline analyzer count toward this cap. Read files shorter than 300 lines completely; for larger files, start with the first 150 lines and expand only when the requested seam requires it.

Empty results are valid evidence. Record `no codebase precedent` and continue with scope questions; present later architectural choices as conventions rather than pretending a precedent exists.

### 3. Build only the first decision layer

Build the decision tree internally. Do not show it unless asked.

- Root: the developer's stated problem.
- Immediate children: Goals and Non-Goals; Functional Requirements; Non-Functional Requirements; Constraints; Acceptance Criteria; Recommended Approach.
- Order the interview by dependency: problem, goals, constraints, solution shape, then details. Document section order is handled later.

Do not build grandchildren yet. Expand a node's children only after its parent is resolved.

Mark evidence-based pre-resolutions with `file:line` citations, but do not record them as decisions. Confirm them with the developer in one consolidated interaction before the interview loop:

```text
From the probe I inferred: <observed behavior> (`path:line`). Keep this for the feature, or change it as part of the work?
```

Use one structured call when its capacity fits. Otherwise ask one concise consolidated question and stop for the answer. Confirmation becomes a decision with rationale `evidence: path:line + confirmed`. A correction changes the decision direction and schedules one narrow correction probe.

### 4. Walk the interview lazily

Walk depth-first, parent before child. Ask one unresolved question, wait for its answer, classify it, and only then continue. Two to four independent sibling detail leaves may share one structured-input call; never batch scope or architectural-shape questions.

#### Question tiers

- **Intent** was handled before the probe. Do not repeat it in this loop.
- **Scope** covers goals, exclusions, requirements, and constraints. Lead with one recommendation grounded in intent and project convention. Cite `file:line` only when an option references existing code; otherwise say `no codebase precedent`.
- **Shape** covers the architectural seam, pattern, or integration point. Name the tradeoff axis. Generate at least two real options. Every option must state what it optimizes and what it sacrifices or costs. Put the recommended option first with a one-line rationale. Cite every option that relies on existing code; otherwise label the options as conventions with `no codebase precedent`.
- **Detail** covers acceptance criteria and routine child decisions. It may be batched only when sibling answers are independent.

For every non-intent question, use structured user input when available, put the recommended authored option first, and label it `(Recommended)`. Do not author an `Other` option when the control already supplies a custom-response field. When structured input is unavailable, ask the same concise question directly and stop for the answer.

If the probe finds an existing feature that might replace the requested work, do not silently rescope. Ask an intent question with citations and offer both “use what exists” and “build as requested.”

#### Response handling

- **Decision:** record the question, recommendation, chosen answer, and a rationale that says more than `agreed`; resolve the node and lazily add its children.
- **Correction:** run targeted repository search on the corrected seam. Execute at most one additional narrow role for that correction when the seam was not already probed, using Step 2's collaboration-agent or bounded-inline path. Rebuild and re-ask dependent descendants.
- **Scope adjustment:** prune or add the relevant branch and record the choice. Put related but unrequested findings in Suggested Follow-ups unless the developer explicitly expands scope.
- **Cross-cutting answer:** keep one node and re-queue it under every affected parent, resolving it once in each parent's context.
- **Deferral:** put the item in Open Questions and resolve the node by deferral.

The total probe-role budget is two initial roles plus at most one additional role per correction event, normally two to four role executions for the entire discovery run. Broad repository sweeps belong to `$rpivc-research`, not this skill.

Stop the interview when all of these are true:

1. every branch has a decision or explicit deferral;
2. the developer's own words appear in Problem and Intent and in Goals;
3. every accepted recommendation has a substantive rationale.

Do not invent questions to fill document sections. Do not ask a final “looks good?” question.

### 5. Synthesize the Feature Requirements Document

Read [the Feature Requirements Document template](references/frd-template.md) completely at runtime. Synthesize from the recorded interview log, not from a loose memory of the conversation.

Redistribute the dependency-ordered interview into these document roles:

- **Summary:** two or three sentences describing the settled feature.
- **Problem & Intent:** the developer's words, verbatim where possible.
- **Goals and Non-Goals:** explicit included and excluded outcomes.
- **Functional Requirements:** numbered and independently testable.
- **Non-Functional Requirements:** performance, security, user experience, accessibility, and reliability constraints.
- **Constraints & Assumptions:** technical, environmental, schedule, and organizational boundaries plus claims for research to verify.
- **Acceptance Criteria:** observable commands, outputs, or visible behavior. Reject phrases such as `works correctly` or `user experience is acceptable`.
- **Recommended Approach:** one or two sentences naming the architectural shape implied by decisions. This is the topic passed to later repository research.
- **Decisions:** one heading per decision, containing the asked question, recommendation, chosen answer, and substantive rationale. Evidence-derived rationale uses `evidence: path:line + confirmed`.
- **Open Questions:** only explicit deferrals. Use `None.` when there are none so the template remains complete.
- **Suggested Follow-ups:** related findings the developer did not add to scope, with `file:line` when available. Omit the entire section when empty.
- **References:** input artifacts, tickets, and user-mentioned files.

### 6. Write the new artifact

Use the metadata helpers' results:

- Filename: `.rpiv/artifacts/discover/<slug>_<topic>.md`, where `<slug>` is the helper's second tab-separated field and `<topic>` is a kebab-case summary of the settled feature.
- `repository` comes from `repo`.
- `branch` and `commit` come from their matching labels.
- `date` and `last_updated` both use the exact `<iso>` value.
- `author` and `last_updated_by` use the `author` label, falling back to `unknown`.

Write one new file with frontmatter `status: ready`. Create the parent artifact directory when necessary. Never edit source files, the input artifact, or another discovery artifact.

### 7. Present the handoff and stop

Report:

```text
Intent captured to:
`.rpiv/artifacts/discover/<slug>_<topic>.md`

{N} requirements, {M} decisions, {K} open questions.

The Feature Requirements Document's Decisions block is translated into research's Developer Context and inherited by design.

---

Follow-up: discover writes a fresh document per call. Re-invoke `$rpivc-discover` to iterate; the prior document stays unchanged.

Next step: `$rpivc-research .rpiv/artifacts/discover/<slug>_<topic>.md` — ground the intent in repository reality.

Tip: start a fresh task first; chained skills work best with a clean context window.
```

The successor name is a handoff, not permission to invoke or port it. Stop after presenting the discovery artifact.

## Follow-ups and boundaries

- Re-invoking `$rpivc-discover <prior-document-path>` runs a fresh interview and writes a fresh artifact.
- A developer may manually edit a prior artifact for a one-off correction; this skill never owns in-place follow-up edits.
- Never write the document without completing the interview.
- Never probe before intent is answered.
- Never silently record evidence as a developer decision.
- Never pre-build the full decision tree.
- Never broaden into repository-wide research, design, implementation, or a successor stage.
