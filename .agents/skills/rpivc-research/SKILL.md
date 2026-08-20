---
name: rpivc-research
description: Turn one accepted RPIVC discovery Feature Requirements Document into a verified, reviewable codebase research artifact. Use when the user manually invokes research with the exact discovery artifact path and wants visible Run, Edit, Omit, or Stop gates for scope tracing and every adaptive analysis wave, followed by Write artifact, Adjust, or Stop and single-draft Accept, Revise, or Stop review. This first unit is repository- and Git-read only and defers external web research.
---

# RPIVC Research

Produce current-code research, not a design. Read [the research contract](references/research-contract.md) and [the research template](assets/research-template.md) completely before acting.

## Preflight the exact dependency

Require exactly one manually supplied absolute path beneath `.rpiv-codex/artifacts/discover/`. Run `node .agents/skills/_shared/scripts/artifact-check.mjs preflight-discovery <artifact-path>` before any target-source inspection. This single safe command validates the dependency, emits its complete content, and compares its recorded repository context with the current checkout. Read the emitted `artifact_content` completely.

Reject a missing, malformed, non-discovery, incomplete, or out-of-repository artifact. Capture the current repository context. If it differs from the artifact, present changed fields and ask **Refresh evidence**, **Continue with the disclosed stale boundary**, or **Stop**. Write nothing and inspect no target source before this decision.

Inherit the discovery problem, users, goals, non-goals, success criteria, recommended approach, decisions, corrections, cross-cutting requirements, explicit deferrals, open questions, citations, and evidence gaps. Do not re-interview the user about settled discovery facts.

## Gate scope tracing

Prepare one complete `rpivc-scope-tracer` YAML card using the contract schema. Include the exact prompt and inherited facts, repository snapshot, explicit model and reasoning, behavioral read/search/Git-read permissions, budgets, evidence schema, and stop condition. Display it and ask **Run**, **Edit**, **Omit**, or **Stop**. End the turn and run nothing.

- **Run** authorizes only the latest displayed card.
- **Edit** produces a complete revised card and another gate.
- **Omit** runs no tracer; continue only if the user supplies 5–9 replacement questions meeting the contract.
- **Stop** ends without an artifact.

Refresh repository context immediately before dispatch. Any change requires a refreshed card and a new **Run**. The tracer always uses `dispatch_mode: spawn`. Dispatch the exact displayed envelope using `spawn_agent` with `agent_type` equal to the displayed `role`, `task_name` equal to the displayed `task_name`, `fork_turns: "none"`, `model` equal to the displayed `model`, and `reasoning_effort` equal to the displayed `reasoning`. Pass the approved card envelope as the only message and inherit no conversation. If the runtime cannot accept all five explicit arguments, stop and report the card unverified; do not rely on a project-agent default as proof of the approved request. Children must not spawn children or write files.

After tracing, show the compact Discovery Summary, 5–9 numbered questions, shared files, proposed groups of at most three related questions, evidence gaps, and proposed specialist per group. Show how every question fits within at most three analysis cards total, then ask **Use scope**, **Revise scope**, or **Stop**. If complete coverage cannot fit, ask **Revise scope**, **Omit group**, or **Stop** instead. No analysis card may exist before **Use scope**.

## Gate adaptive analysis waves

Choose the smallest roster justified by approved question shape:

- reuse `rpivc-codebase-analyzer` by default for behavior and data flow;
- substitute `rpivc-codebase-pattern-finder` for explicit convention comparisons;
- substitute `rpivc-integration-scanner` for bounded exhaustive connection maps;
- use `rpivc-precedent-locator` only with usable Git history and credible anchors.

External web research is deferred. Record an evidence gap when a question crosses that boundary.

Show every complete card in a wave before asking **Run**, **Edit**, **Omit**, or **Stop**. Dispatch no more than three independent cards per wave and three analysis cards total. One wave never authorizes another. Dependent cards must contain actual returned evidence, use a remaining card slot, and receive a later gate. Use Luna/low for mechanical enumeration, Terra/high for behavioral analysis, and Sol/xhigh only after a visible reconciliation card is accepted.

The current collaboration runtime permits four direct child threads per parent. The tracer consumes one, so the complete approved scope must fit at most three analysis cards. Show the complete execution plan at the scope checkpoint. If complete coverage needs a fourth card, ask **Revise scope**, **Omit group**, or **Stop** before displaying analysis cards.

Every analysis card uses `dispatch_mode: spawn` and the same explicit `spawn_agent` arguments as the tracer, including `agent_type`. A dependent card names prior card identifiers in `depends_on`, includes their actual returned evidence, receives a new wave approval, and still spawns a fresh child in one of the three available analysis slots. Never reuse a child, reuse the tracer, hide independent work in another card, or treat an earlier **Run** as authorization for later dependent work.

For every spawn retain safe runtime attestation: displayed-card hash, opaque child-transport hash and byte count, requested runtime settings, task and child identifiers, completion and output hashes, and nested-spawn count. Retain no prompt or output plaintext in attestation and make no exact-equality claim for encrypted payloads.

## Synthesize and checkpoint

The parent synthesizes; children never write the artifact. Map every approved question exactly once to **Answered**, **Partially answered**, **Conflicted**, or **Unanswered**. Verify every cited file and line against the captured revision. Use repository-relative labels and absolute clickable targets. Treat current code as current truth and Git as precedent. Report facts and constraints, not implementation recipes.

Ask developer questions only when evidence cannot supply the answer. Ground each question in clickable findings, explain why it matters, and offer two to four concrete choices when choices exist. Batch only independent questions.

Present a compiled scan of at most 30 lines covering task, scope, layers, key files, integration shape, best matching pattern, precedents, conflicts, gaps, unresolved questions, and coverage counts. Ask **Write artifact**, **Adjust**, or **Stop**. Write nothing before **Write artifact**.

## Write and review one draft artifact

Run `node .agents/skills/_shared/scripts/artifact-path.mjs research <topic>`, then create exactly one new file from the template under `.rpiv-codex/artifacts/research/`. Preserve inherited decisions in Developer Context and complete question coverage in the Coverage Ledger.

Run `node .agents/skills/_shared/scripts/artifact-check.mjs inspect <artifact-path>`. Correct inspection failures once if needed; stop on a second failure. Retain the returned `artifact_sha256` with the draft path, then present its clickable link.

Ask **Accept**, **Revise**, or **Stop** and end the turn. **Revise** updates that same draft path, never allocates another research artifact, reruns the inspector, and shows the unchanged path plus the changed before/after `artifact_sha256` values before repeating the gate. **Accept** freezes the current bytes, creates no sidecar, and invokes no successor. After **Accept**, never modify that artifact.

## Boundaries

- Research is behaviorally read/search/Git-read only outside its one artifact.
- Never fetch, browse the web, edit product code, create dispatch or approval records, commit, push, install, or repair the workflow during use.
- Never create, invoke, route to, or imply `rpivc-design`.
- Never chain automatically. A later stage requires a separate manual invocation.
