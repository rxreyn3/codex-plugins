# Early Design candidate-source acceptance — 9 October 2026

Branch: `codex/design-early-resume`. Candidate is uncommitted; source content identifiers identify the evaluated inputs:

- Design skill: `git-blob:097fead2dfc0d9e9a756f649775a43b2c6ae1d10`.
- Creation progress reference: `git-blob:c25325ba080bd8923c377c7081e4950dde8ae611`.
- [Initial design fixture](fixtures/design-early/.rpiv/artifacts/designs/design.md): `git-blob:9b85b2cb084a5e96c0f832fea890b361549a08f7`.
- [Upstream fixture](fixtures/design-early/.rpiv/artifacts/research/input.md) and [current source](fixtures/design-early/src/send.js) were the only feature evidence supplied.
- [Saved reconsideration result](acceptance-evidence/design-early/reconsidered-design.md): `git-blob:0911c49d600b660681155bbc9d152da7002c9dd2`.

After the final slice-replay and legacy enrichment clarifications, the three required cases were executed again against the source fingerprints above. The repeated-resume case used the preceding reference version; its early-checkpoint behavior was unchanged by those clarifications.

Each trial used a native collaboration agent spawned with `fork_turns: none`, loaded the exact candidate skill and required reference, read the complete design and upstream artifact, checked current source fingerprints, and ran the metadata helpers in its disposable project. The parent implementation history and acceptance expectations were not supplied. These were workflow executions with real file access, not graders asked whether wording looked correct. No installed plugin or user-owned chat was created.

## Observed trials

| Trial and agent task | User input | Observed result |
| --- | --- | --- |
| Ordinary — `/root/final_ordinary` | Design `--resume .rpiv/artifacts/designs/design.md` | Recovered D1 (one transient retry), verified matching upstream/source fingerprints, reran no research roles, presented exact Q2 options directly, retained unapproved summary/decomposition. No files changed. |
| Inconsistent — `/root/final_inconsistent` | Same resume, fixture hint changed to `slices` and next action changed to generate Slice 1 | Reported hint/next-action conflict with unanswered Q2, missing summary/decomposition approvals and absent slices. Asked whether to return to Q2 or supply missing approved proposal/answer records. Generated no code and changed no files. |
| Reconsideration — `/root/final_reconsideration` | Same resume plus explicit replacement of one retry with two, retaining other settled choices | Saved superseding Q1-R1 and updated current D1, preserved original Q1 question/options/answer and its original decision record, updated dependent Scope/Performance and modification metadata, retained independent evidence and choices. No roles rerun. Read back complete document, remained in Design at `decisions`, presented Q2, left summary/decomposition unapproved. Only design changed. |
| Repeated resume — `/root/accept_repeat` | Same ordinary fixture, another fresh agent | Recovered the same D1 and exact Q2 again, no duplicate history, no role rerun or file change, no approval inferred. |

Both ordinary executions and the reconsideration execution presented this exact recovered question and ordered option content (chat styling differed):

> Where should retry failures be logged?
>
> A. Caller owns logging (Recommended) — preserve transport-layer responsibilities and avoid duplicate logs.
>
> B. send owns logging — add local diagnostic responsibility and a logger dependency.

The inconsistent trial's complete clarification question was:

> Should the saved state return to `decisions` with Q2 still pending, or are approval records missing? Please provide the intended correction or missing records; the `slices` hint cannot supply approval.

The parent independently compared before/after files: ordinary and inconsistent designs were byte-identical; reconsideration retained the original answer and appended the explicit replacement, changed only affected current decisions/coverage and metadata, and retained pending Q2 with no slice payload. Its source and upstream were unchanged.

## Verification and remaining limits

- Focused `scripts/test.sh design`: 23 passed.
- Full `scripts/test.sh`: 127 passed, including affected Plan, Revise and handoff contracts.
- `git diff --check`: passed.
- Changed skills passed the bundled skill-creator `quick_validate.py` using PyYAML through `uv`.
- `scripts/validate-plugin.sh` was attempted and exited 1 because `/Users/ryan.reynolds/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py` is absent. Two official-source raw validator locations returned 404; no validator substitution was executed. The suite's independent packaging assertions passed, but they do not replace that command.

The three required fresh-context cases and repeated resume were executed. Relevant-source-drift recovery, forced persistence/readback failure, pending summary/decomposition, legacy input, slice generation/verification, and authority-transfer boundaries are protected by source/consumer contracts; they were not all exercised as fresh-context model trials in this run. See [remaining scenarios](design-acceptance.md). Installed-plugin pickup and human acceptance were not performed; changing installed state was outside authorization. Upstream review pins and baselines were unchanged. No commit, push, publication, or installation occurred.


## Validator gap resolved — 12 October 2026

The historical failure above is retained as the record of the original acceptance run. OpenAI removed the bundled plugin-creator skill, including the system validator path expected by our runner. `scripts/validate-plugin.sh` now uses a byte-identical, repository-local copy of the last official validator and its identifier helper at openai/codex commit `985cf47a4eb6084b2ff6b30ebdb1216acda85bb4`, with original license, notice and source fingerprints. See [validator provenance and scope](../scripts/vendor/codex-plugin-validator/README.md).

- `scripts/validate-plugin.sh` passed for both `rpiv-codex` and `codex-advisor`.
- Seven disposable-package validator tests passed, covering valid input, missing/malformed manifests, malformed version/unknown fields, missing/malformed skills, invalid invocation policy, missing/escaping assets and the upstream missing-skills limitation.
- Runner regression passed with an absent `CODEX_HOME` system validator; it also confirmed that a validator failure stops the runner and preserves its nonzero exit status.
- Full `scripts/test.sh`: 128 passed after adding the runner regression.
- Vendored Python files byte-match the pinned official source; `git diff --check` passed.

No installed plugin state, user configuration, upstream RPIV review baseline, commit, push or publication changed. This closes the missing-validator gap, not the separately recorded installed-plugin and human acceptance limits.
