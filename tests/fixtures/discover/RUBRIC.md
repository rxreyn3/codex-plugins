# Discovery parity and gate rubric

Run a locked fixture through `rpivc-discover`. When comparing behavior with the pinned RPIV discovery skill, give both runs the same answers and record concrete transcript or artifact evidence. Score each shared dimension from 0 to 2.

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| Completeness | Requested outcomes are lost | Most outcomes survive | Every requested outcome and boundary survives |
| Specificity | Output is generic or ambiguous | Some behavior is concrete | Behaviors and observable success signals are precise |
| Implementation leakage | Requirements dictate unapproved internals | Some unnecessary internals leak in | Internals appear only as explicit constraints or grounded recommendations |
| Anti-rescoping | Workflow silently substitutes or broadens | Scope pressure is visible but unclear | Every substitution or expansion requires an explicit choice |
| Consistency | Contradictions remain | Some corrections propagate | Corrections update every affected decision and requirement |
| Auditability | Decisions and evidence lack provenance | Provenance is mixed | User decisions, facts, inferences, deferrals, and agent use are traceable |
| Actionability | Output cannot guide the next stage | Important gaps remain | Requirements, acceptance, and approach are ready for the next human decision |
| Redundant questions | Repeated bucket-filling | One avoidable repeat | Every question could materially change the result |
| Invented deferrals | Workflow fabricates open questions | A deferral is ambiguous | Only decisions explicitly deferred by the user remain open |
| Agent minimality | Agents run by default or without need | Roster is useful but larger than necessary | Zero, one, or two agents are chosen strictly from unresolved evidence needs |
| Gate fidelity | Work runs without the displayed decision | The gate is visible but incomplete or stale | Every agent has a complete current card and runs only after **Run** |
| Evidence conflict handling | Evidence is ignored or bent to preserve the feature | Conflict is noted but not resolved | The contradiction drives a differentiating question and may cancel the feature |
| Link usability | Navigable paths are plain text or code | Some links work | Artifact, lineage, and source locations are concise clickable links |
| Interaction friction | Routine details become a long interrogation | Some independent details remain serial | Questions follow dependencies and batch independent leaves once |

## Universal pass conditions

A run passes only when all of these are true, regardless of its numeric score:

- Intent and observable success are captured before repository inspection.
- Explicit target wording pre-resolves placement; an ambiguous target is clarified before probe readiness.
- No agent runs before a current **Run / Edit / Omit / Stop** card decision.
- An evidence-dependent analyzer gets a new card with real anchors; locator authorization never carries forward.
- A changed repository snapshot invalidates the displayed card and requires a complete refreshed card plus a new decision.
- The final Feature Requirements Document is linked in chat and ends at **Accept / Revise / Stop**.
- Accepting the final artifact creates no sidecar record and starts no later workflow stage.
- Discovery writes no dispatch or approval files.

## Scenario-specific pass conditions

- [Terminal spinner](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/05-terminal-spinner.md): resolve the hypothetical target, use no probe, avoid invented deferrals, batch routine details, and use the conversational final gate.
- [Clickable source links](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/06-clickable-source-links.md): show a locator card directly in chat, write no manifest, gate any dependent analyzer separately, and emit clickable local links.
- [Evidence contradiction](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/07-evidence-contradiction.md): ask what actually fails, do not claim `Open Questions: None` while evidence conflicts with intent, and allow the user to withdraw the feature without inventing a replacement.
- [Context drift](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/08-context-drift-regate.md): dispatch nothing under the stale snapshot, show the entire refreshed card, and require a new explicit decision.

Record qualitative differences as well as scores. Equal totals do not imply equivalent behavior; arithmetic remains surprisingly bad at understanding conversations.
