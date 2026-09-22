---
name: rpivc-research
description: Answer structured repository or external-contract questions with bounded analysis, grounded developer checkpoints, and a research document under .rpiv/artifacts/research/. Use for in-depth research before design or planning; do not use to implement changes.
---

# RPIV Research for Codex

Answer structured questions by first tracing the investigation scope, then executing targeted analysis roles, checkpointing material ambiguities with the developer, and writing a downstream-compatible research document.

Original upstream baseline: 7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7.
Reviewed through RPIV-Pi commit d74b1c99830a565f3df3f37e0a36616d17ffc574; selected Codex differences remain.

This port preserves the upstream `research` workflow:

```text
input -> scope tracer -> grouped analysis -> developer checkpoint -> document -> handoff
```

The stage is analysis-only. It may write or append the research artifact, but it must not edit product source, recommend an implementation recipe, invoke a successor skill, or begin design.

## Input

Treat all text following `$rpivc-research` as one free-text research prompt. It may include a path under `.rpiv/artifacts/discover/` to chain from discovery.

When there is no argument, reply exactly and stop for input:

```text
Please provide a free-text research prompt.
```

If the user is asking a follow-up about an artifact produced earlier in the current task, use [Follow-up research](#follow-up-research) instead of restarting the full workflow.

## Metadata

Resolve the research skill root as the directory containing this loaded `SKILL.md`; do not infer it from the caller's working directory. During input handling, run these bundled helpers once by absolute path from that root and retain their output for the later write:

```bash
node <research-skill-root>/scripts/now.mjs
echo
node <research-skill-root>/scripts/git-context.mjs
```

The first helper returns `<iso>\t<slug>`. Copy the timezone offset verbatim. The second returns labeled repository metadata with explicit fallbacks.

## Navigable file references

Adapt local file references to the output surface without making artifacts machine-specific.

- **Codex Desktop chat and completion reports:** resolve local files against the caller's Git root and use absolute Markdown targets ending in the verified starting line, such as `[descriptive label — lines 42–55](/absolute/repository/backend/path/to/file.py:42)`. Keep ranges only in labels. When no line is verified, link the absolute path without a suffix. Wrap targets containing spaces in angle brackets.
- **Other chat clients:** follow the active host and repository instructions instead of assuming a Codex Desktop or GitHub link form.
- **Human-readable artifact prose:** use repository-relative Markdown links such as `[descriptive label — lines 42–55](backend/path/to/file.py#L42-L55)`. When no verified line exists, link the repository-relative path without a fragment. Never write an absolute machine path into the artifact.
- **Structural fields:** preserve plain paths where a downstream parser consumes them. Do not turn frontmatter fields or another skill's load-bearing path fields into links.

Normalize role output separately at the chat boundary and the artifact-writing boundary. A role's raw backticked citation is evidence input, not the final rendering contract.

## Choice response format

When a checkpoint offers two to four finite authored options, prefer native structured input without letter prefixes. If structured input is unavailable, fails, or does not display, render the same options in prose as `A.` through `D.` in their existing order. Preserve the recommended option first so it becomes `A` when a recommendation exists.

In a prose fallback, put one option on each line as `A. **Label (Recommended)** — consequence.` and `B. **Label** — consequence.` Keep `(Recommended)` inside the bold label and never detach it after the explanation. Omit the dash and consequence when the label is already self-explanatory.

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

Follow every step in order. A checkpoint may span multiple turns; resume the current step after the developer answers instead of restarting the investigation.

### 1. Formulate the research questions

#### Handle a chained discovery artifact

If the input includes a path matching `.rpiv/artifacts/discover/.*\.md`, read that file completely before executing any role.

- In its `## Decisions` section, translate every `### {Decision title}` block into a Developer Context entry: `**Q (discover: {Decision title}): {Question text}**`, then `A: {Chosen text}`.
- Use the `## Recommended Approach` text, normally one or two sentences naming the architectural shape, as the scope-tracer topic body. Keep the full discovery artifact path in the task so the role reads it for additional context.
- Carry the discovery artifact's `## Open Questions` entries forward verbatim into the research artifact's Open Questions section.

For plain free text or a non-discovery path, use the invocation text itself as the topic.

#### Dispatch the mandatory scope tracer

Read [the Scope Tracer role](references/scope-tracer.md) completely. Do not execute any other role first. The scope-tracer separation is organizational: it bounds the search and leaves questions unanswered, but the parent verifies and consumes its output rather than relying on an independent judgment.

When native collaboration agents are available, spawn one isolated agent whose task includes the entire role prompt plus the topic and repository working directory. When they are unavailable, execute that complete role prompt inline, with the same search-slice, file-read, question-count, and output limits. Do not replace it with an unbounded main-context sweep. In either carrier, the scope tracer must return its result inline and must not write a file.

The scope tracer determines one of two evidence modes:

- **Codebase mode:** relevant live project files exist outside `.rpiv/artifacts/`; return five to ten code-trace questions grounded in those files.
- **Greenfield or external-only mode:** no relevant live implementation exists; return three to six external-contract questions derived from the chained discovery requirements or free-text topic. These questions identify the current command, application programming interface, model, configuration, wire-format, or other external behavior that needs primary-source verification. They must not invent repository files, symbols, or line citations.

Wait for a delegated scope tracer and parse its final message, or retain the inline role output as a separate block. Parse only that role result:

- retain the three-to-five-sentence Discovery Summary;
- retain each full numbered question paragraph;

After the questions are formulated and before reading shared files, send concise commentary:

```text
Research questions ready: {N}; reading shared files and grouping the analysis.
```

Then:

- read key shared files that recur across questions into the main context, especially types, shared utilities, and integration wiring;
- extract repository-relative file references from every question;
- group questions sharing at least two file references, with two or three questions per group;
- leave questions without significant file overlap standalone; external-contract questions with no repository references are always standalone;
- target three to six total analysis groups.

Report:

```text
[Scoped]: completed scope-tracer. {N} questions in {G} groups, {M} shared files. Mode: {codebase|greenfield/external-only}. Carrier: {collaboration agent|bounded inline}.
```

### 2. Dispatch the analysis roles

Read every role prompt before executing it, then apply that complete prompt's operational instructions and output contract. These roles are organizational delegation: they bound context, parallelize work, and apply a specialist evidence contract, but the parent verifies their results.

When native collaboration agents are available, include the complete role prompt in each agent task. When they are unavailable, execute each analysis task sequentially inline under the complete role prompt, retaining one separately labeled result per task and deferring synthesis until every task finishes. The inline fallback keeps the same task count, search limits, file-read limits, evidence rules, and output shape; it does not collapse all questions into one general investigation.

- Use [Codebase Analyzer](references/codebase-analyzer.md) for codebase questions.
- Use [Web Search Researcher](references/web-search-researcher.md) only for an external application programming interface, software development kit, library, service, protocol, or wire format that the repository does not already use. The external surface itself triggers this role; merely mentioning documentation does not.
- When the metadata helper returned a real commit, also use [Precedent Locator](references/precedent-locator.md) to find similar changes involving the key Discovery Summary files. With `no-commit`, skip it and record `git history unavailable` under Precedents & Lessons.

If an external-surface question requires current web evidence but the native web capability is unavailable, report the missing evidence capability and stop. Do not route that question to a codebase analyzer or fabricate an answer.

Each standalone codebase-analysis task contains:

```text
Research topic: {topic}

Answer this research question thoroughly. Read the named files, trace the described code paths, and support every behavioral claim with exact repository-relative file:line evidence.

{full dense question paragraph}

Focus on depth. Trace the actual path; do not merely locate it or recommend changes.
```

Each external-contract analysis task contains:

```text
Research topic: {topic}

Answer this external-contract question using current primary sources. State relevant product, command, model, format, version, and date boundaries explicitly, and support each material claim with a direct link.

{full external-contract question paragraph}

Separate documented fact from inference. Do not invent repository evidence or turn the answer into an implementation recommendation.
```

For a grouped task, include each full paragraph as `Question 1`, `Question 2`, and, at most, `Question 3`. Require a separate answer for each and ask the role to identify connections where the same code serves multiple questions.

With collaboration agents, dispatch as many roles concurrently as the current Codex environment permits. If the analysis groups plus precedent sweep exceed available slots, use additional bounded waves. Without collaboration agents, use the bounded sequential inline carrier defined above. These are capacity adapters, not permission to synthesize early: wait for every question report and the precedent report before proceeding. Never use detached background work that cannot resume this workflow.

Immediately before executing the first analysis role, send concise commentary:

```text
Starting {N} analysis roles{ plus one precedent sweep} via {collaboration agents|bounded inline execution}; waiting for every result before synthesis.
```

After every analysis and precedent role has returned, send concise commentary:

```text
Analysis complete: {N}/{N} role results returned.
```

### 3. Synthesize and checkpoint

#### Compile the findings

Before compiling the role reports, send concise commentary:

```text
Synthesizing {N} role reports into the developer checkpoint.
```

- Match each response to the question or questions it answered.
- Cross-reference patterns, conflicts, and connections across reports.
- Keep evidence classes separate. Treat live repository findings as primary evidence for repository behavior, current primary web sources as primary evidence for external contracts, and `.rpiv/artifacts/` as supplementary historical context.
- Verify every emitted `file:line` or `file:start-end` against the current checkout before rendering it as a navigable reference. The path must exist, and the cited line or range end must be within the file. When a line cannot be verified, link the repository-relative path without a fragment rather than inventing precision.
- Verify every external-contract claim against a direct primary-source link and retain its relevant version or date boundary. Never convert an external link into a fabricated repository citation.
- Build Code References as a planner jump table, not narrative.
- Use at most three lines in any code block. Prefer citations plus prose.
- Record current-code facts, not implementation recipes or code-quality recommendations.
- Link plans and designs under Historical Context without summarizing them as current behavior.

#### Ask grounded ambiguity questions

Ask only when the reports expose a material pattern conflict, scope boundary, priority conflict, integration ambiguity, or missing developer context. Each question must be self-contained and include:

1. observed behavior;
2. at least one verified navigable repository link in codebase mode, or one direct primary-source link with a version or date boundary in greenfield or external-only mode;
3. why the decision matters;
4. two to four concrete evidence-based options or hypotheses.

Prefix the visible question with `❓ Question:`. Ask exactly one developer question per response and stop for its answer. This applies even when questions are independent: never batch multiple questions into one structured-input call or one prose response.

Use native structured input when available. Put the recommended evidence-based option first and rely on the control's custom-response field rather than authoring `Other`. If structured input is unavailable, use the lettered prose choice format, permit another written answer, and stop for the answer.

Never ask the developer to validate the research with “does this look correct?” and never ask a preference question that lacks evidence appropriate to the active mode. The checkpoint must pull new information from the developer.

#### Present the compiled scan and gate the write

Present a scan under 30 lines:

```text
Task: {one-line summary}
Scope: {N files across M layers, K integration points} OR {N external surfaces and K contract boundaries}

{Layer} — {key files and roles}
Integration — {inbound, outbound, and wiring counts; top concern if any}
History — {relevant documents and one evidenced lesson, if any}

Best template: {closest current implementation}
Precedents — {count and top lesson, or git history unavailable}
Inconsistencies: {count and short names}
```

Then ask one gated question: `Scan complete — write the doc, or adjust first?` Offer `Write the doc (Recommended)`, `Add an area`, and `Correct a finding`. Use native structured input when available; otherwise use the lettered prose choice format without a custom-answer suffix. Wait for the answer.

Classify the response:

- **Write:** proceed to the document.
- **Correction:** incorporate it, record it in Developer Context, and re-check any dependent finding.
- **New area:** read [Codebase Locator](references/codebase-locator.md) and [Codebase Analyzer](references/codebase-analyzer.md), then execute at most those two roles narrowly on the added repository area using the same collaboration-or-inline carrier. For an added external surface, execute at most one [Web Search Researcher](references/web-search-researcher.md) task instead. Merge the evidence and record the input in Developer Context.
- **Decision:** record it in Developer Context and remove the corresponding Open Question.
- **Scope or focus:** record the chosen boundary in Developer Context.

After an adjustment, present the revised compact scan and gate the write again. Do not write until the developer chooses Write.

### 4. Write the research document

Read [the research document template](references/research-template.md) completely at runtime. Synthesize enough compressed context that a fresh planning task can make architectural decisions without repeating this research.

Replace every template placeholder. When an optional section has no entries, write `None.` rather than leaving example or placeholder text.

Use the retained metadata exactly:

- Filename: `.rpiv/artifacts/research/<slug>_<topic>.md`, where `<slug>` is the helper's second tab-separated field and `<topic>` is a brief kebab-case description.
- `repository` comes from `repo`; `branch` and `commit` come from their matching labels.
- `date` and `last_updated` both use the exact `<iso>` value, including its original offset.
- `author` and `last_updated_by` use `author`, falling back to `unknown`.
- Start with `status: ready`.

Populate every load-bearing template section:

- Research Question preserves the topic emitted by the scope tracer; for a chained run, link the discovery artifact under Historical Context.
- Summary directly answers it.
- Detailed Findings organize current behavior by component.
- Code References is a verified jump table of repository-relative Markdown links using the artifact format above. In greenfield or external-only mode, write `None.` when there are no live code references.
- Integration Points enumerates inbound consumers, outbound dependencies, and infrastructure wiring in codebase mode. In greenfield or external-only mode, record the external contract boundaries with direct primary-source links and do not invent repository wiring.
- Architecture Insights records demonstrated patterns and conventions, not prescriptions.
- Precedents & Lessons records real commits and follow-up evidence, or the explicit no-history fallback.
- Historical Context contains links and one-line scope descriptions, not artifact summaries.
- Developer Context contains every discovery decision and checkpoint answer.
- Open Questions contains only unresolved items, including carried discovery questions. Use `None.` when empty.

Create the parent directory when necessary and write exactly one new artifact. Do not edit product source or another artifact during the initial run.

### 5. Present the handoff and stop

Render this report as ordinary Markdown without a surrounding code fence:

````markdown
Research document written to:
{artifact path rendered with the chat file-reference rule}

{N} questions answered, {M} findings across {K} files.

Please review and let me know if you have follow-up questions.

---

Follow-up: describe the question in chat to append a timestamped Follow-up Research section to this artifact. Start a fresh Research run for a separate artifact.

Recommended next steps (choose one):

**Design**

```text
.rpiv/artifacts/research/{filename}.md
```

Use iterative design with vertical-slice decomposition.

**Blueprint**

```text
.rpiv/artifacts/research/{filename}.md
```

Use the lightweight combined design and phased-plan path for smaller work.

Tip: start a fresh task first; chained skills work best with a clean context window.
````

These successor names are handoffs, not permission to invoke or port them. Stop after presenting the research artifact.

## Follow-up research

When the developer asks a follow-up about the artifact produced in the current task:

1. Keep all prior artifact content immutable.
2. Run `now.mjs` again for a fresh timestamp.
3. Read only the role prompts needed for the new question and execute no more than one or two fresh, narrowly scoped role tasks using the same collaboration-or-inline carrier. Do not repeat the scope tracer or full investigation.
4. Verify new citations and append `## Follow-up Research {ISO 8601 timestamp}` with the new findings.
5. Update only `last_updated`, `last_updated_by`, and `last_updated_note: "Added follow-up research for <brief description>"` in frontmatter.

If the question changes the feature surface or research target materially, do not append. Recommend a fresh **Research** run and render the new topic as an arguments-only `text` fence using the standard format above. Never invoke that fresh run automatically.

## Non-negotiable boundaries

- Scope tracer is always the first executed role on a fresh run, whether delegated or inline.
- Every analysis and precedent role task finishes before synthesis.
- The four progress updates are commentary only. Never copy them into the research artifact, and never name the artifact path in commentary before the write completes. The completion report in step 5 is the first progress text that names the written path.
- The developer checkpoint and explicit write gate happen before artifact creation.
- No placeholder metadata or unverified line citation enters the document.
- Research describes current behavior; design and implementation are successor stages.
- No successor skill is invoked automatically.
