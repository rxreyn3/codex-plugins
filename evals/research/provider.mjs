import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadApiProviders } from "promptfoo";

import {
  createDisposableWorkspace,
  retainWorkspaceReferences,
  snapshotRepository,
  syncEvidence,
} from "../_shared/workspace.mjs";
import {
  buildDispatchAttestation,
  captureAttestationEvent,
  extractAgentCards,
} from "./runtime-attestation.mjs";
import { contextSnapshot } from "../../.agents/skills/_shared/scripts/context-snapshot.mjs";
import { inspectArtifact } from "../../.agents/skills/_shared/scripts/artifact-check.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

// Promptfoo may provide either a plain string or a serialized message history.
// The app-server receives only the latest simulated-user turn so the provider,
// rather than hidden prompt history, owns evaluation state.
function parseLatestUserMessage(prompt) {
  try {
    const parsed = JSON.parse(prompt);
    if (Array.isArray(parsed)) {
      const message = parsed.toReversed().find((entry) => entry?.role === "user" && typeof entry.content === "string");
      if (message) return message.content;
    }
  } catch {
    // A plain prompt is already the user message.
  }
  return prompt;
}

function plainDecisionLine(line) {
  return line.replaceAll(/[*_`]/g, "").trim();
}

export function hasAgentCard(output, role) {
  return output.includes(role)
    && output.split("\n").some((line) =>
      /\bRun\b\s*(?:\/|,).*\bEdit\b\s*(?:\/|,).*\bOmit\b\s*(?:\/|,).*\bStop\b/i.test(plainDecisionLine(line)));
}

function normalizedDecision(input) {
  return input.trim().replaceAll("*", "").toLowerCase();
}

export function shouldCaptureRuntimeSnapshot(input, pendingCards = []) {
  const decision = normalizedDecision(input);
  return pendingCards.length > 0 || decision === "use scope" || decision.startsWith("refresh");
}

function appendJsonLine(target, value) {
  fs.appendFileSync(target, `${JSON.stringify(value)}\n`);
}

function childRolloutEvidence(rolloutPath) {
  if (typeof rolloutPath !== "string" || !fs.existsSync(rolloutPath)) {
    return { completed: false, error: null, output: null, nestedSpawns: null };
  }
  let completed = false;
  let error = null;
  let output = null;
  let nestedSpawns = 0;
  for (const line of fs.readFileSync(rolloutPath, "utf8").split("\n").filter(Boolean)) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const item = entry?.payload ?? {};
    if (entry.type === "event_msg" && item.type === "task_complete") completed = true;
    if (entry.type === "event_msg" && item.type === "turn_aborted") error = "turn aborted";
    if (entry.type !== "response_item") continue;
    if (item.type === "message" && item.role === "assistant") {
      const text = Array.isArray(item.content)
        ? item.content.map((part) => part?.text ?? "").join("\n")
        : item.text;
      if (typeof text === "string" && text.length > 0) output = text;
    }
    if (item.type === "function_call" && item.name === "spawn_agent") nestedSpawns += 1;
    if (item.type === "custom_tool_call" && item.name === "exec"
      && typeof item.input === "string" && item.input.includes("multi_agent_v1__spawn_agent")) nestedSpawns += 1;
  }
  return { completed, error, output, nestedSpawns };
}

export function retainUniqueAttestation(state, attestation) {
  if (!attestation.dispatch || state.attestedCallIds.has(attestation.dispatch.call_id)) return false;
  state.attestedCallIds.add(attestation.dispatch.call_id);
  state.attestations.push(attestation);
  return true;
}

export function observeResearchArtifact(workspace, turn) {
  const directory = path.join(workspace, ".rpiv-codex", "artifacts", "research");
  const artifacts = fs.existsSync(directory)
    ? fs.readdirSync(directory).filter((name) => name.endsWith(".md")).sort()
    : [];
  if (artifacts.length === 0) return null;
  if (artifacts.length !== 1) {
    return {
      turn,
      artifact_count: artifacts.length,
      relative_path: null,
      artifact_sha256: null,
      inspection_passed: false,
      inspection_error: "research revision lifecycle requires exactly one artifact path",
    };
  }

  const absolute = path.join(directory, artifacts[0]);
  const bytes = fs.readFileSync(absolute);
  let inspectionError = null;
  try {
    inspectArtifact(absolute, workspace);
  } catch (error) {
    inspectionError = error instanceof Error ? error.message : String(error);
  }
  return {
    turn,
    artifact_count: 1,
    relative_path: path.relative(workspace, absolute).split(path.sep).join("/"),
    artifact_sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    byte_length: bytes.length,
    inspection_passed: inspectionError === null,
    inspection_error: inspectionError,
  };
}

export function retainArtifactRevisionObservation(state) {
  const observation = observeResearchArtifact(state.workspace, state.turn);
  if (!observation) return null;
  const previous = state.artifactRevisionObservations.at(-1);
  if (previous
    && previous.artifact_count === observation.artifact_count
    && previous.relative_path === observation.relative_path
    && previous.artifact_sha256 === observation.artifact_sha256
    && previous.inspection_passed === observation.inspection_passed) return null;
  state.artifactRevisionObservations.push(observation);
  appendJsonLine(path.join(state.evidenceDir, "artifact-revisions.jsonl"), observation);
  return observation;
}

// Promptfoo carries its own Codex dependency, which can lag the installed app
// and omit protocol fields used by this evaluator. Prefer the system executable
// while explicitly skipping this repository's npm shim.
function executableOnPath(name, sourceRoot) {
  const localBin = path.join(sourceRoot, "node_modules", ".bin");
  for (const directory of String(process.env.PATH ?? "").split(path.delimiter)) {
    if (!directory || path.resolve(directory) === path.resolve(localBin)) continue;
    const candidate = path.join(directory, name);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // Keep looking for the system executable rather than npm's transitive binary.
    }
  }
  return name;
}

function createDiscoveryFixture(workspace, caseId) {
  const context = contextSnapshot(workspace);
  const directory = path.join(workspace, ".rpiv-codex", "artifacts", "discover");
  fs.mkdirSync(directory, { recursive: true });
  const target = path.join(directory, `${caseId}.md`);
  const crossCutting = caseId === "cross-cutting-research";
  const text = `---
stage: discover
status: review
rpiv_source: "packages/rpiv-pi/skills/discover/SKILL.md"
rpiv_commit: d0eb55371f622ac524b3355711a482f95feb14d4
supersedes: null
source_artifacts: []
repository: "${context.repository}"
branch: "${context.branch}"
commit: "${context.commit}"
working_tree_sha256: "${context.working_tree_sha256}"
working_tree_scope: "${context.working_tree_scope}"
created_at: "${context.created_at}"
author: "Evaluation Fixture"
topic: "${caseId}"
target_context: "rpiv-codex repository"
---

# Feature Requirements Document: Research evaluation fixture

## Summary
Research ${crossCutting ? "the skill, artifact, evaluation, and runtime-attestation integration" : "the shared artifact allocation and inspection seam"}.

## Problem & Intent
The developer needs grounded current-code research before a later design decision.

## Goals
- Trace current behavior with verified clickable evidence.
- Preserve visible human approval gates.

## Non-Goals
- Do not change product code or design the solution.
- Do not use external web research.

## Functional Requirements
- Cover every approved research question exactly once.
- Keep current code distinct from Git precedent.

## Non-Functional Requirements
- Work behaviorally read-only outside one research artifact.

## Constraints & Assumptions
- Use the accepted local repository and existing deterministic helpers.

## Acceptance Criteria
- A research artifact contains verified links, complete coverage, and inherited decisions.

## Recommended Approach
Use the manually gated RPIVC research unit with adaptive specialists.

## Decisions
- External web research is deferred.
- No successor stage starts automatically.

## Open Questions
None.

## Dispatch Ledger
- no probe justified — evaluation fixture supplied the bounded target.

## References
None.
`;
  fs.writeFileSync(target, text);
  return target;
}

export default class RpivcResearchProvider {
  constructor(options = {}) {
    this.providerId = options.id ?? "rpivc-research-app-server";
    this.config = options.config ?? {};
    this.providerLoader = options.providerLoader ?? loadApiProviders;
    this.states = new Map();
  }

  id() {
    return this.providerId;
  }

  async createState(context) {
    const caseId = String(context?.vars?.case_id ?? "");
    const inputMode = String(context?.vars?.input_mode ?? "discovery");
    const evaluationId = process.env.RPIVC_EVAL_ID;
    const evidenceRoot = process.env.RPIVC_EVIDENCE_ROOT;
    const configuredSource = process.env.RPIVC_SOURCE_ROOT
      ?? path.resolve(moduleDirectory, this.config.source_root ?? "../..");
    const codexPath = process.env.RPIVC_CODEX_PATH ?? executableOnPath("codex", configuredSource);
    if (!evaluationId || !evidenceRoot || !caseId) {
      throw new Error("RPIVC_EVAL_ID, RPIVC_EVIDENCE_ROOT, and case_id are required");
    }
    const evidenceDir = path.join(evidenceRoot, caseId);
    const workspaceState = createDisposableWorkspace({
      sourceRoot: configuredSource,
      evaluationId,
      caseId,
      evidenceDir,
    });
    if (!["discovery", "prompt"].includes(inputMode)) {
      throw new Error(`unsupported research input_mode: ${inputMode}`);
    }
    // A single approved child may legitimately use two 600-second same-child
    // waits before the parent can synthesize its terminal payload. Keep the
    // outer turn ceiling above that path in both input modes.
    const turnTimeoutMs = 1800000;
    const discoveryArtifact = inputMode === "discovery"
      ? createDiscoveryFixture(workspaceState.workspace, caseId)
      : null;
    workspaceState.baseline = snapshotRepository(workspaceState.workspace);
    fs.writeFileSync(
      path.join(evidenceDir, "baseline.json"),
      `${JSON.stringify(workspaceState.baseline, null, 2)}\n`,
    );
    const delegateConfigs = [{
      id: "openai:codex-app-server:gpt-5.6-luna",
      config: {
        working_dir: workspaceState.workspace,
        codex_path_override: codexPath,
        model: "gpt-5.6-luna",
        model_reasoning_effort: "low",
        personality: "pragmatic",
        base_instructions: "You are Codex performing an isolated repository skill evaluation. Follow the explicitly supplied skill and the user's visible decisions exactly. Use the available repository and collaboration tools as required, and return concise progress and gate output. A valid tracer response contains all five headings Discovery Summary, Research Questions, Shared Files, Evidence Gaps, and Proposed Execution Plan; 5-9 numbered questions with at least three artifact citations each; and exact coverage in at most three groups. Tell the tracer to self-check this schema before returning. The scope checkpoint must show that complete feasible plan before Use scope can approve it; never show four cards and silently regroup afterward. Use scope authorizes card preparation only: respond by displaying the complete analysis YAML cards, ask Run/Edit/Omit/Stop, and end the turn without inspecting source, dispatching, synthesizing, or preparing a compiled scan. Only the later Run authorizes dispatch. Copy the full literal approved question text into analysis-card inputs. Require each child result to end with one literal-clause matrix row per named clause, including status, finding, and exact evidence or gap. Derive each question status from its worst clause; never mark it Answered if any clause is missing, unsupported, or conflicted. The compiled scan must contain one canonical Coverage snapshot line plus one canonical Q clause row per question. Compiled-scan preparation is read-only and has no two-attempt ceiling: repair reported coverage or citation defects and rerun until it passes or evidence is unavailable. The prepare-research-scan result includes claim, claim_line, and source_excerpt for review; after that comparison, use only its normalized_markdown. Then run the exact final draft through artifact-check.mjs render-research-scan and present its plain Markdown output byte-for-byte; append only the write gate and never reconstruct a path or label from JSON. The two-invocation ceiling applies only to inspection after an artifact has been written. In discovery mode, Source Feature must link the exact validated absolute discovery-artifact path. Preserve prepared citation ranges exactly; never widen or join them when writing the artifact. Treat accepted rendered Markdown as the artifact's complete current-code evidence inventory. Copy the complete rendered scan byte-for-byte under Detailed Findings, its snapshot unchanged into Summary, and its Q rows unchanged into Coverage Ledger. Summary must not contain any Q clause row; those rows appear only in Coverage Ledger and the copied Detailed Findings scan. Add no new current-code prose or citations from child output. Code References points to Detailed Findings. Integration Points and Architecture Insights either copy a complete rendered-scan evidence line verbatim or state that there is no additional finding beyond Detailed Findings.",
        developer_instructions: "Evaluation isolation: do not consult personal memory, external applications, or the network. The configured current working directory is the repository; run relative shell commands there and do not reconstruct an alternate workdir. Do not change source files. Follow the supplied rpivc-research skill as the authoritative workflow contract. When a user decision includes an rpivc-evaluation-runtime-snapshot block, it is the exact context-snapshot helper output captured immediately before that decision. Copy its repository, branch, commit, and working_tree_sha256 verbatim into every new or refreshed card. Never recompute or approximate those fields with git status, git ls-files, shasum, or another command. Before displaying a card, verify it contains exactly one working_tree_sha256 key and that the value is exactly 64 hexadecimal characters matching the authoritative snapshot. A refreshed gate must redisplay every complete YAML card; a summary is not an approvable card. Analysis profiles are fixed: codebase analyzer and pattern finder are gpt-5.6-terra/high; integration scanner and precedent locator are gpt-5.6-luna/low. Verify every displayed analysis role/model/reasoning triple before asking Run; never reuse the tracer's medium reasoning for analysis. Do not enumerate or search ALL_TOOLS for collaboration. The supported spawn surface is tools.multi_agent_v1__spawn_agent inside functions.exec; call it directly with the exact card role as agent_type, fork_context: false, the approved envelope as message, and the exact card model and reasoning_effort. Begin every functions.exec spawn-and-wait script with // @exec: {\"yield_time_ms\": 120000}. After spawn returns agent_id, call tools.multi_agent_v1__wait_agent({ targets: [spawned.agent_id], timeout_ms: 600000 }). If that returns a non-final timeout snapshot, call the same wait again on the same agent_id inside the same script. The 120-second outer yield is not a child deadline. If functions.exec returns Script running with cell ID, immediately call functions.wait with that exact cell_id until final output; do not dispatch another card, synthesize, or end the turn first. Never treat a wait timeout as terminal, spawn a replacement, or advance to the next approved card while the current child is non-final. Do not guess other parameter names and do not return an awaiting placeholder. For a multi-card wave, use one separate functions.exec spawn-and-wait call per card, in displayed order, so each approved envelope and result remains independently observable. Artifact citations may use only exact child-returned target-and-line pairs rechecked against current numbered source; never derive source lines from artifact line numbers. Treat each approved question as a hypothesis, split it into named clauses, and mark it Answered only when every clause has direct evidence; when every executed card has depends_on: [], do not claim that a dependent wave ran. Before displaying the compiled scan, pass its complete draft, including the canonical Coverage snapshot and Q clause rows, in a quoted heredoc to artifact-check.mjs prepare-research-scan; never invoke the command bare. Use one behavior and exactly one current-code citation per evidence bullet, split multi-range support into separate bullets, and keep ranges no wider than 15 lines. For every returned citation, compare claim to source_excerpt and repair any semantic mismatch before rendering. Present render-research-scan output exactly. Use full repository-relative citation labels in the compiled scan as well as the artifact; basename-only labels are invalid. The artifact is a projection of that rendered scan, not a second synthesis pass: preserve its exact coverage statuses, totals, Q rows, evidence lines, and citation ranges. After writing or revising the artifact, run artifact-check.mjs normalize-citations on the exact draft path before inspection; do not use sed or an ad hoc script to rebuild citation labels. If inspection reports an out-of-bounds range, re-read that target with numbered lines and replace the entire start-end range; never decrement only the end or clamp a start beyond EOF. Artifact inspection has a hard two-invocation ceiling for the initial draft: after one failed inspection, make one correction, normalize citations again, and inspect once more; if that second invocation fails, stop immediately.",
        sandbox_mode: "workspace-write",
        network_access_enabled: false,
        approval_policy: "never",
        // Child settings can only be queried with thread/resume when rollouts are
        // persisted. Every evaluation task is archived during cleanup below.
        ephemeral: false,
        persist_threads: true,
        thread_pool_size: 1,
        thread_cleanup: "archive",
        persist_extended_history: true,
        experimental_raw_events: true,
        include_raw_events: true,
        inherit_process_env: false,
        reuse_server: true,
        request_timeout_ms: turnTimeoutMs,
        startup_timeout_ms: 120000,
        turn_timeout_ms: turnTimeoutMs,
        cli_config: {
          features: {
            multi_agent: true,
            memories: false,
            apps: false,
            plugins: false,
            recommended_plugins: false,
            browser_use: false,
            in_app_browser: false,
          },
        },
      },
    }];
    const previousWaitInstructions = "After spawn returns agent_id, call tools.multi_agent_v1__wait_agent({ targets: [spawned.agent_id], timeout_ms: 600000 }). If that returns a non-final timeout snapshot, call the same wait again on the same agent_id inside the same script.";
    const keyedWaitInstructions = "After spawn returns agent_id, call tools.multi_agent_v1__wait_agent({ targets: [spawned.agent_id], timeout_ms: 600000 }). Its status is a map: read only waited.status?.[spawned.agent_id]. The keyed child object is terminal when Object.hasOwn(state, \"completed\") || Object.hasOwn(state, \"failed\") || Object.hasOwn(state, \"cancelled\") || Object.hasOwn(state, \"terminated\"). Never compare the complete waited.status map with status strings and never poll a terminal keyed child again. Only if the keyed state is absent or non-final may the script call the same wait again on the same agent_id.";
    const evaluationCorrections = "On the initial request, the first command must be artifact-check.mjs preflight-research with the exact input as its one literal argument. The invoked skill content is already supplied; do not access SKILL.md through cat, sed, rg, find, or any other shell command at any time. Do not cat, read, or combine the discovery artifact or target files in any command before preflight; use artifact_content returned by preflight. Read only the contract and template after preflight succeeds. Never use a current-file citation to claim Git history such as introduced, inherited, or changed behavior. Split that into one current-behavior bullet with one file citation and one separate history bullet with a locally verified plain commit identifier.";
    const exactPreflightCorrection = "The exact first command executable path is node .agents/skills/_shared/scripts/artifact-check.mjs preflight-research <input>. Do not shorten, relocate, search for, or guess that helper path. The first command must exit zero; a failed attempt followed by discovery is not preflight-first.";
    const initialGateCorrection = "After successful preflight and reading the contract and template, the initial turn must display only one complete YAML card with id S1, role rpivc-scope-tracer, task_name s1_scope_tracer, model gpt-5.6-terra, the literal card field reasoning: medium, no reasoning_effort card field, and the Run/Edit/Omit/Stop gate, then end. reasoning_effort is only the spawn-API argument mapped from card.reasoning. Do not answer the research questions, produce Discovery Summary or Proposed Execution Plan, invoke the tracer, show analysis cards, or offer Use scope on the initial turn. Only the user's later Run authorizes spawning S1. Analysis card roles must also be exact callable rpivc-* role identifiers, never human-readable aliases such as codebase analyzer.";
    const scopeCheckpointCorrection = "When a later Run authorizes S1, spawn and wait for S1, then present the complete tracer payload with all five required headings, its 5-9 numbered questions, and the complete feasible coverage plan, followed only by Use scope/Revise scope/Stop, then end. Do not construct or display any A-card in the S1 Run response. Only the user's subsequent Use scope authorizes preparing and displaying complete A-cards with Run/Edit/Omit/Stop; Use scope does not authorize dispatch.";
    const aggregateScanCorrection = "prepare-research-scan returns every detectable citation defect in one aggregated correction set. After a failure, repair every listed defect together before one rerun; do not submit sequential one-defect retries.";
    const invalidChildCorrection = "If a terminal analysis child omits the required literal-clause matrix or answers a different task, do not spawn a replacement, silently repair its answer, ask for synthesis authorization, or end with only an acknowledgement. Record the invalid child as an evidence gap, mark every clause assigned only to that card Unanswered, and continue the already-approved turn directly into synthesis and the compiled-scan preparation.";
    const tracerAndEvidenceCorrection = "Treat a discovery path in the approved tracer card as already absolute and pass it literally; never prepend repository or duplicate .rpiv-codex. Before offering Use scope, validate the tracer's five headings, 5-9 numbered questions, three concrete artifact links per question, exact group coverage, and smallest roster. Never parent-author replacement scope for an invalid tracer; stop before analysis. Fold Git precedent into the analyzer whenever it concerns the same files, never a standalone precedent locator merely for history. During citation excerpt review, cite the lines that perform each claimed action: return claims cite the return object, check or verdict claims cite the check expressions, and multi-file claims become separate one-file bullets. Lines that merely select or stage values do not prove they are returned, hashed, or checked. An unknown-stage claim cites both the stage guard and throw. Scan normalization, coverage validation, citation checks, and the normalized_markdown return are separate claims with separate evidence. In parseCoverageProjection, snapshot recognition, contiguous identifiers and totals, and clause-row checks are separate evidence blocks. In validateLocalMarkdownLinks, target and label checks are separate from the later research-width check. In runtime-attestation, no-history, completion, output, and no-fan-out claims must each cite their individual context_mode_matches, child_completed, child_output_observed, or no_child_fanout check expression; selection of those values is not the verdict. An overall runtime pass claim cites Object.values(checks).every(Boolean). A passing-attestation claim cites attestations.every, while bounded-spawn behavior is a separate claim citing the direct-child budget expression. When writing the artifact, start from the complete research template and preserve every template ## section heading exactly once, including Research Questions, Evidence Conflicts and Gaps, and Dispatch Ledger; never compress or omit empty sections. Summary contains the snapshot but no Q clause rows; Q rows belong only in Coverage Ledger and the copied Detailed Findings scan.";
    const strictTracerLinksCorrection = "Every tracer citation must use a full repository-relative path:line label and a literal absolute local target beginning with /. file:// targets, basename labels, and targets without a line or range are invalid. Reject an invalid tracer before offering Use scope.";
    const projectionVerificationCorrection = "Preserve every inherited discovery decision in Developer Context, including negative workflow boundaries such as no automatic successor stage. Before normalize-citations or inspect, pass the exact rendered scan through a quoted heredoc to artifact-check.mjs verify-research-projection on the draft path. Repair every reported projection mismatch before continuing; this read-only check does not consume an inspection attempt. Repeat it after Revise.";
    const configuredDeveloperInstructions = delegateConfigs[0].config.developer_instructions;
    const correctedDeveloperInstructions = configuredDeveloperInstructions
      .replace(previousWaitInstructions, keyedWaitInstructions)
      .concat(" ", evaluationCorrections, " ", exactPreflightCorrection, " ", initialGateCorrection, " ", scopeCheckpointCorrection, " ", aggregateScanCorrection, " ", invalidChildCorrection, " ", tracerAndEvidenceCorrection, " ", strictTracerLinksCorrection, " ", projectionVerificationCorrection);
    if (correctedDeveloperInstructions === configuredDeveloperInstructions) {
      throw new Error("research evaluation wait instructions were not corrected");
    }
    delegateConfigs[0].config.developer_instructions = correctedDeveloperInstructions;
    const [delegate] = await this.providerLoader(delegateConfigs);
    const state = {
      ...workspaceState,
      caseId,
      evaluationId,
      delegate,
      turn: 0,
      phase: "ordinary",
      inputMode,
      discoveryArtifact,
      driftMarker: path.join(
        workspaceState.workspace,
        "tests",
        `.rpivc-eval-drift-${evaluationId}.txt`,
      ),
      driftEvents: [],
      latestCards: [],
      pendingCards: [],
      attestationEvents: [],
      attestations: [],
      attestedCallIds: new Set(),
      artifactRevisionObservations: [],
      archivedThreadIds: new Set(),
      capturesProtocolEvents: false,
    };
    if (typeof delegate.handleNotification === "function") {
      // Tap the notification before Promptfoo reduces unknown collaboration
      // items to generic metadata. The reducer stores hashes/settings only.
      const originalHandleNotification = delegate.handleNotification.bind(delegate);
      delegate.handleNotification = (message) => {
        const captured = captureAttestationEvent(message);
        if (captured) state.attestationEvents.push(captured);
        return originalHandleNotification(message);
      };
      state.capturesProtocolEvents = true;
    }
    this.states.set(caseId, state);
    return state;
  }

  async stateFor(context) {
    const caseId = String(context?.vars?.case_id ?? "");
    return this.states.get(caseId) ?? this.createState(context);
  }

  connectionFor(state) {
    return [...(state.delegate.connections?.values?.() ?? [])][0] ?? null;
  }

  // Child settings notifications are not reliably routed through the active
  // parent turn. Resume the persisted child to ask Codex for the effective
  // model, effort, sandbox, and approval policy, then archive it immediately.
  // Every approved research card creates a fresh child.
  async captureEffectiveChildSettings(state, events, parentThreadId = null) {
    const connection = this.connectionFor(state);
    if (!connection || typeof connection.request !== "function") return;
    if (parentThreadId
      && !state.attestationEvents.some((event) => event.kind === "thread-settings" && event.thread_id === parentThreadId)) {
      try {
        const resumed = await connection.request("thread/resume", {
          threadId: parentThreadId,
          persistExtendedHistory: true,
        }, { timeoutMs: 120000 });
        state.attestationEvents.push({
          kind: "thread-settings",
          source: "thread/resume",
          thread_id: parentThreadId,
          model: resumed?.model ?? null,
          effort: resumed?.reasoningEffort ?? null,
          sandbox_policy: resumed?.sandbox ?? null,
          approval_policy: resumed?.approvalPolicy ?? null,
          collaboration_mode: null,
        });
      } catch (error) {
        state.attestationEvents.push({
          kind: "thread-settings-query-failed",
          thread_id: parentThreadId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    const childThreadIds = [...new Set(events
      .filter((event) => ["subagent-activity", "spawn-result", "child-notification", "collaboration-call"].includes(event.kind) && event.child_thread_id)
      .map((event) => event.child_thread_id))];
    for (const childThreadId of childThreadIds) {
      try {
        const resumed = await connection.request("thread/resume", {
          threadId: childThreadId,
          persistExtendedHistory: true,
        }, { timeoutMs: 120000 });
        state.attestationEvents.push({
          kind: "thread-settings",
          source: "thread/resume",
          thread_id: childThreadId,
          model: resumed?.model ?? null,
          effort: resumed?.reasoningEffort ?? null,
          sandbox_policy: resumed?.sandbox ?? null,
          approval_policy: resumed?.approvalPolicy ?? null,
          collaboration_mode: null,
        });
        const thread = resumed?.thread ?? resumed ?? {};
        const turns = Array.isArray(thread.turns) ? thread.turns : [];
        const lastTurn = turns.at(-1) ?? null;
        const lastAgentMessage = lastTurn?.items?.findLast?.((item) =>
          ["agentMessage", "agent_message"].includes(item?.type) && typeof (item.text ?? item.content) === "string");
        const rollout = childRolloutEvidence(thread.path);
        const output = typeof (lastAgentMessage?.text ?? lastAgentMessage?.content) === "string"
          ? lastAgentMessage.text ?? lastAgentMessage.content
          : rollout.output;
        const completed = lastTurn?.status === "completed" || rollout.completed;
        state.attestationEvents.push({
          kind: "turn-completed",
          thread_id: childThreadId,
          turn_id: lastTurn?.id ?? null,
          status: completed ? "completed" : lastTurn?.status ?? null,
          error: lastTurn?.error?.message ?? lastTurn?.error ?? rollout.error,
        });
        if (output) {
          state.attestationEvents.push({
            kind: "agent-output",
            thread_id: childThreadId,
            turn_id: lastTurn?.id ?? null,
            author: childThreadId,
            recipient: null,
            content_sha256: crypto.createHash("sha256").update(output).digest("hex"),
            content_bytes: Buffer.byteLength(output),
          });
        }
        state.attestationEvents.push({
          kind: "nested-spawn-observation",
          thread_id: childThreadId,
          count: rollout.nestedSpawns,
          source: rollout.nestedSpawns === null ? "unavailable" : "child-rollout",
        });
      } catch (error) {
        state.attestationEvents.push({
          kind: "thread-settings-query-failed",
          thread_id: childThreadId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      try {
        await connection.request("thread/archive", { threadId: childThreadId }, { timeoutMs: 120000 });
        state.archivedThreadIds.add(childThreadId);
      } catch {
        // Closing the app-server connection remains the final cleanup fallback.
      }
    }
  }

  async archiveParentThreads(state) {
    const fallbackConnection = this.connectionFor(state);
    for (const handle of state.delegate.threads?.values?.() ?? []) {
      if (!handle?.threadId || state.archivedThreadIds.has(handle.threadId)) continue;
      const connection = state.delegate.connections?.get?.(handle.connectionKey) ?? fallbackConnection;
      if (!connection || typeof connection.request !== "function") continue;
      try {
        await connection.request("thread/archive", { threadId: handle.threadId }, { timeoutMs: 120000 });
        state.archivedThreadIds.add(handle.threadId);
      } catch {
        // Closing the app-server connection remains the final cleanup fallback.
      }
    }
  }

  // This marker forces the approval card's working-tree hash to become stale.
  // It exercises the real redisplay-and-reapprove gate without changing source.
  insertDrift(state) {
    fs.mkdirSync(path.dirname(state.driftMarker), { recursive: true });
    fs.writeFileSync(state.driftMarker, `evaluation drift marker for ${state.evaluationId}\n`);
    state.driftEvents.push({ action: "created", before_turn: state.turn + 1, path: path.relative(state.workspace, state.driftMarker) });
  }

  removeDrift(state) {
    if (!fs.existsSync(state.driftMarker)) return;
    fs.rmSync(state.driftMarker, { force: true });
    state.driftEvents.push({ action: "removed", after_turn: state.turn, path: path.relative(state.workspace, state.driftMarker) });
  }

  // beforeTurn records authorization against the cards visible on the preceding
  // turn. afterTurn advances the harness only from observable model output; it
  // never dispatches or selects the workflow's next stage on the model's behalf.
  beforeTurn(state, input) {
    const decision = normalizedDecision(input);
    state.pendingCards = decision === "run" ? [...state.latestCards] : [];
    if (state.phase === "awaiting-stale-run" && decision === "run") {
      this.insertDrift(state);
      state.phase = "stale-run-sent";
    } else if (state.phase === "awaiting-fresh-run" && decision === "run") {
      state.phase = "locator-run-sent";
    } else if (state.phase === "awaiting-analyzer-run" && decision === "run") {
      state.phase = "analyzer-run-sent";
    }
  }

  afterTurn(state, output) {
    const displayedCards = extractAgentCards(output);
    state.latestCards = displayedCards;
    if (state.phase === "waiting-for-locator-card" && hasAgentCard(output, "rpivc-codebase-locator")) {
      state.phase = "awaiting-stale-run";
      return;
    }
    if (state.phase === "stale-run-sent") {
      state.phase = hasAgentCard(output, "rpivc-codebase-locator")
        ? "awaiting-fresh-run"
        : "invalid-missing-refreshed-locator-card";
      return;
    }
    if (state.phase === "locator-run-sent") {
      if (hasAgentCard(output, "rpivc-codebase-analyzer")) {
        state.phase = "awaiting-analyzer-run";
      } else {
        state.phase = "post-evidence-drift";
        this.removeDrift(state);
      }
      return;
    }
    if (state.phase === "analyzer-run-sent") {
      state.phase = "post-evidence-drift";
      this.removeDrift(state);
      return;
    }
    if (state.phase === "post-evidence-drift" && hasAgentCard(output, "rpivc-codebase-analyzer")) {
      state.phase = "awaiting-analyzer-run";
    }
  }

  async callApi(prompt, context, callOptions) {
    const state = await this.stateFor(context);
    const latestInput = parseLatestUserMessage(prompt);
    const input = state.discoveryArtifact
      ? latestInput.replaceAll("{{DISCOVERY_ARTIFACT}}", state.discoveryArtifact)
      : latestInput;
    this.beforeTurn(state, input);
    const decision = normalizedDecision(input);
    const runtimeSnapshot = shouldCaptureRuntimeSnapshot(input, state.pendingCards)
      ? contextSnapshot(state.workspace)
      : null;
    if (runtimeSnapshot) {
      appendJsonLine(path.join(state.evidenceDir, "pre-dispatch-snapshots.jsonl"), {
        before_turn: state.turn + 1,
        decision,
        card_ids: state.pendingCards.map((card) => card.id),
        context: runtimeSnapshot,
      });
    }
    // Slice the event stream at the turn boundary so an older spawn cannot make
    // a later Run appear authorized.
    const attestationEventStart = state.attestationEvents.length;
    const isFirstTurn = state.turn === 0;
    const skillPath = path.join(state.workspace, ".agents", "skills", "rpivc-research", "SKILL.md");
    const modelInput = runtimeSnapshot
      ? `${input}\n\n<rpivc-evaluation-runtime-snapshot>\n${JSON.stringify(runtimeSnapshot, null, 2)}\n</rpivc-evaluation-runtime-snapshot>`
      : input;
    const appServerInput = isFirstTurn
      ? [
          { type: "skill", name: "rpivc-research", path: skillPath },
          { type: "text", text: modelInput },
        ]
      : [{ type: "text", text: modelInput }];
    const response = await state.delegate.callApi(
      JSON.stringify(appServerInput),
      {
        ...context,
        prompt: {
          ...context?.prompt,
          raw: `rpivc-research:${state.caseId}`,
          label: `rpivc-research:${state.caseId}`,
          config: {},
        },
      },
      callOptions,
    );
    state.turn += 1;
    const output = typeof response.output === "string" ? response.output : JSON.stringify(response.output ?? "");
    this.afterTurn(state, output);
    const raw = typeof response.raw === "string"
      ? (() => { try { return JSON.parse(response.raw); } catch { return response.raw; } })()
      : response.raw;
    if (!state.capturesProtocolEvents && Array.isArray(raw?.notifications)) {
      // Compatibility path for provider versions without a callable notification
      // handler. It is weaker because Promptfoo may already have normalized data.
      for (const notification of raw.notifications) {
        const captured = captureAttestationEvent(notification);
        if (captured) state.attestationEvents.push(captured);
      }
    }
    const currentAttestationEvents = state.attestationEvents.slice(attestationEventStart);
    if (state.pendingCards.length > 0 && currentAttestationEvents.some((event) => event.kind === "dispatch-call")) {
      const parentThreadId = response.sessionId ?? response.metadata?.codexAppServer?.threadId ?? null;
      await this.captureEffectiveChildSettings(state, currentAttestationEvents, parentThreadId);
      for (const card of state.pendingCards) {
        const attestation = buildDispatchAttestation({
          events: state.attestationEvents,
          parentThreadId,
          card,
        });
        if (!retainUniqueAttestation(state, attestation)) continue;
        appendJsonLine(path.join(state.evidenceDir, "runtime-attestations.jsonl"), attestation);
      }
    }
    state.pendingCards = [];
    retainArtifactRevisionObservation(state);
    syncEvidence({
      workspace: state.workspace,
      evidenceDir: state.evidenceDir,
      baseline: state.baseline,
      extra: {
        adapter_phase: state.phase,
        drift_events: [...state.driftEvents],
        turn_count: state.turn,
        runtime_attestation_count: state.attestations.length,
        artifact_revision_observation_count: state.artifactRevisionObservations.length,
      },
    });
    // Replace disposable-workspace paths before recording or returning output;
    // otherwise all rendered links die when the temporary clone is removed.
    const retainedOutput = retainWorkspaceReferences(output, state.workspace, state.evidenceDir);
    const record = {
      turn: state.turn,
      input,
      output: retainedOutput,
      session_id: response.sessionId ?? null,
      token_usage: response.tokenUsage ?? null,
      cost: response.cost ?? null,
      metadata: response.metadata ?? null,
      raw: raw ?? null,
      phase_after_turn: state.phase,
      drift_events: [...state.driftEvents],
    };
    appendJsonLine(path.join(state.evidenceDir, "turns.jsonl"), record);
    return { ...response, output: retainedOutput };
  }

  async cleanup() {
    await Promise.all([...this.states.values()].map(async (state) => {
      syncEvidence({
        workspace: state.workspace,
        evidenceDir: state.evidenceDir,
        baseline: state.baseline,
        extra: {
          adapter_phase: state.phase,
          drift_events: [...state.driftEvents],
          turn_count: state.turn,
          runtime_attestation_count: state.attestations.length,
          artifact_revision_observation_count: state.artifactRevisionObservations.length,
        },
      });
      await this.archiveParentThreads(state);
      if (typeof state.delegate.cleanup === "function") await state.delegate.cleanup();
      else if (typeof state.delegate.shutdown === "function") await state.delegate.shutdown();
    }));
  }
}
