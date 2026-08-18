# Manual discovery fixture: terminal spinner regression

This fixture reproduces the earlier bucket-filling failure.

## Paste this prompt into the Codex editor

Paste only this block into a fresh task:

```text
$rpivc-discover Create a new widget spinner.
```

## Answers to give only when asked

Do not paste this section into the editor. Use the closest matching answer when discovery asks; do not volunteer later answers early.

- Problem and user: I want a little ASCII widget to spin on screen for my baby.
- Target context: Treat it as a hypothetical standalone terminal script. We are only using it to test discovery, not asking to add it to rpiv-codex.
- Success: I can run a script and see it in a terminal.
- Other outcomes: That's it.
- Exclusion or constraint: Don't install frameworks beyond what I already have.
- Visible behavior: It spins centrally with wings, slows down, and stops.
- Explicit deferrals: None. If asked about open questions, answer “I don't know.” This must not cause the workflow to invent one.

Focused behavioral checks:

- After the success and framework answers, do not ask redundant “other goals” or “other constraints” questions.
- Resolve the ambiguous target before deciding probe readiness; never assume rpiv-codex is the product repository.
- Because this is a discovery-only hypothetical, do not propose a codebase agent merely to fill a roster.
- Ask what the user can run and observe, not how to determine whether the baby enjoys it.
- Let one answer resolve multiple decision branches.
- Do not propose appearance or timing as a fabricated deferral.
- Still resolve visible behavior and a reasoned recommended approach before finishing.
- Write only one final discovery artifact; do not create dispatch or approval files.
- Present the artifact as a clickable Markdown link and ask **Accept / Revise / Stop**.
- **Accept** must write no sidecar record and start no later stage.
