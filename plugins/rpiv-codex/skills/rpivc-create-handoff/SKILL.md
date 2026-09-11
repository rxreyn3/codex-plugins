---
name: rpivc-create-handoff
description: Create a concise, context-preserving RPIV handoff artifact for a fresh Codex task. Capture the current task, decisions, in-flight changes, verified repository state, open questions, and exact next actions without continuing the work or invoking another workflow stage.
---

# RPIV Create Handoff for Codex

Write one handoff document that lets a fresh Codex task or engineer resume the current work without relying on chat history.

This port preserves the `create-handoff` workflow from RPIV-Pi commit `7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7`:

```text
inspect current task and repository state -> write one concise handoff artifact
                                          -> report its path -> stop
```

The handoff captures state; it does not perform new implementation, commit, push, invoke `Resume Handoff`, or start another workflow stage. The artifact's `status: complete` means that the handoff document is complete, not that every task described inside it is finished.

## Input

Treat all text following `$rpivc-create-handoff` as an optional short description used to derive the filename slug. Convert it to lower-case kebab-case. If no description is supplied, derive a concise slug from the active task rather than asking a blocking question.

## Metadata

Resolve the create-handoff skill root as the directory containing this loaded `SKILL.md`; do not infer it from the caller's working directory. Before writing, run these bundled helpers by absolute path from that root:

```bash
node <create-handoff-skill-root>/scripts/now.mjs
echo
node <create-handoff-skill-root>/scripts/git-context.mjs
```

The first helper returns `<iso>\t<slug>` without a trailing newline. The second returns the caller's current branch, commit, repository name, repository root, repository status, and configured author. Copy metadata values verbatim; do not reformat the timezone offset.

If `in_repo: no`, retain the stable fallback values and omit repository-specific file claims that cannot be verified. A handoff can still capture non-repository work.

## File references

- **Codex Desktop chat and completion reports:** resolve local files against the caller's Git root and use absolute Markdown targets ending in the verified starting line, such as `[Orders handler — lines 42–55](/absolute/repository/src/orders.ts:42)`. Keep ranges only in labels. When no line is verified, link the absolute path without a suffix. Wrap targets containing spaces in angle brackets.
- **Other chat clients:** follow the active host and repository instructions instead of assuming a Codex Desktop or GitHub link form.
- **Human-readable handoff prose:** use repository-relative Markdown links such as `[Orders handler — lines 42–55](src/orders.ts#L42-L55)`. When no verified line exists, link the repository-relative path without a fragment. Never write the absolute repository root or another machine-specific path into the handoff.
- Keep frontmatter fields, filenames, commands, identifiers, and other parser-consumed values as plain text rather than Markdown links.

## Choice response format

When a checkpoint offers two to four finite authored options, prefer native structured input without letter prefixes. If structured input is unavailable, fails, or does not display, render the same options in prose as `A.` through `D.` in their existing order. Preserve the recommended option first so it becomes `A` when a recommendation exists.

In a prose fallback, put one option on each line as `A. **Label (Recommended)** — consequence.` and `B. **Label** — consequence.` Keep `(Recommended)` inside the bold label and never detach it after the explanation. Omit the dash and consequence when the label is already self-explanatory.

After the prose list, write `Reply with A, B, ...` using only the letters actually shown. Add `, or write another answer` only when the checkpoint permits a custom response. Accept an uppercase or lowercase letter, the full option label, or an unambiguous natural-language answer. Reset the letters for every new question; they have no meaning outside the currently displayed choice. Do not letter open-ended requests.

## Recommended action format

When the report recommends another RPIV stage, put the bold action name outside the code fence and put only the arguments the developer should paste after selecting that skill inside a `text` fence:

````markdown
Recommended next step: **{Action}**

```text
{arguments only}
```
````

Never put `$`, a skill identifier, or explanatory prose inside the arguments fence. If an action takes no arguments, omit the fence. A recommendation is a handoff, never permission to invoke the stage automatically.

## Workflow

Follow every numbered step in order.

### 1. Establish current truth

Inspect the current conversation and available evidence before writing:

1. identify the active task or tasks and mark each as completed, in progress, planned, or blocked;
2. use the retained Git metadata to identify the repository, branch, and commit;
3. inspect `git status --short` and relevant diffs when file changes affect continuation;
4. verify recent changes and important learnings against current files before describing them as facts;
5. identify the target artifact and other required inputs for the next action, separately from historical references;
6. separate settled decisions, current proposals, and unresolved questions;
7. identify the smallest safe next action.

Do not perform new implementation merely to improve the handoff. Do not commit, push, publish, contact external systems, or change unrelated state.

### 2. Choose the artifact path

Use the metadata timestamp slug and description slug:

```text
.rpiv/artifacts/handoffs/<timestamp-slug>_<description-slug>.md
```

Create `.rpiv/artifacts/handoffs/` when needed. Write exactly one new handoff artifact per invocation; never overwrite an existing handoff.

### 3. Write the handoff

Use this complete compatibility structure. Keep it concise but include enough evidence for a cold resume. Omit empty bullets, not required headings.

Label artifact links as **Required inputs** or **Historical references** within the existing sections. Required inputs govern the next action; name the target artifact and explain what each additional input is needed to establish, with section pointers when useful. Historical references preserve provenance and are opened only for a specific unresolved question. Do not make the full research bibliography required merely because it was read earlier. Capture settled decisions, their authority, and the exact next action in this handoff so an older handoff is not required just to recover them; retain links to their evidence.

```markdown
---
date: {exact ISO timestamp with timezone}
author: {author from git context}
commit: {current short commit or no-commit}
branch: {current branch or no-branch}
repository: {repository name or unknown}
topic: "{Feature or Task Name} {Work Type}"
tags: [implementation, strategy, relevant-component-names]
status: complete
last_updated: {same exact ISO timestamp as date}
last_updated_by: {author from git context}
type: {work_type}
---

# Handoff: {concise description}

## Task(s)
{Active tasks and exact status. Name the current phase and link the governing plan or research artifact when applicable.}

## Critical References
{Required inputs for the next action as repository-relative Markdown links: target artifact, plus the purpose and relevant sections of any additional governing input. Use None for work without artifact inputs.}

## Recent changes
{Verified recent changes with repository-relative Markdown file links and line references.}

## Learnings
{Important verified patterns, root causes, constraints, and clearly labelled inferences or unknowns.}

## Artifacts
{An exhaustive ordered list of artifacts produced or updated, using repository-relative Markdown links. Mark each as Required input or Historical reference; an inventory entry is not itself a read requirement. Include other historical references only when they help recover a decision or resolve an open question.}

## Action Items & Next Steps
{Small, ordered actions for the next task, including validation and approval gates.}

## Other Notes
{Useful context that does not fit above, including deferred scope and explicit constraints.}
```

Avoid large code excerpts and diffs. Link durable evidence instead. Preserve exact identifiers needed to resume, but never include secrets or irrelevant personal data.

### 4. Verify and save

Before saving, confirm:

1. the output path uses the exact timestamp slug and a kebab-case description;
2. `date` and `last_updated` contain the exact same timestamp;
3. repository, branch, commit, and author match the helper output;
4. task completion and handoff-document completion are not confused;
5. every claimed change or learning is verified, labelled as inference, or labelled unknown;
6. human-readable file links are repository-relative and structural fields remain plain text;
7. action items preserve every explicit approval and scope boundary;
8. required inputs each have a next-action purpose, historical references are separately labelled, and settled decisions do not require replaying older handoffs;
9. the file did not already exist and no second artifact or product file changed.

Save the handoff only after these checks pass.

### 5. Report and stop

Render the completion report as ordinary Markdown, replacing the example target with the actual absolute path in Codex Desktop or the active host's required form elsewhere:

````markdown
Handoff written to:
[Handoff document](/absolute/repository/.rpiv/artifacts/handoffs/{timestamp}_{description}.md)

Describe extra context in chat if it should be appended before changing tasks. Re-run Create Handoff only when a new snapshot is needed.

---

Recommended next step: **Resume Handoff**

```text
.rpiv/artifacts/handoffs/{timestamp}_{description}.md
```

Start a fresh task first so it loads the handoff into a clean context. Resume Handoff is a separate skill; Create Handoff does not invoke it.
````

The successor name is a handoff, not permission to invoke it. Stop after the report.

## Non-negotiable boundaries

- Create exactly one new handoff artifact per invocation.
- Capture current truth; do not continue implementation to make the packet look tidier.
- Preserve the artifact path, frontmatter fields, section headings, and `status: complete` compatibility contract.
- Keep prose concise but sufficient for a reader with no conversation history.
- Never overwrite an existing handoff.
- Never commit, push, publish, contact external systems, invoke Resume Handoff, or start another workflow stage.
