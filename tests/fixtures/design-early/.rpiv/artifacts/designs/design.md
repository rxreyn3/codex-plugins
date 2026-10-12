---
date: 2026-10-09T10:00:00+0200
author: Trial
commit: no-commit
branch: main
repository: trial
topic: Bounded retry
tags: [design, retry]
status: in-progress
workflow_step: decisions
parent: .rpiv/artifacts/research/input.md
last_updated: 2026-10-09T10:10:00+0200
last_updated_by: Trial
---
# Design: Bounded retry
## Workflow Progress
- Completed work: input validated and read completely; Codebase Pattern Finder, Codebase Analyzer, Integration Scanner verified complete; Precedent Locator skipped (no-commit); external research inapplicable (no new external interface); dimensions complete; Q1 answered -> D1.
- Architecture-summary approval: unapproved; no summary proposed yet.
- Decomposition approval: unapproved; no breakdown proposed yet.
- Next action: decisions — present Q2 and await its answer before architecture summary.
- Evidence baseline: upstream .rpiv/artifacts/research/input.md git-blob:8aaf36636a211b0b75acfc9dbb19baa672aac526; src/send.js git-blob:c704512c8b66071264cff105df1771040bdf9b22; repository no-commit. Source supports existing delegation and injected transport, not deployed retry behavior.
- Outstanding gaps: Q2 unanswered; architecture-summary and decomposition approvals; all slices.
- Pending checkpoint: Q2; architectural choice; unanswered; proposal unapproved. Exact question: Where should retry failures be logged? Options in order: A. Caller owns logging (Recommended) — preserve transport-layer responsibilities and avoid duplicate logs. B. send owns logging — add local diagnostic responsibility and a logger dependency. Supporting reference: [send delegation](src/send.js#L1-L3). Proposal: preserve caller-owned logging for bounded retries; no implementation code or criteria proposed.
## Summary
Goal: bounded transient retry. Architecture unsettled pending Q2 and summary approval.
## Requirements
At most two retries; no retry for permanent errors; existing send entry point and injected transport preserved.
## Current State Analysis
### Key Discoveries
- Codebase Pattern Finder — verified complete: send is the implementation template; delegated transport keeps delivery responsibility separate. [src/send.js](src/send.js#L1-L3). No other patterns in this small fixture; no discrepancy.
- Codebase Analyzer — verified complete: send calls transport once and returns its result. No current retry. [src/send.js](src/send.js#L1-L3). No assumptions beyond source behavior.
- Integration Scanner — verified complete: send is the only exported entry; transport injected by caller; no other inbound files, configuration, events or tests in this fixture. [src/send.js](src/send.js#L1-L3). Runtime delivery unverified.
- Precedent Locator — skipped: git history unavailable (no-commit).
### Dimension coverage
- Data model: covered, simple — preserve request/transport shape, source reference above.
- Interface surface: covered, simple — keep send entry point, source reference above.
- Integration wiring: covered, simple — caller injects transport, source reference above.
- Scope: covered — D1 chooses one retry, permanent errors excluded per upstream.
- Verification: covered — inspect transient cap, permanent errors and logging ownership after Q2; criteria not yet authored.
- Performance: covered — D1 bounds extra delivery attempts.
- Migration: inapplicable — no persisted schema.
## Scope
### Building
Bounded transient retry and chosen failure logging ownership.
### Not Building
Permanent-error retries or replacing transport.
## Decisions
- D1: one automatic retry for transient errors, modeled on existing send delegation. Chosen via Q1; two retries rejected for extra attempts. Source: [send](src/send.js#L1-L3), upstream bounded cap. Current; no superseding answer.
- Keep request and transport shape and injected delivery responsibility (simple source-backed choice).
## Architecture
Not established; decomposition unapproved. No slice code persisted.
## Slices
Not established; decomposition unapproved.
## Desired End State
A bounded transient retry while callers retain the send entry point. Logging ownership unresolved.
## File Map
Not established; decomposition unapproved.
## Ordering Constraints
Not established; decomposition unapproved.
## Verification Notes
git history unavailable. Runtime behavior unverified; future slice must independently verify code and criteria before approval.
## Performance Considerations
D1 caps retries at one; bounded extra attempts.
## Migration Notes

## Pattern References
[send](src/send.js#L1-L3) is the entry point to extend.
## Developer Context
### Q1
Kind: architectural choice. State: answered.
Exact question: How many automatic retries for transient failures?
A. One retry (Recommended) — bound extra delivery attempts at one.
B. Two retries — allow another attempt at additional cost.
Evidence: [send](src/send.js#L1-L3); upstream allows at most two.
Proposal: one automatic retry.
Original answer: A, one retry.
Interpretation: developer chose one retry. Result: D1. Dependent work: Scope, Performance, retry implementation, future summary and decomposition.
### Q2
Kind: architectural choice. State: unanswered. Proposal: unapproved.
Exact question: Where should retry failures be logged?
A. Caller owns logging (Recommended) — preserve transport-layer responsibilities and avoid duplicate logs.
B. send owns logging — add local diagnostic responsibility and a logger dependency.
Evidence: [send delegation](src/send.js#L1-L3).
Proposal: preserve caller-owned logging for bounded retries.
Original answer: none. Resulting decision: none.
## Design History
No slices; decomposition unapproved. Creation input, verified roles and dimensions completed as recorded above.
## References
[Upstream research](.rpiv/artifacts/research/input.md)
