---
date: 2026-10-26T13:17:58+0100
author: Ryan Reynolds
commit: no-commit
branch: main
repository: candidate-project
topic: Delivery diagnostics
tags: [design, delivery]
status: in-progress
workflow_step: research
parent: .rpiv/artifacts/research/input.md
last_updated: 2026-10-26T13:20:54+0100
last_updated_by: Ryan Reynolds
---
# Design: Delivery diagnostics

## Workflow Progress
- Completed work: upstream validation and complete read, lines 1–22. All four required source files completely inspected and coverage saved. Codebase Analyzer returned, directly verified against unchanged complete source coverage and focused reread, then summary saved and read back.
- Next action: Step 2: bounded acceptance milestone reached; stop here. On continuation, run unfinished Codebase Pattern Finder and Integration Scanner before any dimensions.
- Evidence baseline: repository no-commit; all five fingerprints reconfirmed after analyzer; current path inventory contains four source files plus upstream and this design. Connection search scope `src`, non-comment lines for `send(`, `readDeliveryConfig`, `DELIVERY_`, `retryJob`, and `deliver`; only these source files match. All current source is untracked.  upstream `.rpiv/artifacts/research/input.md`, fingerprint `7230057fa226bda77847da72e9785c0f0095fd95`, supports inherited goal and constraints.
- Input evidence:
  - `.rpiv/artifacts/research/input.md`: Step 1; no-commit; fingerprint `7230057fa226bda77847da72e9785c0f0095fd95`; complete 1–22/22. Goal: internal diagnostic counter preserving request content, error identity, retries and disabled behavior. No gap.
  - `src/send.js`: Step 1; no-commit; fingerprint `df440e1cf1bbe2878929e909cd7317701202516a` confirmed unchanged; complete 1–713/713; [send](src/send.js#L1-L10) forwards request, retries transient errors up to attempts, rethrows same error and rejects disabled calls; [configuration](src/send.js#L711-L713) parses exact string false and numeric attempts. Lines 11–710 are comments. Initial 1–180 delivery truncated; recovered uncertain 55–130. No remaining read gap.
  - `src/controller.js`: Step 1; no-commit; fingerprint `a2dca0f62fda4f75b939e033cca2676b8626c3c7` confirmed unchanged; complete 1–2/2; [deliver](src/controller.js#L1-L2) reads environment config and forwards it to send. No gap.
  - `src/job.js`: Step 1; no-commit; fingerprint `8c349f8ae1b0920aa46c7d470b8ccbbced628810` confirmed unchanged; complete 1–2/2; [retryJob](src/job.js#L1-L2) uses attempts 2 without enabled config. No gap.
  - `src/send.test.js`: Step 1; no-commit; fingerprint `e09cfa70215c1d76d64cf19ae7d2a0e23e8cecd9` confirmed unchanged; complete 1–3/3; [scenario](src/send.test.js#L1-L3) always returns sent; comment claims transient failure but no failure or assertion appears. No gap.
- Role state: Codebase Analyzer complete and verified; Codebase Pattern Finder unfinished; Integration Scanner unfinished; Precedent Locator skipped under no-commit rule. External research not required: no new external dependency in inherited scope or inspected code.
- Outstanding gaps: two research roles; all dimensions unchecked; diagnostic placement unresolved; architecture-summary and decomposition unapproved; no slices.
- Pending checkpoint: none (bounded acceptance stops before decisions).

## Summary
Design an internal diagnostic counter around existing delivery. Architecture is not yet established.

## Requirements
Preserve request content, transport error identity, retry counts and disabled-delivery behavior. No request payload logging, external service or new persisted schema. [Upstream research](.rpiv/artifacts/research/input.md#L1-L22).

## Current State Analysis
### Codebase Analyzer — complete and verified
- Findings: [shared delivery — lines 1–10](src/send.js#L1-L10) checks explicit disabled state before calling transport, defaults nullish attempt counts to one, sequentially passes the original request to transport, returns first success and directly rethrows ordinary errors when nontransient or at an exactly matching final attempt. There is no retry delay.
- [Configuration tail — lines 711–713](src/send.js#L711-L713) disables only for exact environment string false and converts attempts with Number without validation. Zero, negative and NaN counts skip the loop and reach the positive-count error. Null or undefined transport rejections fail at the error.transient property access, so identity preservation does not cover these values. Other unusual counts follow the literal loop and equality conditions; no normalization is established.
- [Controller — lines 1–2](src/controller.js#L1-L2) derives config from environment; [job — lines 1–2](src/job.js#L1-L2) fixes attempts at two and supplies no enable switch. Neither catches send rejection.
- Reasoning: trace the enable guard, nullish fallback, loop, catch condition and final throw, then both callers and the trailing configuration declaration. Lines 11–710 are comments; they establish no runtime behavior. Parent reused full unchanged reads and directly reread all executable sections and consumers after the role returned.
- Discrepancy: [verification surface — lines 1–3](src/send.test.js#L1-L3) claims a transient failure in its comment, but scenario uses an always-successful transport and has no assertions. It establishes only a callable success example; no tests were executed.
- Baseline: complete source ranges and fingerprints in Input evidence, reconfirmed unchanged after role return. No new source files identified by role or targeted connection search.
- Assumptions and gaps: injected transport behavior beyond invocation is unknown. Runtime behavior has not been exercised. Pattern Finder and Integration Scanner remain unfinished; no diagnostic placement chosen.
- Actual candidate change surface: shared send implementation and both callers are the known delivery path; configuration tail and verification surface are preservation constraints. Exact new/modified file set remains unestablished until remaining research and decisions.
### Key Discoveries
Configuration lives after the long comment block, and controller and background job use different configuration paths. Existing scenario does not verify retries. See role references above.

## Scope
### Building
Internal delivery diagnostics; placement unresolved.
### Not Building
External services, persisted schema, payload logging.

## Decisions
Inherited: diagnostics remain internal; request payloads must not be logged. No new decisions.

## Architecture

## Slices

## Desired End State
Diagnostic counting without changing delivery behavior; exact consumer behavior not yet established.

## File Map
Not yet established.

## Ordering Constraints
Not yet established.

## Verification Notes
git history unavailable. Precedent Locator skipped under no-commit rule. Runtime behavior not tested. Pattern Finder and Integration Scanner remain unfinished. Initial skill read was truncated; missing middle recovered from lines 150–219. Initial source chunk was truncated; uncertain lines 55–130 recovered before coverage completion. A broad connection search matched historical comments and was truncated; recovered by a bounded non-comment connection search. One analyzer dispatch failed at shared agent capacity, then retry succeeded as a native read-only child with full bundled prompt. No inline substitute. These recovery and capacity calls are measurement confounds.

## Performance Considerations
Not yet established.

## Migration Notes

## Pattern References
Not yet established.

## Developer Context
Inherited upstream decisions: diagnostics remain internal; request payloads must not be logged. No new questions or approvals.

## Design History
Initialized before source reads. Saved/read back each bounded source chunk, then complete input and verified Analyzer summary. Stopped at authorized bounded milestone. No dimensions, slices or approvals.

## References
[Ready upstream research](.rpiv/artifacts/research/input.md).
