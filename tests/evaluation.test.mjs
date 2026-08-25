import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import RpivcDiscoverProvider from "../evals/discover/provider.mjs";
import { hasAgentCard } from "../evals/discover/provider.mjs";
import {
  buildDispatchAttestation,
  captureAttestationEvent,
  dispatchEnvelope,
  expectedTaskName,
  extractAgentCards,
} from "../evals/discover/runtime-attestation.mjs";
import {
  isSubagentTurn,
  isTargetEvidenceTurn,
  localLinkContract,
  preservesStandaloneBoundary,
} from "../evals/discover/assertions.mjs";
import {
  cleanupDisposableWorkspace,
  createDisposableWorkspace,
  inventoryChanges,
  retainWorkspaceReferences,
  snapshotRepository,
  syncEvidence,
} from "../evals/_shared/workspace.mjs";

const root = path.resolve(import.meta.dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function repositoryFixture() {
  const fixture = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "rpivc-eval-source-")));
  git(fixture, "init", "-b", "main");
  git(fixture, "config", "user.name", "Evaluation Fixture");
  git(fixture, "config", "user.email", "fixture@example.test");
  fs.mkdirSync(path.join(fixture, ".agents", "skills", "rpivc-discover"), { recursive: true });
  fs.mkdirSync(path.join(fixture, "tests"), { recursive: true });
  fs.writeFileSync(path.join(fixture, ".gitignore"), ".rpiv-codex/\nnode_modules/\n.env*\n!.env.example\n");
  fs.writeFileSync(path.join(fixture, "tracked.txt"), "baseline\n");
  fs.writeFileSync(path.join(fixture, "PARITY.md"), "fixture parity\n");
  fs.writeFileSync(path.join(fixture, ".agents", "skills", "rpivc-discover", "SKILL.md"), "fixture skill\n");
  git(fixture, "add", ".");
  git(fixture, "commit", "-m", "fixture baseline");
  return fixture;
}

test("Promptfoo is pinned and exposed through explicit local commands", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.devDependencies.promptfoo, "0.122.0");
  assert.equal(pkg.devDependencies.yaml, "2.9.0");
  assert.equal(pkg.engines.node, ">=22.22.0");
  assert.equal(pkg.scripts["eval:discover:validate"], "node evals/_shared/run.mjs validate");
  assert.equal(pkg.scripts["eval:discover"], "node evals/_shared/run.mjs eval");
  assert.equal(pkg.scripts["eval:research:validate"], "node evals/_shared/run.mjs validate research");
  assert.equal(pkg.scripts["eval:research"], "node evals/_shared/run.mjs eval research");
  assert.equal(pkg.scripts["eval:view"], "node evals/_shared/run.mjs view");
  assert.equal(fs.existsSync(path.join(root, "package-lock.json")), true);
});

test("discovery config contains two simulated-user cases and two independent graders per case", () => {
  const config = read("evals", "discover", "promptfooconfig.yaml");
  const cases = read("evals", "discover", "cases.yaml");
  const runner = read("evals", "_shared", "run.mjs");
  assert.match(config, /file:\/\/provider\.mjs/);
  assert.match(config, /file:\/\/cases\.yaml/);
  assert.equal((cases.match(/^\s+case_id:/gm) ?? []).length, 2);
  assert.equal((cases.match(/id: promptfoo:simulated-user/g) ?? []).length, 2);
  assert.equal((cases.match(/type: agent-rubric/g) ?? []).length, 4);
  assert.equal((cases.match(/sandbox_mode: read-only/g) ?? []).length, 4);
  assert.equal((cases.match(/model_reasoning_effort: xhigh/g) ?? []).length, 4);
  assert.match(cases, /stateful: true/);
  assert.equal((cases.match(/intent_answer_turn: 2/g) ?? []).length, 2);
  assert.match(cases, /When probe evidence is reported without a question, reply exactly: Continue/);
  assert.match(cases, /For the first locator card, reply exactly: Run/);
  assert.match(cases, /###STOP###/);
  assert.match(runner, /PROMPTFOO_DISABLE_TELEMETRY/);
  assert.match(runner, /PROMPTFOO_DISABLE_UPDATE/);
  assert.match(runner, /PROMPTFOO_DISABLE_SHARING/);
  assert.match(runner, /"--no-cache"/);
  assert.match(runner, /"--no-share"/);
  assert.match(runner, /"--repeat", "1"/);
  assert.doesNotMatch(runner, /PROMPTFOO_DISABLE_REMOTE_GENERATION/);
});

test("adapter recognizes the rendered Markdown decision gate", () => {
  assert.equal(hasAgentCard(
    "role: rpivc-codebase-locator\nChoose **Run**, **Edit**, **Omit**, or **Stop**.",
    "rpivc-codebase-locator",
  ), true);
  assert.equal(hasAgentCard("role: rpivc-codebase-locator\nRun it whenever", "rpivc-codebase-locator"), false);
});

test("runtime attestation binds the displayed card to the effective child run", () => {
  const card = {
    id: "D1",
    dispatch_protocol: "rpivc-dispatch/v1",
    task_name: "d1_codebase_locator",
    role: "rpivc-codebase-locator",
    runtime_agent_type: "default",
    purpose: "Locate the save flow",
    prompt: "Locate the save flow and return file:line evidence.",
    inputs: ["captured intent", "target repository: /tmp/project"],
    repository: "/tmp/project",
    branch: "main",
    commit: "abc123",
    working_tree_sha256: "tree-hash",
    model: "gpt-5.6-luna",
    reasoning: "low",
    sandbox_request: "read-only",
    sandbox_enforcement: "inherited-parent",
    behavioral_permissions: ["read", "search", "git-read"],
    intended_tools: ["read", "search", "git-read"],
    child_agents: "forbidden",
    budget: { max_files: 10, max_findings: 12 },
    expected_evidence: "Repository-relative file:line locations",
    output_schema: "Primary Anchors; Search Gaps",
    stop_when: "The locations are ranked or evidence is unavailable",
  };
  const rendered = `\`\`\`yaml\n${[
    'id: "D1"',
    "dispatch_protocol: rpivc-dispatch/v1",
    "task_name: d1_codebase_locator",
    "role: rpivc-codebase-locator",
    "runtime_agent_type: default",
  ].join("\n")}\n\`\`\``;
  assert.equal(extractAgentCards(rendered)[0].task_name, "d1_codebase_locator");
  assert.equal(expectedTaskName(card), "d1_codebase_locator");

  const parentThreadId = "parent-thread";
  const childThreadId = "child-thread";
  const agentPath = "/root/d1_codebase_locator";
  const envelope = JSON.stringify(dispatchEnvelope(card));
  const notifications = [
    { method: "thread/settings/updated", params: { threadId: parentThreadId, threadSettings: { model: "gpt-5.6-sol", effort: "xhigh", approvalPolicy: "never", sandboxPolicy: { type: "workspaceWrite", networkAccess: false } } } },
    { method: "rawResponseItem/completed", params: { threadId: parentThreadId, turnId: "parent-turn", item: { type: "function_call", name: "spawn_agent", call_id: "spawn-call", arguments: JSON.stringify({ agent_type: card.runtime_agent_type, task_name: card.task_name, fork_turns: "none", model: card.model, reasoning_effort: card.reasoning, message: envelope }) } } },
    { method: "item/completed", params: { threadId: parentThreadId, item: { type: "subAgentActivity", id: "spawn-call", kind: "started", agentThreadId: childThreadId, agentPath } } },
    { method: "thread/settings/updated", params: { threadId: childThreadId, threadSettings: { model: card.model, effort: card.reasoning, approvalPolicy: "never", sandboxPolicy: { type: "workspaceWrite", networkAccess: false } } } },
    { method: "turn/completed", params: { threadId: childThreadId, turn: { id: "child-turn", status: "completed", error: null } } },
    { method: "rawResponseItem/completed", params: { threadId: parentThreadId, turnId: "parent-turn", item: { type: "agent_message", author: agentPath, recipient: "/root", content: [{ type: "output_text", text: "located" }] } } },
  ];
  const events = notifications.map(captureAttestationEvent).filter(Boolean);
  const attestation = buildDispatchAttestation({ events, parentThreadId, card });
  assert.equal(attestation.pass, true);
  assert.equal(attestation.child.thread_id, childThreadId);
  assert.equal(attestation.child.nested_spawn_count, 0);
  assert.equal(JSON.stringify(events).includes(card.prompt), false);

  const implicitDefaultEvents = events.map((event) => event.call_id === "spawn-call"
    ? { ...event, agent_type: null }
    : event);
  const implicitDefault = buildDispatchAttestation({ events: implicitDefaultEvents, parentThreadId, card });
  assert.equal(implicitDefault.spawn.agent_type, null);
  assert.equal(implicitDefault.checks.requested_runtime_agent_matches, true);
  assert.equal(implicitDefault.pass, true);

  const opaqueEvents = events.map((event) => event.kind === "spawn-call"
    ? { ...event, canonical_envelope_sha256: null, message_sha256: "encrypted-payload-hash", message_bytes: 512 }
    : event);
  const opaque = buildDispatchAttestation({ events: opaqueEvents, parentThreadId, card });
  assert.equal(opaque.pass, true);
  assert.equal(opaque.prompt_verification.status, "opaque-encrypted-transport");
  assert.equal(opaque.prompt_verification.exact_plaintext_observed, false);

  const nested = captureAttestationEvent({
    method: "rawResponseItem/completed",
    params: { threadId: childThreadId, turnId: "child-turn", item: { type: "function_call", name: "spawn_agent", call_id: "nested", arguments: JSON.stringify({ task_name: "forbidden", message: "{}" }) } },
  });
  const failed = buildDispatchAttestation({ events: [...events, nested], parentThreadId, card });
  assert.equal(failed.pass, false);
  assert.equal(failed.checks.no_child_fanout, false);
});

test("adapter queries and archives a persisted child to attest effective settings", async () => {
  const requests = [];
  const connection = {
    async request(method, params) {
      requests.push({ method, params });
      if (method === "thread/resume") {
        return {
          model: "gpt-5.6-luna",
          reasoningEffort: "low",
          sandbox: { type: "workspaceWrite", networkAccess: false },
          approvalPolicy: "never",
        };
      }
      return {};
    },
  };
  const provider = new RpivcDiscoverProvider();
  const state = {
    delegate: { connections: new Map([["connection", connection]]) },
    attestationEvents: [],
    archivedThreadIds: new Set(),
  };
  await provider.captureEffectiveChildSettings(state, [{ kind: "subagent-activity", child_thread_id: "child-thread" }]);
  assert.deepEqual(requests.map((request) => request.method), ["thread/resume", "thread/archive"]);
  assert.equal(state.attestationEvents[0].model, "gpt-5.6-luna");
  assert.equal(state.attestationEvents[0].effort, "low");
  assert.equal(state.archivedThreadIds.has("child-thread"), true);
});

test("deterministic assertions distinguish ordinary messages, bootstrap reads, and real collaboration", () => {
  const ordinary = {
    metadata: { codexAppServer: { items: [{ type: "agentMessage" }] } },
    raw: { items: [{ type: "agent_message" }], notifications: [{ method: "thread/settings/updated", params: { collaborationMode: "default" } }] },
  };
  assert.equal(isSubagentTurn(ordinary), false);
  assert.equal(isSubagentTurn({ raw: { items: [{ type: "collabAgentToolCall" }] } }), true);

  const bootstrap = { raw: { items: [{ type: "command_execution", command: "sed -n '1,200p' .agents/skills/rpivc-discover/references/discovery-contract.md" }] } };
  const targetRead = { raw: { items: [{ type: "command_execution", command: "sed -n '1,200p' src/feature.mjs" }] } };
  const memoryRead = { raw: { items: [{ type: "command_execution", command: "sed -n '1,200p' /Users/example/.codex/memories/MEMORY.md" }] } };
  assert.equal(isTargetEvidenceTurn(bootstrap), false);
  assert.equal(isTargetEvidenceTurn(memoryRead), false);
  assert.equal(isTargetEvidenceTurn(targetRead), true);
});

test("local-link requirements differ between no-probe and brownfield discovery", () => {
  const existing = new Set(["/tmp/artifact.md", "/tmp/source.mjs"]);
  const exists = (target) => existing.has(target);
  const finalChat = "[Feature Requirements Document](/tmp/artifact.md)";
  assert.equal(localLinkContract("No repository references.", finalChat, "no-probe-discovery", exists).pass, true);
  assert.equal(localLinkContract("No repository references.", finalChat, "brownfield-agent-gates", exists).pass, false);
  assert.equal(localLinkContract("No repository references.", finalChat, "brownfield-agent-gates", exists, 0).pass, true);
  assert.equal(localLinkContract("[source:3](/tmp/source.mjs:3)", finalChat, "brownfield-agent-gates", exists).pass, true);
});

test("standalone boundary uses structured artifact evidence instead of exact prose", () => {
  const turns = [{ input: "I want a standalone terminal script." }];
  const artifact = [
    'target_context: "standalone artifact"',
    "A standalone terminal script displays the widget.",
    "- `no probe justified` — no product repository was established.",
  ].join("\n");
  assert.equal(preservesStandaloneBoundary(turns, artifact), true);
  assert.equal(preservesStandaloneBoundary(turns, artifact.replace("no probe justified", "probe ran")), false);
});

test("disposable workspace mirrors current nonignored state and cleans only its verified temp root", () => {
  const source = repositoryFixture();
  const evidenceRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "rpivc-eval-evidence-")));
  fs.writeFileSync(path.join(source, "tracked.txt"), "dirty current state\n");
  fs.writeFileSync(path.join(source, "untracked.txt"), "included\n");
  fs.writeFileSync(path.join(source, ".env.local"), "SECRET=excluded\n");
  fs.mkdirSync(path.join(source, ".rpiv-codex"), { recursive: true });
  fs.writeFileSync(path.join(source, ".rpiv-codex", "old.md"), "excluded runtime\n");

  const state = createDisposableWorkspace({
    sourceRoot: source,
    evaluationId: "unit-test",
    caseId: "workspace-copy",
    evidenceDir: path.join(evidenceRoot, "workspace-copy"),
  });
  assert.equal(fs.readFileSync(path.join(state.workspace, "tracked.txt"), "utf8"), "dirty current state\n");
  assert.equal(fs.readFileSync(path.join(state.workspace, "untracked.txt"), "utf8"), "included\n");
  assert.equal(fs.existsSync(path.join(state.workspace, ".env.local")), false);
  assert.equal(fs.existsSync(path.join(state.workspace, ".rpiv-codex")), false);
  const before = snapshotRepository(state.workspace);
  fs.writeFileSync(path.join(state.workspace, "new.txt"), "new\n");
  const after = snapshotRepository(state.workspace);
  assert.deepEqual(inventoryChanges(before.files, after.files).created, ["new.txt"]);

  const artifactDirectory = path.join(state.workspace, ".rpiv-codex", "artifacts", "discover");
  fs.mkdirSync(artifactDirectory, { recursive: true });
  const canonicalWorkspace = fs.realpathSync(state.workspace);
  fs.writeFileSync(path.join(artifactDirectory, "retained.md"), `[source](${path.join(canonicalWorkspace, "tracked.txt")}:1)\n`);
  syncEvidence({
    workspace: state.workspace,
    evidenceDir: state.evidenceDir,
    baseline: state.baseline,
    extra: { adapter_phase: "complete", drift_events: [{ action: "removed" }], turn_count: 4 },
  });
  syncEvidence({ workspace: state.workspace, evidenceDir: state.evidenceDir, baseline: state.baseline });
  const retainedArtifact = path.join(state.evidenceDir, "workspace", ".rpiv-codex", "artifacts", "discover", "retained.md");
  const retainedSource = path.join(state.evidenceDir, "workspace", "tracked.txt");
  assert.match(fs.readFileSync(retainedArtifact, "utf8"), new RegExp(retainedSource.replaceAll("/", "\\/")));
  assert.equal(
    retainWorkspaceReferences(`[source](${path.join(canonicalWorkspace, "tracked.txt")}:1)`, state.workspace, state.evidenceDir),
    `[source](${retainedSource}:1)`,
  );
  fs.writeFileSync(path.join(artifactDirectory, "retained.md"), `[source:1-1](${path.join(canonicalWorkspace, "tracked.txt")}:1-1)\n`);
  syncEvidence({ workspace: state.workspace, evidenceDir: state.evidenceDir, baseline: state.baseline });
  assert.match(fs.readFileSync(retainedArtifact, "utf8"), new RegExp(`${retainedSource.replaceAll("/", "\\/")}:1-1`));
  const latest = JSON.parse(fs.readFileSync(path.join(state.evidenceDir, "latest.json"), "utf8"));
  assert.equal(latest.adapter_phase, "complete");
  assert.equal(latest.turn_count, 4);

  cleanupDisposableWorkspace(state.temporaryParent);
  assert.equal(fs.existsSync(state.temporaryParent), false);
  assert.equal(fs.existsSync(retainedSource), true);
  assert.equal(fs.existsSync(source), true);
  fs.rmSync(source, { force: true, recursive: true });
  fs.rmSync(evidenceRoot, { force: true, recursive: true });
});

test("brownfield adapter injects drift before stale Run and removes it after probe evidence", async () => {
  const source = repositoryFixture();
  const evidenceRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "rpivc-eval-adapter-")));
  const previous = {
    id: process.env.RPIVC_EVAL_ID,
    evidence: process.env.RPIVC_EVIDENCE_ROOT,
    source: process.env.RPIVC_SOURCE_ROOT,
  };
  process.env.RPIVC_EVAL_ID = "adapter-unit";
  process.env.RPIVC_EVIDENCE_ROOT = evidenceRoot;
  process.env.RPIVC_SOURCE_ROOT = source;
  const outputs = [
    "role: rpivc-codebase-locator\nChoose **Run**, **Edit**, **Omit**, or **Stop**.",
    "Repository changed. Refreshed role: rpivc-codebase-locator\nChoose **Run**, **Edit**, **Omit**, or **Stop**.",
    "Locator evidence returned. What link behavior should be observable?",
  ];
  const calls = [];
  let cleaned = false;
  const delegate = {
    async callApi(prompt) {
      calls.push(JSON.parse(prompt));
      return {
        output: outputs[calls.length - 1],
        sessionId: "fixture-thread",
        metadata: { codexAppServer: { items: [], sandboxMode: "workspace-write" } },
        raw: JSON.stringify({ items: [], notifications: [] }),
      };
    },
    async cleanup() { cleaned = true; },
  };
  const provider = new RpivcDiscoverProvider({
    providerLoader: async () => [delegate],
  });
  const context = {
    vars: { case_id: "brownfield-agent-gates" },
    prompt: { raw: "fixture", label: "fixture" },
  };
  try {
    await provider.callApi(JSON.stringify([{ role: "user", content: "$rpivc-discover fixture" }]), context);
    const state = provider.states.get("brownfield-agent-gates");
    assert.equal(state.phase, "awaiting-stale-run");
    await provider.callApi(JSON.stringify([{ role: "user", content: "Run" }]), context);
    assert.equal(state.phase, "awaiting-fresh-run");
    assert.equal(fs.existsSync(state.driftMarker), true);
    await provider.callApi(JSON.stringify([{ role: "user", content: "Run" }]), context);
    assert.equal(state.phase, "post-evidence-drift");
    assert.equal(fs.existsSync(state.driftMarker), false);
    assert.deepEqual(state.driftEvents.map((event) => event.action), ["created", "removed"]);
    assert.equal(calls[0][0].type, "skill");
    assert.equal(calls[1][0].text, "Run");
    const runtime = JSON.parse(fs.readFileSync(path.join(evidenceRoot, "brownfield-agent-gates", "runtime.json"), "utf8"));
    await provider.cleanup();
    assert.equal(cleaned, true);
    const latest = JSON.parse(fs.readFileSync(path.join(evidenceRoot, "brownfield-agent-gates", "latest.json"), "utf8"));
    assert.equal(latest.adapter_phase, "post-evidence-drift");
    assert.equal(latest.turn_count, 3);
    assert.deepEqual(latest.drift_events.map((event) => event.action), ["created", "removed"]);
    cleanupDisposableWorkspace(runtime.temporary_parent);
  } finally {
    if (previous.id === undefined) delete process.env.RPIVC_EVAL_ID; else process.env.RPIVC_EVAL_ID = previous.id;
    if (previous.evidence === undefined) delete process.env.RPIVC_EVIDENCE_ROOT; else process.env.RPIVC_EVIDENCE_ROOT = previous.evidence;
    if (previous.source === undefined) delete process.env.RPIVC_SOURCE_ROOT; else process.env.RPIVC_SOURCE_ROOT = previous.source;
    fs.rmSync(source, { force: true, recursive: true });
    fs.rmSync(evidenceRoot, { force: true, recursive: true });
  }
});
