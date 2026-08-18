# Manual discovery fixture: existing artifact refinement

## Paste this prompt into the Codex editor

Paste only this block into a fresh task. The quoted sentence is the supplied draft artifact:

```text
$rpivc-discover Refine this existing draft: “Let users save searches.”
```

## Answers to give only when asked

Do not paste this section into the editor. Use the closest matching answer when discovery asks; do not volunteer later answers early.

- Target context: The pasted sentence is the artifact to refine. This is only a discovery fixture, not a request to add saved searches to rpiv-codex.
- Problem and user: Support operators repeat the same multi-filter searches every day and rebuild them manually.
- Success: An operator can name the current filter set, reopen it later, and get the same query.
- Scope: Personal saved searches, create, open, rename, and delete.
- Non-goal: No sharing, team defaults, notifications, or search-language changes.
- Constraint: Respect existing authorization and tenant boundaries; duplicate names are not allowed for one user.
- Shape preference: Saved entries should appear beside recent searches if that fits the confirmed interface precedent.
- Acceptance: The four operations persist across sessions; deleted entries disappear; another user cannot see or open them; invalid saved filters fail visibly.
- Explicit deferrals: None.
