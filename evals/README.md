# RPIV-Codex evaluations

Promptfoo owns the repeatable evaluation layer. The product remains the repository-local `rpivc-*` skills and agents; the evaluator drives those skills through Codex app-server tasks in disposable repository clones.

```text
Promptfoo case
  -> hosted simulated user
  -> RPIV-Codex target adapter
  -> Codex app-server task
  -> disposable current-working-tree clone
  -> safe child runtime attestation
  -> deterministic checks + two read-only agent graders
  -> local JSON, HTML, and evidence bundle
```

The suite follows the [official OpenAI evaluation workflow](https://learn.chatgpt.com/use-cases/ai-app-evals): exercise the path users hit, establish a baseline before changing product behavior, keep fixtures synthetic, and combine deterministic assertions with model grading.

## Commands

Prerequisites are Node.js 22.22.0 or newer, the repository dependencies, Codex 0.144.0 or newer, and an existing Codex/ChatGPT login.

```sh
npm install
npm test
npm run eval:discover:validate
npm run eval:discover
npm run eval:view
```

`npm run eval:discover` is deliberately one pass: two cases, one trial each, no cache, no sharing, and maximum concurrency one. It never repairs `rpivc-discover`, reruns a failed case, invokes RPIV-Pi, or starts another workflow stage.

## Discovery cases

- `no-probe-discovery` is the smallest realistic branch. It captures intent for a hypothetical spinner, justifies zero agents, completes the Feature Requirements Document, accepts it, and stops.
- `brownfield-agent-gates` is the integration branch. It begins locator-only, injects deterministic working-tree drift immediately before the first `Run`, requires a fresh card, permits an analyzer only from real locator anchors, removes the marker after final probe evidence, accepts the disclosed stale boundary, and stops after final artifact acceptance.

The simulated user receives only the synthetic persona, facts, allowed gate decisions, and stopping rule. It never receives the rubric, a diagnosis, or an intended patch.

## Evidence and verdicts

Each run writes beneath `.rpiv-codex/evals/<evaluation-id>/`:

- Promptfoo JSON and HTML reports
- source-checkout snapshots and a post-run isolation verdict
- one evidence directory per case
- complete target turns with app-server metadata and raw events
- `runtime-attestations.jsonl` for every approved child dispatch, containing hashes and runtime facts but no prompt or output text
- the relevant skill, agent, parity, and generated-artifact files
- deterministic assertion components
- separate contract/evidence and interaction/parity grader results
- a cleanup record for the disposable workspace

A product case passes only when its deterministic assertion and both independent agent rubrics pass. The wrapper also fails when the source checkout changes or a disposable workspace is not removed.

Literal click behavior in the Codex Desktop renderer is outside Promptfoo's app-server boundary. The automated suite verifies Markdown-link syntax and target existence; renderer interaction remains a small human calibration check.

For an approved child dispatch, the adapter captures the native spawn call, child thread identifier, completion, returned-output hash, and nested-spawn count. Evaluation threads are persisted only long enough to resume each child and verify its effective model, reasoning, and inherited sandbox, then archived. Codex exposes the child payload only as encrypted content, so the record proves opaque transport rather than byte-for-byte plaintext prompt equality; it states that limitation explicitly.

## Privacy and isolation

- Cases contain synthetic data only. Do not add customer data, secrets, credentials, or sensitive personal data.
- Promptfoo's hosted simulated-user service receives the synthetic scenario instructions and conversation history.
- Subject and grader Codex tasks use the existing local Codex login; no OpenAI application programming interface key is required by this suite.
- Telemetry, update checks, sharing, Cloud result sync, caching, inherited process environment, and Codex network access are disabled by the runner.
- Hosted simulated-user generation remains enabled intentionally.
- Disposable clones exclude Git-ignored files, `.rpiv-codex/`, dependencies, and common credential-file shapes. They are removed after Promptfoo finishes grading.

## Adding a later stage

Reuse the shape, not the discovery wording:

1. Add one minimal case and one integration case.
2. Give the simulated user only scenario facts and explicit human decisions.
3. Keep target orchestration in a thin adapter only when the stage needs controlled external events.
4. Put stable rules in deterministic assertions and qualitative behavior in two independent rubrics.
5. Read the pinned RPIV sources and parity matrix as inspiration; do not execute Pi or require line-by-line equality.
6. Run one baseline and stop for human calibration before changing the skill.
