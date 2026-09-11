---
name: rpivc-validate
description: Verify that one implementation plan was correctly executed by running its success criteria against the working tree and writing a validation report. Use explicitly after rpivc-implement completes or when a developer asks to validate a plan. This stage audits and reports; it never fixes code or edits the plan.
---

# RPIV Validate for Codex

Validate one implementation plan against the delivered working tree and write one evidence-backed report.

This port preserves the `validate` workflow from RPIV-Pi commit `7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7`:

```text
plan -> inspect implementation -> run plan criteria
     -> adjudicate findings -> write pass/fail report
```

Validate does not edit product code or plans. Fixes belong to Implement and plan corrections belong to Revise. It does not commit, invoke a successor, push, publish, or start another stage.

## Input

Treat all text following `$rpivc-validate` as zero or one plan path, usually under `.rpiv/artifacts/plans/`. If more than one plan path is supplied, ask the developer which single plan to validate and stop. Do not silently validate only the first path.

A checkpoint may span several turns. After the developer answers a selection question, resume the current step rather than restarting or repeating completed inspection.

## Metadata

Resolve this skill's root as the directory containing the loaded `SKILL.md`; never infer it from the caller's working directory. At the start, run the bundled helpers by absolute path from that root:

```bash
node <validate-skill-root>/scripts/now.mjs
echo
node <validate-skill-root>/scripts/git-context.mjs
echo
echo "### recent (read only when no plan path was supplied)"
echo "recent plans:"
node <validate-skill-root>/scripts/list-recent.mjs .rpiv/artifacts/plans 10
```

The first helper returns `<iso>\t<slug>` with no trailing newline. Retain both fields verbatim. The repository helper returns `branch`, `commit`, `repo`, `root`, `in_repo`, and `author` labels.

## File references

- **Codex Desktop chat and completion reports:** resolve local files against the caller's Git root and use absolute Markdown targets ending in the verified starting line, such as `[Orders handler — lines 42–55](/absolute/repository/src/orders.ts:42)`. Keep ranges only in labels. When no line is verified, link the absolute path without a suffix. Wrap targets containing spaces in angle brackets.
- **Other chat clients:** follow the active host and repository instructions instead of assuming a Codex Desktop or GitHub link form.
- **Human-readable report prose:** use repository-relative Markdown links such as `[Orders handler — lines 42–55](src/orders.ts#L42-L55)`. When no verified line exists, link the repository-relative path without a fragment. Never write an absolute machine path into the report.
- **Structural fields:** preserve the report's `parent`, `blockers[].file`, commands, filenames, frontmatter values, and plan `files:` entries as plain repository-relative values. Do not convert them to Markdown links.
- Raw command output is evidence input. Summarize verified outcomes; do not paste logs into the report.

## Choice response format

When a checkpoint offers two to four finite authored options, prefer native structured input without letter prefixes. If structured input is unavailable, fails, or does not display, render the same options in prose as `A.` through `D.` in their existing order. Preserve the recommended option first so it becomes `A` when a recommendation exists.

In a prose fallback, put one option on each line as `A. **Label (Recommended)** — consequence.` and `B. **Label** — consequence.` Keep `(Recommended)` inside the bold label and never detach it after the explanation. Omit the dash and consequence when the label is already self-explanatory.

After the prose list, write `Reply with A, B, ...` using only the letters actually shown. Add `, or write another answer` only when the checkpoint already permits a custom response. Accept an uppercase or lowercase letter, the full option label, or an unambiguous natural-language answer. Reset the letters for every new question; they have no meaning outside the currently displayed choice. Do not letter open-ended requests for a feature description, path, correction, or other required free text.

## Recommended action format

When the report recommends another RPIV stage, put the bold action name outside the code fence and put only the arguments the developer should paste after selecting that skill inside a `text` fence:

````markdown
Recommended next step: **{Action}**

```text
{arguments only}
```
````

Never put `$`, a skill identifier, or explanatory prose inside the arguments fence. Put the reason after the fence. If an action takes no arguments, omit the fence. A recommendation is a handoff, never permission to invoke the stage automatically.

## Workflow

Follow every numbered step in order.

### 1. Resolve the plan and implementation context

1. Determine whether the conversation already contains the implementation context. Reuse verified session evidence when present; otherwise perform the full repository discovery below.
2. Resolve exactly one plan:
   - With an explicit path, verify that it is a real plan artifact and use it.
   - With no path and no recent plans, state that `.rpiv/artifacts/plans/` is empty, ask for a plan path in one concise question, and stop.
   - With exactly one recent plan, ask `Validate this plan?` with `Validate <filename> (Recommended)` and `Pick a different path`.
   - With two or more recent plans, offer the four newest filenames and ask the developer to choose one.
3. Use native structured input when it is available. Put the recommended option first and rely on the control's custom-response field rather than authoring `Other`. If structured input is unavailable or fails to display, use the lettered prose choice format, permit another written answer, and stop.
4. Read the resolved plan completely: frontmatter, every phase, every checked item, automated and manual verification, risks, history, and follow-ups.
5. Record the expected files, phase behavior, success criteria, manual checks, and key functionality.
6. If metadata says `in_repo: no`, skip `git log` and `git diff`. Validate from file inspection, plan commands, and the checklist, and include `Git history unavailable — validation based on file inspection only` in the report.
7. Otherwise inspect `git log --oneline -n 20`, select a base that covers the implementation commits, and inspect `git diff <base>..HEAD`, scoped to relevant paths when needed. Also inspect the current staged and unstaged delta because Validate normally runs before Commit.
8. For each new or substantially rewritten file, read one established sibling with the same role. Compare imports, naming, error handling, and test structure. Search for stale renamed terms, comments, documentation, and test descriptions. Record only genuine divergences.

Never infer plan structure from a partial read.

### 2. Validate every phase systematically

For every phase in plan order:

1. Compare checked completion items with the actual implementation.
2. Run every command from that phase's `#### Automated Verification:` section exactly as written, from the repository root. Do not substitute a preferred build tool or silently repair an invalid command.
3. Record pass or fail and investigate the cause of each failure far enough to attribute it honestly.
4. List every manual criterion as a concrete unchecked step for the developer; never claim an unperformed manual check passed.
5. Inspect relevant error paths, validation boundaries, likely regressions, and maintainability without inventing requirements outside the plan.

#### Attribute whole-plan failures

Before a whole-plan command failure forces the verdict, attribute every failing finding to a file.

- When every failing file is byte-identical to the merge base, prove it per file with `git diff --quiet <base> -- <file>`. For an uncommitted implementation, `<base>` is `HEAD`.
- Only with that proof, rule the criterion `not met, non-blocking`, report `pre-existing at base — criterion unachievable as written` under Potential Issues, and record the criterion itself as a plan deviation. That failure alone does not force `verdict: fail`.
- Without per-file proof, or when any failing file is inside the run's delta, the command failure blocks normally.

#### Rule plan-authored risks

When the plan declares a `risks:` frontmatter array:

1. Rule every `{ id, claim }` against the delivered code and emit one `risk_rulings: [{ id, pass }]` entry per flag.
2. For `disposition: verify-at-implement`, run the declared `procedure`; reading code alone is insufficient.
3. Rule `pass: true` only when the risk is unfounded or handled. Any `pass: false` forces `verdict: fail` and appears under Potential Issues with the original claim.

### 3. Determine the verdict and write one report

Read [Validation report template](references/validation-template.md) completely. Derive:

- filename: `.rpiv/artifacts/validation/<slug>_<plan-topic-kebab>.md`, using the retained slug and the lowercased, hyphen-joined plan `topic`;
- `date` and `last_updated`: retained `<iso>` including offset;
- `repository`, `branch`, `commit`, and `author`: matching metadata labels, with `unknown` author fallback;
- `parent`: the plain repository-relative plan path;
- `tags`: `validation` plus relevant plan tags;
- `topic`: `Validation of <plan topic>`;
- `status`: always `ready`, written once.

Set `verdict: pass` only when all checked phases match the code, every blocking automated command passes, there is no actionable deviation or potential issue, and every risk ruling passes. Set `verdict: fail` for any phase gap, blocking command failure, actionable deviation or issue, or failing risk ruling.

When risks exist, add one frontmatter `risk_rulings` entry per risk. When a blocking command failure is not already represented by `pass: false`, add one frontmatter blocker per failing command:

```yaml
blockers:
  - id: b1
    command: "<verbatim command runnable from repository root>"
    file: "<plain repository-relative in-delta file>"
    line: <attributed line>
```

Number blockers `b1`, `b2`, and so on. These are the remediation stage's only structured handles, so never leave a command blocker only in prose. Omit `blockers` when every blocker is already represented by a failed risk ruling.

Create the report once at the computed path. Fill or remove every template placeholder. Omit Pattern Conformance and Potential Issues entirely when empty; keep every other section, using the template's `None — ...` form where applicable. Never overwrite an existing validation report, patch a previous report, or append a follow-up section; a rerun gets a fresh timestamped file.

The report must not contain raw command output, `git log` output, intermediate reasoning, absolute machine paths, or unverified claims.

### 4. Present the result and stop

Report:

```text
Validation written to:
`.rpiv/artifacts/validation/{filename}.md`

Verdict: {pass | fail}
```

For localized findings, explain that Implement should fix them before Validate is rerun. For a plan-level gap, render:

Recommended next step: **Revise**

```text
<plan-path> "<specific plan correction grounded in the validation finding>"
```

If the verdict passes, render `Recommended next step: **Commit**` with no arguments fence. If it fails, do not recommend Commit.

Always stop after the report and handoff. A successor name is never permission to invoke that stage automatically.

## Scratch and safety boundaries

- Any scratch file created while running a plan command or risk procedure belongs under `.rpiv/tmp/` or outside the repository. Remove repository-located scratch when its command finishes.
- Never create scratch elsewhere in the repository; untracked scratch contaminates the working tree being validated.
- Do not alter product code, tests, documentation, or the plan during validation.
- Do not hide a failing criterion by changing its command, output, or evidence file.
