---
name: rpivc-commit
description: Create structured Git commits by analyzing staged and unstaged changes, grouping files logically, matching the repository's message style, and requiring developer approval before committing. Supports an optional commit-message hint.
---

# RPIV Commit for Codex

Create one or more atomic Git commits from the current repository changes.

This port preserves the `commit` workflow from RPIV-Pi commit `7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7`:

```text
dirty tree -> inspect scope and history -> propose atomic commits
           -> developer approval -> stage explicit paths -> commit and report
```

The approval gate is mandatory. This stage creates local commits only; it never pushes, publishes, or invokes another workflow stage.

## Input

Treat all text following `$rpivc-commit` as an optional commit-message hint. With no hint, infer the message from conversation context, repository history, and the changes. A checkpoint may span several turns; after the developer answers the commit-plan gate, resume execution rather than rebuilding a different plan.

## Metadata

Resolve this skill's root as the directory containing the loaded `SKILL.md`; never infer it from the caller's working directory. Before inspecting individual changes, run the bundled helper by absolute path from that root, followed by the recent subjects:

```bash
node <commit-skill-root>/scripts/git-changes.mjs
echo "---recent-subjects---"
git log --pretty=%s -n 20 2>/dev/null || true
```

- `in_repo: yes|no`;
- `---status---`, capped at 200 current paths;
- `---diffstat---`, capped at 200 lines, with a safe no-HEAD fallback.

The recent-subjects block may be empty in a repository with no commits.

## File references

- **Codex Desktop chat and completion reports:** resolve local files against the caller's Git root and render each in-scope file as an absolute Markdown link, such as `[src/orders.ts](/absolute/repository/src/orders.ts)`. For verified lines, end the target in the starting line and keep any range only in the label. Wrap targets containing spaces in angle brackets.
- **Other chat clients:** follow the active host and repository instructions instead of assuming a Codex Desktop or GitHub link form.
- **Structural values:** keep Git commands and helper output as plain repository-relative paths.

## Choice response format

When a required decision or approval remains unanswered, present the complete question in the final chat response and stop before dependent work. State the relevant evidence, why the choice matters, each option's consequence, and how to answer. Do not use asynchronous structured input as the sole carrier of the checkpoint. Synchronous structured input may be used only when the active host permits its mode, purpose, and question shape and it actually returns an answer. If it does not return an answer, the complete final-response question is still required. Never force a mode change, use an optional-only or permission-forbidden input tool for approval, or wait in a loop for an answer.

When the active host permits multiple-choice prose, render two to four finite authored options in their existing order as `A.` through `D.`; preserve the recommended option first so it becomes `A` when a recommendation exists. Put one option on each line as `A. **Label (Recommended)** — consequence.` and `B. **Label** — consequence.` Keep `(Recommended)` inside the bold label. Omit the dash and consequence only when the label itself makes the consequence clear. Checkpoint-specific option bullets below define content, not the final response format. When the active host forbids textual multiple-choice lists, ask one concise plain-text question that states the alternatives and their consequences without a lettered or bulleted list.

After a lettered list, write `Reply with A, B, ...` using only the letters shown. Add `, or write another answer` only when that checkpoint already permits a custom response. Accept an uppercase or lowercase letter, the full option label, or an unambiguous natural-language answer. Reset letters for each new question; do not letter open-ended requests for a feature description, path, correction, or other required free text. A recommendation or preselection does not choose itself.

Keep an unanswered checkpoint pending across completed turns. Resume the same step only after an unambiguous answer; tool acceptance, silence, timeout, dismissal, and unrelated messages are not answers or approval. Preserve existing authorization for unchanged scope rather than adding another gate. A pending checkpoint does not create an extra artifact, mark work ready, or advance a successor stage. If a handoff is requested later, carry the unresolved question and blocked next action in its existing sections.

## Recommended action format

This is a terminal RPIV stage and emits no successor recommendation after a successful commit. If a stopped run must refer to another RPIV action, put the bold action name outside any code fence and put only pasteable arguments inside a `text` fence:

````markdown
Recommended next step: **{Action}**

```text
{arguments only}
```
````

Never put `$`, a skill identifier, or explanatory prose inside the arguments fence. A recommendation is a handoff, never permission to invoke another stage automatically.

## Workflow

Follow every numbered step in order.

### 1. Check the repository and establish scope

1. Run the metadata commands above.
2. If the helper reports `in_repo: no`, tell the developer: `This directory is not a git repository. Run git init to initialize one.` Stop without changing anything.
3. Treat only paths in `---status---` as eligible.
4. If the status is truncated, say so and inspect the full status before proposing a plan.
5. If the working tree is clean, report that there is nothing to commit and stop.

### 2. Understand the changes

1. Use the conversation history when it explains what was built or changed. In a standalone invocation, infer intent from repository state and file inspection.
2. For a path with a small diffstat of about five changed lines or fewer, use the filename and line counts when they make intent clear. Inspect `git diff <path>` only when the change is larger or its purpose is ambiguous.
3. For an untracked directory, treat its contents as the change unless it contains many files. Do not read obvious files merely to prove that their names mean what they say.
4. Determine whether the paths form one logical change or several atomic groups.
5. Check the eligible changes for suspected application programming interface keys, credentials, tokens, private keys, or other sensitive values. If a suspected secret would be committed, identify the affected path and stop before staging.

### 3. Plan the commit or commits

For each logical group:

1. list the exact eligible files that belong together;
2. draft a clear imperative subject focused on why the change exists;
3. match the style of `---recent-subjects---`, including any established prefix, casing, and approximate length budget;
4. when recent subjects are empty or inconsistent, use imperative sentence case with no prefix;
5. use the optional message hint as intent, while still checking that it accurately describes the files.

Split unrelated features, fixes, refactors, or documentation changes into separate commits. Group by file path; do not pretend a path-only staging plan can split independent hunks in the same file.

### 4. Present and gate the plan

Present every planned commit in order with:

- its proposed subject;
- its exact file links.

Then ask exactly: `{N} commit(s) with {M} files. Proceed?` with header `Commit` and these choices:

- `Commit (Recommended)` — create the commits exactly as planned.
- `Adjust` — change the grouping or commit messages.
- `Review files` — show the full eligible diff before committing.

Use the Choice response format with the recommended option first, permit another written answer, and stop while unanswered. Do not author an `Other` option.

Do not stage or commit anything until the developer chooses `Commit`. After `Review files`, show the requested diff and repeat the gate. After `Adjust`, ask one focused question, revise the plan, and repeat the gate.

### 5. Execute the approved plan

For each approved commit, in order:

1. run `git add -- <path>...` with the exact files in that commit;
2. never use `git add -A`, `git add .`, or another broad staging command;
3. verify the staged paths match that commit;
4. create the commit with the approved subject and no co-author or tool attribution;
5. if staging or committing fails, report the exact failure and stop rather than broadening the command or bypassing repository hooks.

After all approved commits succeed, run `git log --oneline -n <N>` where `<N>` is the number of commits just created. Report those commits and stop without pushing or starting another stage.

## Invariants

- Commits are authored solely by the developer. Never add `Co-Authored-By`, tool attribution, or generated-by text.
- Stage only explicit paths from the authoritative in-scope status.
- Preserve the approved grouping and subjects; any change requires a new approval gate.
- Never push, publish, or invoke another workflow stage.
