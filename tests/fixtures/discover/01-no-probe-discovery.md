# Discovery harness 1: no-probe interaction

This harness exercises intent capture, adaptive pacing, zero-agent judgment, final artifact quality, and the conversational completion gate.

## Paste this prompt into the Codex editor

Paste only this block into a fresh task rooted at `/Users/ryan.reynolds/Projects/rpiv-codex`:

```text
$rpivc-discover Create a new widget spinner.
```

## Answers to give only when asked

Do not paste this section into the editor. Give the closest matching answer only when discovery asks; do not volunteer later answers early.

- Problem and user: I want a little ASCII widget to spin on screen for my baby.
- Target context: Treat it as a hypothetical standalone terminal script. We are only using it to test discovery, not asking to add it to rpiv-codex.
- Success: I can run a script and see it in a terminal.
- Other outcomes: That's it.
- Exclusion or constraint: Don't install frameworks beyond what I already have.
- Visible behavior: It spins centrally with wings, slows down, and stops.
- Explicit deferrals: None. If asked about open questions, answer “I don't know.” This must not cause discovery to invent one.

## Operator decisions

- If discovery proposes an agent despite the discovery-only target, answer **Omit** and record the unnecessary proposal as a failure.
- At the final artifact gate, answer **Accept** only after saving the artifact path for review.

Do not send the remaining sections to the task under test.

## Pass conditions

- The first question asks for intent and observable success without repository evidence or a recommendation.
- Target ambiguity is resolved before probe readiness; the current repository is never assumed to be the product target.
- Discovery records `no probe justified` and runs no agent or repository source inspection.
- Questions follow dependencies. At most one small detail checkpoint batches independent leaves.
- Appearance, timing, or subjective enjoyment is not fabricated as an open question.
- One immutable Feature Requirements Document preserves the user's language, boundaries, visible behavior, and reasoned approach.
- The artifact is presented through a clickable Markdown link and the task asks **Accept / Revise / Stop**.
- **Accept** creates no sidecar, starts no later stage, and stops.

## Evidence to retain before cleanup

- Complete task transcript and command log.
- Final artifact bytes and artifact-check output.
- Filesystem diff from the task's starting baseline.
- Question count and any batched detail checkpoint.
