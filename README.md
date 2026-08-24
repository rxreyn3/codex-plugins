# rpiv-codex

A lightweight, human-gated Codex port of valuable RPIV-Pi workflow behavior.

Current checkpoint: `rpivc-discover` is accepted at commit `bc94805`. The independently reviewable `rpivc-research` candidate is implemented against its [accepted specification](/Users/ryan.reynolds/Projects/rpiv-codex/specs/rpivc-research.md). Research preserves RPIV-Pi's two entry modes: a lightweight direct prompt or one accepted discovery artifact. A run owns one review-draft path, **Revise** changes and revalidates those bytes in place, and **Accept** freezes them. The fresh three-case release evaluation on 2026-08-24 remains unaccepted: the latest run passed 0/3 with zero harness errors, so Research and plugin packaging remain gated pending workflow reliability fixes. No later workflow stage is implemented.

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

Research uses the same evaluation discipline through direct-prompt, discovery-backed narrow, and cross-cutting cases. Its evaluator independently attests every fresh child and archives it immediately after capturing effective runtime settings. It also records evaluation-only artifact path and hash observations so the revision case proves one validated path changed without creating duplicate workflow artifacts.

Useful entry points:

- [Evaluation guide](/Users/ryan.reynolds/Projects/rpiv-codex/evals/README.md)
- [Discovery configuration](/Users/ryan.reynolds/Projects/rpiv-codex/evals/discover/promptfooconfig.yaml)
- [Research configuration](/Users/ryan.reynolds/Projects/rpiv-codex/evals/research/promptfooconfig.yaml)
- [Parity matrix](/Users/ryan.reynolds/Projects/rpiv-codex/PARITY.md)
- [Implementation plan](/Users/ryan.reynolds/Projects/rpiv-codex/PLAN.md)
- [`rpivc-research` specification](/Users/ryan.reynolds/Projects/rpiv-codex/specs/rpivc-research.md)

```sh
npm test
npm run eval:discover:validate
npm run eval:discover
npm run eval:research:validate
npm run eval:research
npm run eval:view
```
