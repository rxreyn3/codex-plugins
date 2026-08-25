# `rpivc-research` Unit Specification

Status: accepted by Ryan on 2026-08-19; implementation authorized.

Single-draft revision requested by Ryan on 2026-08-20 after the accepted
three-card candidate passed its two-case baseline. A research run now owns one
review-draft path: **Revise** changes and revalidates those bytes in place, while
**Accept** freezes them. Evaluation evidence proves the path stayed constant and
the validated hash changed; no superseding research files are created.

Free-text parity correction requested by Ryan on 2026-08-21. Research accepts a
direct prompt for small or already-understood work as well as an accepted discovery
artifact. Discovery remains optional richer context, not a mandatory toll booth.

Discovery prerequisite: accepted at commit `bc94805`.

Behavioral baseline: RPIV-Pi commit `d0eb55371f622ac524b3355711a482f95feb14d4`.

Primary references:

- [RPIV research skill](/Users/ryan.reynolds/Projects/rpiv-mono/packages/rpiv-pi/skills/research/SKILL.md)
- [RPIV scope tracer](/Users/ryan.reynolds/Projects/rpiv-mono/packages/rpiv-pi/agents/scope-tracer.md)
- [RPIV codebase analyzer](/Users/ryan.reynolds/Projects/rpiv-mono/packages/rpiv-pi/agents/codebase-analyzer.md)
- [RPIV codebase pattern finder](/Users/ryan.reynolds/Projects/rpiv-mono/packages/rpiv-pi/agents/codebase-pattern-finder.md)
- [RPIV integration scanner](/Users/ryan.reynolds/Projects/rpiv-mono/packages/rpiv-pi/agents/integration-scanner.md)
- [RPIV precedent locator](/Users/ryan.reynolds/Projects/rpiv-mono/packages/rpiv-pi/agents/precedent-locator.md)

The commit pin is authoritative. Local links are navigation conveniences for the
currently synchronized RPIV checkout.

## Outcome

Implement one independently invoked, behaviorally read-only Codex skill that turns
a direct research prompt or an accepted discovery Feature Requirements Document
into a grounded research artifact for a separately invoked later stage.

The unit preserves RPIV's valuable research behavior while adding explicit review
boundaries around scope formation, each agent wave, developer decisions, and the
artifact write:

```text
direct prompt OR accepted Feature Requirements Document
  -> deterministic input and repository-context preflight
  -> visible scope-tracer card
  -> Run / Edit / Omit / Stop
  -> review traced questions and proposed grouping
  -> Use scope / Revise scope / Stop
  -> visible analysis cards, maximum three per wave
  -> Run / Edit / Omit / Stop
  -> synthesize and resolve grounded ambiguities
  -> Write artifact / Adjust / Stop
  -> one review-draft research artifact
  -> Accept / Revise / Stop
  -> Accept freezes that one path
  -> stop
```

The skill never invokes `rpivc-design`, writes dispatch or approval sidecars,
changes product source, commits, pushes, or repairs itself.

## Invocation and dependency contract

Invoke the skill manually with exactly one input:

```text
$rpivc-research <non-empty research prompt>
$rpivc-research /absolute/path/to/.rpiv-codex/artifacts/discover/<artifact>.md
```

The explicit invocation is the human decision to start research. No persisted
approval record is required.

Before reading target source, the skill must:

1. Run the deterministic research-input preflight, which accepts non-empty free
   text or validates and emits one named discovery artifact. The invoked skill
   content is already loaded, so preflight is the first command; no earlier
   command rereads `SKILL.md`, reads the discovery artifact, or combines either
   read with another operation.
2. Treat path-shaped input as an artifact attempt. Reject relative, missing,
   malformed, non-discovery, or out-of-repository artifact paths instead of
   silently researching the path text.
3. In discovery mode, require the complete discovery sections expected by the
   current discovery contract and compare its repository context with the current
   checkout.
4. In prompt mode, preserve the prompt verbatim as authoritative scope and capture
   current repository context without requiring a discovery artifact.
5. If discovery context changed, show the difference and ask **Refresh evidence**,
   **Continue with the disclosed stale boundary**, or **Stop**.
6. Perform no target-source search before Ryan chooses **Run** on the scope-tracer
   card.

Only discovery mode inherits these facts without asking Ryan to repeat them:

- Problem, users, goals, non-goals, and success criteria
- Recommended approach
- Decisions and corrections
- Cross-cutting requirements
- Explicit deferrals
- Unresolved open questions
- Source evidence and known evidence gaps

Each inherited decision appears in the research artifact's Developer Context.
Open questions remain open until evidence or a developer answer resolves them.
Prompt mode invents none of these fields and records that no discovery decisions
were supplied.

## Stage 1: Scope tracing

Display one complete `rpivc-scope-tracer` card before target inspection. The card
uses the dispatch protocol and identifies its input mode. It includes either the
exact direct prompt or the validated artifact and inherited facts, plus repository
context, Luna or Terra model choice, reasoning level, behavioral permissions,
budgets, output schema, and stop condition.

The card copies `repository`, `branch`, `commit`, and `working_tree_sha256`
literally from the authoritative preflight or refreshed context snapshot. It
contains exactly one `working_tree_sha256` key with that snapshot's 64-character
hexadecimal value. A hash of file names, Git status, or any other approximation
is invalid.

Recommended default:

- Model: `gpt-5.6-terra`
- Reasoning: `medium`
- Context: no inherited conversation beyond the displayed JSON envelope
- Behavioral permissions: read, search, and Git-read only
- Child agents: forbidden
- Budget: 5–10 key files, 5–9 anchor slices, 5–9 research questions

The scope tracer must:

1. In discovery mode, read the Feature Requirements Document first; in prompt mode,
   begin from the exact direct prompt without assuming a missing document.
2. Decompose the topic into narrow capability or seam slices.
3. Sweep anchor terms sequentially.
4. Rank canonical definitions, cross-slice files, entry points, interfaces, and
   wiring files.
5. Read no more than ten ranked files for depth.
6. Produce a Discovery Summary and 5–9 numbered trace-quality questions inline.
7. Put the canonical definition first in each question's citations.
8. Reference at least three concrete artifacts per question.
9. Answer none of the questions and write no file.

**Omit** runs no tracer. Research may continue only if Ryan supplies replacement
questions meeting the same schema; otherwise the skill stops. This keeps Omit a
real choice rather than a decorative button.

### Scope checkpoint

After the tracer returns, present:

- A compact Discovery Summary
- The numbered questions
- Shared files and question overlap
- Proposed groups of at most three related questions
- Evidence gaps or malformed citations
- A proposed specialist for each group

These are five mandatory tracer sections. The response contains 5–9 explicitly
numbered unanswered questions with at least three repository artifact citations
per question, and the proposed plan maps every question exactly once. The tracer
self-checks that schema before returning; a plan without the numbered questions
is not an approvable checkpoint.

The displayed plan must already fit the runtime: no more than three analysis
groups. Fold related Git precedent into the same current-behavior group and use
pattern or integration specialists as substitutions rather than additions.
Never display an infeasible four-card plan and silently regroup it after Ryan's
response.

Ryan chooses:

- **Use scope** — allow preparation of the first analysis wave.
- **Revise scope** — edit, add, remove, split, or merge questions before cards are
  displayed. No agent runs automatically.
- **Stop** — preserve the conversation and write no artifact.

**Use scope** does not authorize analysis. Its response displays the complete
first-wave YAML cards, asks **Run / Edit / Omit / Stop**, and ends without source
inspection, dispatch, synthesis, scan preparation, or artifact writing. Only the
subsequent **Run** authorizes dispatch of those exact cards.

## Stage 2: Targeted research

Select the smallest roster justified by the approved question shapes. Available
roles are an inventory, not a mandatory fan-out checklist.

| Role | Use when | Do not use when |
|---|---|---|
| `rpivc-codebase-analyzer` | A question requires behavioral or data-flow tracing through concrete code. This is the default RPIV research role. | Location or connection enumeration alone answers the question. |
| `rpivc-codebase-pattern-finder` | A question explicitly compares established implementations, conventions, or tests. | A general analyzer can answer without a separate pattern sweep. |
| `rpivc-integration-scanner` | A bounded question requires an exhaustive inbound, outbound, registration, event, job, or configuration map. | Deep implementation analysis is the actual need. |
| `rpivc-precedent-locator` | Git history exists and similar changes or follow-up fixes could affect the design. | The workspace has no usable Git history or no credible search anchors. |

The pinned RPIV skill normally uses grouped codebase analyzers plus a Git-gated
precedent sweep. Pattern and integration roles are Codex-native substitutions for
questions whose shape matches their narrower contracts; they must not be spawned
merely because their definitions exist.

External web research is deferred from this first unit. RPIV conditionally uses a
web researcher for external surfaces the repository does not already use, but
network evidence, source policy, and evaluation fixtures need their own reviewed
contract. When an approved question reaches that boundary, record it as an
evidence gap instead of improvising a web agent.

### Grouping and wave rules

- Group two or three questions only when they share at least two file references
  or one clearly continuous code path.
- Keep unrelated questions separate even when batching would be cheaper.
- Dispatch at most three independent cards in one wave.
- Show every complete card before the wave.
- Refresh context before constructing the cards. If it changes after display,
  redisplay every complete refreshed YAML card before requesting another
  **Run**; a card summary is not an approval surface.
- Ryan may edit or omit any card.
- A card contains the full literal text of each assigned approved question and
  only evidence already available. Question numbers, ranges, and paraphrases do
  not transport the approved clauses.
- Dependent work receives a later card containing the actual preceding evidence.
- One approved wave never authorizes another wave.
- Stop after three analysis cards total.
- The current runtime permits four direct child threads per parent. Reserve one
  for the scope tracer and plan complete coverage across at most three analysis
  cards.
- Every analysis card spawns a fresh child with `fork_turns: none`, explicit
  `agent_type`, model, and reasoning, no children, and the approved card
  envelope. `agent_type` equals the displayed role.
- Dispatch uses native `collaboration.spawn_agent` directly, never a deferred
  adapter inside `functions.exec`. The direct call carries exact `agent_type`,
  `task_name`, `fork_turns: none`, model, reasoning, and approved envelope.
- Independent cards are all spawned before waiting so the approved wave runs in
  parallel. The parent calls native `collaboration.wait_agent` with a 600-second
  interval until completion notifications account for every authorized child.
  The current wait schema has no target argument or keyed status map. A timeout
  is retried only while an authorized child remains live; it never authorizes a
  replacement child or early synthesis.
- A later dependent card names prior cards in `depends_on`, contains their
  returned evidence, receives a separate approval, and consumes one of the
  three analysis-card slots by spawning a fresh child.
- Child reuse, tracer reuse, and dependent cards without a new wave approval
  are forbidden. If complete coverage needs a fourth card,
  return to scope review with **Revise scope**, **Omit group**, or **Stop**.
- The parent validates the tracer's five headings, question count, concrete
  citation coverage, exact group coverage, and smallest feasible roster before
  offering **Use scope**. It never replaces an invalid tracer result with
  parent-authored questions or a plan. An invalid tracer stops before analysis.
- A same-file Git-history question stays in the current-behavior analyzer group;
  it does not justify a standalone precedent child by itself.

Runtime profiles are fixed by specialist role: analyzer and pattern finder use
Terra/high; integration scanner and precedent locator use Luna/low. Verify each
displayed role/model/reasoning triple before requesting **Run**. Sol/xhigh is
available only when Ryan accepts a visible reconciliation card for genuinely
difficult conflicting evidence. The initial implementation should not need Sol
by default.

### Runtime evidence

Reuse discovery's safe runtime-attestation mechanism. For each approved card,
retain:

- Fresh-child dispatch
- Displayed-card hash
- Opaque child-transport hash and byte count
- Requested role, task name, model, and reasoning
- Child task identifier
- Effective model, reasoning, sandbox, and approval policy
- Completion status and output hash
- Nested-spawn count

Do not retain prompt or output plaintext in the attestation. Do not claim exact
prompt equality while Codex exposes only encrypted child payloads.

## Stage 3: Synthesis and developer checkpoint

The parent reconciles returned evidence; children do not write the artifact.

For every approved question, classify the answer as:

- **Answered** — supported by verified current-code citations
- **Partially answered** — supported findings plus a named missing boundary
- **Conflicted** — credible sources disagree
- **Unanswered** — evidence unavailable within the approved scope

Before presenting conclusions:

1. Treat question wording as a hypothesis, not proof, and split every question
   into its named clauses.
2. Mark a question Answered only when every clause has direct evidence; preserve
   missing or contrary clauses as Partial, Conflicted, or Unanswered.
3. Verify each cited file exists at the captured revision.
4. Verify every cited line or range is within the file.
5. Use repository-root-relative labels and absolute clickable targets.
6. Prefer live code as current truth and Git history as precedent, not current
   behavior.
7. Cross-reference shared findings, conflicts, and integration points.
8. Exclude recommendations and implementation recipes; research describes the
   system and its constraints.

A terminal child payload that omits its required clause matrix or answers a
different task is retained as an evidence gap, not retried under the same
approval. Mark its exclusively assigned clauses Unanswered and continue the
already-approved turn into synthesis. Do not silently repair the child, ask for
duplicate synthesis authorization, or end on a bare acknowledgement.

Ask a developer question only when the answer adds information evidence cannot
supply. Every question must include observable findings, clickable evidence, why
the decision matters, and two to four concrete choices where choices exist.
Independent questions may be presented in one small checkpoint; dependent ones
remain sequential.

Never ask Ryan to confirm facts the repository already proves. The code has enough
ways to waste a person's afternoon without the workflow adding ceremonial trivia.

After ambiguities are handled, present a compiled scan of at most 30 lines:

- Task and scope
- Layers and key files
- Integration shape
- Best matching pattern
- Relevant precedents
- Conflicts, gaps, and unresolved questions
- Coverage count by Answered, Partial, Conflicted, and Unanswered

Before display, pass the complete draft scan on standard input to the read-only
`artifact-check.mjs prepare-research-scan` command using a complete quoted
heredoc; a bare invocation is invalid. It canonicalizes local citation labels,
validates targets and line bounds, rejects evidence ranges wider than 15 lines,
rejects more than one current-code citation on a rendered line,
and returns the exact
numbered source excerpt for every citation. Compare each claim with its returned
excerpt; correct the claim or citation and rerun when the cited lines do not
directly support it. Use one behavior and exactly one citation per evidence
bullet; split multi-range support into separate independently supported bullets.
Present the returned `normalized_markdown` without manual
label edits or widened or joined ranges. Scan preparation creates no artifact
and has no two-invocation limit; repair deterministic preparation failures and
rerun until it passes or evidence is unavailable. It aggregates all detectable
citation defects into one correction set, which the parent repairs together
before one rerun. The two-invocation ceiling
begins only after **Write artifact**, when artifact inspection starts.

After inspecting the JSON excerpts, pass the exact final draft through the
read-only `artifact-check.mjs render-research-scan` command. It repeats the
deterministic checks and prints only canonical Markdown. Present that output
byte-for-byte and append only the write gate; do not reconstruct paths or labels
from the longer JSON result.

The accepted `normalized_markdown` is the complete current-code evidence
inventory for the artifact. Artifact prose may reorganize verified pairs and add
uncited scope or status text, but every current-code factual claim and citation
must be copied together verbatim from that inventory. Missing evidence produces
a Partial or Unanswered clause, not a fresh citation copied from child output.

Ryan chooses **Write artifact**, **Adjust**, or **Stop**. The skill writes nothing
before **Write artifact**.

## Research artifact contract

Write exactly one new file:

```text
.rpiv-codex/artifacts/research/<timestamp>_<topic>.md
```

Frontmatter:

```yaml
stage: research
status: review
rpiv_source: packages/rpiv-pi/skills/research/SKILL.md
rpiv_commit: d0eb55371f622ac524b3355711a482f95feb14d4
supersedes: null
source_artifacts:
  - .rpiv-codex/artifacts/discover/example.md # discovery mode; [] in prompt mode
repository: /absolute/path/to/target-repository
branch: main
commit: <commit-or-no-commit>
working_tree_sha256: <snapshot>
created_at: <ISO-8601-with-offset>
topic: <research-topic>
```

Required body:

1. `# Research: <topic>`
2. `## Source Feature` — a Markdown link to the exact validated absolute
   discovery artifact plus inherited scope, or the exact direct prompt
3. `## Research Questions` — stable question identifiers and full approved text
4. `## Summary` — direct answers and the system shape
5. `## Coverage Ledger` — each question mapped once to status, every named
   clause, finding headings, and direct evidence links
6. `## Detailed Findings` — organized by component or behavior
7. `## Code References` — concise planner jump table
8. `## Integration Points`
   - Inbound references
   - Outbound dependencies
   - Infrastructure wiring
9. `## Architecture Insights` — observed patterns and constraints, not a design
10. `## Precedents & Lessons` — commits, blast radius, follow-up fixes, and
    composite lessons, or an explicit evidence-backed reason no precedent ran
11. `## Developer Context`
    - Inherited discovery decisions, or an explicit statement that none were supplied
    - The explicit sentence: `External web research is deferred from this research unit.`
    - Research checkpoint answers and corrections
12. `## Evidence Conflicts and Gaps`
13. `## Historical Context` — plain Git commit identifiers that resolve to
    commits in the current repository, plus only verified links to real local
    files, without pretending old documents are current code or inventing
    `.git/commit/<sha>` paths. The declared external `rpiv_commit` source pin is
    exempt from local resolution.
    A current-file citation proves current behavior only; claims that behavior
    was introduced, inherited, or changed in Git use a separate history bullet
    with a verified plain commit identifier.
14. `## Open Questions` — only genuinely unresolved questions
15. `## Dispatch Ledger` — compact role, model, question coverage, completion,
    incorporation decision, and runtime-attestation reference

The artifact is compressed context for a fresh design task. It must be readable
without the research conversation and must never rely on hidden evaluator state.

After writing or revising, run the deterministic citation normalizer once. It
derives repository-relative labels and colon-style line targets from the
artifact's existing verified absolute targets; it does not invent evidence.
The initial draft permits at most two inspector invocations. A first failure may
be corrected once and normalized again; a second failure stops the workflow
immediately. A third inspection attempt is forbidden.

After writing, present the clickable artifact, a short result summary, conflicts
and gaps, and **Accept / Revise / Stop**. Until acceptance, it remains the run's
only review draft. A revision edits that same path, reruns the inspector, and
shows the unchanged path with different validated before/after artifact hashes.
Acceptance freezes those bytes, creates no sidecar, and invokes no successor.

## Parity decisions

| RPIV research behavior | Classification | `rpivc-research` treatment |
|---|---|---|
| Free-text or discovery-artifact input | Preserve | Accept either one non-empty direct prompt or one validated absolute discovery artifact path. |
| Read discovery decisions and open questions | Preserve | Inherit them into Developer Context and Open Questions without re-interviewing. |
| Scope tracer before analysis | Preserve | One visible, approved `rpivc-scope-tracer` card runs first. |
| Discovery Summary plus 5–9 dense questions | Codex adaptation | Keep definition-first citations and bounded file reads while fitting complete coverage into three analysis cards. |
| Group questions by overlap | Preserve | Group two or three related questions and expose the grouping for review. |
| Concurrent targeted analysis | Codex adaptation | Maximum three cards total; later dependent waves require separate approval and fresh children within the same total. |
| Codebase analyzer as default | Preserve | Use for behavioral and data-flow questions. |
| Pattern and integration specialists | Codex adaptation | Substitute only for questions matching their narrower contracts; never default fan-out. |
| Git-gated precedent sweep | Preserve | Run only with credible anchors and usable Git history; otherwise record why it was omitted. |
| External web researcher | Deferred | Define network evidence and evaluation policy as a separate later capability. |
| Verified repository-root-relative citations | Preserve | Verify targets and render clickable absolute links with relative labels. |
| Grounded developer ambiguities | Preserve | Ask only questions that pull new information; expose a conversational checkpoint. |
| Compiled scan before write | Preserve | Require **Write artifact / Adjust / Stop**. |
| Comprehensive research document | Preserve | Add an explicit coverage ledger and evidence-gap section for reviewability. |
| Automatic design or blueprint suggestions | Intentionally omitted | Stop after the research artifact gate; Ryan manually invokes the next skill. |
| Append-in-place follow-up research | Codex adaptation | Revise the single review draft in place, revalidate it, and freeze it only on acceptance. |
| Pi argument expansion, workflow contracts, and automatic chaining | Intentionally omitted | Native invocation and conversational state replace Pi machinery. |

## Future implementation shape

Only after Ryan approves this specification, create:

```text
.agents/skills/rpivc-research/
  SKILL.md
  agents/openai.yaml
  references/research-contract.md
  assets/research-template.md

.codex/agents/
  rpivc-scope-tracer.toml
  rpivc-codebase-pattern-finder.toml
  rpivc-integration-scanner.toml
  rpivc-precedent-locator.toml

evals/research/
  cases.yaml
  promptfooconfig.yaml
  provider.mjs
  assertions.mjs
  rubrics/contract-and-evidence.md
  rubrics/interaction-and-parity.md
```

Reuse the existing `rpivc-codebase-analyzer` definition and shared artifact,
snapshot, link, workspace, and runtime-attestation helpers. Do not copy discovery
logic merely to change a stage name.

No file in that implementation shape is created at the specification checkpoint.

## Evaluation and acceptance

Promptfoo begins with two synthetic, one-pass cases:

### Narrow research path

- Supplies a complete accepted discovery fixture for one brownfield seam.
- Requires one scope tracer and the smallest justified analysis roster.
- Exercises question review, a grounded developer checkpoint, one final artifact,
  and final acceptance.
- Fails on redundant questions, mandatory fan-out, unverified citations,
  implementation advice, or successor invocation.

### Cross-cutting integration path

- Supplies a discovery fixture spanning behavior, integration wiring, and history.
- Requires visible grouping and at least two independently approved waves when a
  dependent card needs returned evidence.
- Exercises analyzer, integration or pattern substitution, precedent lookup,
  dependent-card gating, conflict handling, runtime attestation, and complete
  question coverage without exceeding four total direct children.
- Fails when a later card references future evidence, a question disappears, or
  automated success hides an unresolved approved outcome.

Deterministic checks must prove:

- Prompt mode requires no discovery artifact, preserves the exact prompt in the
  scope card and output, and writes `source_artifacts: []`.
- Discovery mode completes deterministic preflight before target inspection and
  preserves its source lineage and inherited decisions.
- Invalid path-shaped input stops instead of falling back to prompt mode.
- No target inspection or subagent run occurs before the scope-tracer **Run**.
- The scope checkpoint occurs before analysis cards.
- Every dispatched role, model, reasoning level, task name, and question set
  matches its displayed card as far as the observable runtime permits.
- Every displayed or refreshed card has one exact authoritative context snapshot;
  a malformed, duplicate-key, summarized, or approximated card cannot authorize
  dispatch.
- No more than four direct children are created: one tracer and at most three
  fresh analysis children. Every dependent card has its own approval, actual
  dependency evidence, and one remaining analysis-card slot.
- No child agent spawns another child.
- Each approved question appears in the Coverage Ledger exactly once.
- Each Answered question has at least one valid clickable current-code citation.
- Local citation targets use `:line` or `:start-end`; GitHub-style `#L`
  fragments are invalid. Inspection reports all Markdown-link defects in one
  invocation so the single permitted correction sees the complete set.
- One enclosing Markdown code-span pair around a citation label is presentation
  markup; after it is removed, the label must exactly match the
  repository-relative path and target line or range.
- Conflicted, Partial, and Unanswered questions remain visible as gaps or open
  questions.
- Discovery decisions survive unchanged into Developer Context.
- Pattern and integration agents run only for matching question shapes.
- Precedent behavior is Git-gated and does not fetch or mutate history.
- Read-only research changes nothing outside the one research artifact.
- A revision changes the validated hash at the same artifact path and never
  creates a second research artifact.
- Initial draft inspection stops after a second failed invocation.
- No dispatch or approval sidecars are written.
- No `rpivc-design` files, prompts, invocations, or routing instructions appear.

Both agent graders receive raw fixture inputs, turns, cards, attestations, source
artifacts, and output artifacts without the intended diagnosis. One baseline runs
once and stops; failed evaluation does not repair or rerun the skill.

## Manual review checkpoint

The implementation unit is complete only after:

1. Structural skill validation passes.
2. Product contract tests pass.
3. Promptfoo configuration validation passes.
4. One three-case baseline completes: direct prompt, discovery-backed narrow, and
   discovery-backed cross-cutting revision.
5. Ryan manually exercises one supplied prompt and inspects the artifact.
6. Ryan explicitly accepts or requests revision.

At that checkpoint, `rpivc-design` must not exist. The repository stops with the
research diff and evidence ready for review; no commit is implied unless Ryan asks.
