---
name: rpivc-research
description: Answer structured questions about a codebase with targeted parallel analysis, grounded developer checkpoints, and a research document under .rpiv/artifacts/research/. Use for in-depth repository research before design or planning; do not use to implement changes.
---

# RPIV Research for Codex

Answer structured codebase questions by first tracing the investigation scope, then dispatching targeted analysis roles, checkpointing material ambiguities with the developer, and writing a downstream-compatible research document.

This port preserves the `research` workflow from RPIV-Pi commit `7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7`:

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

## Workflow

Follow every step in order. A checkpoint may span multiple turns; resume the current step after the developer answers instead of restarting the investigation.

### 1. Formulate the research questions

#### Handle a chained discovery artifact

If the input includes a path matching `.rpiv/artifacts/discover/.*\.md`, read that file completely before dispatching any agent.

- In its `## Decisions` section, translate every `### {Decision title}` block into a Developer Context entry: `**Q (discover: {Decision title}): {Question text}**`, then `A: {Chosen text}`.
- Use the `## Recommended Approach` text, normally one or two sentences naming the architectural shape, as the scope-tracer topic body. Keep the full discovery artifact path in the task so the role reads it for additional context.
- Carry the discovery artifact's `## Open Questions` entries forward verbatim into the research artifact's Open Questions section.

For plain free text or a non-discovery path, use the invocation text itself as the topic.

#### Dispatch the mandatory scope tracer

Read [the Scope Tracer role](references/scope-tracer.md) completely. Spawn one isolated native collaboration agent whose task includes the entire role prompt plus the topic and repository working directory. Do not dispatch any other role first. The role must return its Discovery Summary and five to ten numbered dense questions inline; it must not write a file.

If native collaboration agents are unavailable, report that the required scope-tracer boundary cannot be preserved and stop. Do not substitute an unbounded main-context sweep.

Wait for the scope tracer, then parse only its final message:

- retain the three-to-five-sentence Discovery Summary;
- retain each full numbered question paragraph;
- read key shared files that recur across questions into the main context, especially types, shared utilities, and integration wiring;
- extract repository-relative file references from every question;
- group questions sharing at least two file references, with two or three questions per group;
- leave questions without significant overlap standalone;
- target three to six total analysis groups.

Report:

```text
[Scoped]: ran scope-tracer. {N} questions in {G} groups, {M} shared files.
```

### 2. Dispatch the analysis roles

Read every role prompt before dispatching it, then include that complete prompt's operational instructions and output contract in the native agent task.

- Use [Codebase Analyzer](references/codebase-analyzer.md) for codebase questions.
- Use [Web Search Researcher](references/web-search-researcher.md) only for an external application programming interface, software development kit, library, service, protocol, or wire format that the repository does not already use. The external surface itself triggers this role; merely mentioning documentation does not.
- When the metadata helper returned a real commit, also use [Precedent Locator](references/precedent-locator.md) to find similar changes involving the key Discovery Summary files. With `no-commit`, skip it and record `git history unavailable` under Precedents & Lessons.

If an external-surface question requires current web evidence but the native web capability is unavailable, report the missing evidence capability and stop. Do not route that question to a codebase analyzer or fabricate an answer.

Each standalone analysis task contains:

```text
Research topic: {topic}

Answer this research question thoroughly. Read the named files, trace the described code paths, and support every behavioral claim with exact repository-relative file:line evidence.

{full dense question paragraph}

Focus on depth. Trace the actual path; do not merely locate it or recommend changes.
```

For a grouped task, include each full paragraph as `Question 1`, `Question 2`, and, at most, `Question 3`. Require a separate answer for each and ask the role to identify connections where the same code serves multiple questions.

Dispatch as many roles concurrently as the current Codex environment permits. If the analysis groups plus precedent sweep exceed available slots, use additional bounded waves. This is a capacity adapter, not permission to synthesize early: wait for every question report and the precedent report before proceeding. Never use detached background work that cannot resume this workflow.

### 3. Synthesize and checkpoint

#### Compile the findings

- Match each response to the question or questions it answered.
- Cross-reference patterns, conflicts, and connections across reports.
- Treat live repository findings as primary evidence. Treat `.rpiv/artifacts/` as supplementary historical context.
- Verify every emitted `file:line` or `file:start-end` against the current checkout before writing it. The path must exist, and the cited line or range end must be within the file. When a line cannot be verified, cite the repository-relative path without a line rather than inventing precision.
- Build Code References as a planner jump table, not narrative.
- Use at most three lines in any code block. Prefer citations plus prose.
- Record current-code facts, not implementation recipes or code-quality recommendations.
- Link plans and designs under Historical Context without summarizing them as current behavior.

#### Ask grounded ambiguity questions

Ask only when the reports expose a material pattern conflict, scope boundary, priority conflict, integration ambiguity, or missing developer context. Each question must be self-contained and include:

1. observed behavior;
2. at least one verified `file:line` reference in the question itself;
3. why the decision matters;
4. two to four concrete evidence-based options or hypotheses.

Prefix the visible question with `❓ Question:`. Ask one question at a time and wait for its answer before asking a dependent question. Two to four genuinely independent questions may share one structured-input call.

Use native structured input when available. Put the recommended evidence-based option first and rely on the control's custom-response field rather than authoring `Other`. If structured input is unavailable, ask the same concise question directly and stop for the answer.

Never ask the developer to validate the research with “does this look correct?” and never ask a preference question that lacks code evidence. The checkpoint must pull new information from the developer.

#### Present the compiled scan and gate the write

Present a scan under 30 lines:

```text
Task: {one-line summary}
Scope: {N files across M layers, K integration points}

{Layer} — {key files and roles}
Integration — {inbound, outbound, and wiring counts; top concern if any}
History — {relevant documents and one evidenced lesson, if any}

Best template: {closest current implementation}
Precedents — {count and top lesson, or git history unavailable}
Inconsistencies: {count and short names}
```

Then ask one gated question: `Scan complete — write the doc, or adjust first?` Offer `Write the doc (Recommended)`, `Add an area`, and `Correct a finding`. Wait for the answer.

Classify the response:

- **Write:** proceed to the document.
- **Correction:** incorporate it, record it in Developer Context, and re-check any dependent finding.
- **New area:** read [Codebase Locator](references/codebase-locator.md) and [Codebase Analyzer](references/codebase-analyzer.md), then dispatch at most those two roles narrowly on the added area. Merge their evidence and record the input in Developer Context.
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
- Code References is a verified jump table.
- Integration Points enumerates inbound consumers, outbound dependencies, and infrastructure wiring.
- Architecture Insights records demonstrated patterns and conventions, not prescriptions.
- Precedents & Lessons records real commits and follow-up evidence, or the explicit no-history fallback.
- Historical Context contains links and one-line scope descriptions, not artifact summaries.
- Developer Context contains every discovery decision and checkpoint answer.
- Open Questions contains only unresolved items, including carried discovery questions. Use `None.` when empty.

Create the parent directory when necessary and write exactly one new artifact. Do not edit product source or another artifact during the initial run.

### 5. Present the handoff and stop

Report:

```text
Research document written to:
`.rpiv/artifacts/research/{filename}.md`

{N} questions answered, {M} findings across {K} files.

Please review and let me know if you have follow-up questions.

---

Follow-up: describe the question in chat to append a timestamped Follow-up Research section to this artifact. Re-run `$rpivc-research` for a fresh artifact.

Next step (choose one):
- `$rpivc-design .rpiv/artifacts/research/{filename}.md` — iterative design with vertical-slice decomposition.
- `$rpivc-blueprint .rpiv/artifacts/research/{filename}.md` — lightweight combined design and phased-plan path for smaller work.

Tip: start a fresh task first; chained skills work best with a clean context window.
```

These successor names are handoffs, not permission to invoke or port them. Stop after presenting the research artifact.

## Follow-up research

When the developer asks a follow-up about the artifact produced in the current task:

1. Keep all prior artifact content immutable.
2. Run `now.mjs` again for a fresh timestamp.
3. Read only the role prompts needed for the new question and dispatch no more than one or two fresh, narrowly scoped agents. Do not repeat the scope tracer or full investigation.
4. Verify new citations and append `## Follow-up Research {ISO 8601 timestamp}` with the new findings.
5. Update only `last_updated`, `last_updated_by`, and `last_updated_note: "Added follow-up research for <brief description>"` in frontmatter.

If the question changes the feature surface or research target materially, do not append. Tell the developer to run `$rpivc-research <new topic>` for a fresh artifact. Never invoke that fresh run automatically.

## Non-negotiable boundaries

- Scope tracer is always the first dispatched role on a fresh run.
- Every analysis and precedent role finishes before synthesis.
- The developer checkpoint and explicit write gate happen before artifact creation.
- No placeholder metadata or unverified line citation enters the document.
- Research describes current behavior; design and implementation are successor stages.
- No successor skill is invoked automatically.
