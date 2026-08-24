# RPIV-Codex Parity Port — Revised Plan

## Summary

Build `rpiv-codex` as independently invoked Codex skills preserving RPIV’s standalone pipeline:

```text
rpivc-discover
  → rpivc-research
  → rpivc-design
  → rpivc-plan
  → rpivc-implement
  → rpivc-validate
  → rpivc-code-review
```

`rpivc-revise` remains an explicit corrective branch from planning, implementation, validation, or code-review feedback.

The port preserves RPIV’s workflow behavior while replacing automatic orchestration with lightweight conversational gates:

```text
propose action
  → Ryan chooses Run / Edit / Omit
  → perform only the accepted action
  → produce one review artifact
  → Ryan chooses Accept / Revise / Stop
  → stop
```

No separate approval skill, dispatch artifact, approval record, resume command, automatic successor selection, or hidden workflow state is required.

Use:

- Skill prefix: `rpivc-`
- Artifact root: `.rpiv-codex/`
- Behavioral baseline: RPIV commit `d0eb55371f622ac524b3355711a482f95feb14d4`
- Explicit skill invocation only.
- One implementation unit at a time, followed by Ryan’s manual test and decision.
- Historical dispatch, approval, and discovery artifacts from the superseded design are deleted at Ryan’s explicit request.

Codex skills can be instruction-only and explicitly invoked; deterministic scripts remain optional helpers rather than required approval machinery. [Official OpenAI skill documentation](https://developers.openai.com/codex/skills/)

## Changes From the Original Plan

| Original design | Revised design |
|---|---|
| Public `rpivc-approve` skill | Remove from the normal workflow |
| Dispatch manifest file before every agent | Show the complete agent card directly in chat |
| Hash-bound approval record | Explicit conversational **Run / Edit / Omit** decision |
| Resume with manifest and approval paths | Continue naturally in the same conversation |
| Final artifact approval record | **Accept / Revise / Stop** conversational checkpoint |
| Hard rejection when repository context changes | Show the change and ask **Refresh / Continue / Stop** |
| Paths rendered as backtick code | Human-facing Markdown links |
| Long dispatch-ledger tables | Compact linked lists |
| Claimed child-specific read-only enforcement | Disclose inherited runtime sandbox separately from behavioral permissions |
| Audit-grade approval by default | Optional future strict mode only if a real need emerges |

## Repository Layout

```text
.agents/skills/
  rpivc-discover/
  rpivc-research/
  rpivc-design/
  rpivc-plan/
  rpivc-revise/
  rpivc-implement/
  rpivc-validate/
  rpivc-code-review/
  _shared/

.codex/agents/
  rpivc-codebase-locator.toml
  rpivc-codebase-analyzer.toml
  rpivc-codebase-pattern-finder.toml
  rpivc-integration-scanner.toml
  rpivc-scope-tracer.toml
  rpivc-precedent-locator.toml
  rpivc-slice-verifier.toml
  rpivc-artifact-code-reviewer.toml
  rpivc-artifact-coverage-reviewer.toml
  rpivc-diff-auditor.toml
  rpivc-peer-comparator.toml
  rpivc-claim-verifier.toml
```

Every skill receives:

- `SKILL.md`
- Generated `agents/openai.yaml`
- Only the references, templates, and scripts it actually needs

Shared deterministic helpers may provide:

- Repository and working-tree context collection
- Timestamped artifact paths
- Artifact schema validation
- Working-tree comparison
- Clickable-link formatting where repetition justifies it

There is no approval-record writer or workflow runner.

## Artifacts and Lineage

New workflow runs write only meaningful stage results:

```text
.rpiv-codex/
  artifacts/
    discover/<timestamp>_<topic>.md
    research/<timestamp>_<topic>.md
    design/<timestamp>_<topic>.md
    plan/<timestamp>_<topic>.md
    revise/<timestamp>_<topic>.md
    implement/<timestamp>_<topic>_phase-<n>.md
    validate/<timestamp>_<topic>.md
    code-review/<timestamp>_<topic>.md
```

The superseded `.rpiv-codex/dispatch/`, `.rpiv-codex/approvals/`, and discovery artifacts are removed. New runs do not recreate those auxiliary directories.

Common frontmatter:

```yaml
stage: discover
status: review
rpiv_source: packages/rpiv-pi/skills/discover/SKILL.md
rpiv_commit: d0eb55371f622ac524b3355711a482f95feb14d4
supersedes: null
source_artifacts: []
repository: /absolute/repository/path
branch: main
commit: ...
working_tree_sha256: ...
created_at: ...
```

`status: review` describes the artifact’s lifecycle, not a persisted approval state. The artifact remains immutable after presentation.

If Ryan requests changes, the skill writes a new timestamp-distinct artifact with `supersedes:` pointing to the prior version.

## Clickable Path Contract

Every path intended for human navigation must be a Markdown link.

Chat responses use absolute Codex-compatible targets:

```md
[Feature Requirements Document](/Users/ryan.reynolds/Projects/rpiv-codex/.rpiv-codex/artifacts/discover/example.md)
```

Repository evidence includes clickable line locations:

```md
[artifact-check.mjs:94](/Users/ryan.reynolds/Projects/rpiv-codex/.agents/skills/_shared/scripts/artifact-check.mjs:94)
```

Rules:

- Use a concise repository-relative path or descriptive name as the link label.
- Use the absolute local path as the link target.
- Do not wrap navigable paths in backticks.
- Frontmatter may retain plain machine-readable paths.
- Repeat useful frontmatter lineage as clickable links in the document body.
- Avoid putting long paths inside tables.

Dispatch history should use compact lists:

```md
## Dispatch Ledger

- `rpivc-codebase-locator` — completed; evidence incorporated
  - Purpose: locate the artifact inspection entry point
  - Model: Luna, low reasoning
  - [Relevant evidence](...)
```

## Conversational Human Gates

### Agent dispatch gate

Before any subagent runs, the active skill displays the complete proposed card:

```yaml
id: D1
dispatch_protocol: rpivc-dispatch/v1
task_name: d1_codebase_locator
role: rpivc-codebase-locator
purpose: Locate artifact inspection entry points
prompt: <exact prompt>
inputs:
  - captured feature intent
model: gpt-5.6-luna
reasoning: low

sandbox_request: read-only
sandbox_enforcement: inherited-parent
behavioral_permissions:
  - read
  - search
  - git-read
child_agents: forbidden

budget:
  max_files: 10
  max_findings: 12

expected_evidence: repository-relative file:line locations
stop_when: relevant locations are ranked or the boundary is reached
```

Ryan chooses:

- **Run** — dispatch exactly the displayed card.
- **Edit** — Ryan changes any field; the skill presents the revised card before dispatch.
- **Omit** — do not run that role.
- **Stop** — end the stage without dispatch.

The response authorizes only the displayed cards. It does not authorize later agents or another wave.

The displayed card is the authoritative Codex role instance. An initial dispatch uses `agent_type` equal to its displayed role, its `task_name`, explicit model and reasoning arguments, `fork_turns: none`, and a JSON envelope containing the card. Research may later send a separately approved dependent card to the same completed role-and-runtime profile; that follow-up retains the task name and effective settings instead of requesting a new child. Evaluation captures either dispatch and the child lifecycle before Promptfoo sanitization, then resumes the persisted evaluation child to verify its originating role, effective model, reasoning, inherited sandbox, completion, output, and absence of nested spawns. Codex encrypts the child payload before protocol evidence exposes it, so the evaluator records the displayed-card hash and opaque transport hash separately; it does not claim byte-for-byte plaintext prompt verification.

### Dependent dispatches

If an analyzer depends on locator output:

```text
show locator card
  → Run
  → locator returns actual anchors
  → show analyzer card containing those anchors
  → Run / Edit / Omit
```

An analyzer card may never refer to future or placeholder evidence.

### Final artifact gate

After writing the stage artifact, the skill presents:

- A clickable artifact link
- A short summary
- Important decisions
- Evidence gaps or unresolved questions
- Repository-context changes, if any

Ryan chooses:

- **Accept** — finish the stage.
- **Revise** — discuss the correction and produce a new immutable artifact.
- **Stop** — preserve the artifact but take no further action.

Acceptance does not write another file.

The next skill must still be invoked manually with the exact artifact path. That invocation is itself an explicit decision to continue.

### Mutation gate

`rpivc-implement` receives a stronger conversational gate before changing source:

```text
Phase scope
Files allowed to change
Existing dirty files
Planned checks
Known risks
```

Ryan chooses **Begin**, **Edit scope**, or **Stop**.

The decision authorizes only that phase invocation. It does not authorize later phases, commits, pushes, or external actions.

## Repository Context Changes

Artifacts retain repository, branch, commit, and working-tree snapshot information for traceability.

A downstream skill compares current context with the source artifact:

- If unchanged, continue.
- If changed, summarize what changed and ask:
  - **Refresh evidence**
  - **Continue with the disclosed stale boundary**
  - **Stop**

Continuing records the accepted evidence limitation in the next artifact.

Context changes no longer require regenerating approval records or navigating a chain of hash-bound files.

## Controlled Subagent Model

Rules:

- Every role, prompt, input, model, reasoning level, behavioral permission, budget, evidence contract, and stop condition is visible before dispatch.
- Ryan may edit or omit any role.
- Maximum three genuinely independent agents per wave.
- Dependent agents receive separate later gates.
- Agents receive no inherited conversation beyond the explicitly named inputs.
- Agents may not spawn children.
- Agents may not silently request replacement or follow-up agents.
- Actual runtime sandbox and behavioral compliance are different facts.
- The current collaboration runtime may inherit the parent sandbox; the workflow must not claim technical read-only enforcement.
- Research and review agents remain behaviorally read-only.
- Final artifacts record what ran, what returned, and what evidence was incorporated or excluded.

Defaults:

- Luna/low: location and mechanical enumeration.
- Terra/high: behavioral tracing, research, pattern analysis, and artifact review.
- Sol/xhigh: difficult reconciliation, claim verification, or security analysis.

## Skill Behavior

| Skill | RPIV parity and Codex-native gate |
|---|---|
| `rpivc-discover` | Preserve intent-before-evidence, adaptive locator/analyzer probing, lazy decision tree, evidence pre-resolution, dialectic trade-offs, corrections, cross-cutting requirements, anti-rescoping, explicit deferrals, and the complete Feature Requirements Document. Agent cards use conversational gates. Finish with **Accept / Revise / Stop** and never invoke research automatically. |
| `rpivc-research` | Preserve scope-tracer questions, grouped targeted research, precedents, verified citations, ambiguity handling, Developer Context inheritance, and synthesis. Gate the scope tracer and each resulting independent research wave conversationally. |
| `rpivc-design` | Preserve targeted research, ambiguity sweep, architecture checkpoint, vertical slices, code and success criteria, slice verification, and per-slice review. Gate research and verifier rosters separately. |
| `rpivc-plan` | Preserve one-to-one slice-to-phase mapping, unchanged criteria, code-bearing phased plans, and independent code and coverage review. Present reviewer cards before dispatch and triage findings before the final plan artifact. |
| `rpivc-revise` | Apply surgical feedback while preserving passing content and valid phase boundaries. Produce a new artifact with `supersedes:` and finish with **Accept / Revise / Stop**. |
| `rpivc-implement` | Consume a manually supplied plan and implement exactly one phase per invocation. Show dirty baseline, write scope, risks, and checks before **Begin / Edit / Stop**. Produce a linked implementation log and diff summary. No implementation subagents initially. |
| `rpivc-validate` | Preserve phase-by-phase and whole-plan verification, pattern checks, command evidence, deviations, and pass/fail verdict. Missing approved outcomes still fail validation even when automated tests pass. |
| `rpivc-code-review` | Preserve file discovery, integration, precedent and peer analysis, quality and security lenses, interaction sweeps, coverage arithmetic, claim verification, and removal of falsified findings. Gate every dependent agent wave. Apply no fixes. |

Manual correction loop:

```text
code-review blocker
  → manually invoke rpivc-revise
  → accept revised plan
  → manually invoke rpivc-implement for one corrective phase
  → manually invoke rpivc-validate
  → manually invoke rpivc-code-review
```

Completion requires:

- A passing validation artifact
- A code-review artifact with no unwaived blockers
- Ryan’s explicit **Finish** decision

Nothing commits or pushes automatically.

## Incremental Implementation Order

### 1. Discovery simplification and correction — accepted

Completed and accepted at commit `bc94805` after the two-case Promptfoo baseline,
runtime subagent attestation, contract tests, and manual review.

Update only the existing discovery vertical unit:

- Remove `rpivc-approve` from the public workflow.
- Replace approval-record and resume-path behavior with conversational gates.
- Stop writing new dispatch and approval artifacts.
- Delete the historical dispatch, approval, and discovery artifacts as explicitly requested.
- Retain context collection and artifact preflight under neutral helper names.
- Remove approval-writing and approval-verification behavior that no longer has a consumer.
- Make all presented artifact, lineage, and `file:line` references clickable.
- Replace long ledger tables with linked lists.
- Preserve adaptive zero/one/two-agent discovery.
- Preserve truthful sandbox disclosure.
- Update deterministic product tests and the Promptfoo discovery cases.
- Run one Promptfoo baseline and stop for Ryan’s review and decision. Completed.

The discovery checkpoint is closed. No research implementation was included in it.

### 2. Research — free-text parity validation in progress

The accepted unit contract is [the `rpivc-research` specification](/Users/ryan.reynolds/Projects/rpiv-codex/specs/rpivc-research.md). Ryan accepted it on 2026-08-19, including the external-web deferral. Implementation remains bounded to this independently reviewable unit.

- Add `rpivc-research`.
- Add scope-tracer, pattern, integration, precedent, and analysis specialists.
- Accept a direct research prompt or one accepted discovery artifact.
- Test conversational scope-tracer and research-wave gates.
- Test Feature Requirements Document decision inheritance.
- Stop for manual review.

Stop after the one-shot evaluation and manual review evidence. Do not implement `rpivc-design`.

The first research baseline ran once on 2026-08-19 and passed 1/2 cases. The narrow case exposed omitted explicit model/reasoning spawn arguments plus two deterministic evaluator defects. Those bounded corrections were applied. Ryan separately authorized a fresh baseline on 2026-08-20; it again passed 1/2, with the narrow case fully passing and the cross-cutting case stopping when the fifth direct child was rejected by the runtime's four-child ceiling.

The three-card candidate's 2026-08-20 baseline passed 2/2. Ryan then rejected timestamp-distinct research files for minor revisions because they force downstream consumers to resolve lineage. Research now creates one review draft, edits and revalidates that same path on **Revise**, and freezes it on **Accept**. Ryan subsequently rejected the discovery-only entry contract because small research tasks must not require a Feature Requirements Document. The parity correction accepts either a direct prompt or one accepted discovery artifact. A fresh three-case baseline covers direct-prompt, discovery-backed narrow, and cross-cutting revision behavior.

### 3. Design

- Add `rpivc-design` and slice verifier.
- Test ambiguity checkpoints, conserved coverage, slice atomicity, and per-slice review.
- Stop for manual review.

### 4. Plan

- Add `rpivc-plan` and both artifact reviewers.
- Test slice-to-phase mapping, unchanged criteria, reviewer triage, and cross-phase coherence.
- Stop for manual review.

### 5. Revise

- Add surgical immutable plan revision with `supersedes:` lineage.
- Stop for manual review.

### 6. Implement

- Add one-phase mutation.
- Add dirty-baseline fencing and declared write-scope enforcement.
- Add the conversational mutation gate and implementation log.
- Stop for manual review.

### 7. Validate

- Add final goal and plan verification with command evidence.
- Stop for manual review.

### 8. Code review

- Add approved conversational review waves and adversarial claim verification.
- Stop for manual review.

No later unit is scaffolded early.

## Test Plan

### Conversational gate contracts

- No subagent runs before an explicit **Run** decision.
- **Edit** always produces a revised visible card before dispatch.
- **Omit** runs no agent.
- Approval of one card never authorizes another card or wave.
- No stage invokes or selects its successor.
- No new approval or dispatch artifacts are written.
- Artifact acceptance creates no sidecar record.
- Implementation performs no source write before **Begin**.
- No child agent runs.
- Actual model and reasoning match the displayed card.
- Sandbox limitations are disclosed truthfully.

### Artifact contracts

- Every skill passes `quick_validate.py`.
- Generated `openai.yaml` matches the skill contract.
- Accepted stage outputs are immutable.
- Research keeps one review-draft path before acceptance. A revision changes and
  reinspects that path; evaluation evidence proves the hash changed without
  adding workflow artifacts. Existing discovery lifecycle behavior is unchanged
  by this research-only correction.
- Human-facing paths render as Markdown links.
- Source citations link to the exact local `file:line`.
- Long paths do not appear in body tables.
- Existing historical artifacts remain unchanged.
- Read-only stages write only their final stage artifacts.
- Repository drift produces a visible choice rather than silent continuation or automatic regeneration.

### Behavioral parity

For every skill, maintain a parity matrix against pinned RPIV sources:

- Preserve
- Codex adaptation
- Deferred
- Intentionally omitted

This is source-guided behavioral parity, not differential execution. Read the pinned workflow, skill, command, agent, helper, and artifact sources for inspiration; run only the Codex-native capability. Do not execute RPIV-Pi, install Pi extensions, or require line-by-line equality in prompts, transcripts, or artifacts. Every meaningful departure must be classified, and no applicable behavior marked Preserve may disappear without becoming a failing finding.

Promptfoo is the committed evaluation framework. Each stage begins with two synthetic cases: a minimal path and a high-risk integration path. A thin target adapter may manage disposable Codex app-server tasks and deterministic external perturbations, but it does not implement product behavior.

For each case:

- A hosted simulated user supplies only persona facts and explicit gate decisions.
- The target is the real repository-local skill running through Codex app-server in a disposable clone of the current working tree.
- Stable contracts use deterministic JavaScript assertions.
- Approved subagent runs produce a safe runtime attestation containing identifiers, hashes, requested and effective settings, completion status, and nested-spawn count; prompt and output text are never persisted in that record.
- A contract-and-evidence grader and an interaction-and-parity grader independently inspect the retained evidence bundle.
- The case passes only when the deterministic assertion and both graders pass.

An evaluation is one manually triggered baseline with one trial per case, no cache, no sharing, maximum concurrency one, and no automatic repair. After the baseline, stop. Product fixes and another run require a separate user decision.

For discovery, use two high-value harnesses:

- No-probe discovery, absorbing the terminal-spinner pacing regression.
- Brownfield agent gates, absorbing progressive locator/analyzer dispatch, evidence contradiction, repository drift, and clickable-link behavior.

Score:

- Completeness
- Specificity
- Implementation leakage
- Anti-rescoping
- Consistency
- Actionability
- Redundant questions
- Invented deferrals
- Agent minimality
- Human-control clarity
- Interaction friction

The current discovery suite lives under `evals/discover/`. It preserves the no-probe and brownfield scenarios while replacing manual task creation, `/goal` orchestration, reviewer spawning, cleanup steps, and handwritten verdict assembly. RPIV remains a pinned read-only design reference, not a second runtime.

## Deferred Work

Do not currently add:

- Strict hash-bound approval mode
- Audit or compliance records
- Workflow runners
- Automatic chaining
- Retry routing
- Automatic repair loops
- Detached lanes
- Parallel write agents
- Hidden prompt injection
- Automatic commits or pushes
- Artifact databases or indexes
- Pi extension installation
- `build`, `ship`, `vet`, or `polish`
- Deferred RPIV commands such as `explore`, `blueprint`, `slice`, `architecture-review`, and `frontend-design`

A strict approval mode may be reconsidered only if a concrete future use case requires durable proof of who approved exact bytes.

## Current Assumptions

- `rpiv-codex` now exists; the accepted discovery unit is committed at `bc94805`.
- The previous assumption that it remains empty is obsolete.
- Historical discovery, dispatch, and approval artifacts from the superseded gate design have been deleted at Ryan’s explicit request.
- `rpiv-mono` remains read-only and untouched.
- Initial use is Ryan’s local Codex environment.
- No global installation or plugin packaging is included.
- Skills never modify `.gitignore`, commit, push, or choose whether artifacts should be committed.
- The discovery checkpoint is complete and accepted.
- The `rpivc-research` candidate and its evaluation files exist in the working tree. Its latest bounded runtime-capacity correction has deterministic validation but no fresh behavioral pass.
- `rpivc-design` must not exist at the research checkpoint.
