---
date: {Current date and time with timezone in ISO format}
author: {`author:` from Metadata}
commit: {Current commit hash}
branch: {Current branch name}
repository: {Repository name}
topic: "{User's Research Topic}"
tags: [research, codebase, relevant-component-names]
status: ready
last_updated: {Same ISO timestamp as `date:` above}
last_updated_by: {`author:` from Metadata}
---

# Research: {User's Research Topic}

## Research Question
{Topic emitted by the scope tracer's questions artifact}

## Summary
{High-level findings answering the research question.}

## Detailed Findings

### {Component or area}
- {Finding with a verified `file.ext:line` reference}
- {Connection to another component}
- {Relevant implementation detail}

## Code References
- `path/to/file.py:NN` — {Planner jump-table description}
- `another/file.ts:NN-NN` — {Description of the cited block}

## Integration Points
{Enumerate every observed consumer, dependency, and wiring point with verified repository-relative evidence.}

### Inbound References
- `path/to/consumer.ext:line` — {What references the component and how}

### Outbound Dependencies
- `path/to/dependency.ext:line` — {What the component depends on}

### Infrastructure Wiring
- `path/to/config.ext:line` — {Dependency injection, routes, events, jobs, or middleware}

## Architecture Insights
{Demonstrated patterns, conventions, and current design decisions.}

## Precedents & Lessons
{N} similar past changes analyzed, or an explicit no-history fallback.

### Precedent: {What changed}
**Commit(s)**: `{hash}` — "{message}" ({YYYY-MM-DD})
**Blast radius**: {N} files across {M} layers
  {layer}/ — {what changed}

**Follow-up fixes**:
- `{hash}` — "{message}" ({date}) — {what went wrong}

**Lessons from docs**:
- `.rpiv/artifacts/path/to/doc.md` — {evidenced lesson}

**Takeaway**: {One sentence describing what the precedent establishes}

### Composite Lessons
- {Most recurring evidenced lesson, with relevant commit hash inline}

## Historical Context (from `.rpiv/artifacts/`)
- `.rpiv/artifacts/something.md` — {One-line description of the document's scope}

## Developer Context
**Q (`file.ext:line`): {Question grounded in specific code evidence}**
A: {Developer's answer}

## Related Research
- {Links to other research documents}

## Open Questions
- {Only unresolved questions, or `None.`}
