# RPIV-Codex discovery parity

The first checkpoint adapts RPIV-Pi discovery from commit `d0eb55371f622ac524b3355711a482f95feb14d4`:

- [discover skill](/Users/ryan.reynolds/Projects/rpiv-mono/packages/rpiv-pi/skills/discover/SKILL.md)
- [Feature Requirements Document template](/Users/ryan.reynolds/Projects/rpiv-mono/packages/rpiv-pi/skills/discover/templates/frd.md)
- [codebase locator](/Users/ryan.reynolds/Projects/rpiv-mono/packages/rpiv-pi/agents/codebase-locator.md)
- [codebase analyzer](/Users/ryan.reynolds/Projects/rpiv-mono/packages/rpiv-pi/agents/codebase-analyzer.md)

RPIV-Pi is MIT licensed; the original notice is retained in [LICENSE](/Users/ryan.reynolds/Projects/rpiv-codex/LICENSE).

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
| Agent execution | Codex adaptation | Displays exact editable cards in chat and requires **Run / Edit / Omit / Stop** before dispatch. No dispatch file is written. |
| Locator-dependent analysis | Codex adaptation | Runs a locator only after **Run**, then displays a new analyzer card containing actual anchors for a separate decision. |
| Agent definitions | Codex adaptation | Uses visible project agents with pinned model and reasoning. Cards request read-only isolation while disclosing inherited-parent sandbox enforcement. |
| Final review | Codex adaptation | Presents one immutable artifact with **Accept / Revise / Stop**. Acceptance writes no sidecar record. |
| Dirty working-tree context | Codex adaptation | Records a Git-visible source snapshot. Later context changes produce **Refresh / Continue / Stop**, not a hash-bound approval failure. |
| Paths and evidence | Codex adaptation | Human-facing paths and citations are Markdown links with repository-relative labels and absolute local targets. |
| Pi runtime APIs and agent-package installation | Intentionally omitted | Native Codex skills, project agents, terminal, and subagent controls replace them. |
| Automatic next-stage routing | Intentionally omitted | Discovery stops at its artifact review gate. |
| Detached lanes, retries, repair loops, commits, and hidden prompt injection | Intentionally omitted | These conflict with explicit human control and inspectable state. |
| Audit-grade approval records | Deferred | Reconsider only if a concrete multi-reviewer or compliance requirement appears. |
| Additional specialists or discovery write agents | Deferred | Add only if a reviewed fixture demonstrates a gap the two discovery roles cannot cover. |

Model, reasoning, intended tool lists, behavioral permissions, and budgets are visible conversational contracts. Current manual evidence shows that project-agent model and reasoning settings apply, while child-specific sandbox settings do not override the parent runtime. Read-only behavior, tool lists, and budgets remain prompt-level constraints.
