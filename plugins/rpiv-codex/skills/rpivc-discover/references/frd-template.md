---
date: {Current date and time with timezone in ISO format}
author: {`author:` from Metadata}
commit: {Current commit hash}
branch: {Current branch name}
repository: {Repository name}
topic: "{Feature topic}"
tags: [intent, frd, relevant-component-names]
status: ready
last_updated: {Same ISO timestamp as `date:` above}
last_updated_by: {`author:` from Metadata}
---

# FRD: {Feature topic}

## Summary
{Two or three sentences describing the settled feature in the developer's framing.}

## Problem & Intent
{The developer's own explanation of the problem and who experiences it.}

## Goals
- {Explicit goal}

## Non-Goals
- {Explicit exclusion}

## Functional Requirements
1. {Numbered, independently testable requirement.}

## Non-Functional Requirements
- **Performance**: {Constraint or "no specific constraint"}
- **Security**: {Authentication, data handling, or threat boundary}
- **User experience and accessibility**: {Interaction and accessibility constraints}
- **Reliability**: {Failure, retry, and recovery expectations}

## Constraints & Assumptions
- {Technical, schedule, or organizational constraint}
- {Assumption for research to verify}

## Acceptance Criteria
- [ ] {Observable command, output, or visible behavior}

## Recommended Approach
{One or two sentences naming the architectural shape implied by the decisions.}

## Decisions

### {Decision title}
**Question**: {Question as asked, or "Pre-resolved from codebase evidence — confirmed"}
**Recommended**: {Recommendation, or "n/a — intent question"}
**Chosen**: {Developer's answer}
**Rationale**: {Why, or `evidence: path/to/file.ext:line + confirmed`}

## Open Questions
- {Only an item the developer explicitly deferred, or "None."}

## Suggested Follow-ups
{Omit this entire section when no related but out-of-scope findings exist.}

- {Observed item and `file:line` when applicable}

## References
- {Input artifact, ticket, or explicitly mentioned file}
