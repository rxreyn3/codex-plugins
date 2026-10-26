---
name: rpivc-map
description: Create or refresh an interactive, source-linked system map from RPIV artifacts or a bounded exploration question to find unresolved decisions and agreed work remaining. An optional companion to discovery, research, design, Plan or Blueprint; does not approve decisions or implement the mapped system.
---

# RPIV Map for Codex

Help the reader find what still needs deciding or building. Show how parts connect only as context for that work. Produce one versioned JSON companion and a self-contained HTML map. Read [the companion contract](references/schema.md) when creating or refreshing data and [acceptance checks](references/acceptance.md) before review.

This is a Codex-native companion, not an upstream port or a mandatory RPIV stage. Invocation authorizes map artifacts and bounded read-only inspection, not product changes, ticket updates, provider actions or publication. A beautiful diagram does not advance an unfinished upstream stage.

## Choose the subject and owner

Use the supplied artifact or existing companion. Without either, accept an explicit exploration question and system area; record that no owning artifact exists. If neither the topic nor a relevant artifact is supplied or clear from the conversation, ask for that missing input. Do not start an unbounded repository survey.

Read the primary artifact completely and follow relevant evidence links. Reuse an existing map of the same work. Preserve its identity, original stage and stable part identifiers; a stage change alone does not justify moving components or creating a competing map. Research is the normal starting point, but discovery/Explore may produce an explicitly provisional map.

Establish the document that owns intended behavior before describing it as agreed:

- Before an initial Plan first reaches ready, Design owns intended behavior and architecture. Once it reaches ready, Plan owns the current specification; Design remains historical rationale even if Plan later returns to review. Check materialization metadata and recorded history, not just today's status.
- Blueprint is an alternative planning route. Its plan includes architectural decisions, sequential slices and developer checkpoints. Pending checkpoints stay pending; generated code inside the plan is not implemented code. A Blueprint plan has no separate authoritative Design by implication. Read the applicable artifact history to establish its approvals.
- Research records findings and developer agreements without choosing an implementation mechanism. Current code establishes code presence at its inspected revision; test, deployment and runtime claims require their own evidence.
- If ownership is unresolved, preserve that gap and ask before presenting a single authoritative intended design. An incomplete artifact may produce an incomplete map, never an invented ready state.

For an initial artifact-backed map, put `<artifact-stem>.map.json` beside the artifact. For Explore, use `.rpiv/artifacts/maps/<topic>.map.json` and explicitly record the missing owner. Attach later artifacts to the same map instead of renaming its identity. Keep candidates and approved revisions separate using the helper's revision directories; do not overwrite the last approved result.

## Extract and refresh evidence

Collect only evidence relevant to the map's questions. A quick map may reuse supplied evidence with its original date; a refresh checks affected current sources and records revisions or retrieval times. Inaccessible sources are coverage gaps, not proof of no change. Preserve conflicting claims with their supporting sources until resolved.

Use the companion as the sole maintained factual model. It holds parts, connections, independent scope/implementation/check claims, questions, work, constraints, journeys, ticket relationships, suggestions and refresh changes. A rendered export embeds a generated copy; never hand-edit its factual content. Each material claim needs its own evidence reference or an explicit unknown/assumption. A schema field proves capacity; a callback setting does not prove successful delivery.

Connections describe data movement, triggering or dependency explicitly, with payload, trigger and real endpoints. Reference implementations stay outside the runtime path. Policies attach to constrained actions or data. Distinguish direct ticket scope, prerequisites and related work; a ticket link, Done label or visual neighbor is not scope approval or runtime proof. For a mixed component, name both existing behavior and unfinished additions.

Keep scope, implementation and checks independent. Agreement may exist before its mechanism does. Design progress changes design evidence; it does not mark implementation or runtime verified. A provider success cannot prove a second system's action succeeded.

## Explain decisions and remaining work

Write concrete behavior and consequences before technical detail. Keep these separate:

- **Still to decide:** genuine unresolved design/checking/coordination questions, grouped by the person or investigation needed next. Do not reopen settled outcomes because implementation is unfinished.
- **Agreed work remaining:** missing agreed outcomes or specific outstanding checks. Unchanged requirements and existing behavior belong under What we agreed, not in a build list. No new task is a valid result.
- **What we agreed / What exists / What we checked:** independent sourced statements together in selected detail. Do not repeat them as badges on components, tooltips or journey steps.

Every question starts with Agreed, Needs design/checking/coordination, Why it matters and Next step. Include an explicitly illustrative example when timing or failure is hard to picture. Explain “record which call each message belongs to”, rather than “reliable association”. State whether a risk was found in code or reproduced in a running app.

Keep technical candidates and longer evidence expandable. A prerequisite is work to investigate, not a recommended implementation. Leave the recommendation unset unless evidence establishes feasibility and consequences of preferring it over alternatives. A user choice becomes ready only when its options are understood; do not fill an empty user-choice group artificially.

Suggest at most one next discussion or investigation only when dependency evidence supports the order. Name the concrete behavior it makes possible, distinguish hard prerequisites from helpful work, and say that priority is not agreed. It cannot override Plan ordering or assign ticket scope.

Map controls only inspect. Discuss decisions in chat, then route their recording through the owning Research, Design, Plan or Blueprint workflow within existing authorization. Refresh from that record. Opening an option or selecting a recommendation never records an agreement. Never edit an owning artifact to reconcile the map's assumptions.

## Render and preserve context

Resolve this skill's root from the loaded `SKILL.md`, not the working directory. Use its bundled scripts as described in [the companion contract](references/schema.md). The renderer is generic; do not copy a worked example's architecture into another system.

Choose the smallest composition that explains responsibilities. Use a simple flow for a small system; add responsibility layers only when helpful. Keep stable positions through inspection. Distinguish interface, processing and saved-data shapes, external boundaries and entry/exit points. Route directional connections to actual endpoints without crossing unrelated parts; pair numbers with the inspectable connection list. Keep the implementation-line legend explicit.

Keep the current journey or ticket and visible connections when selecting a part, question, connection or dependency. Only **Show everything connected to this** changes that context; provide return to it. Show ticket portions and outside dependencies with concrete reasons. A walkthrough describes evidence or intent, not a live simulation.

Generate **Review remaining questions**, its deduplicated action groups, question explanations, work, connection details and dependency reasons from the same companion. Explicit question selection closes unrelated disclosures and focuses/scrolls to the selected question. Connection selection explains payload, trigger and evidence, with access back to either endpoint.

Mobile uses grouped components and readable steps, not a shrunken diagram. Put the collapsed grouped picker before long detail, preserve responsibility labels/colors, and provide **Choose another part**. Test selecting two parts without losing a journey or ticket, useful keyboard focus and useful scroll position. Keep tooltips to about 25 words.

## Compare with the last approved map

Use the last approved revision as baseline, never the most recent failed candidate. Preserve it until the revised data and rendering pass checks and final advisor approval. Record source-backed changes and affected parts/questions/work for the expandable **Since the last refresh** summary. Include meaningful decisions, dependencies, remaining work, new/stale/conflicting/check evidence and ownership changes. Stage progression alone is not implementation progress.

Retain previous/current claim details where available. If no earlier approved map exists, say so. If evidence establishes no meaningful change, say that; if a source could not be checked, retain a coverage gap rather than claiming no change. Changed decisions require the authoritative record; unsupported ordering remains unset.

## Review and deliver

Run companion validation and generated-data parity checks, then exercise the actual rendering using [the acceptance checklist](references/acceptance.md). Review every question's wording, not only the featured one. Source tests, local browser interaction and screenshots establish different things; report each accurately.

Final approval by the configured Codex Advisor is required for the exact final companion and rendering. Load the available Codex Advisor skill and follow its dispatch policy; explicit review in this workflow bypasses automatic eligibility checks. Supply the source model, evidence, all question copy and actual desktop/mobile rendered views, including supported light/dark appearances. The advisor must not invoke another advisor. Record findings, resolutions, reviewed digests, requested settings and effective settings only if reported. Approval of an earlier revision does not transfer to changed content or visuals.

If rendering tools or Advisor are unavailable, retain a draft and name the specific gap. Never manufacture approval. Use the helper's approval workflow only after genuine final approval; it records a quality review, not business agreement or permission to publish. Keep existing approved/published output available after failed refreshes.

Return the map, companion, owning artifact, what remains unresolved, evidence age, checks and review status. Hosting is optional: use Sites only when requested or updating an already authorized site. Preserve site identity, audience, iframe sandbox and both inner/outer content security policies when exporting into an existing host. Local rendering, publication and authenticated production inspection are separate results. A backlink into the owning artifact requires authorization and that stage's edit rules.

## Navigable file references

Adapt local file references to the output surface without making artifacts machine-specific.

- **Codex Desktop chat and completion reports:** resolve local files against the caller's Git root and use absolute Markdown targets ending in the verified starting line, such as `[descriptive label — lines 42–55](/absolute/repository/backend/path/to/file.py:42)`. Keep ranges only in labels. When no line is verified, link the absolute path without a suffix. Wrap targets containing spaces in angle brackets.
- **Other chat clients:** follow the active host and repository instructions instead of assuming a Codex Desktop or GitHub link form.
- **Human-readable artifact prose:** use repository-relative Markdown links such as `[descriptive label — lines 42–55](backend/path/to/file.py#L42-L55)`. When no verified line exists, link the repository-relative path without a fragment. Never write an absolute machine path into the artifact.
- **Structural fields:** preserve plain paths where a downstream parser consumes them. Do not turn frontmatter fields or another skill's load-bearing path fields into links.

Normalize role output separately at the chat boundary and the artifact-writing boundary. A role's raw backticked citation is evidence input, not the final rendering contract.

## Choice response format

When a required decision or approval remains unanswered, present the complete question in the final chat response and stop before dependent work. State the relevant evidence, why the choice matters, each option's consequence, and how to answer. Do not use asynchronous structured input as the sole carrier of the checkpoint. Synchronous structured input may be used only when the active host permits its mode, purpose, and question shape and it actually returns an answer. If it does not return an answer, the complete final-response question is still required. Never force a mode change, use an optional-only or permission-forbidden input tool for approval, or wait in a loop for an answer.

When the active host permits multiple-choice prose, render two to four finite authored options in their existing order as `A.` through `D.`; preserve the recommended option first so it becomes `A` when a recommendation exists. Put one option on each line as `A. **Label (Recommended)** — consequence.` and `B. **Label** — consequence.` Keep `(Recommended)` inside the bold label. Omit the dash and consequence only when the label itself makes the consequence clear. Checkpoint-specific option bullets below define content, not the final response format. When the active host forbids textual multiple-choice lists, ask one concise plain-text question that states the alternatives and their consequences without a lettered or bulleted list.

After a lettered list, write `Reply with A, B, ...` using only the letters shown. Add `, or write another answer` only when that checkpoint already permits a custom response. Accept an uppercase or lowercase letter, the full option label, or an unambiguous natural-language answer. Reset letters for each new question; do not letter open-ended requests for a feature description, path, correction, or other required free text. A recommendation or preselection does not choose itself.

Keep an unanswered checkpoint pending across completed turns. Resume the same step only after an unambiguous answer; tool acceptance, silence, timeout, dismissal, and unrelated messages are not answers or approval. Preserve existing authorization for unchanged scope rather than adding another gate. A pending checkpoint does not create an extra artifact, mark work ready, or advance a successor stage. If a handoff is requested later, carry the unresolved question and blocked next action in its existing sections.

## Recommended action format

When a report recommends another RPIV stage, put the bold action name outside the code fence and put only the arguments the developer should paste after selecting that skill inside a `text` fence:

````markdown
Recommended next step: **{Action}**

```text
{arguments only}
```
````

Never put `$`, a skill identifier, or explanatory prose inside the arguments fence. Put the reason after the fence. If an action takes no arguments, omit the fence. A recommendation is a handoff, never permission to invoke the stage automatically.
