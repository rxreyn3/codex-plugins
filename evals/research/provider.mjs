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

function appendJsonLine(target, value) {
  fs.appendFileSync(target, `${JSON.stringify(value)}\n`);
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
    const discoveryArtifact = createDiscoveryFixture(workspaceState.workspace, caseId);
    workspaceState.baseline = snapshotRepository(workspaceState.workspace);
    fs.writeFileSync(
      path.join(evidenceDir, "baseline.json"),
      `${JSON.stringify(workspaceState.baseline, null, 2)}\n`,
    );
    const [delegate] = await this.providerLoader([{
      id: "openai:codex-app-server:gpt-5.6-sol",
      config: {
        working_dir: workspaceState.workspace,
        codex_path_override: codexPath,
        model: "gpt-5.6-sol",
        model_reasoning_effort: "xhigh",
        personality: "pragmatic",
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
        request_timeout_ms: 900000,
        startup_timeout_ms: 120000,
        turn_timeout_ms: 900000,
        cli_config: {
          features: {
            multi_agent: true,
          },
        },
      },
    }]);
    const state = {
      ...workspaceState,
      caseId,
      evaluationId,
      delegate,
      turn: 0,
      phase: "ordinary",
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
  async captureEffectiveChildSettings(state, events) {
    const connection = this.connectionFor(state);
    if (!connection || typeof connection.request !== "function") return;
    const childThreadIds = [...new Set(events
      .filter((event) => event.kind === "subagent-activity" && event.child_thread_id)
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
    const input = parseLatestUserMessage(prompt).replaceAll("{{DISCOVERY_ARTIFACT}}", state.discoveryArtifact);
    this.beforeTurn(state, input);
    // Slice the event stream at the turn boundary so an older spawn cannot make
    // a later Run appear authorized.
    const attestationEventStart = state.attestationEvents.length;
    const isFirstTurn = state.turn === 0;
    const skillPath = path.join(state.workspace, ".agents", "skills", "rpivc-research", "SKILL.md");
    const appServerInput = isFirstTurn
      ? [
          { type: "skill", name: "rpivc-research", path: skillPath },
          { type: "text", text: input },
        ]
      : [{ type: "text", text: input }];
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
      await this.captureEffectiveChildSettings(state, currentAttestationEvents);
      for (const card of state.pendingCards) {
        const attestation = buildDispatchAttestation({
          events: state.attestationEvents,
          parentThreadId: response.sessionId ?? response.metadata?.codexAppServer?.threadId ?? null,
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
