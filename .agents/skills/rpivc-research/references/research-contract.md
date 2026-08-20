# Research behavior contract

This contract adapts RPIV-Pi `packages/rpiv-pi/skills/research/SKILL.md` at commit `d0eb55371f622ac524b3355711a482f95feb14d4`. Preserve research behavior and manual review boundaries, not Pi runtime machinery.

## Required discovery input

Accept one absolute discovery artifact path and no free-text substitute. Require `stage: discover`, `status: review`, the current discovery sections, source lineage, and repository context. The path itself is the human decision to continue. Inherit discovery decisions verbatim into Developer Context and keep unresolved questions open until evidence or a developer answer resolves them.

## Scope tracer card

Use every field below. The displayed card is authoritative:

```yaml
id: "S1"
dispatch_protocol: rpivc-dispatch/v1
dispatch_mode: spawn
depends_on: []
task_name: s1_scope_tracer
role: rpivc-scope-tracer
purpose: "Form trace-quality questions without answering them"
prompt: "{{EXACT_DISCOVERY_SHAPED_PROMPT}}"
inputs: ["{{ABSOLUTE_DISCOVERY_ARTIFACT}}", "{{INHERITED_FACTS}}"]
repository: "{{ABSOLUTE_REPOSITORY}}"
branch: "{{BRANCH}}"
commit: "{{COMMIT}}"
working_tree_sha256: "{{SHA256}}"
model: gpt-5.6-terra
reasoning: high
sandbox_request: read-only
sandbox_enforcement: "inherited-parent; project-agent configuration does not guarantee child-specific isolation"
behavioral_permissions: [read, search, git-read]
intended_tools: [read, search, git-read]
child_agents: forbidden
budget: {max_files: 10, max_anchor_slices: 9, min_questions: 5, max_questions: 9}
expected_evidence: "Discovery Summary and numbered questions with repository-relative file:line citations"
output_schema: "Discovery Summary; Research Questions; Shared Files; Search Gaps"
stop_when: "Ten files or nine questions are reached, the scope is covered, or evidence is unavailable"
```

The tracer reads the discovery artifact first, sweeps anchor terms sequentially, ranks definitions and wiring, reads no more than ten files, and emits 5–9 unanswered dense questions. Put the canonical definition first and cite at least three concrete artifacts per question.

## Analysis cards and selection

Every analysis card uses the same fields, including `dispatch_mode` and `depends_on`. Its inputs contain only approved questions and evidence already returned. Group two or three questions only when they share at least two file references or one continuous code path. Keep unrelated questions separate. Maximum three cards per separately approved wave and three analysis cards total.

The runtime allows four direct child threads for one parent. The scope tracer occupies one. Before analysis cards exist, plan complete question coverage across at most three analysis cards. If the approved questions need a fourth card, return to scope review with **Revise scope**, **Omit group**, or **Stop** instead of starting an impossible wave.

For every authorized card, use `dispatch_mode: spawn` and call `spawn_agent` with `agent_type` equal to the card's `role`, plus its exact `task_name`, `fork_turns: "none"`, `model`, and `reasoning_effort` mapped from the displayed `reasoning`. The effective child profile does not substitute for those explicit requested arguments. A first-wave card uses `depends_on: []`.

A later dependent card lists the actual prior card identifiers in `depends_on`, includes their returned evidence, receives a separate **Run**, and spawns a fresh child in a remaining analysis slot. It counts toward the three-card total and must never reuse a prior child or the tracer, hide independent work, or imply authorization from an earlier wave.

- Analyzer: behavioral/data-flow tracing; default role.
- Pattern finder: explicit comparison of established implementations, conventions, or tests.
- Integration scanner: exhaustive bounded inbound, outbound, registration, event, job, or configuration map.
- Precedent locator: credible Git anchors and usable local history. Never fetch.

Pattern and integration specialists substitute for the analyzer; availability is not a reason to run them. Prefer the smallest set of at most three cards across the full approved scope. If analyzer, pattern, integration, and precedent cards are all independently necessary, expose the capacity conflict at scope review rather than silently substituting or failing during dispatch. External research is deferred and becomes an evidence gap.

## Evidence and synthesis

Verify all citations before incorporation. A valid current-code citation has a repository-relative label and absolute target: `[path/to/file:line](/absolute/repository/path/to/file:line)`. Verify file existence and line bounds. Git commits support precedent, not current behavior.

The Coverage Ledger contains every approved question exactly once. Answered questions require at least one verified current-code citation. Partial, Conflicted, and Unanswered questions remain visible in gaps or Open Questions. Exclude advice, prescriptions, and design choices.

## Write and final review

Only **Write artifact** authorizes one new research artifact. **Adjust** changes the compiled scan and repeats the gate. **Stop** writes nothing. Before acceptance, the one artifact is a review draft. **Revise** edits that same path, reruns inspection, and reports a changed artifact hash without creating another file. **Accept** freezes the current bytes; **Accept** and **Stop** create no additional files.

No action in this unit authorizes `rpivc-design`, a commit, a push, a global installation, product-source changes, or network access.
