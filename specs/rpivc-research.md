# `rpivc-research` Unit Specification

Status: accepted by Ryan on 2026-08-19; implementation authorized.

Single-draft revision requested by Ryan on 2026-08-20 after the accepted
three-card candidate passed its two-case baseline. A research run now owns one
review-draft path: **Revise** changes and revalidates those bytes in place, while
**Accept** freezes them. Evaluation evidence proves the path stayed constant and
the validated hash changed; no superseding research files are created.

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
an accepted discovery Feature Requirements Document into a grounded research
artifact suitable for `rpivc-design`.

The unit preserves RPIV's valuable research behavior while adding explicit review
boundaries around scope formation, each agent wave, developer decisions, and the
artifact write:

```text
accepted Feature Requirements Document
  -> artifact and repository-context preflight
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

Invoke the skill manually with exactly one source artifact:

```text
$rpivc-research /absolute/path/to/.rpiv-codex/artifacts/discover/<artifact>.md
```

The explicit invocation and exact artifact path are the human decision to continue
from discovery. No persisted approval record is required.

Before reading target source, the skill must:

1. Run the deterministic discovery preflight, which validates the named Feature
   Requirements Document and emits its complete content for reading.
2. Reject a missing, malformed, non-discovery, or out-of-repository artifact.
3. Require the source artifact to contain the complete discovery sections expected
   by the current discovery contract.
4. Capture the current repository, branch, commit, and working-tree snapshot.
5. Compare that context with the source artifact.
6. If context changed, show the difference and ask **Refresh evidence**, **Continue
   with the disclosed stale boundary**, or **Stop**.
7. Perform no target-source search before Ryan chooses **Run** on the scope-tracer
   card.

The skill inherits these discovery facts without asking Ryan to repeat them:

- Problem, users, goals, non-goals, and success criteria
- Recommended approach
- Decisions and corrections
- Cross-cutting requirements
- Explicit deferrals
- Unresolved open questions
- Source evidence and known evidence gaps

Each inherited decision appears in the research artifact's Developer Context.
Open questions remain open until evidence or a developer answer resolves them.

## Stage 1: Scope tracing

Display one complete `rpivc-scope-tracer` card before target inspection. The card
uses the discovery dispatch protocol and includes the exact prompt, inherited
facts, source artifact, repository context, Luna or Terra model choice, reasoning
level, behavioral permissions, budgets, output schema, and stop condition.

Recommended default:

- Model: `gpt-5.6-terra`
- Reasoning: `high`
- Context: no inherited conversation beyond the displayed JSON envelope
- Behavioral permissions: read, search, and Git-read only
- Child agents: forbidden
- Budget: 5–10 key files, 5–9 anchor slices, 5–9 research questions

The scope tracer must:

1. Read the Feature Requirements Document first.
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

Ryan chooses:

- **Use scope** — allow preparation of the first analysis wave.
- **Revise scope** — edit, add, remove, split, or merge questions before cards are
  displayed. No agent runs automatically.
- **Stop** — preserve the conversation and write no artifact.

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
- Ryan may edit or omit any card.
- A card may contain only approved questions and evidence already available.
- Dependent work receives a later card containing the actual preceding evidence.
- One approved wave never authorizes another wave.
- Stop after three analysis cards total.
- The current runtime permits four direct child threads per parent. Reserve one
  for the scope tracer and plan complete coverage across at most three analysis
  cards.
- Every analysis card spawns a fresh child with `fork_turns: none`, explicit
  `agent_type`, model, and reasoning, no children, and the approved card
  envelope. `agent_type` equals the displayed role.
- A later dependent card names prior cards in `depends_on`, contains their
  returned evidence, receives a separate approval, and consumes one of the
  three analysis-card slots by spawning a fresh child.
- Child reuse, tracer reuse, and dependent cards without a new wave approval
  are forbidden. If complete coverage needs a fourth card,
  return to scope review with **Revise scope**, **Omit group**, or **Stop**.

Use Luna/low only for mechanical enumeration, Terra/high for behavioral research,
and Sol/xhigh only when Ryan accepts a visible reconciliation card for genuinely
difficult conflicting evidence. The initial implementation should not need Sol by
default.

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

1. Verify each cited file exists at the captured revision.
2. Verify every cited line or range is within the file.
3. Use repository-root-relative labels and absolute clickable targets.
4. Prefer live code as current truth and Git history as precedent, not current
   behavior.
5. Cross-reference shared findings, conflicts, and integration points.
6. Exclude recommendations and implementation recipes; research describes the
   system and its constraints.

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
  - /absolute/path/to/discovery-artifact.md
repository: /absolute/path/to/target-repository
branch: main
commit: <commit-or-no-commit>
working_tree_sha256: <snapshot>
created_at: <ISO-8601-with-offset>
topic: <research-topic>
```

Required body:

1. `# Research: <topic>`
2. `## Source Feature` — clickable source artifact and inherited scope summary
3. `## Research Questions` — stable question identifiers and full approved text
4. `## Summary` — direct answers and the system shape
5. `## Coverage Ledger` — each question mapped to status, finding headings, and
   evidence links
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
    - Inherited discovery decisions
    - Research checkpoint answers and corrections
12. `## Evidence Conflicts and Gaps`
13. `## Historical Context` — links only, without pretending old documents are
    current code
14. `## Open Questions` — only genuinely unresolved questions
15. `## Dispatch Ledger` — compact role, model, question coverage, completion,
    incorporation decision, and runtime-attestation reference

The artifact is compressed context for a fresh design task. It must be readable
without the research conversation and must never rely on hidden evaluator state.

After writing, present the clickable artifact, a short result summary, conflicts
and gaps, and **Accept / Revise / Stop**. Until acceptance, it remains the run's
only review draft. A revision edits that same path, reruns the inspector, and
shows the unchanged path with different validated before/after artifact hashes.
Acceptance freezes those bytes, creates no sidecar, and invokes no successor.

## Parity decisions

| RPIV research behavior | Classification | `rpivc-research` treatment |
|---|---|---|
| Free-text or discovery-artifact input | Codex adaptation | First unit requires one manually supplied discovery artifact. Free-text entry can be considered later because the intended pipeline dependency is now available. |
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

- No target inspection or subagent run occurs before the scope-tracer **Run**.
- The scope checkpoint occurs before analysis cards.
- Every dispatched role, model, reasoning level, task name, and question set
  matches its displayed card as far as the observable runtime permits.
- No more than four direct children are created: one tracer and at most three
  fresh analysis children. Every dependent card has its own approval, actual
  dependency evidence, and one remaining analysis-card slot.
- No child agent spawns another child.
- Each approved question appears in the Coverage Ledger exactly once.
- Each Answered question has at least one valid clickable current-code citation.
- Conflicted, Partial, and Unanswered questions remain visible as gaps or open
  questions.
- Discovery decisions survive unchanged into Developer Context.
- Pattern and integration agents run only for matching question shapes.
- Precedent behavior is Git-gated and does not fetch or mutate history.
- Read-only research changes nothing outside the one research artifact.
- A revision changes the validated hash at the same artifact path and never
  creates a second research artifact.
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
4. One two-case baseline completes.
5. Ryan manually exercises one supplied prompt and inspects the artifact.
6. Ryan explicitly accepts or requests revision.

At that checkpoint, `rpivc-design` must not exist. The repository stops with the
research diff and evidence ready for review; no commit is implied unless Ryan asks.
