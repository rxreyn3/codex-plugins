#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  cleanupDisposableWorkspace,
  snapshotRepository,
  syncEvidence,
} from "./workspace.mjs";

const sharedDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(sharedDirectory, "../..");
const requestedStage = process.argv[3] ?? "discover";
const allowedStages = new Set(["discover", "research"]);
if (!allowedStages.has(requestedStage)) throw new Error(`unknown evaluation stage: ${requestedStage}`);
const configPath = path.join(repositoryRoot, "evals", requestedStage, "promptfooconfig.yaml");
const promptfooBinary = path.join(repositoryRoot, "node_modules", ".bin", "promptfoo");

function evaluationId() {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "").replace("Z", "Z");
  return `${timestamp}-${process.pid}`;
}

function runCommand(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(promptfooBinary, args, {
      cwd: repositoryRoot,
      env,
      stdio: "inherit",
    });
    const forwardSignal = (signal) => {
      if (!child.killed) child.kill(signal);
    };
    process.on("SIGINT", forwardSignal);
    process.on("SIGTERM", forwardSignal);
    const detachSignals = () => {
      process.off("SIGINT", forwardSignal);
      process.off("SIGTERM", forwardSignal);
    };
    child.once("error", (error) => {
      detachSignals();
      reject(error);
    });
    child.once("exit", (code, signal) => {
      detachSignals();
      resolve({ code: code ?? 1, signal });
    });
  });
}

function controlledEnvironment(id, evidenceRoot) {
  // Research allows one retry after a 90-minute app-server turn timeout. Give
  // the enclosing case enough time to report that bounded retry outcome, and
  // give an abandoned scheduler slot one turn plus a small cleanup buffer to
  // drain before the next serial case begins.
  const caseTimeoutMs = 21_600_000;
  const schedulerQueueTimeoutMs = 5_700_000;
  const evaluationTimeoutMs = caseTimeoutMs * 3;
  return {
    ...process.env,
    RPIVC_EVAL_ID: id,
    RPIVC_EVIDENCE_ROOT: evidenceRoot,
    RPIVC_SOURCE_ROOT: repositoryRoot,
    PROMPTFOO_CONFIG_DIR: path.join(repositoryRoot, ".rpiv-codex", "promptfoo"),
    PROMPTFOO_LOG_DIR: path.join(evidenceRoot, "logs"),
    PROMPTFOO_DISABLE_TELEMETRY: "1",
    PROMPTFOO_DISABLE_UPDATE: "1",
    PROMPTFOO_DISABLE_SHARING: "true",
    PROMPTFOO_CACHE_ENABLED: "false",
    PROMPTFOO_ASSERTIONS_MAX_CONCURRENCY: "1",
    PROMPTFOO_EVAL_TIMEOUT_MS: String(caseTimeoutMs),
    PROMPTFOO_MAX_EVAL_TIME_MS: String(evaluationTimeoutMs),
    PROMPTFOO_SCHEDULER_QUEUE_TIMEOUT_MS: String(schedulerQueueTimeoutMs),
  };
}

function runtimeRecords(evidenceRoot) {
  if (!fs.existsSync(evidenceRoot)) return [];
  return fs.readdirSync(evidenceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(evidenceRoot, entry.name, "runtime.json"))
    .filter((candidate) => fs.existsSync(candidate))
    .map((candidate) => JSON.parse(fs.readFileSync(candidate, "utf8")));
}

function finishWorkspaces(evidenceRoot) {
  const results = [];
  for (const runtime of runtimeRecords(evidenceRoot)) {
    let cleanup = "not-started";
    let error = null;
    try {
      const baseline = JSON.parse(fs.readFileSync(path.join(runtime.evidence_dir, "baseline.json"), "utf8"));
      if (fs.existsSync(runtime.workspace)) {
        syncEvidence({ workspace: runtime.workspace, evidenceDir: runtime.evidence_dir, baseline });
      }
      cleanupDisposableWorkspace(runtime.temporary_parent);
      cleanup = "removed";
    } catch (caught) {
      cleanup = "failed";
      error = caught instanceof Error ? caught.message : String(caught);
    }
    const record = { case_id: runtime.case_id, cleanup, error };
    fs.writeFileSync(path.join(runtime.evidence_dir, "cleanup.json"), `${JSON.stringify(record, null, 2)}\n`);
    results.push(record);
  }
  return results;
}

async function main() {
  const action = process.argv[2] ?? "eval";
  if (!fs.existsSync(promptfooBinary)) {
    throw new Error("Promptfoo is not installed. Run npm install first.");
  }

  if (action === "view") {
    const localState = path.join(repositoryRoot, ".rpiv-codex", "promptfoo");
    fs.mkdirSync(localState, { recursive: true });
    const result = await runCommand(["view"], {
      ...process.env,
      PROMPTFOO_CONFIG_DIR: localState,
      PROMPTFOO_DISABLE_TELEMETRY: "1",
      PROMPTFOO_DISABLE_UPDATE: "1",
      PROMPTFOO_DISABLE_SHARING: "true",
    });
    process.exitCode = result.code;
    return;
  }

  const id = action === "validate" ? "validation" : evaluationId();
  const evidenceRoot = path.join(repositoryRoot, ".rpiv-codex", "evals", id);
  fs.mkdirSync(evidenceRoot, { recursive: true });
  const env = controlledEnvironment(id, evidenceRoot);

  if (action === "validate") {
    const result = await runCommand(["validate", "--config", configPath], env);
    process.exitCode = result.code;
    return;
  }
  if (action !== "eval") throw new Error(`unknown action: ${action}`);

  const before = snapshotRepository(repositoryRoot, { excludeRuntime: true });
  fs.writeFileSync(path.join(evidenceRoot, "source-before.json"), `${JSON.stringify(before, null, 2)}\n`);
  const result = await runCommand([
    "eval",
    "--config", configPath,
    "--no-cache",
    "--no-share",
    "--repeat", "1",
    "--max-concurrency", "1",
  ], env);
  const cleanup = finishWorkspaces(evidenceRoot);
  const after = snapshotRepository(repositoryRoot, { excludeRuntime: true });
  const sourceUnchanged = before.branch === after.branch
    && before.commit === after.commit
    && before.git_status === after.git_status
    && before.working_tree_sha256 === after.working_tree_sha256;
  const summary = {
    evaluation_id: id,
    promptfoo_exit_code: result.code,
    promptfoo_signal: result.signal,
    source_unchanged: sourceUnchanged,
    cleanup,
  };
  fs.writeFileSync(path.join(evidenceRoot, "run-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`\nRPIV-Codex evidence: ${evidenceRoot}\n`);
  process.stdout.write(`Source checkout unchanged: ${sourceUnchanged ? "yes" : "NO"}\n`);
  process.stdout.write(`Temporary workspaces removed: ${cleanup.every((entry) => entry.cleanup === "removed") ? "yes" : "NO"}\n`);
  process.exitCode = result.code || (!sourceUnchanged || cleanup.some((entry) => entry.cleanup !== "removed") ? 1 : 0);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
