# Changelog

## 0.1.0 — 2026-08-26

Initial local release of the skills-only `rpiv-codex` plugin.

### Included

- `rpivc-discover` turns a feature idea or supplied product artifact into a
  reviewable Feature Requirements Document with visible agent-dispatch gates.
- `rpivc-research` accepts either a direct prompt or one accepted Discover
  artifact, gates its tracer and adaptive analysis waves, revises one validated
  draft in place, and freezes it after **Accept**.
- The plugin bundles its deterministic helpers and specialist contracts, runs
  against the user's current project, and writes workflow artifacts beneath
  that project's `.rpiv-codex/artifacts/` directory.
- The tracked `rpiv-codex-local` marketplace provides local installation and
  iteration without project-local RPIVC skills or agent profiles.

### Release evidence

- All 87 unit tests passed.
- Discover and Research Promptfoo configurations validated.
- Fresh installed-plugin Research evaluation
  `20260826T083033564Z-44542` passed 3/3 with no failed or errored cases.
- The narrow, cross-cutting, and direct-prompt cases each scored `1.0` for the
  deterministic contract, contract and evidence, and interaction and parity
  components.
- The evaluator reported an unchanged source checkout and successful removal
  of every disposable workspace.
- Ryan manually accepted the three-case result.

Local gitignored evidence:

- [Promptfoo JSON report](/Users/ryan.reynolds/Projects/rpiv-codex/.rpiv-codex/evals/20260826T083033564Z-44542/promptfoo.json)
- [Promptfoo HTML report](/Users/ryan.reynolds/Projects/rpiv-codex/.rpiv-codex/evals/20260826T083033564Z-44542/promptfoo.html)
- [Isolation and cleanup summary](/Users/ryan.reynolds/Projects/rpiv-codex/.rpiv-codex/evals/20260826T083033564Z-44542/run-summary.json)

### Boundaries

- Skills only: no Model Context Protocol server, app, hook, or authentication
  flow.
- Local marketplace release only; nothing was pushed, remotely published, or
  submitted to the universal plugin directory.
- No automatic successor routing and no workflow stage after Research.
