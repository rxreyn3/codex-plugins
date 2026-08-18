# Manual discovery fixture: repository drift before dispatch

Use this fixture to verify that a conversational **Run** applies only to the displayed repository snapshot.

## Paste this prompt into the Codex editor

Paste only this block into a fresh task rooted at `/Users/ryan.reynolds/Projects/rpiv-codex`:

```text
$rpivc-discover In rpiv-codex, improve how final discovery artifacts present their source links.
```

## Answers to give only when asked

Do not paste the rest of this file into the editor. Use the answers from [the clickable-source-links fixture](/Users/ryan.reynolds/Projects/rpiv-codex/tests/fixtures/discover/06-clickable-source-links.md), one at a time and only when discovery asks.

## Operator steps

1. Continue until discovery displays its first locator card. Do not answer **Run** yet.
2. Record the displayed repository, branch, commit, and working-tree SHA-256.
3. Make one harmless, reversible Git-visible change outside `.rpiv-codex/`, such as adding a temporary line to a scratch fixture. Do not change the displayed card in chat.
4. Answer **Run**.
5. After observing the gate behavior, restore the temporary change manually.

## Expected behavior

- Discovery recomputes repository context before dispatch.
- It detects that the working-tree SHA-256 differs.
- It runs no agent under the stale card.
- It displays a complete refreshed card containing the new snapshot and requires another **Run / Edit / Omit / Stop** decision.
- Restoring the source change before the second decision changes the snapshot again and therefore requires another refreshed card. Slightly annoying, entirely honest.
- No dispatch or approval artifact is written during the exercise.
