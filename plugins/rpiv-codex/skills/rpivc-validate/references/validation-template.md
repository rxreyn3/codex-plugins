---
template_version: 1
date: {Current date and time with timezone in ISO format}
author: {`author:` from metadata}
commit: {Current commit hash}
branch: {Current branch name}
repository: {Repository name}
topic: "Validation of {plan topic}"
status: ready
verdict: {pass | fail}
{When the plan declares risks, insert risk_rulings: [{ id: r1, pass: true }]; otherwise omit this line}
{When a command blocker is required, insert blockers: [{ id: b1, command: "verbatim command", file: "path", line: 1 }]; otherwise omit this line}
parent: "{plain repository-relative plan path}"
tags: [validation, {inherit relevant tags from the plan frontmatter}]
last_updated: {Same ISO timestamp as date above}
---

## Validation Report: {Plan topic}

### Implementation Status

- ✓ Phase 1: {name} — {Fully implemented | Partially implemented (see Findings) | Not implemented}
- ✓ Phase 2: {name} — {outcome}
- ⚠️ Phase 3: {name} — {Partial — see Findings}

### Automated Verification Results

- ✓ {one-line label}: `{command from plan}` — {brief outcome}
- ✗ {one-line label}: `{command from plan}` — {failure summary}
- ✓ No regressions detected

### Code Review Findings

#### Matches Plan:

- {[Descriptive evidence — line 42](src/example.ts#L42) — what matches the plan}
- {[Descriptive evidence — lines 42–55](src/example.ts#L42-L55) — what matches the plan}

#### Deviations from Plan:

- {[Descriptive evidence — line 42](src/example.ts#L42) — what diverged and why}
- {Or: None. Implementation is a faithful realization of the plan.}

#### Pattern Conformance:

{Optional subsection. Omit the entire subsection when there is nothing to report.}

- ✓ {Imports, naming, error handling, or test structure follow an established sibling}
- Minor observation: {acceptable variation, not a deviation}

#### Potential Issues:

{Optional subsection. Omit the entire subsection when there are no potential issues.}

- {[Descriptive evidence — line 42](src/example.ts#L42) — risk not covered by the plan}

### Manual Testing Required:

{Bulleted checklist when manual criteria exist:}

1. {Area}:
   - [ ] {Verifiable step}
   - [ ] {Verifiable step}

{Or, when the plan has no manual criteria:}

None — {one-line reason}.

### Recommendations:

- {Actionable recommendation}
- {Or, when verdict is pass: Ready to commit — implementation is complete and validated.}
