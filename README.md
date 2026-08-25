# rpiv-codex

A lightweight, human-gated Codex port of valuable RPIV-Pi workflow behavior.

Current checkpoint: `rpivc-discover` and `rpivc-research` are accepted repository-local units. Research is implemented against its [accepted specification](/Users/ryan.reynolds/Projects/rpiv-codex/specs/rpivc-research.md), preserves both a direct prompt and one accepted discovery artifact as input, revises one review draft in place, and freezes it after **Accept**. Its fresh three-case repository-local release evaluation passed 3/3 on 2026-08-25 and was manually accepted. No later workflow stage is implemented.

The canonical source now lives in the skills-only `rpiv-codex` plugin under `plugins/rpiv-codex/`. Repository-local `.agents/skills` and `.codex/agents` paths are development symlinks to that source. The plugin bundles its helpers and specialist authoring contracts, runs them against the user's current project, and writes artifacts only beneath that project's `.rpiv-codex/artifacts/`. It contributes no Model Context Protocol server, app, hook, authentication flow, or automatic successor stage.

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

## Local plugin installation

The tracked repository marketplace is `.agents/plugins/marketplace.json`, with marketplace identity `rpiv-codex-local` and plugin base version `0.1.0`.

```sh
codex plugin marketplace add "$(pwd)"
codex plugin add rpiv-codex@rpiv-codex-local
```

Start a new Codex task after installation or reinstallation; existing tasks keep the plugin inventory captured when they started. Invoke `$rpivc-discover` or `$rpivc-research` from the unrelated project you want to work on. The project does not need its own RPIVC skills or custom agent profiles.

During local iteration, use Codex's `plugin-creator` cachebuster helper on `plugins/rpiv-codex/`, reinstall from `rpiv-codex-local`, and test from another new task. Do not hand-edit Codex's plugin cache or marketplace configuration.

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
