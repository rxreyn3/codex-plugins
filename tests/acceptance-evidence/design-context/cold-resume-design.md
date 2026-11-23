---
date: 2026-10-26T13:18:42+0100
author: Ryan Reynolds
commit: no-commit
branch: main
repository: recovery-project
topic: Bounded retry
tags: [design, retry]
status: in-progress
workflow_step: research
parent: .rpiv/artifacts/research/input.md
last_updated: 2026-10-26T13:21:26+0100
last_updated_by: Ryan Reynolds
---
# Design: Bounded retry

## Workflow Progress
- **Completed work:** validated ready upstream; read upstream completely, lines 1–17. src/send.js complete, lines 1–3; src/inspection.js complete through line 703; initial required input collection verified complete. Unchanged prior coverage reused after baseline and connection checks. Initial design was created and completely read back before any source content reads. No research, dimensions, or approvals completed.
- **Next action:** Step 2: run required targeted research roles on a later continuation. Stopped immediately after verified input completion and research-step save/readback under the bounded trial override; no research roles run.
- **Evidence baseline:** repository revision no-commit, branch main. Upstream fingerprint ffcf66ebdf5f93a680b31d8d0ce808058c1abd51 supports inherited requirements below. Source fingerprints recorded before source reads. Current path inventory: src/send.js, src/inspection.js, .rpiv/artifacts/research/input.md, synthetic-tool-results/truncated.json, synthetic-tool-results/error.json, synthetic-tool-results/distinct.json. Git status: untracked .rpiv/, src/, synthetic-tool-results/. Cold resume reconfirmed all three fingerprints, ready upstream contents, no-commit revision, and unchanged inventory (plus this design). Established connection/configuration search: repository-wide hidden files excluding .git/, .rpiv/, synthetic-tool-results/, terms send|transport|inspection|retry|cancel|import|require|route|register|config|event|job. Only src/send.js lines 1–2 and src/inspection.js lines 1, 352, 703 matched; no additional callers, imports, registrations, or configuration paths found. Current untracked inventory inspected; no tracked revision exists for a historical diff. No invalidating drift established. Verified source claim: src/send.js lines 1–3 directly delegates to injected transport, without retry or logging.
- **Input evidence:**
  - .rpiv/artifacts/research/input.md; owner Step 1; revision no-commit; fingerprint ffcf66ebdf5f93a680b31d8d0ce808058c1abd51; extent 17 lines; inspected 1–17; state complete. Findings: injected transport and send entry point must remain; inherited one retry and caller-owned failure logging; caller cancellation required; no request-body or credential logging. Gap none; next action compare baseline on resume.
  - src/send.js; owner Step 1; revision no-commit; fingerprint c704512c8b66071264cff105df1771040bdf9b22; extent 3 lines; inspected 1–3; state complete. Findings: send(request, transport) directly returns transport(request), preserving the injected transport; no retry, delay, or logging exists in this file ([lines 1–3](src/send.js#L1-L3)). Fingerprint reconfirmed after reading. Gap none; next action reuse on matching baseline during resume.
  - src/inspection.js; owner Step 1; revision no-commit; fingerprint 5c66a97198aaaaffebc047568a24de4383ddeee6; extent 703 lines; inspected 1–703 (prior contiguous chunks 1–175 and 176–350 reused; new chunks 351–525 and 526–703); state complete. Findings: line 1 describes synthetic inspection source and says runtime behavior remains unverified; lines 2–350 export independent numeric declarations observation1 through observation349 ([lines 1–350](src/inspection.js#L1-L350)). Fingerprint reconfirmed after each chunk. Newly verified lines 351–525 contain independent numeric declarations plus cancellationOwner = caller at line 352 ([line 352](src/inspection.js#L352)); fingerprint unchanged before and after the new chunk. Final chunk lines 526–703 contains numeric declarations through observation700 and forbiddenLogFields = requestBody, transportCredentials at line 703 ([line 703](src/inspection.js#L703)). Full 703-line extent covered; same fingerprint reconfirmed before and after collection. Gap none; next action reuse on matching baseline during resume.
- **Outstanding gaps:** initial input gaps none; required research roles not started; architectural dimensions unchecked; architecture summary and decomposition unapproved.
- **Pending checkpoint:** none. No proposal approved.

## Summary
Add bounded transient retries while preserving injected transport and the send entry point. Architecture remains unsettled pending complete input and research.

## Requirements
Derived from [ready upstream](.rpiv/artifacts/research/input.md#L1-L17): preserve injected transport and send entry point; allow one transient retry (inherited Q1, within stated maximum of two); never retry permanent errors; caller can cancel retry delay; caller owns failure logging; do not log request bodies or transport credentials.

## Current State Analysis
[send lines 1–3](src/send.js#L1-L3) directly delegates to the injected transport. Initial required input complete; required research roles unfinished.

### Key Discoveries
Upstream carries answered requirements; these must not be re-asked. [inspection lines 1–350](src/inspection.js#L1-L350) contain a synthetic-source comment and numeric declarations only; [line 352](src/inspection.js#L352) declares caller cancellation ownership and [line 703](src/inspection.js#L703) declares requestBody and transportCredentials as forbidden log fields. Complete source coverage establishes these declarations, not observed runtime behavior.

## Scope
### Building
Bounded retry behavior preserving existing transport and entry point, with cancellation as required upstream. Exact files and architecture not yet established.
### Not Building
Send-owned failure logging, request-body logging, or credential logging. Further exclusions not yet established.

## Decisions
- D1 (inherited Q1): one transient retry. Original answer is more specific than upstream maximum of two; preserve it.
- D2 (inherited Q2): caller owns failure logging; send must not add logging.

## Architecture

## Slices

## Desired End State
Caller can use existing send entry point and injected transport with one transient retry, no retry for permanent errors, and cancellation of retry delay. Detailed architecture not yet established.

## File Map
Not yet established; required input references are not an approved modification list.

## Ordering Constraints
Complete required input before research; research before architectural dimensions and developer checkpoints. No decomposition or slices approved.

## Verification Notes
Initial input coverage verified complete; research has not begun. Git history unavailable (no-commit); Precedent Locator will be skipped under the skill rule. No tests or runtime verification performed.

## Performance Considerations
Not yet established.

## Migration Notes

## Pattern References
Not yet established.

## Developer Context
### Inherited Q1 — answered
Question: How many transient retries?
Original answer: One retry. This is an inherited decision.
Evidence: [upstream line 12](.rpiv/artifacts/research/input.md#L12).
Interpretation: one retry; resulting decision D1. No ordered options or proposal recorded upstream. No new approval inferred.

### Inherited Q2 — answered
Question: Who owns failure logging?
Original answer: The caller; send must not add logging.
Evidence: [upstream line 13](.rpiv/artifacts/research/input.md#L13).
Interpretation: preserve caller ownership; resulting decision D2. No ordered options or proposal recorded upstream. No new approval inferred.

## Design History
Creation initialized and read back before source reads. Required send input completed and saved/read back; inspection chunks 1–175 and 176–350 saved/read back. Cold resume reused unchanged verified coverage after reconciling baseline and connection/configuration searches; read and saved/read back chunk 351–525, then read final chunk 526–703, reconfirmed fingerprints and saved complete input with workflow_step research. Bounded trial stops before research roles. No slice approvals or code generated.

## References
- [Ready research input](.rpiv/artifacts/research/input.md)
