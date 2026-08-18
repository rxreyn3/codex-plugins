# Discovery parity and gate rubric

Run a locked fixture only through `rpivc-discover`. Review its transcript, agent activity, and artifact against the behaviors classified in [the parity matrix](/Users/ryan.reynolds/Projects/rpiv-codex/PARITY.md) and the pinned RPIV source references listed there. RPIV is read-only design inspiration: do not execute it or require line-by-line equality. Score each dimension from 0 to 2.

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

- Intent and observable success are captured before subject-specific memory lookup, Git context collection, target-source inspection, or subagent dispatch.
- Explicit target wording pre-resolves placement; an ambiguous target is clarified before probe readiness.
- The parent may read the selected skill and its directly referenced workflow assets, but it does not inspect target product source to manufacture analyzer anchors before showing the first card.
- No agent runs before a current **Run / Edit / Omit / Stop** card decision.
- An evidence-dependent analyzer gets a new card with real anchors; locator authorization never carries forward.
- A changed repository snapshot invalidates the displayed card and requires a complete refreshed card plus a new decision.
- A repository change after evidence collection is disclosed before artifact creation and requires **Refresh evidence / Continue with the disclosed stale boundary / Stop**.
- The dispatch ledger records the exact observed runtime sandbox, or `unverified`; behavioral read-only compliance is not described as technical sandbox enforcement.
- The final Feature Requirements Document is linked in chat and ends at **Accept / Revise / Stop**.
- Accepting the final artifact creates no sidecar record and starts no later workflow stage.
- Discovery writes no dispatch or approval files.

## Reference-parity pass conditions

- Every applicable behavior classified **Preserve** in the parity matrix is visible in the Codex run or cited as not exercised by this fixture.
- Every **Codex adaptation** is judged by its declared outcome, especially human control and evidence visibility, rather than by Pi's runtime shape.
- Any meaningful departure from the pinned reference is already classified as **Codex adaptation**, **Deferred**, or **Intentionally omitted**, with a reason.
- Pi extensions, workflow injection, automatic chaining, and other intentionally omitted mechanics are not reintroduced merely to imitate implementation details.
- Different wording, question order, or artifact formatting is not a failure unless it loses intent, evidence, a requested outcome, or another preserved behavior.

## Scenario-specific pass conditions

- [No-probe discovery](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/01-no-probe-discovery.md): resolve the hypothetical target, use no probe, avoid invented deferrals, batch routine details, and use the conversational final gate.
- [Brownfield agent gates](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/02-brownfield-agent-gates.md): start locator-only, write no manifest, gate dependent analysis separately, re-gate before dispatch after drift, reconcile contradictory evidence instead of preserving the proposed solution, disclose post-evidence drift, and emit clickable local links.

Record qualitative gaps as well as scores. A run cannot pass with an unexplained loss of preserved behavior even when its total looks healthy; arithmetic remains surprisingly bad at understanding conversations.
