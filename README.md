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

Promptfoo now owns the repeatable discovery evaluation. It drives the real repository-local skill through Codex app-server tasks in disposable clones, using two synthetic multi-turn cases, deterministic assertions, safe child-runtime attestations, and two independent read-only agent graders. It does not run RPIV-Pi or repair the product during a baseline.

Useful entry points:

- [Evaluation guide](/Users/ryan.reynolds/Projects/rpiv-codex/evals/README.md)
- [Discovery configuration](/Users/ryan.reynolds/Projects/rpiv-codex/evals/discover/promptfooconfig.yaml)
- [Parity matrix](/Users/ryan.reynolds/Projects/rpiv-codex/PARITY.md)
- [Implementation plan](/Users/ryan.reynolds/Projects/rpiv-codex/PLAN.md)

```sh
npm test
npm run eval:discover:validate
npm run eval:discover
npm run eval:view
```
