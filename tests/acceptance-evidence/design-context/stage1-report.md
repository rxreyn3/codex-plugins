# Design context handling: Stage 1 source acceptance

Date: 2026-10-26. Scope: the local Design skill candidate, without installation or publication. Selective source reading is not implemented. All first-read source coverage, required research roles, human approvals, independent slice verification and fresh-task boundaries remain required.

## Result

The candidate supports durable partial-input recovery and passed the exercised evidence-preservation and workflow-boundary cases. One paired source trial used 8.3% less incremental parent context at the same verified milestone. It required more calls and generated more output tokens. This is a modest context-size improvement, not an established reduction in overall cost or latency.

The approximately 4,000-token output target is an instruction, not a harness-enforced limit. The candidate still produced truncation warnings and recovered them. No missing source coverage or false role completion remained at the measured milestone. There is no basis for claiming truncation has been eliminated.

## Changes and unchanged boundaries

- Start creates and reads back the single artifact after the complete upstream read, before deep source reads. Its Input evidence queue records exact content baselines, verified ranges, findings and unfinished work.
- Resume reconciles the queue before research routing. Matching fingerprints plus explicit saved coverage permit reuse; changed files or missing baselines require affected rereads. Connection and configuration searches check for additions outside the old fingerprint list.
- Combined outer and inner output budgets, connector representation handling, targeted truncation recovery and chunk-level persistence are explicit. Execution storage is temporary.
- The first-read policy still covers complete required files. No new frontmatter, workflow-step values, runtime commands, approval gates, preliminary reader roles or automatic chats were introduced.

## Controlled pilot

Both arms used fresh native agents, the same synthetic five-file fixture and the same completed-input-plus-first-verified-Codebase-Analyzer milestone. Each used one native read-only analyzer child. Native turn metadata records `gpt-6.1-sol` at `medium` effort for both parents and children. This is one exploratory pair, with no statistical or minimum-saving claim.

The fixture contains a 713-line shared module, a configuration export after 700 historical comments, two callers with different attempt settings, and a misleading test comment. A predefined source checklist was outside both research projects. Parent inspection of both saved designs found the same critical behavior, inherited constraints and remaining unknowns, including the distinction between ordinary error identity and null/undefined rejections. Neither arm executed the product or claimed deployed behavior.

| Recorded measure | Original | Candidate |
| --- | ---: | ---: |
| Parent first-response input | 42,272 | 42,273 |
| Parent milestone / peak input | 98,162 | 93,546 |
| Incremental parent input | 55,890 | 51,273 |
| Parent tool calls | 19 | 25 |
| Parent truncated outputs | 2 | 3 |
| Parent output tokens, summed across responses | 6,442 | 8,395 |
| Parent input tokens, summed across responses | 1,604,810 | 1,957,952 |
| Parent visible tool-output characters | 251,957 | 203,382 |
| Repeated long-comment bytes, lower bound | 75,762 | 5,520 |
| Analyzer child peak input | 76,506 | 64,472 |
| Analyzer child summed response input | 430,125 | 523,479 |

Input includes cached input. Summed response input counts repeated processing across calls; it is not window occupancy or a price calculation. Repeated-comment bytes count exact synthetic long-comment text delivered more than once after unescaping shell envelopes; they exclude other source and newline bytes. Visible characters are not model tokens.

The candidate reduced incremental parent input by 4,617 tokens and peak parent input by 4,616 tokens. More checkpoint work and calls accompanied these savings; this pair cannot isolate their individual contribution. Child differences are observed measurements, not proof that changing parent instructions caused them.

Confounds: the candidate initially hit the shared agent-capacity limit and retried after a slot opened. Its skill-body read, a source chunk and a broad search truncated; missing evidence was recovered. The original also truncated initial source reads and recovery. Both eventually inspected all 700 historical comments and the executable tail. The original naturally reused some unchanged earlier reads after its analyzer returned. Agent behavior and hidden prompt/schema equivalence were not exhaustively controlled. Connector normalization was tested separately, not exercised by the benchmark fixture.

Reproduction and audit evidence:

- [Measurements, native thread identifiers, usage-event lines, fingerprints and checklist](measurements.json).
- [Parent dispatch text](dispatch-prompts.json). Disposable absolute roots identify the actual trial; substitute a new root for reproduction.
- [Fixture reproducer](reproduce-fixture.mjs): run `node tests/acceptance-evidence/design-context/reproduce-fixture.mjs <new-project-root>`, then initialize an empty Git repository without a commit. Its output was checked byte-for-byte against all five original input files.
- [Original saved design](original-design.md) and [candidate saved design](candidate-design.md). Required remaining roles, dimensions and approvals are explicitly unfinished.
- Original parent native thread: `01a17823-1618-7763-8326-f502bd0807e0`; candidate: `01a17825-1fa8-7d01-9005-f9ed12d30bb6`. Local native rollouts retain tool actions and token records; raw rollouts containing shared instructions are not copied into the repository.

## Behavioral source trials

| Case | Observed result |
| --- | --- |
| Early interruption | Artifact created/read back before source content; complete upstream and send input saved; inspection 1–350/703 saved as partial, with later lines unread. |
| Cold resume without temporary store | Fresh agent compared fingerprints, reused send 1–3 and inspection 1–350, searched relevant connections, then read 351–525 and 526–703. Input completed; research and approvals remained unfinished. Targeted search matches were not counted as replayed full reads. |
| Changed partial source | Same branch, changed observation100; only inspection invalidated and all 703 lines reread. Independent send evidence retained. |
| Missing content baseline | Historical ranges did not substitute for the missing fingerprint. Inspection reread in full; unrelated evidence retained. |
| Damaged coverage wording | Other saved records still established coverage through 350; safely reconciled. This does **not** establish recovery from genuinely missing or contradictory coverage. |
| New caller/configuration | Discovered new caller with target unchanged. Found attempts:99 configuration but correctly recorded it as unwired, not enforced behavior. Affected scanner evidence reopened; D1 and unanswered Q2 preserved. |
| Exact duplicate envelope | Actual orchestration retained raw response and emitted the repeated payload once, with extra text warning, cursor, provenance and `isError: false` retained. An unavailable TextEncoder attempt failed before mutation and was corrected. |
| Distinct/error/page envelopes | Preserved text-only warning, distinct configuration pointer, cursors, nested SOURCE_UNAVAILABLE, error flag and provenance. Unavailable pages/configuration remained explicit gaps; envelope case stayed in input. |
| Truncation recovery | Actual source-output truncations and a synthetic truncated-result signal did not establish complete coverage. Missing ranges were recovered before source completion was saved. |
| Ordinary older modern artifact | Recovered exact pending Q2 and D1 without manufacturing a historical queue or changing the artifact merely to resume. |
| Invalid legacy artifact | Missing workflow_step plus unapproved empty skeleton caused an explicit stop; artifact unchanged. |
| Save failure | Normal save against read-only fixture failed with PermissionError 13. Dependent work stopped; no permission workaround or saved-answer claim; artifact unchanged. |

See the [cold-resume artifact](cold-resume-design.md), [boundary observations and hashes](boundary-results.json), and [invalidation/envelope observations](invalidation-envelope-results.json). These are synthetic static-source trials, not provider or product runtime evidence.

The coherent legacy-approved-slice happy path, every finalization/authority-transfer permutation, a deliberately injected post-write readback mismatch, genuinely missing coverage with a valid baseline, and connector shapes beyond the fixtures were not freshly exercised. Existing prompt-contract checks cover those unchanged boundaries where applicable; that is a different verification level. No exhaustive acceptance claim is made.

## Checks and disposition

- `bash scripts/test.sh design`: 28 passed.
- `bash scripts/test.sh plan`: 18 passed.
- `bash scripts/test.sh revise`: 16 passed.
- `bash scripts/test.sh`: full suite, 165 passed before committing the source candidate.
- `bash scripts/validate-plugin.sh`: both plugins validated.
- `git diff --check`: passed.
- Independent focused source review: no actionable findings; static review only.

Stage 1 is a measured source candidate. No critical omission, false completion or approval regression was found in exercised cases. No installation, publication, global-setting change, upstream repin or other-skill modification occurred. Consider selective reading only through a separately authorized experiment; this result does not promote it automatically.
