# RPIV-Codex discovery parity

The first checkpoint adapts RPIV-Pi discovery from commit `d0eb55371f622ac524b3355711a482f95feb14d4`:

- [discover skill](/Users/ryan.reynolds/Projects/rpiv-mono/packages/rpiv-pi/skills/discover/SKILL.md)
- [Feature Requirements Document template](/Users/ryan.reynolds/Projects/rpiv-mono/packages/rpiv-pi/skills/discover/templates/frd.md)
- [codebase locator](/Users/ryan.reynolds/Projects/rpiv-mono/packages/rpiv-pi/agents/codebase-locator.md)
- [codebase analyzer](/Users/ryan.reynolds/Projects/rpiv-mono/packages/rpiv-pi/agents/codebase-analyzer.md)

RPIV-Pi is MIT licensed; the original notice is retained in [LICENSE](/Users/ryan.reynolds/Projects/rpiv-codex/LICENSE).

This matrix is a behavioral reference contract, not a differential test. Evaluation reads the pinned RPIV sources for intent and inspiration, then exercises only `rpivc-discover` in Codex. It does not run RPIV-Pi, reproduce Pi runtime mechanics, or require line-by-line equality in prompts, transcripts, or artifacts.

| RPIV behavior | Classification | RPIV-Codex treatment |
|---|---|---|
| Free text and existing artifact inputs | Preserve | Reads user-named inputs fully and always creates a fresh Feature Requirements Document. |
| Foundational intent before agents | Preserve | No Git context, ambient search, inspection, or agent dispatch before the first intent answer. |
| Target context before probe readiness | Codex adaptation | Resolves whether the current repository, another product, a standalone artifact, or only a fixture is in scope; never equates the skill host with the product. |
| Narrow locator and analyzer probe | Codex adaptation | Preserves role boundaries with a zero-to-two evidence-minimal roster; two is a ceiling, not a default. |
| Lazy decision tree | Preserve | Expands only resolved parents; completion is depth-based rather than heading-based. |
| Evidence pre-resolution | Preserve | Batches likely code-grounded answers for explicit confirmation with linked `file:line` evidence. |
| Tiered questions and dialectic shape options | Preserve | Intent, scope, shape, and detail tiers retain distinct interaction rules. |
| Corrections and cross-cutting requirements | Preserve | Corrections reopen affected branches; one new seam may trigger one additional gated card. |
| Anti-rescoping and explicit deferrals | Preserve | Existing substitutes, scope growth, follow-ups, and Open Questions require explicit user decisions. |
| Complete Feature Requirements Document | Preserve | Keeps every original substantive section, including Recommended Approach. |
| Agent execution | Codex adaptation | Displays exact editable cards in chat and requires **Run / Edit / Omit / Stop** before dispatch. The card becomes the native role instance and is sent with explicit task name, model, reasoning, and no inherited conversation. No dispatch file is written. |
| Locator-dependent analysis | Codex adaptation | Runs a locator only after **Run**, then displays a new analyzer card containing actual anchors for a separate decision. |
| Agent definitions | Codex adaptation | Uses visible project-agent files as authoring references for complete cards; the runtime card, not a hidden agent selector, is authoritative. Cards request read-only behavior while disclosing inherited-parent sandbox enforcement. |
| Final review | Codex adaptation | Presents one immutable artifact with **Accept / Revise / Stop**. Acceptance writes no sidecar record. |
| Dirty working-tree context | Codex adaptation | Records a Git-visible source snapshot. Later context changes produce **Refresh / Continue / Stop**, not a hash-bound approval failure. |
| Paths and evidence | Codex adaptation | Human-facing paths and citations are Markdown links with repository-relative labels and absolute local targets. |
| Pi runtime APIs and agent-package installation | Intentionally omitted | Native Codex skills, project agents, terminal, and subagent controls replace them. |
| Automatic next-stage routing | Intentionally omitted | Discovery stops at its artifact review gate. |
| Detached lanes, retries, repair loops, commits, and hidden prompt injection | Intentionally omitted | These conflict with explicit human control and inspectable state. |
| Audit-grade approval records | Deferred | Reconsider only if a concrete multi-reviewer or compliance requirement appears. |
| Additional specialists or discovery write agents | Deferred | Add only if a reviewed fixture demonstrates a gap the two discovery roles cannot cover. |

Model, reasoning, intended tool lists, behavioral permissions, and budgets are visible conversational contracts. Promptfoo runtime attestation verifies the explicit spawn model and reasoning against the persisted child's effective settings and verifies that its sandbox matches the parent policy. Codex encrypts the child payload before app-server and rollout evidence expose it, so exact plaintext prompt bytes remain unobservable; the evaluator records a displayed-card hash and a separate opaque transport hash without claiming they can be compared. Read-only behavior, tool lists, and budgets remain prompt-level constraints.

## Verification rule

- Harnesses must demonstrate every applicable behavior classified **Preserve**.
- Reviewers judge **Codex adaptation** rows against the declared human-control outcome, not Pi's implementation shape.
- A meaningful departure must be classified as **Codex adaptation**, **Deferred**, or **Intentionally omitted** with a reason before the evaluation can pass.
- Different wording, question order, artifact formatting, and native interaction mechanics are not parity failures by themselves.
- Changes to the RPIV source pin or the intended treatment require an explicit matrix update; no evaluation silently follows a moving upstream target.
