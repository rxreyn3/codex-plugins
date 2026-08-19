# Discovery behavior contract

This contract adapts RPIV-Pi `packages/rpiv-pi/skills/discover/SKILL.md` at commit `d0eb55371f622ac524b3355711a482f95feb14d4`. Preserve behavior, not Pi runtime mechanics.

## Intent before evidence

The first question is open-ended and contains no recommendation or repository citation. Establish:

- the problem or opportunity;
- the affected user or operator;
- the observable successful outcome;
- the user's motivation and important language.

Do not let existing code redefine the feature before this intent is captured. A user-named source artifact is input and may be read fully, but do not perform an ambient repository probe yet.

Ask for an outcome the user can run, do, or observe. Subjective reactions such as whether a baby enjoys an animation are not system acceptance signals.

Probe readiness requires both enough specificity to search for relevant nouns, flows, boundaries, or precedents and a resolved target context. Establish whether the current repository is the actual product target, another repository is the target, the output is standalone, or the scenario is only a discovery exercise. Pre-resolve this branch when the initial request or a user-named artifact explicitly names the target; “In rpiv-codex” is already a decision, not an invitation to ask whether rpiv-codex is the target. The skill repository and current working directory are not product evidence. Never infer placement from them.

Ask no more than three intent questions before deciding readiness. Keep follow-ups atomic: do not combine target placement, runtime, appearance, and success. If an answer addresses only appearance, runtime and placement remain unresolved.

## Narrow evidence probe

Use only locator and analyzer cards explicitly authorized with **Run** in the conversation. Shape each prompt from captured intent and the resolved target. Locator answers **where**; analyzer answers **how**. Neither chooses requirements or recommends architecture.

The parent may not manufacture “known anchors” by inspecting the target while planning a probe. Before authorization, use only user-named inputs, the discovery skill resources needed to follow this contract, the relevant project-agent definition, and repository identity from the context snapshot. An analyzer-only first card is valid only when the user or an approved prior artifact supplied its exact anchors. Otherwise start with locator-only. Files accidentally read outside this boundary are excluded from product evidence and must not appear as repository grounding in the artifact.

Treat sandboxing as an evidence claim, not an aspiration. In the current native collaboration runtime, the displayed card is the authoritative role instance and the child inherits the parent runtime policy. A project-agent definition is an authoring reference; do not imply that its sandbox or developer instructions were selected as a hidden runtime layer. Every displayed card must distinguish the requested read-only isolation, the `inherited-parent` enforcement boundary, and the narrower read/search/Git-read behavioral permissions. **Run** authorizes that disclosed limitation only for the displayed card. After dispatch, record the observed runtime policy when available and separately state whether the agent attempted any write or mutating command. Never infer technical read-only enforcement from behavioral compliance.

The valid roster is zero, one, or two agents. Use zero when no target repository is established or evidence cannot materially affect a live decision. Use locator only for an unresolved location question. Use analyzer only when its exact anchors are already known. Show two in one conversational wave only for genuinely independent questions with fully visible inputs. “At most two” must never become “always two.”

If analyzer work depends on locator results, show and run the locator first. Then, only if analysis is still necessary, show a second analyzer-only card containing the actual anchors and stop for a separate **Run / Edit / Omit / Stop** decision. Future output such as “D1 anchors” is never a reviewable input.

Read no more than five relevant files surfaced by the authorized probe. Each agent must also stop before surfacing more distinct repository files than its displayed `max_files`; extra files are a behavioral violation even when the parent excludes them. Evidence must use repository-relative `file:line` citations. An empty or irrelevant result is a valid `no codebase precedent` result.

Return the final authorized probe evidence in its own response and ask no product question in that response. On the next turn, refresh the repository snapshot before continuing the interview. This response boundary lets an operator-controlled change made after evidence returns be detected before it can be bypassed by a question emitted in the same turn.

Never silently turn code observations into decisions. Present likely pre-resolutions in a compact batch and ask the user to confirm, correct, or leave each unresolved.

## Lazy decision tree

Maintain a private tree of unresolved decisions. Begin with the root and only its immediate relevant children:

1. goals and non-goals;
2. functional requirements;
3. non-functional requirements;
4. constraints and assumptions;
5. acceptance criteria;
6. recommended approach.

Expand a branch only after its parent is resolved. Do not interview by walking the final document headings or filling quotas.

For each answer:

1. update the affected decision;
2. detect contradictions or changes to earlier answers;
3. re-open every branch affected by a cross-cutting answer;
4. expose only the next highest-value unresolved decision.

## Question tiers

### Intent

Ask one open question. Give no recommendation and cite no code. Follow with one unresolved decision at a time; do not bundle independent placement, runtime, appearance, and success choices.

### Scope

Ask one question. When useful, recommend an answer grounded in stated intent or confirmed evidence, and explain why. If an existing feature might substitute for the requested outcome, ask explicitly whether substitution is acceptable. Never redirect silently.

### Shape

Ask one question with at least two genuine options. For every option state what it optimizes and what it sacrifices. Cite code only when describing confirmed current behavior. A recommended option must have rationale beyond user agreement.

### Detail

Before asking, scan all unresolved leaves whose parents are already resolved. Batch two to four independent leaves into one compact numbered checkpoint, even when they sit under different branches. For example, interruption behavior, in-place versus new-line output, and secondary non-goals can be answered together after the feature shape is settled. Do not batch dependent choices.

For a trivial feature, allow at most one detail checkpoint unless its answer exposes a new dependency, contradiction, or material scope decision. Relevance alone is not enough reason to serialize many small questions.

Use that checkpoint to expose independent unresolved branches, including constraints, exclusions, other requested outcomes, and observable success when the user has not supplied them. A reply resolves only the numbered items it actually answers. A general response such as “that's it” means no additional outcome only when that is what was asked; it does not confirm suggested defaults or silently close unrelated branches. Do not infer dependencies, lifecycle, interruption handling, rendering mechanics, or timing from the absence of a correction.

Do not turn unanswered routine items from that checkpoint into a serial interview. “I don't know,” “none,” silence, and declining a recommended default are not explicit deferrals. Leave non-material implementation degrees of freedom unspecified when they do not change the requested outcome, scope, constraints, acceptance boundary, or user-approved approach. Ask one narrow follow-up only when an unanswered item would materially change one of those product decisions.

## Corrections, boundaries, and deferrals

- Treat corrections as authoritative. Update prior decisions and revisit dependent branches.
- A correction may justify at most one additional narrow agent on a newly exposed code seam, and that agent requires a new displayed card and explicit **Run** decision.
- Put related, unrequested observations in Suggested Follow-ups unless the user explicitly expands scope.
- Record a decision in Open Questions only when the user explicitly defers it.
- Treat a deferral as explicit only when the user says to defer the decision or decide it later; uncertainty by itself is not a deferral.
- Do not invent deferrals to make the interview finish.
- Capture explicit non-goals and resist later accidental rescoping.

## Completion rule

Stop asking questions when all of the following are true:

- every relevant tree branch has a decision or explicit deferral;
- Problem & Intent and Goals preserve the user's language;
- every accepted recommendation has substantive rationale;
- cross-cutting answers have been propagated;
- no remaining question would materially change scope, behavior, constraints, acceptance, or approach.

This is a depth test, not a document-bucket test. Do not ask padding questions after it passes.

## Evidence rules

- Distinguish user decisions, repository facts, inferences, and unresolved questions.
- Cite exact repository-relative `file:line` evidence for repository claims and render it as a Markdown link with an absolute local target. Use the literal repository-relative `file:line` as the link label, not a descriptive alias.
- Use only Git-visible tracked or untracked source files covered by the recorded working-tree snapshot for repository evidence. If a required source is ignored or outside the target repository, disclose the uncovered boundary rather than implying complete stale-context detection.
- Never fabricate a precedent, constraint, or path.
- If evidence conflicts, show the conflict and ask the user to resolve its product consequence.
- When repository evidence contradicts the stated problem or proposed solution, the contradiction is a live decision. Ask the smallest differentiating question and keep it in Open Questions until the user resolves it; do not write `None` merely because the proposed behavior is implementable.
- Keep implementation detail out of requirements unless it is an explicit constraint or necessary to make the recommended approach actionable.
- Preserve the repository snapshot that covered incorporated evidence. Before the next product question and immediately before artifact creation, compare a fresh snapshot with it. Any repository, branch, commit, or working-tree SHA-256 change requires **Refresh evidence / Continue with the disclosed stale boundary / Stop**, even when the changed file appears irrelevant. Continuing records both snapshots and the accepted stale boundary in the artifact; refreshing requires newly gated agent work.
