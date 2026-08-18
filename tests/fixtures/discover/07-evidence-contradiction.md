# Manual discovery fixture: evidence contradicts the proposed problem

Use this fixture to prove that repository evidence can correct the problem statement rather than merely decorate a predetermined feature.

## Paste this prompt into the Codex editor

Paste only this block into a fresh task rooted at `/Users/ryan.reynolds/Projects/rpiv-codex`:

```text
$rpivc-discover In rpiv-codex, add a --compact option to artifact inspection because scripts have to scrape its human-readable output.
```

## Answers to give only when asked

Do not paste this section into the editor. Use the closest matching answer when discovery asks; do not volunteer later answers early.

- Initial problem and user: Local scripts need structured artifact information and I assumed the helper prints prose.
- Target context: The current rpiv-codex repository is explicitly the product target.
- Initial success claim: Scripts can parse the helper output without scraping prose.
- When evidence shows the helper already emits JSON: Confirm that scripts invoke `artifact-check.mjs` directly, not a conversational summary.
- When asked what fails with existing multiline JSON: Nothing fails; I had not realized the command already emits JSON.
- Resolution: Drop the proposed `--compact` feature. Do not invent a whitespace or performance problem to preserve it.
- Non-goal: Do not turn compact JSON, fewer fields, or conversational summaries into requirements.
- Explicit deferrals: None.

Expected contradiction behavior:

- Start with the smallest justified conversational probe; no agent runs before **Run**.
- Surface the repository fact that direct helper output is already structured JSON.
- Ask the differentiating question: whether scripts invoke the helper directly or consume conversational prose, and what specifically fails with multiline JSON.
- Keep the contradiction open until the user answers. Never write `Open Questions: None` while the stated problem conflicts with evidence.
- After the user says nothing fails and drops the feature, stop without manufacturing a replacement requirement.
- If an artifact is produced to record the stopped discovery, it must say the proposed feature was withdrawn rather than recommending implementation.
