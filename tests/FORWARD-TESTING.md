# Forward-testing Codex skills and workflow actions

Use this guide to improve one manually invoked Codex skill or workflow action through fresh, realistic task runs. Keep stage-specific prompts, locked answers, and pass conditions in that stage's harness files; keep the iteration machinery here.

The objective is “good enough with evidence,” not an immortal polishing daemon.

## Start with two high-value harnesses

Begin each new stage with two complementary harnesses:

1. **Minimal path** — the smallest realistic case, ideally exercising a zero-agent or low-complexity branch.
2. **Integration path** — a brownfield or cross-boundary case exercising the stage's distinctive agents, gates, evidence, artifacts, and failure boundaries.

Add another harness only when a material behavior cannot be exercised by either existing harness without making one incoherent. Prefer folding former bug cases into pass conditions or operator-controlled perturbations. A harness collection should be a test surface, not sedimentary rock.

Each harness must contain:

- one exact prompt under **Paste this prompt into the Codex editor**;
- locked answers under **Answers to give only when asked**;
- explicit operator decisions for conversational gates;
- optional operator-controlled perturbations such as repository drift;
- observable pass conditions;
- raw evidence to retain before cleanup.

Never give the task under test its rubric, expected result, prior diagnosis, or proposed fix. Send only the user prompt, then the locked answer that matches the question currently asked.

## Use RPIV as a reference, not a second runtime

For a ported RPIV capability, treat the pinned RPIV source and the stage's parity matrix as read-only design references:

1. Record the pinned commit and relevant workflow, skill, command, agent, helper, and artifact-template sources.
2. Maintain a compact matrix classifying valuable behavior as **Preserve**, **Codex adaptation**, **Deferred**, or **Intentionally omitted**.
3. Derive harness pass conditions from applicable **Preserve** rows and judge **Codex adaptation** rows by their declared native outcome.
4. Require reviewers to identify any meaningful behavior gap not already classified in the matrix.

Do not run RPIV-Pi, install or invoke Pi extensions, force identical question order, or compare transcripts and artifacts line by line. The reference explains what was valuable; the harness proves that the Codex-native capability retains that value with its deliberate human gates. Different wording or execution shape is acceptable unless it loses intent, evidence, an outcome, or another preserved behavior.

## Roles in one iteration

### Orchestrator

The goal-owning task controls the loop. It creates fresh subject tasks, sends fixture answers, captures evidence, requests independent reviews, applies scoped corrections, runs deterministic checks, and performs exact cleanup.

### Subject task

Run the skill as a real user would in a fresh isolated Codex task created from the current working tree. Do not tell it that it is being evaluated. Let it invoke only the agents authorized by the harness conversation.

### Two independent reviewers

After both subject runs finish, spawn exactly two read-only reviewers in parallel. Give each reviewer raw evidence and the applicable skill contract, harness, rubric, parity matrix, and relevant pinned-source references. Do not give either reviewer the orchestrator's diagnosis, the other review, prior-iteration findings, or the intended patch.

1. **Contract and evidence reviewer**
   - Check ordering, authorization, actual agent configuration, repository snapshots, write scope, lineage, cleanup boundaries, claims against raw commands and artifacts, and unexplained gaps against preserved reference behavior.
2. **Interaction and product-fidelity reviewer**
   - Check intent preservation, question dependencies, pacing, unnecessary friction, agent minimality, trade-offs, corrections, anti-rescoping, artifact usefulness, and whether Codex adaptations retain the valuable outcome.

Use Terra/high by default for both. Reviewers must not edit files, spawn children, or continue the workflow. Require this output:

```text
Verdict: pass | revise
Material findings:
- <finding with transcript, command, or artifact evidence>
Non-blocking observations:
- <optional improvement that should not force another iteration>
Recommended next experiment:
- <smallest test that distinguishes the finding from the next explanation>
```

## Iteration loop

### 1. Establish a baseline

- Record the source repository, branch, commit, Git status, and working-tree snapshot.
- List pre-existing files under the stage artifact directory.
- Record the skill, helpers, agents, tests, harnesses, and rubric in scope.
- Record the parity matrix, pinned RPIV commit and relevant source paths, and all currently accepted classifications. Read them only; do not execute RPIV or modify its repository.
- Refuse unrelated source dirt or fence it explicitly; never overwrite it.

### 2. Run both harnesses in fresh tasks

For each harness:

1. Create a fresh isolated Codex task from the current working tree.
2. Send only the exact prompt block.
3. Read each response and send only the matching locked answer or declared gate decision.
4. Perform operator-controlled perturbations outside the task conversation at the instructed point.
5. Capture the complete task transcript, tool and command record, spawned-agent tasks, repository snapshots, final artifact, validation output, and filesystem diff.
6. Stop after the harness's final decision. Never invoke the next workflow stage.

Do not reuse a subject task after changing the skill or scripts. A fresh task prevents stale instructions and prior answers from flattering the next iteration.

### 3. Run the independent reviews

- Give both reviewers the same raw evidence bundle.
- Preserve both verdicts before reconciling them.
- Verify every material finding against the transcript, repository, or emitted artifact.
- Exclude falsified findings and explain the exclusion in the iteration summary.
- If reviewers disagree, the orchestrator resolves the disagreement from evidence; do not add a committee merely because two agents produced different adjectives.

### 4. Decide whether another iteration is justified

Another iteration is required for a reproducible material finding involving:

- user intent, requested outcomes, or explicit boundaries being lost;
- unauthorized inspection, dispatch, mutation, chaining, or cleanup;
- a stale or misleading evidence boundary;
- incorrect actual agent role, prompt, model, reasoning, inputs, budget, or stop condition;
- invented requirements, deferrals, evidence, or product decisions;
- an incomplete, inconsistent, non-actionable, or invalid artifact;
- repeated interaction friction that obscures decisions or materially burdens the user.
- an applicable preserved RPIV behavior being lost, or a meaningful reference departure remaining unclassified.

Do not iterate solely for wording preference, cosmetic formatting, harmless variation, or a reviewer suggestion unsupported by the contract. Record those as non-blocking observations.

### 5. Apply the smallest correction

- Change only the current skill, its stage-specific agents and helpers, shared helpers genuinely required by it, and its tests or harness documentation.
- Add a deterministic contract test for a stable rule when practical.
- Do not weaken a test merely to accept the latest transcript.
- Do not implement another stage, install dependencies, alter Git history, commit, push, or touch another repository unless separately authorized.

### 6. Validate and repeat

- Run the repository test suite.
- Run structural skill validation.
- Inspect the source diff and ensure only intended paths changed.
- Start the next iteration with new subject tasks and clean context.

Stop successfully when:

- both harnesses pass after the most recent source change;
- both independent reviewers report no verified material finding;
- deterministic tests and structural validation pass;
- test-created artifacts are cleaned up and no unrelated state changed;
- residual limitations are genuinely human-only or explicitly accepted.
- no applicable preserved behavior is missing and no meaningful parity gap remains unexplained.

Stop without claiming success when:

- ten iterations have completed;
- progress requires an unscripted product decision or new authority;
- the same external blocker prevents meaningful progress;
- the required behavior cannot be observed with available tools.

## Cleanup

After reviewers have consumed the evidence:

- delete only artifact paths created after the recorded baseline;
- delete the exact operator-created perturbation files;
- preserve all pre-existing artifacts and unrelated dirty files;
- archive temporary subject tasks when their evidence has been captured;
- keep a compact iteration log under the ignored `.rpiv-codex/evals/<stage>/` directory while the goal is active;
- summarize the final result, then delete the goal's temporary evaluation log if it is no longer needed.

Never use a broad recursive deletion against `.rpiv-codex/`, a repository root, a workspace root, or an unresolved variable.

## Adapting this guide for a new stage

For `research`, `design`, `plan`, or another future skill:

1. Copy the two-harness shape, not discovery's questions.
2. Define the minimal path and the stage's highest-risk integration path.
3. Replace discovery-specific gates and artifacts with that stage's public contract.
4. Create or update that stage's parity matrix from its pinned RPIV sources without executing RPIV.
5. Keep the same fresh-task isolation, raw-evidence bundle, two independent reviews, materiality rule, ten-iteration ceiling, and exact cleanup discipline.
6. Add stage-specific deterministic tests only for stable rules; leave product judgment in the conversational harness.

## Reusable `/goal` template

Official Codex guidance recommends `/goal` for one durable objective with a verifiable stopping condition, named source material, validation evidence, checkpoints, and an explicit way to stop. See [Follow a goal](https://learn.chatgpt.com/use-cases/follow-goals).

```text
/goal Improve <SKILL_OR_ACTION> by following <ABSOLUTE_FORWARD_TEST_GUIDE>, <ABSOLUTE_STAGE_HARNESS_GUIDE>, and <ABSOLUTE_PARITY_MATRIX>. Treat the matrix and its pinned RPIV sources as read-only behavioral inspiration; do not run RPIV, invoke Pi extensions, or require line-by-line output equality. Run both stage harnesses in fresh isolated Codex tasks from the current working tree. Drive only their locked answers and declared gate decisions. After each iteration, have exactly two independent read-only reviewer subagents assess the raw inputs, transcripts, agent tasks, commands, repository snapshots, outputs, and any unexplained gap against behavior classified Preserve or Codex adaptation, without receiving prior diagnoses or intended fixes. Verify their findings, classify any intentional reference departure, apply only the smallest in-scope corrections, run deterministic tests and structural validation, clean only test-created artifacts, and repeat until both harnesses pass after the latest change with no verified material reviewer findings or unexplained parity gaps, or ten iterations have completed. Stop sooner if blocked by a user-only decision, missing authority, or behavior that available tools cannot observe. Do not implement another stage, install anything, commit, push, or modify another repository. Finish with the changes made, validation evidence, cleaned paths, parity assessment, and residual limitations.
```

## Suggested discovery goal

```text
/goal Improve rpivc-discover by following /Users/ryan.reynolds/Projects/rpiv-codex/tests/FORWARD-TESTING.md, /Users/ryan.reynolds/Projects/rpiv-codex/MANUAL-TEST.md, and /Users/ryan.reynolds/Projects/rpiv-codex/PARITY.md. Treat PARITY.md and its RPIV sources pinned at d0eb55371f622ac524b3355711a482f95feb14d4 as read-only behavioral inspiration; do not run RPIV, invoke Pi extensions, or require line-by-line output equality. Run both discovery harnesses in fresh isolated Codex tasks from the current working tree. Drive only their locked answers and declared gate decisions. After each iteration, have exactly two independent read-only Terra/high reviewer subagents assess the raw inputs, transcripts, agent tasks, commands, repository snapshots, outputs, and any unexplained gap against behavior classified Preserve or Codex adaptation, without receiving prior diagnoses or intended fixes. Verify their findings, classify any intentional reference departure, apply only the smallest changes within rpivc-discover, its required helpers, and its tests, run npm test and structural skill validation, clean only test-created artifacts, and repeat until both harnesses pass after the latest change with no verified material reviewer findings or unexplained parity gaps, or ten iterations have completed. Stop sooner if blocked by a user-only product decision or literal Codex interface behavior. Do not implement research or another stage, install anything, commit, push, or modify rpiv-mono. Finish with the changes made, validation evidence, cleaned paths, parity assessment, and residual limitations.
```
