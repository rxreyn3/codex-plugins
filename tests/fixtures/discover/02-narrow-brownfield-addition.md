# Manual discovery fixture: narrow brownfield addition

## Paste this prompt into the Codex editor

Paste only this block into a fresh task:

```text
$rpivc-discover Add a --json option to the existing status command.
```

## Answers to give only when asked

Do not paste this section into the editor. Use the closest matching answer when discovery asks; do not volunteer later answers early.

- Target context: This is a brownfield parity scenario, not a request to add a status command to rpiv-codex. No live product repository is available in this conversation-only run.
- Problem and user: People scripting the command have to scrape human-readable output.
- Success: The same status facts are emitted as stable machine-readable JSON when explicitly requested.
- Scope: Additive option on the existing command; default output remains byte-for-byte unchanged.
- Non-goal: No new API, schema negotiation, or changes to other commands.
- Constraint: Reuse current status collection and current command-line parser.
- Shape preference: One documented object with existing field names where they already exist.
- Acceptance: Default behavior is unchanged; `--json` emits valid JSON; errors retain a nonzero exit; focused tests cover both modes.
- Explicit deferrals: None.
