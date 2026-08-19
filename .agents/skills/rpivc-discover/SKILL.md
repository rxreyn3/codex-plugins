---
name: rpivc-discover
description: Turn a feature idea or existing product artifact into a complete, evidence-aware Feature Requirements Document using RPIV's intent-first discovery interview. Use for greenfield or brownfield feature definition when every codebase-agent dispatch must be shown for a conversational Run, Edit, Omit, or Stop decision and the final artifact must be reviewed without automatic chaining.
---

# RPIVC Discover

Preserve RPIV discovery behavior while adding lightweight Codex-native review gates. Read [the discovery contract](references/discovery-contract.md) and the relevant template before acting.

## Start or continue discovery

Accept free text, a pasted artifact, or user-named file paths. Read named inputs completely; do not search around them yet. If a named RPIVC artifact records an older repository context, run `node .agents/skills/_shared/scripts/artifact-check.mjs compare <path>`. When it differs, summarize the changed fields and ask **Refresh evidence**, **Continue with the disclosed stale boundary**, or **Stop**. Record any accepted stale boundary in the new artifact.

Before Git context collection, repository search, codebase inspection, or subagent dispatch, ask one foundational intent question: what problem should change, for whom, and what should the user be able to run, do, or observe when it works? Capture the answer in the user's words. Ask about observable system behavior, not whether another person or animal will feel pleased.

Ask no more than three intent questions before deciding whether the idea is ready for a narrow probe. Treat each answer as resolving only what it actually answers. Do not bundle placement, runtime, appearance, and success into one follow-up or interview by document headings.

Before declaring probe readiness, establish the **target context**: the current repository, another named repository, a standalone artifact, or only a discovery exercise. Pre-resolve explicit wording such as “in rpiv-codex,” a named repository path, or “only a test”; record it and do not ask for redundant confirmation. Never infer that the skill-hosting repository is the product target. Ask one focused placement question only when the target remains ambiguous.

## Gate a narrow evidence probe

While choosing the roster and preparing cards, read only the user's named inputs, this skill's own resources, the matching project-agent definition, and `context-snapshot.mjs` output. Do not search memories or inspect target-repository source, tests, documentation, Git history, or configuration to discover anchors. Reading this skill so you can follow it does not turn its paths into approved product evidence. Treat an exact anchor as already known only when the user supplied it or an approved prior artifact records it. Otherwise, unresolved **where** questions require a locator card before any analyzer card.

Choose the smallest useful roster:

- no agent when this is only a fixture, no product repository is established, or code evidence cannot change a live decision;
- locator only when **where** is unresolved;
- analyzer only when exact anchors already exist and **how** is unresolved;
- both only when their questions are independent and every input is already visible.

“At most two” is a ceiling, never a default. If no probe is justified, state why, record `no probe justified`, and continue the interview without writing a dispatch file.

For a justified probe:

1. Run `node .agents/skills/_shared/scripts/context-snapshot.mjs` and confirm that its absolute repository matches the established product target. If not, ask the user to re-root or continue without repository evidence.
2. Build only the justified cards from [the card templates](assets/agent-card-templates.md). Fill every field with information available now. Include the repository, branch, commit, and working-tree SHA-256 shown by the snapshot. Treat the displayed card as the complete, authoritative runtime role contract; the matching project-agent definition is an authoring reference for the card, not a second hidden configuration layer.
3. Display the complete cards directly in chat as YAML. Explain that requested read-only isolation is not a technical guarantee because child agents inherit the parent runtime sandbox.
4. Ask for exactly one conversational decision: **Run**, **Edit**, **Omit**, or **Stop**. End the response and run nothing yet.
5. Treat only an explicit **Run** as authorization for the most recently displayed cards:
   - **Edit**: incorporate the requested changes, display the complete revised cards, and ask again without dispatching.
   - **Omit**: remove the named roles; if none remain, continue without a probe.
   - **Stop**: end discovery without dispatch.
6. Before an authorized dispatch, collect context again. If repository, branch, commit, or working-tree SHA-256 differs from the displayed card, show a refreshed complete card and require a new **Run** decision.
7. Dispatch exactly the displayed roles, prompts, inputs, models, reasoning levels, behavioral permissions, budgets, evidence schemas, and stop conditions. The displayed card is the native Codex role instance; do not require or claim a separate hidden custom-agent selector. Build the dispatch message as a JSON object with exactly two top-level fields: `protocol`, equal to the displayed `dispatch_protocol`, and `card`, containing every other displayed card field with the same values and no extra fields. Set `task_name` to the displayed `task_name`, `fork_turns` to `none`, `model` to the displayed `model`, and `reasoning_effort` to the displayed `reasoning`. If the runtime cannot accept those explicit spawn arguments, stop and report the card as unverified instead of claiming it ran as approved. Give agents no inherited conversation beyond the JSON envelope. Do not allow child or follow-up agents. Run cards in parallel only when their displayed inputs are independent.

Wait for all authorized cards. Record actual completion, observable runtime sandbox or `unverified`, behavioral compliance, and what evidence was incorporated or excluded. Verify the returned distinct-file count against the displayed card budget; exceeding it is a behavioral violation, not permission to incorporate the extra files. Read at most five files surfaced by the probe. If the result is empty or irrelevant, record `no codebase precedent` rather than inventing evidence.

Use repository evidence in the interview or final artifact only when it came from a user-named input or an authorized probe. Never incorporate target files that the parent inspected while planning a card or checking runtime capability; disclose and exclude any accidental read.

After the final authorized probe result, report the evidence and end the response without asking a product question. This creates an operator checkpoint for an out-of-conversation repository change. On the next turn, collect a fresh snapshot before asking the next product question; if it differs, use the stale-evidence gate below. Do not require or interpret a conversational answer merely to advance past this checkpoint.

Retain the repository snapshot that covered the incorporated evidence. Before asking the next product question after the probe, and again immediately before artifact creation, run `node .agents/skills/_shared/scripts/context-snapshot.mjs`. If repository, branch, commit, or working-tree SHA-256 differs from the evidence snapshot, show the changed fields and ask exactly **Refresh evidence**, **Continue with the disclosed stale boundary**, or **Stop**. End the response and take no further action until the user chooses. **Refresh evidence** requires newly gated cards for any agent work; **Continue with the disclosed stale boundary** records both the evidence snapshot and current snapshot in the artifact; **Stop** ends discovery. An irrelevant repository change still requires this gate.

If locator evidence reveals anchors that justify analysis, display a new analyzer-only card containing the actual repository-relative anchors and ask **Run / Edit / Omit / Stop**. Never dispatch it from the locator authorization or name future locator output as an input.

Then run the full interview in [the discovery contract](references/discovery-contract.md). Subagents gather evidence; the user makes product decisions. Before asking details, batch two to four currently independent leaves into one numbered checkpoint. A trivial feature gets at most one such checkpoint unless an answer exposes a new dependency, contradiction, or material scope decision.

Before declaring the interview complete, explicitly resolve any still-unasked constraint, exclusion, other-outcome, and observable-success branch. Prefer including independent unresolved branches in the one detail checkpoint. Do not treat a general response such as “that's it” as approval of proposed defaults or as resolution of a different branch; ask the narrow missing question instead. Never infer dependency, lifecycle, interruption, rendering, or timing requirements merely because the user does not correct a proposal.

After the detail checkpoint, do not reopen its unanswered routine items one by one. “I don't know,” “none,” silence, or failure to choose a proposed default is not an explicit deferral. If an unanswered item would not materially change the requested outcome, scope, constraint, acceptance boundary, or user-approved approach, leave that implementation degree of freedom unspecified and omit it from Open Questions. Ask one narrow follow-up only when the missing decision is material; record it as deferred only when the user explicitly says to defer or decide it later.

If a correction exposes one genuinely new code seam, display at most one new narrow card across the entire discovery and use the same conversational gate. Never dispatch it silently.

## Produce the Feature Requirements Document

Finish only when the discovery contract's depth-based completion rule holds.

1. Run `node .agents/skills/_shared/scripts/artifact-path.mjs discover <topic>`.
2. Create a new artifact from [the Feature Requirements Document template](assets/frd-template.md). Copy `common_frontmatter` exactly. Use `supersedes` only when revising a previously presented artifact. `source_artifacts` lists only user-supplied or prior stage artifacts, not conversational dispatches.
3. Preserve the user's language in Problem & Intent and Goals. Include every requested outcome, explicit non-goal, accepted trade-off, confirmed fact, correction, and cross-cutting requirement.
4. Make every human-facing path clickable:
   - use the literal repository-relative `path/to/file:line` as the label, not descriptive prose;
   - use an absolute local target;
   - cite evidence as `[path/to/file:line](/absolute/path/to/file:line)`;
   - never wrap a navigable path in backticks;
   - do not put long paths in tables.
5. Put only explicitly deferred decisions in Open Questions. Put unrequested related ideas in Suggested Follow-ups and omit that section when empty.
6. Record each authorized role and its result in the linked-list Dispatch Ledger. If no probe ran, record `no probe justified` and the reason.
7. Keep `status: review`. Treat the file as an unpublished draft until it passes inspection and is presented; it becomes immutable when presented.
8. Run `node .agents/skills/_shared/scripts/artifact-check.mjs inspect <artifact-path>`. If the first inspection fails, correct that same unpublished draft once and inspect it again. Never create a second artifact merely because preflight failed. If the correction also fails, preserve the single failed draft, stop, and report the fault without presenting it for acceptance.
9. Present a clickable link in the form `[Feature Requirements Document](/absolute/path/to/artifact.md)`, followed by a concise summary of decisions, deferrals, and evidence gaps.
10. Ask **Accept**, **Revise**, or **Stop** and end the response:
    - **Accept**: acknowledge the decision and stop; write no sidecar record.
    - **Revise**: discuss the correction and write a new immutable artifact with `supersedes` pointing to the prior artifact.
    - **Stop**: preserve the artifact and take no further action.

Never invoke, select, or imply that another workflow stage has begun. A later skill must be manually invoked with the exact artifact path.

## Safety and write scope

- Interview and agent work are behaviorally read-only. Disclose the broader inherited technical sandbox on every card.
- Write only new files beneath `.rpiv-codex/artifacts/discover/`.
- Never write dispatch manifests, approval records, hidden state, or source changes.
- Never modify an artifact after it has been presented, `.gitignore`, Git history, or remote state.
- Never silently substitute an existing feature, broaden scope, or convert a follow-up into a requirement.
