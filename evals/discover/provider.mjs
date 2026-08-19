import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadApiProviders } from "promptfoo";

import {
  createDisposableWorkspace,
  syncEvidence,
} from "../_shared/workspace.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

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

function hasAgentCard(output, role) {
  return output.includes(role)
    && /Run\s*(?:\/|,).*Edit\s*(?:\/|,).*Omit\s*(?:\/|,).*Stop/is.test(output);
}

function normalizedDecision(input) {
  return input.trim().replaceAll("*", "").toLowerCase();
}

function appendJsonLine(target, value) {
  fs.appendFileSync(target, `${JSON.stringify(value)}\n`);
}

export default class RpivcDiscoverProvider {
  constructor(options = {}) {
    this.providerId = options.id ?? "rpivc-discover-app-server";
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
    const [delegate] = await this.providerLoader([{
      id: "openai:codex-app-server:gpt-5.6-sol",
      config: {
        working_dir: workspaceState.workspace,
        model: "gpt-5.6-sol",
        model_reasoning_effort: "xhigh",
        personality: "pragmatic",
        sandbox_mode: "workspace-write",
        network_access_enabled: false,
        approval_policy: "never",
        ephemeral: true,
        persist_threads: true,
        thread_pool_size: 1,
        thread_cleanup: "unsubscribe",
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
      phase: caseId === "brownfield-agent-gates" ? "waiting-for-locator-card" : "ordinary",
      driftMarker: path.join(
        workspaceState.workspace,
        "tests",
        `.rpivc-eval-drift-${evaluationId}.txt`,
      ),
      driftEvents: [],
    };
    this.states.set(caseId, state);
    return state;
  }

  async stateFor(context) {
    const caseId = String(context?.vars?.case_id ?? "");
    return this.states.get(caseId) ?? this.createState(context);
  }

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

  beforeTurn(state, input) {
    const decision = normalizedDecision(input);
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
    }
  }

  async callApi(prompt, context, callOptions) {
    const state = await this.stateFor(context);
    const input = parseLatestUserMessage(prompt);
    this.beforeTurn(state, input);
    const isFirstTurn = state.turn === 0;
    const skillPath = path.join(state.workspace, ".agents", "skills", "rpivc-discover", "SKILL.md");
    const appServerInput = isFirstTurn
      ? [
          { type: "skill", name: "rpivc-discover", path: skillPath },
          { type: "text", text: input },
        ]
      : [{ type: "text", text: input }];
    const response = await state.delegate.callApi(
      JSON.stringify(appServerInput),
      {
        ...context,
        prompt: {
          ...context?.prompt,
          raw: `rpivc-discover:${state.caseId}`,
          label: `rpivc-discover:${state.caseId}`,
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
    const record = {
      turn: state.turn,
      input,
      output,
      session_id: response.sessionId ?? null,
      token_usage: response.tokenUsage ?? null,
      cost: response.cost ?? null,
      metadata: response.metadata ?? null,
      raw: raw ?? null,
      phase_after_turn: state.phase,
      drift_events: [...state.driftEvents],
    };
    appendJsonLine(path.join(state.evidenceDir, "turns.jsonl"), record);
    syncEvidence({
      workspace: state.workspace,
      evidenceDir: state.evidenceDir,
      baseline: state.baseline,
      extra: {
        adapter_phase: state.phase,
        drift_events: [...state.driftEvents],
        turn_count: state.turn,
      },
    });
    return response;
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
        },
      });
      if (typeof state.delegate.cleanup === "function") await state.delegate.cleanup();
      else if (typeof state.delegate.shutdown === "function") await state.delegate.shutdown();
    }));
  }
}
