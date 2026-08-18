# Manual discovery fixture: vague greenfield feature

## Paste this prompt into the Codex editor

Paste only this block into a fresh task:

```text
$rpivc-discover I want a tiny local focus timer.
```

## Answers to give only when asked

Do not paste this section into the editor. Use the closest matching answer when discovery asks; do not volunteer later answers early.

- Target context: This is only a discovery fixture, not a request to add the timer to rpiv-codex.
- Problem and user: I lose track of short focus sessions while coding; this is just for me.
- Success: I can start a timer from the terminal, see time remaining, and get a clear terminal notification when it finishes.
- Scope: One active timer only.
- Non-goal: No accounts, cloud synchronization, or graphical application.
- Constraint: Use the repository's existing runtime and no new framework.
- Shape preference: Prefer the simplest option that keeps state only for the current process.
- Acceptance: A command starts a chosen duration, updates visibly, and exits cleanly after notifying me.
- Explicit deferrals: None.
