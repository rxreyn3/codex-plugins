# Forward-testing Codex skills and workflow actions

Use this guide to evaluate one manually invoked Codex skill or workflow action in one evidence-gathering pass. Keep stage-specific prompts, locked answers, and pass conditions in that stage's harness files; keep the reusable evaluation machinery here.

The output is one evidence-backed **PASS** or **FAIL**. After the reviews, the evaluation may apply one bounded correction set and validate it, but it never reruns a harness or starts a second correction cycle. Ryan reviews the result and decides whether to launch another evaluation. Autonomy is useful; an unsupervised prompt-polishing carousel is less charming.

## Start with two high-value harnesses

Give each new stage two complementary harnesses:

1. **Minimal path** — the smallest realistic case, ideally exercising a zero-agent or low-complexity branch.
2. **Integration path** — a brownfield or cross-boundary case exercising the stage's distinctive agents, gates, evidence, artifacts, and failure boundaries.

Add another harness only when a material behavior cannot fit coherently into either existing harness. Prefer folding former bug cases into pass conditions or operator-controlled perturbations.

Each harness must contain:

- one exact prompt under **Paste this prompt into the Codex editor**;
- locked answers under **Answers to give only when asked**;
- explicit operator decisions for conversational gates;
- optional operator-controlled perturbations such as repository drift;
- observable pass conditions;
- raw evidence to retain before cleanup.

Never give the subject task its rubric, expected result, prior diagnosis, or proposed fix. Send only the user prompt, then the locked answer matching the question currently asked.

## Use RPIV as a reference, not a second runtime

For a ported RPIV capability, treat the pinned RPIV source and the stage's parity matrix as read-only design references:

1. Record the pinned commit and relevant workflow, skill, command, agent, helper, and artifact-template sources.
2. Maintain a compact matrix classifying valuable behavior as **Preserve**, **Codex adaptation**, **Deferred**, or **Intentionally omitted**.
3. Derive harness pass conditions from applicable **Preserve** rows and judge **Codex adaptation** rows by their declared native outcome.
4. Require reviewers to identify any meaningful behavior gap not already classified in the matrix.

Do not run RPIV-Pi, install or invoke Pi extensions, force identical question order, or compare transcripts and artifacts line by line. The reference explains what was valuable; the harness proves whether the Codex-native capability retains that value with its deliberate human gates.

## Roles in one evaluation

### Orchestrator

The goal-owning task records the baseline, creates fresh subject tasks, sends fixture answers, captures raw evidence, requests independent reviews, verifies findings, applies at most one bounded correction set, runs deterministic checks, performs exact cleanup, reports **PASS** or **FAIL**, and stops.

It may edit only the current skill, its stage-specific agents and helpers, shared helpers genuinely required by it, and directly affected tests or harness documentation. It must not implement another stage, broaden the product contract, or silently reclassify a parity decision that requires Ryan's judgment.

### Subject task

Run the skill as a real user would in a fresh isolated Codex task created from the current working tree. Do not tell it that it is being evaluated. Let it invoke only agents authorized through the harness conversation.

### Two independent reviewers

After both subject runs finish, spawn exactly two read-only reviewers in parallel. Give each reviewer the raw evidence, applicable skill contract, harness, rubric, parity matrix, and relevant pinned-source references. Do not give either reviewer the orchestrator's diagnosis, the other review, earlier evaluation findings, or an intended patch.

1. **Contract and evidence reviewer**
   - Check ordering, authorization, actual agent configuration, repository snapshots, write scope, lineage, cleanup boundaries, raw claims, and unexplained gaps against preserved reference behavior.
2. **Interaction and product-fidelity reviewer**
   - Check intent preservation, question dependencies, pacing, unnecessary friction, agent minimality, trade-offs, corrections, anti-rescoping, artifact usefulness, and whether Codex adaptations retain the valuable outcome.

Use Terra/high by default for both. Reviewers must not edit files, spawn children, or continue the workflow. Require this output:

```text
Verdict: PASS | FAIL
Material findings:
- <finding with transcript, command, or artifact evidence>
Non-blocking observations:
- <optional improvement that does not fail the evaluation>
Recommended correction:
- <smallest evidence-backed correction>
```

## Single evaluation pass

### 1. Establish the baseline

- Record the source repository, branch, commit, Git status, and working-tree snapshot.
- List pre-existing files under the stage artifact directory.
- Record the skill, helpers, agents, tests, harnesses, and rubric in scope.
- Record the parity matrix, pinned RPIV commit and relevant source paths, and accepted classifications. Read them only; do not execute RPIV or modify its repository.
- Refuse unrelated source dirt or fence it explicitly; never overwrite it.

### 2. Run each harness exactly once

For each harness:

1. Create one fresh isolated Codex task from the current working tree.
2. Send only the exact prompt block.
3. Read each response and send only the matching locked answer or declared gate decision.
4. Perform operator-controlled perturbations outside the subject conversation at the instructed point.
5. Capture the complete task transcript, tool and command record, spawned-agent tasks, repository snapshots, final artifact, validation output, and filesystem diff.
6. Stop after the harness's final decision. Never invoke the next workflow stage.

Do not restart or rerun a harness during the same evaluation. A tool failure, incomplete transcript, unavailable runtime evidence, or other proof gap produces **FAIL** with the limitation stated plainly.

### 3. Run the two reviews once

- Give both reviewers the same raw evidence bundle.
- Preserve both verdicts before reconciling them.
- Resolve reviewer disagreement from evidence. If the disagreement cannot be resolved, report **FAIL** because the acceptance case is unproven.

### 4. Apply at most one bounded correction set

- Verify every material reviewer finding against the raw evidence before editing.
- Exclude falsified findings and explain the exclusion in the final report.
- If no verified material finding exists, make no source change.
- If verified findings exist, apply the smallest coherent correction set within the declared scope and add or update deterministic tests when practical.
- Do not rerun either harness, respawn the reviewers, or make a second correction pass. Behavioral changes remain unproven until Ryan launches another evaluation.
- If a finding requires a product decision, new authority, another stage, or a parity reclassification, recommend it without applying it.

### 5. Run deterministic checks

- Run the repository test suite.
- Run structural skill validation.
- Inspect the source and filesystem diffs for unauthorized changes.
- Do not repair a validation failure after this check; record it in the verdict.

### 6. Decide and stop

Report **PASS** only when:

- both harnesses satisfy every applicable pass condition;
- both reviewers have no verified material finding;
- deterministic tests and structural validation pass;
- no unauthorized state changed;
- no applicable preserved behavior is missing and no meaningful parity gap remains unexplained.
- no material behavioral correction was required after the harness runs.

Report **FAIL** when any condition above is unproven or false. If one bounded correction set was applied, label the outcome **FAIL — candidate fixes applied; rerun required** and list every changed path. Include verified findings, evidence, validation results, non-blocking observations, and any remaining recommended changes. End the goal after reporting the verdict and cleaning evaluation-created state.

## Cleanup

After reviewers have consumed the evidence:

- delete only artifact paths created after the recorded baseline;
- delete the exact operator-created perturbation files;
- preserve all pre-existing artifacts and unrelated dirty files;
- archive temporary subject tasks after their evidence is captured;
- keep no hidden routing or continuation state.

Never use a broad recursive deletion against `.rpiv-codex/`, a repository root, a workspace root, or an unresolved variable.

## Adapting this guide for a new stage

For `research`, `design`, `plan`, or another future skill:

1. Copy the two-harness shape, not discovery's questions.
2. Define the minimal path and the stage's highest-risk integration path.
3. Replace discovery-specific gates and artifacts with that stage's public contract.
4. Create or update that stage's parity matrix from pinned RPIV sources without executing RPIV.
5. Keep the same fresh-task isolation, raw-evidence bundle, two independent reviews, single-pass verdict, and exact cleanup discipline.
6. Add stage-specific deterministic tests only for stable rules; leave product judgment in the conversational harness.

## Reusable `/goal` template

Official Codex guidance recommends `/goal` for a durable objective with a verifiable stopping condition, named source material, validation evidence, checkpoints, and an explicit way to stop. See [Follow a goal](https://learn.chatgpt.com/use-cases/follow-goals).

```text
/goal Evaluate <SKILL_OR_ACTION> exactly once by following <ABSOLUTE_FORWARD_TEST_GUIDE>, <ABSOLUTE_STAGE_HARNESS_GUIDE>, and <ABSOLUTE_PARITY_MATRIX>. Treat the matrix and its pinned RPIV sources as read-only behavioral inspiration; do not run RPIV, invoke Pi extensions, or require line-by-line output equality. Run each stage harness exactly once in its own fresh isolated Codex task from the current working tree. Drive only locked answers and declared gate decisions. Then have exactly two independent read-only reviewer subagents assess the same raw inputs, transcripts, agent tasks, commands, repository snapshots, outputs, and parity contract without receiving prior diagnoses or intended fixes. Verify their findings and apply at most one bounded correction set within the current capability, its required helpers, and directly affected tests or harness documentation. Run deterministic tests and structural validation, clean only evaluation-created artifacts, report one evidence-backed PASS or FAIL, and stop. Do not rerun a harness, respawn reviewers, start a second correction pass, implement another stage, install anything, commit, push, or modify another repository. If behavioral corrections were applied, report FAIL with candidate fixes applied and rerun required.
```

## Suggested discovery goal

```text
/goal Evaluate rpivc-discover exactly once by following /Users/ryan.reynolds/Projects/rpiv-codex/tests/FORWARD-TESTING.md, /Users/ryan.reynolds/Projects/rpiv-codex/MANUAL-TEST.md, and /Users/ryan.reynolds/Projects/rpiv-codex/PARITY.md. Treat PARITY.md and its RPIV sources pinned at d0eb55371f622ac524b3355711a482f95feb14d4 as read-only behavioral inspiration; do not run RPIV, invoke Pi extensions, or require line-by-line output equality. Run each discovery harness exactly once in its own fresh isolated Codex task from the current working tree. Drive only locked answers and declared gate decisions. Then have exactly two independent read-only Terra/high reviewer subagents assess the same raw inputs, transcripts, agent tasks, commands, repository snapshots, outputs, and parity contract without receiving prior diagnoses or intended fixes. Verify their findings and apply at most one bounded correction set within rpivc-discover, its required agents or helpers, and directly affected tests or harness documentation. Run npm test and structural skill validation, clean only evaluation-created artifacts, report one evidence-backed PASS or FAIL, and stop. Do not rerun a harness, respawn reviewers, start a second correction pass, implement research or another stage, install anything, commit, push, or modify rpiv-mono. If behavioral corrections were applied, report FAIL with candidate fixes applied and rerun required.
```
