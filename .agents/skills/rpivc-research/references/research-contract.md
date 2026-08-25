# Research behavior contract

This contract adapts RPIV-Pi `packages/rpiv-pi/skills/research/SKILL.md` at commit `d0eb55371f622ac524b3355711a482f95feb14d4`. Preserve research behavior and manual review boundaries, not Pi runtime machinery.

## Research input modes

Accept exactly one non-empty free-text research prompt or one absolute discovery artifact path. The explicit invocation is the human decision to start research.

- **Direct prompt:** Remove invocation-padding whitespace, then preserve the complete normalized prompt as authoritative scope. Capture current repository context. Do not invent or request discovery goals, decisions, deferrals, acceptance criteria, or open questions.
- **Discovery artifact:** Require `stage: discover`, `status: review`, the current discovery sections, source lineage, and repository context. Inherit discovery decisions verbatim into Developer Context and keep unresolved questions open until evidence or a developer answer resolves them.

An input is path-shaped when it is whitespace-free and absolute, relative, home-relative, or Markdown-shaped. An absolute input containing whitespace is also path-shaped when it ends in `.md` or names `.rpiv-codex/artifacts/`; other sentence-like slash-prefixed text remains a prompt. Reject a path-shaped value if it is not one valid absolute discovery artifact path; never fall back to prompt mode after path validation fails.

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
prompt: "{{EXACT_RESEARCH_PROMPT}}"
inputs: ["{{INPUT_MODE}}", "{{DIRECT_PROMPT_OR_ABSOLUTE_DISCOVERY_ARTIFACT}}", "{{INHERITED_FACTS_OR_NONE}}"]
repository: "{{ABSOLUTE_REPOSITORY}}"
branch: "{{BRANCH}}"
commit: "{{COMMIT}}"
working_tree_sha256: "{{SHA256}}"
model: gpt-5.6-terra
reasoning: medium
sandbox_request: read-only
sandbox_enforcement: "inherited-parent; project-agent configuration does not guarantee child-specific isolation"
behavioral_permissions: [read, search, git-read]
intended_tools: [read, search, git-read]
child_agents: forbidden
budget: {max_files: 10, max_anchor_slices: 9, min_questions: 5, max_questions: 9}
expected_evidence: "Five mandatory sections; 5-9 numbered questions with at least three repository artifact citations each; exact question coverage in at most three groups"
output_schema: "Discovery Summary; Research Questions; Shared Files; Evidence Gaps; Proposed Execution Plan"
stop_when: "The five-section schema self-check passes within ten files and nine questions, or evidence is unavailable"
```

Immediately before every authorized spawn, validate the exact transport envelope again and pass those same bytes as the only child message. Never retype or reconstruct a validated envelope inside the spawn call.

The card copies `repository`, `branch`, `commit`, and `working_tree_sha256` literally from one authoritative context snapshot. It contains exactly one `working_tree_sha256` key, whose value is the snapshot's exact 64-character hexadecimal hash, exactly one `reasoning: medium` key, and no `reasoning_effort` key. `reasoning_effort` exists only in the spawn API mapping. Do not substitute a hash of file names, Git status, or another approximation. Pass every complete card through `artifact-check.mjs validate-research-card` before displaying it; a validator failure is not approvable. If context changes, redisplay every complete refreshed YAML card; a card summary cannot receive **Run** approval.

In discovery mode, the tracer reads the exact absolute discovery path from its approved input without joining or prepending the repository path. In prompt mode, it begins from the exact direct prompt and must not assume an unprovided Feature Requirements Document. It then sweeps anchor terms sequentially, ranks definitions and wiring, reads no more than ten files, and emits one response with the literal headings **Discovery Summary**, **Research Questions**, **Shared Files**, **Evidence Gaps**, and **Proposed Execution Plan**. The question section contains 5–9 explicitly numbered unanswered dense questions with at least three concrete artifact citations per question. Each citation uses a full repository-relative `path:line` label and a literal absolute local target beginning with `/`; `file://` targets are invalid. The plan maps every question exactly once. The parent passes the complete payload through `artifact-check.mjs validate-research-scope`, which validates all five headings, question and group counts, existing citation targets, labels, line bounds, and exact question-to-group coverage before **Use scope**; it never substitutes parent-authored questions, citations, or a plan for an invalid tracer result. An invalid tracer stops before scope use or analysis. Its proposed execution plan must already be runtime-feasible: no more than three total groups, with related Git precedent folded into the current-behavior analyzer group whenever it concerns the same files and pattern or integration specialists substituting for rather than adding to the analyzer. Never create a standalone precedent group solely because a same-file question asks about history, present four groups, or rely on later silent regrouping.

## Analysis cards and selection

**Use scope** authorizes preparation of analysis cards, not analysis. The parent must respond by displaying the complete first-wave YAML cards and the **Run / Edit / Omit / Stop** gate, then end the turn without source inspection, dispatch, synthesis, scan preparation, or artifact writing. Only the subsequent **Run** authorizes dispatch of those exact cards.

Every analysis card uses the same fields, including `dispatch_mode` and `depends_on`. Its inputs contain the full literal text of every assigned approved question plus only evidence already returned. A question number, numeric range, paraphrase, or reference to tracer output does not transport the question's clauses. Group two or three questions only when they share at least two file references or one continuous code path. Keep unrelated questions separate. Maximum three cards per separately approved wave and three analysis cards total.

The runtime allows four direct child threads for one parent. The scope tracer occupies one. Before analysis cards exist, plan complete question coverage across at most three analysis cards. If the approved questions need a fourth card, return to scope review with **Revise scope**, **Omit group**, or **Stop** instead of starting an impossible wave.

For every authorized card, use `dispatch_mode: spawn` and pass the exact validated envelope as the only child message. Call the native `collaboration.spawn_agent` tool directly, not from `functions.exec` and not through a deferred adapter. Set `agent_type` equal to the card's `role`, exact `task_name`, `fork_turns: "none"`, exact `model`, and `reasoning_effort` mapped from `reasoning`. The child starts with no inherited conversation. For one tracer or dependent card, spawn it and call native `collaboration.wait_agent` with `timeout_ms: 600000`. For an approved independent wave, spawn every authorized card before waiting so they run in parallel, then continue direct waits until separately delivered completion notifications account for them all. The current wait schema has no target argument and no keyed status map. If a wait interval expires, inspect native child status and wait again only while an authorized child remains live. Never reread a completed child, advance into synthesis while one remains live, spawn a replacement for a timeout, pass invented target parameters, call `functions.wait`, or use a running-cell response as child evidence. Incorporate every fresh child's returned payload in the same turn; a spawn acknowledgement, timeout snapshot, or “awaiting” placeholder is not completed research. The effective child profile does not substitute for explicit role, task name, model, reasoning, and no-history requests. A first-wave card uses `depends_on: []`.

A later dependent card lists the actual prior card identifiers in `depends_on`, includes their returned evidence, receives a separate **Run**, and spawns a fresh child in a remaining analysis slot. It counts toward the three-card total and must never reuse a prior child or the tracer, hide independent work, or imply authorization from an earlier wave.

- Analyzer: behavioral/data-flow tracing; default role.
- Pattern finder: explicit comparison of established implementations, conventions, or tests.
- Integration scanner: exhaustive bounded inbound, outbound, registration, event, job, or configuration map.
- Precedent locator: credible Git anchors and usable local history. Never fetch.

The custom-agent runtime profiles are exact, not suggestions:

- `rpivc-codebase-analyzer`: `gpt-5.6-terra` / `high`
- `rpivc-codebase-pattern-finder`: `gpt-5.6-terra` / `high`
- `rpivc-integration-scanner`: `gpt-5.6-luna` / `low`
- `rpivc-precedent-locator`: `gpt-5.6-luna` / `low`

Verify every displayed role/model/reasoning triple against this table before asking for **Run**. The scope tracer's Terra/medium profile never carries into an analysis card.

Pattern and integration specialists substitute for the analyzer; availability is not a reason to run them. Prefer the smallest set of at most three cards across the full approved scope. If analyzer, pattern, integration, and precedent cards are all independently necessary, expose the capacity conflict at scope review rather than silently substituting or failing during dispatch. External research is deferred and becomes an evidence gap.

## Evidence and synthesis

Verify all citations before incorporation. The parent may use only exact target-and-line pairs returned by a child and rechecked against current numbered source; never manufacture a range from the artifact's own line number. A valid current-code citation has a repository-relative label and absolute target: `[path/to/file:line](/absolute/repository/path/to/file:line)`. This rule applies to the compiled scan and the artifact; basename-only labels are invalid. Local targets use `:line` or `:start-end`, never GitHub-style `#L` fragments. One enclosing Markdown code-span pair is presentation markup and may surround the label; after removing it, the label must still exactly match the repository-relative path and line or range. Verify file existence and line bounds. For an out-of-bounds range, re-read the named file and replace the entire range; decrementing only the end does not repair a start beyond end-of-file. The inspector reports all Markdown defects together so the one permitted correction can address the complete set. Git commits support precedent, not current behavior.

Write Git commit identifiers as plain code spans unless they are accompanied by a verified link to a real existing local file. Reverify each 40-character identifier in **Precedents & Lessons** and **Historical Context** against local Git. Artifact inspection rejects an identifier that does not resolve to a commit in the current repository, except the frontmatter's declared external `rpiv_commit` source pin. Never manufacture `.git/commit/<sha>` or another filesystem target for a commit object.

A current-file citation proves current behavior only. It cannot support a claim that behavior was introduced by, inherited from, or changed in a Git commit. Split those claims: one current-behavior bullet with one file citation, then one separate history bullet with a locally verified plain commit identifier and no current-file citation.

Source-selection lines and verdict checks are separate evidence. A range that only gathers or stages values cannot prove a later return, hash, comparison, or pass/fail result. Give separate single-citation bullets to coverage-snapshot recognition, contiguous-identifier and total checks, and clause-row checks. Give separate bullets to Markdown target/label validation and the later research-width check. Runtime-attestation verdicts cite the individual `context_mode_matches`, `child_completed`, `child_output_observed`, and `no_child_fanout` check expressions, not the earlier selection of dispatch, completion, output, or nested-spawn values. Split any sentence whose clauses require different source blocks.

Every child ends with a literal-clause matrix: one row per named clause with Supported, Unsupported, or Conflicted status, the finding, and exact evidence or gap. A terminal payload that omits this schema or answers a different task is invalid. Do not replace or silently repair that child under the same approval. Record the invalid result as an evidence gap, mark clauses assigned only to it Unanswered, and continue the already-approved turn into synthesis without asking for a second authorization or ending on a bare acknowledgement. The compiled scan and artifact Coverage Ledger contain every approved question exactly once and enumerate every named clause. A question is not evidence that its premise is true. **Answered** requires direct current-code evidence for every clause; the worst clause determines the question status. Otherwise use Partial, Conflicted, or Unanswered and name the missing or contrary clause. When every executed card has `depends_on: []`, report that no dependent wave ran even if a question or simulator instruction mentions dependent waves. Partial, Conflicted, and Unanswered questions remain visible in gaps or Open Questions. Exclude advice, prescriptions, and design choices.

## Write and final review

Before the compiled-scan gate, derive a canonical question projection from the clause matrix: one `- Coverage snapshot: Q1=... | Totals: ...` line and one `- Qn — **Status** — Clauses: ...` row per question. Run `artifact-check.mjs prepare-research-scan` with the complete draft in a quoted heredoc; never invoke it with unredirected standard input. Start every current-code evidence bullet with its question identifier, such as `- Q1:`, and give every Answered question at least one labeled evidence bullet. Use one behavior and exactly one current-code citation per evidence bullet, splitting multi-range support into separate independently supported bullets, and keep ranges at most 15 lines. Scan preparation is read-only, creates no artifact, validates the coverage projection and Answered-question evidence coverage, and is not governed by the later two-invocation artifact-inspection ceiling. Repair all reported scan defects and rerun until preparation passes or evidence is unavailable. Compare every returned `claim` and `claim_line` to its numbered `source_excerpt` and correct any mismatch. Then run the exact final draft through `artifact-check.mjs render-research-scan` with another quoted heredoc. It repeats deterministic validation and prints canonical Markdown only. Present that complete standard output byte-for-byte and append only the write gate; never reconstruct it from the longer JSON result. Do not widen, join, or hand-rewrite prepared ranges. The accepted rendered Markdown is the complete current-code evidence inventory for the artifact. When writing, start from the complete research template and preserve every `##` section heading exactly once. Under Detailed Findings, copy the entire rendered scan byte-for-byte. Copy its coverage snapshot unchanged into Summary and its Q rows unchanged into Coverage Ledger. Every other current-code claim-and-citation pair must likewise be a verbatim rendered-scan line; do not introduce current-code prose or citations from child output while writing. Code References points to Detailed Findings rather than rebuilding a citation table. Integration Points and Architecture Insights either reuse a complete rendered-scan evidence line verbatim or say no additional finding exists beyond Detailed Findings. Preserve every inherited discovery decision in Developer Context, including negative workflow boundaries such as no automatic successor stage. A clause without scan evidence remains Partial or Unanswered. Only **Write artifact** authorizes one new research artifact. **Adjust** changes the compiled scan and repeats the gate. **Stop** writes nothing. The allocator creates the ignored stage directory and emits the authoritative absolute path and frontmatter; copy `absolute` literally and do not derive a path from `relative`, `created_at`, or the current directory. Discovery mode declares exactly one repository-relative discovery path in `source_artifacts` and links the exact validated absolute discovery path under Source Feature; prompt mode declares none. Pass the exact rendered scan to `artifact-check.mjs finalize-research <absolute-artifact-path>` in a quoted heredoc. The finalizer verifies byte-for-byte Detailed Findings before normalization and inspection, so a projection failure consumes no inspection attempt. It rejects current-code citation lines outside the rendered scan and returns an artifact hash only after inspection succeeds. The initial draft permits at most two finalizer calls that reach inspection: correct once after the first inspection failure, then stop if the second inspection fails. **Revise** edits that same absolute path, reruns the finalizer, and reports a changed artifact hash without creating another file. **Accept** freezes the current bytes; **Accept** and **Stop** create no additional files.

Preparation aggregates all detectable citation defects into one correction set. Repair that complete set before one rerun; sequential one-defect retries are not an acceptable substitute.

No action in this unit authorizes `rpivc-design`, a commit, a push, a global installation, product-source changes, or network access.
