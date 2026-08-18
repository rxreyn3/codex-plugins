# Manual discovery fixture: clickable source links

Use this fixture to exercise a justified brownfield probe and dependent conversational agent gates.

## Paste this prompt into the Codex editor

Paste only this block into a fresh task rooted at `/Users/ryan.reynolds/Projects/rpiv-codex`:

```text
$rpivc-discover In rpiv-codex, improve how final discovery artifacts present their source links.
```

## Answers to give only when asked

Do not paste this section into the editor. Use the closest matching answer when discovery asks; do not volunteer later answers early.

- Problem and user: I review discovery artifacts in Codex, but paths rendered as code or frontmatter values are not clickable, so navigating to evidence is tedious.
- Target context: The current rpiv-codex repository is explicitly the product target.
- Success: Human-facing artifact, lineage, and source `file:line` references open when clicked in Codex.
- Scope: Use concise repository-relative labels with absolute local Markdown-link targets in the artifact body and final chat response.
- Non-goal: Do not change Codex's renderer, make YAML frontmatter interactive, add approval records, or change another workflow stage.
- Constraint: Keep frontmatter machine-readable; repeat useful lineage in the body. Avoid long paths in Markdown tables.
- Shape preference: Prefer linked lists for dispatch history and references because long path tables wrap poorly.
- Acceptance: The final artifact link opens; body lineage links open their files; source citations open the named line; navigable paths are not wrapped in backticks; no dispatch or approval file is created.
- Explicit deferrals: None.

Expected probe and gate behavior:

- Do not ask whether rpiv-codex is the product target; the pasted prompt already resolves it.
- Display only the smallest justified card set directly in chat. A locator-only first wave is expected unless exact analyzer anchors are already known.
- The displayed card must contain the exact prompt, current repository snapshot, model, reasoning, sandbox disclosure, behavioral permissions, budget, evidence schema, and stop condition.
- Run no agent and write no dispatch file before the user answers **Run**.
- If the user answers **Edit**, show the complete revised card and wait again. **Omit** removes the role; **Stop** ends discovery.
- If locator evidence justifies behavioral analysis, display a new analyzer-only card containing the actual anchors. The locator decision does not authorize it.
- Record completed roles and incorporation decisions in the final artifact's linked-list Dispatch Ledger.
- Present the final artifact as a clickable link and ask **Accept / Revise / Stop**.
