# RPIV Codex

![RPIV Codex workflow from intent to verified change, with Blueprint and Design-to-Plan routes, revision, and handoffs](docs/assets/rpiv-codex-workflow.png)

RPIV Codex is an independent Codex-native port of the RPIV feature-development workflow. It helps developers take an unclear request through discovery, grounded research, design, planning, implementation, validation, local commits, and verified code review.

The workflow is deliberately controlled rather than autonomous. Each skill owns one stage, writes or updates a durable artifact when appropriate, and stops at an explicit boundary. A recommended next stage is a handoff—not permission to continue changing code, committing, pushing, or publishing.

## Install

Add this repository as a Codex marketplace and install the RPIV workflow plugin:

```bash
codex plugin marketplace add rxreyn3/rpiv-codex --ref main
codex plugin add rpiv-codex@rpiv-codex
```

Start a fresh Codex task after installation so the skills are loaded.

The repository also publishes [Codex Advisor](docs/CODEX-ADVISOR.md), an optional separate plugin for focused second opinions:

```bash
codex plugin add codex-advisor@rpiv-codex
```

## Choose a workflow

Start with the stage that matches what you already know. You do not need to run every stage.

```text
                         ┌────────► Blueprint ────────┐
Discover ──► Research ───┤                            ├──► Implement ──► Validate ──► Commit ──► Code Review
                         └────────► Design ──► Plan ──┘

                                       Revise the current design or plan when evidence changes
                              Create Handoff ↔ Resume Handoff whenever work must cross tasks
```

There are two routes from research to an implementation plan:

- **Blueprint** produces one reviewed phased plan in a combined workflow. It accepts a ready research or solutions artifact, a well-scoped feature description, or recent-artifact selection.
- **Design → Plan** separates architectural design from plan production. Use it when design needs to be developed, verified, and resumed one vertical slice at a time before becoming an implementation plan.

### Choose your starting point

| When you need to… | Use | Result |
| --- | --- | --- |
| Turn an idea or product artifact into explicit requirements | [`$rpivc-discover`](plugins/rpiv-codex/skills/rpivc-discover/SKILL.md) | A Feature Requirements Document under `.rpiv/artifacts/discover/` |
| Investigate repository behavior or an external contract without implementing | [`$rpivc-research`](plugins/rpiv-codex/skills/rpivc-research/SKILL.md) | Grounded research under `.rpiv/artifacts/research/` |
| Produce one reviewed phased plan directly | [`$rpivc-blueprint`](plugins/rpiv-codex/skills/rpivc-blueprint/SKILL.md) | An implementation-ready plan under `.rpiv/artifacts/plans/` |
| Resolve architecture and decompose complex work one slice at a time | [`$rpivc-design`](plugins/rpiv-codex/skills/rpivc-design/SKILL.md) | A resumable design under `.rpiv/artifacts/designs/` |
| Convert a ready design into a reviewed implementation plan | [`$rpivc-plan`](plugins/rpiv-codex/skills/rpivc-plan/SKILL.md) | A plan preserving the design's approved slices and success criteria |
| Update the current design or plan after feedback or new evidence | [`$rpivc-revise`](plugins/rpiv-codex/skills/rpivc-revise/SKILL.md) | A reviewed, history-preserving artifact revision |
| Execute an approved plan, one phase or the full plan | [`$rpivc-implement`](plugins/rpiv-codex/skills/rpivc-implement/SKILL.md) | Source changes checked against each phase's criteria |
| Audit an implementation against its plan | [`$rpivc-validate`](plugins/rpiv-codex/skills/rpivc-validate/SKILL.md) | An evidence-backed report under `.rpiv/artifacts/validation/` |
| Group current changes into atomic local commits | [`$rpivc-commit`](plugins/rpiv-codex/skills/rpivc-commit/SKILL.md) | An approved local commit or commit series; never a push |
| Review pending changes, a commit, branch, range, folder, or files | [`$rpivc-code-review`](plugins/rpiv-codex/skills/rpivc-code-review/SKILL.md) | A verified review under `.rpiv/artifacts/reviews/` |
| Preserve in-flight work before changing tasks | [`$rpivc-create-handoff`](plugins/rpiv-codex/skills/rpivc-create-handoff/SKILL.md) | A concise state snapshot under `.rpiv/artifacts/handoffs/` |
| Continue from a handoff after verifying current repository state | [`$rpivc-resume-handoff`](plugins/rpiv-codex/skills/rpivc-resume-handoff/SKILL.md) | An approved continuation from the next concrete task |

## Examples

Start from a feature idea:

```text
$rpivc-discover Add a safe way for users to retry a failed checkout payment without creating a duplicate charge
```

Research a ready discovery artifact:

```text
$rpivc-research Trace the current payment-attempt lifecycle and idempotency controls using .rpiv/artifacts/discover/2026-09-29_09-00-00_checkout-retry.md
```

Create a plan directly with Blueprint:

```text
$rpivc-blueprint .rpiv/artifacts/research/2026-09-29_10-00-00_checkout-retry.md
```

Or start the resumable Design route:

```text
$rpivc-design .rpiv/artifacts/research/2026-09-29_10-00-00_checkout-retry.md
```

If another design slice remains, resume it in a fresh task:

```text
$rpivc-design --resume .rpiv/artifacts/designs/2026-09-29_11-00-00_checkout-retry.md
```

Once the design is ready, turn it into a plan:

```text
$rpivc-plan .rpiv/artifacts/designs/2026-09-29_11-00-00_checkout-retry.md
```

Implement one approved phase when you want a checkpoint-sized change:

```text
$rpivc-implement .rpiv/artifacts/plans/2026-09-29_12-00-00_checkout-retry.md Phase 2
```

Or implement the complete ready plan, then validate it after every phase is finished:

```text
$rpivc-implement .rpiv/artifacts/plans/2026-09-29_12-00-00_checkout-retry.md
$rpivc-validate .rpiv/artifacts/plans/2026-09-29_12-00-00_checkout-retry.md
```

Commands above are prompts to enter in Codex, not shell commands. Artifact paths are examples; use the paths produced by your own run.

## Update

Refresh the marketplace snapshot and reinstall whichever plugins you use:

```bash
codex plugin marketplace upgrade rpiv-codex
codex plugin add rpiv-codex@rpiv-codex
codex plugin add codex-advisor@rpiv-codex  # optional
```

Start a fresh Codex task after updating.

## Remove

```bash
codex plugin remove rpiv-codex@rpiv-codex
codex plugin remove codex-advisor@rpiv-codex  # if installed
codex plugin marketplace remove rpiv-codex
```

## Maintainer workflow

New skills are developed and accepted one at a time using an ignored, cache-busted local marketplace copy. Public releases use clean semantic versions and treat pushes to `main` as the publication boundary.

- [Development workflow](docs/DEVELOPMENT.md)
- [Release workflow](docs/RELEASING.md)

## Origin and attribution

RPIV Codex is a port and adaptation of [`@juicesharp/rpiv-pi`](https://github.com/juicesharp/rpiv-mono/tree/main/packages/rpiv-pi), created by [Sergii Guslystyi (`juicesharp`)](https://github.com/juicesharp).

The port is based on [`rpiv-pi` commit `7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7`](https://github.com/juicesharp/rpiv-mono/tree/7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7/packages/rpiv-pi). Its workflows, specialist prompts, templates, and helper scripts have been copied or adapted to replace Pi-specific mechanics with Codex-native skills, tools, collaboration, artifact references, and plugin packaging.

This repository is maintained independently by Ryan Reynolds. It is not an official RPIV-Pi release and is not affiliated with or endorsed by the upstream author.

## License

RPIV Codex is distributed under the [MIT License](LICENSE). The license preserves the upstream `juicesharp` copyright and identifies Ryan Reynolds's copyright in the Codex adaptation.
