# rpiv-codex

A lightweight, human-gated Codex port of valuable RPIV-Pi workflow behavior.

Current checkpoint: `rpivc-discover`, shared deterministic artifact helpers, and the locator and analyzer discovery agents. No later workflow stage is implemented.

Discovery keeps review inside the conversation:

```text
intent + explicit target context
  -> no probe when evidence cannot help
  -> or visible minimal agent card
       -> Run / Edit / Omit / Stop
       -> bounded evidence probe
  -> adaptive discovery interview
  -> immutable Feature Requirements Document
  -> Accept / Revise / Stop
```

Only final stage artifacts are written. They remain local under the gitignored `.rpiv-codex/` directory. There are no dispatch manifests, approval records, resume commands, or automatic next stages.

See [the parity matrix](/Users/ryan.reynolds/Projects/rpiv-codex/PARITY.md), [the manual checkpoint](/Users/ryan.reynolds/Projects/rpiv-codex/MANUAL-TEST.md), [the reusable forward-testing guide](/Users/ryan.reynolds/Projects/rpiv-codex/tests/FORWARD-TESTING.md), and [the implementation plan](/Users/ryan.reynolds/Projects/rpiv-codex/PLAN.md).
