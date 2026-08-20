import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { inheritsExternalWebDeferral, repositoryRelativeCitationLabels } from "../evals/research/assertions.mjs";
import {
  buildDispatchAttestation,
  captureAttestationEvent,
  extractAgentCards,
} from "../evals/research/runtime-attestation.mjs";
import { artifactPath } from "../.agents/skills/_shared/scripts/artifact-path.mjs";
import RpivcResearchProvider, {
  observeResearchArtifact,
  retainArtifactRevisionObservation,
  retainUniqueAttestation,
} from "../evals/research/provider.mjs";

const root = path.resolve(import.meta.dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function researchWorkspaceFixture() {
  const workspace = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "rpivc-research-revision-")));
  git(workspace, "init", "-b", "main");
  git(workspace, "config", "user.name", "Research Fixture");
  git(workspace, "config", "user.email", "research@example.test");
  fs.writeFileSync(path.join(workspace, ".gitignore"), ".rpiv-codex/\n");
  fs.writeFileSync(path.join(workspace, "tracked.txt"), "baseline\n");
  git(workspace, "add", ".");
  git(workspace, "commit", "-m", "fixture baseline");
  const allocation = artifactPath("research", "Revision Fixture", workspace, new Date("2026-08-20T12:00:00.000Z"));
  fs.mkdirSync(path.dirname(allocation.absolute), { recursive: true });
  const frontmatter = allocation.common_frontmatter;
  fs.writeFileSync(allocation.absolute, [
    "---",
    "stage: research",
    "status: review",
    `rpiv_source: ${JSON.stringify(frontmatter.rpiv_source)}`,
    `rpiv_commit: ${frontmatter.rpiv_commit}`,
    "supersedes: null",
    "source_artifacts: []",
    `repository: ${JSON.stringify(frontmatter.repository)}`,
    `branch: ${JSON.stringify(frontmatter.branch)}`,
    `commit: ${JSON.stringify(frontmatter.commit)}`,
    `working_tree_sha256: ${JSON.stringify(frontmatter.working_tree_sha256)}`,
    `working_tree_scope: ${JSON.stringify(frontmatter.working_tree_scope)}`,
    `created_at: ${JSON.stringify(frontmatter.created_at)}`,
    "---",
    "",
    "# Research: Revision Fixture",
    "",
    "Initial reviewed draft.\n",
  ].join("\n"));
  return { workspace, artifact: allocation.absolute };
}

test("research skill exposes the accepted manual gates and boundaries", () => {
  const skill = read(".agents", "skills", "rpivc-research", "SKILL.md");
  const contract = read(".agents", "skills", "rpivc-research", "references", "research-contract.md");
  const combined = `${skill}\n${contract}`;
  assert.deepEqual(skill.split("---")[1].trim().split("\n").map((line) => line.split(":")[0]), ["name", "description"]);
  assert.match(combined, /exactly one manually supplied absolute path/);
  assert.match(combined, /inspect no target source before this decision/);
  assert.match(combined, /\*\*Run\*\*, \*\*Edit\*\*, \*\*Omit\*\*, or \*\*Stop\*\*/);
  assert.match(combined, /\*\*Use scope\*\*, \*\*Revise scope\*\*, or \*\*Stop\*\*/);
  assert.match(combined, /no more than three independent cards per wave and three analysis cards total/);
  assert.match(combined, /complete approved scope must fit at most three analysis cards/);
  assert.doesNotMatch(combined, /followup_task|dispatch_mode: followup/);
  assert.match(combined, /`agent_type` equal to the displayed `role`/);
  assert.match(combined, /requested runtime settings/);
  assert.match(combined, /updates that same draft path/);
  assert.match(combined, /changed before\/after `artifact_sha256` values/);
  assert.doesNotMatch(combined, /timestamp-distinct artifact|writes a new artifact with `supersedes`/);
  assert.match(combined, /One wave never authorizes another/);
  assert.match(combined, /External web research is deferred/);
  assert.match(combined, /\*\*Write artifact\*\*, \*\*Adjust\*\*, or \*\*Stop\*\*/);
  assert.match(combined, /\*\*Accept\*\*, \*\*Revise\*\*, or \*\*Stop\*\*/);
  assert.match(combined, /Never create, invoke, route to, or imply `rpivc-design`/);
});

test("research specialist definitions are adaptive and childless", () => {
  const expected = {
    "rpivc-scope-tracer.toml": /5-9 dense numbered questions/,
    "rpivc-codebase-pattern-finder.toml": /approved comparison questions/,
    "rpivc-integration-scanner.toml": /connection graph/,
    "rpivc-precedent-locator.toml": /Never fetch/,
  };
  for (const [file, pattern] of Object.entries(expected)) {
    const text = read(".codex", "agents", file);
    assert.match(text, pattern);
    assert.match(text, /spawn children/);
    assert.match(text, /behaviorally read-only|never mutate/i);
  }
  assert.equal(fs.existsSync(path.join(root, ".codex", "agents", "rpivc-codebase-analyzer.toml")), true);
});

test("research template is compressed planner context with complete coverage", () => {
  const template = read(".agents", "skills", "rpivc-research", "assets", "research-template.md");
  for (const section of [
    "Source Feature", "Research Questions", "Summary", "Coverage Ledger", "Detailed Findings",
    "Code References", "Integration Points", "Architecture Insights", "Precedents & Lessons",
    "Developer Context", "Evidence Conflicts and Gaps", "Historical Context", "Open Questions", "Dispatch Ledger",
  ]) assert.match(template, new RegExp(`## ${section.replace(/[&]/g, "\\&")}`));
  assert.match(template, /stage: research/);
  assert.match(template, /status: review/);
  assert.match(template, /source_artifacts:/);
  assert.match(template, /^supersedes: null$/m);
});

test("research evaluation is exactly two cases with two independent graders", () => {
  const cases = read("evals", "research", "cases.yaml");
  const config = read("evals", "research", "promptfooconfig.yaml");
  assert.equal((cases.match(/^\s+case_id:/gm) ?? []).length, 2);
  assert.equal((cases.match(/type: agent-rubric/g) ?? []).length, 2, "YAML anchor defines two graders reused by both cases");
  assert.match(cases, /maxTurns: 20/);
  assert.match(cases, /maxTurns: 30/);
  assert.match(cases, /exercise_revision: true/);
  assert.match(cases, /same revised artifact path/);
  assert.match(config, /maxConcurrency: 1/);
  assert.match(config, /repeat: 1/);
  assert.doesNotMatch(`${cases}\n${config}`, /web-search|network_access_enabled: true/);
});

test("artifact allocator supports research without changing discovery provenance", async () => {
  const module = await import("../.agents/skills/_shared/scripts/artifact-path.mjs");
  const now = new Date("2026-08-19T12:00:00.000Z");
  const discover = module.artifactPath("discover", "Example", root, now);
  const research = module.artifactPath("research", "Example", root, now);
  assert.equal(discover.common_frontmatter.rpiv_source, "packages/rpiv-pi/skills/discover/SKILL.md");
  assert.equal(research.common_frontmatter.rpiv_source, "packages/rpiv-pi/skills/research/SKILL.md");
  assert.match(research.relative, /^\.rpiv-codex\/artifacts\/research\//);
});

test("research attestation recognizes every dispatchable research role", () => {
  const rendered = [
    "```yaml\nid: S1\ntask_name: s1_scope_tracer\nrole: rpivc-scope-tracer\nmodel: gpt-5.6-terra\nreasoning: high\n```",
    "```yaml\nid: A4\ntask_name: a4_precedent\nrole: rpivc-precedent-locator\nmodel: gpt-5.6-luna\nreasoning: low\n```",
  ].join("\n");
  assert.deepEqual(extractAgentCards(rendered).map((card) => card.role), ["rpivc-scope-tracer", "rpivc-precedent-locator"]);
});

test("external-web deferral assertion accepts equivalent inherited wording", () => {
  assert.equal(inheritsExternalWebDeferral("External web research is deferred."), true);
  assert.equal(inheritsExternalWebDeferral("The artifact must defer external web research."), true);
  assert.equal(inheritsExternalWebDeferral("External research remains explicitly deferred."), true);
  assert.equal(inheritsExternalWebDeferral("External web research is enabled."), false);
});

test("research assertion requires repository-relative citation labels", () => {
  const repository = "/tmp/evidence/workspace";
  assert.equal(repositoryRelativeCitationLabels(
    "[src/provider.mjs:12](/tmp/evidence/workspace/src/provider.mjs:12)",
    repository,
  ), true);
  assert.equal(repositoryRelativeCitationLabels(
    "[provider.mjs:12](/tmp/evidence/workspace/src/provider.mjs:12)",
    repository,
  ), false);
});

test("research provider clears stale cards and retains each child call once", () => {
  const provider = new RpivcResearchProvider();
  const cardState = { latestCards: [{ id: "old" }], phase: "ordinary" };
  provider.afterTurn(cardState, "No dispatch card in this turn.");
  assert.deepEqual(cardState.latestCards, []);

  const state = { attestedCallIds: new Set(), attestations: [] };
  const attestation = { dispatch: { call_id: "call-1" } };
  assert.equal(retainUniqueAttestation(state, attestation), true);
  assert.equal(retainUniqueAttestation(state, attestation), false);
  assert.equal(state.attestations.length, 1);
});

test("research revision evidence proves changed bytes at one validated path", () => {
  const { workspace, artifact } = researchWorkspaceFixture();
  const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), "rpivc-research-evidence-"));
  const state = { workspace, evidenceDir, turn: 1, artifactRevisionObservations: [] };

  const first = observeResearchArtifact(workspace, 1);
  assert.equal(first.artifact_count, 1);
  assert.equal(first.inspection_passed, true);
  assert.equal(retainArtifactRevisionObservation(state).artifact_sha256, first.artifact_sha256);
  assert.equal(retainArtifactRevisionObservation(state), null, "unchanged bytes are not a revision");

  fs.appendFileSync(artifact, "Revised reviewed draft.\n");
  state.turn = 2;
  const second = retainArtifactRevisionObservation(state);
  assert.equal(second.relative_path, first.relative_path);
  assert.notEqual(second.artifact_sha256, first.artifact_sha256);
  assert.equal(second.inspection_passed, true);
  assert.equal(state.artifactRevisionObservations.length, 2);
  assert.equal(fs.readFileSync(path.join(evidenceDir, "artifact-revisions.jsonl"), "utf8").trim().split("\n").length, 2);
});

test("runtime reducer captures only fresh spawn dispatches without plaintext", () => {
  const spawn = captureAttestationEvent({
    method: "rawResponseItem/completed",
    params: {
      threadId: "parent",
      turnId: "turn-1",
      item: {
        type: "function_call",
        name: "spawn_agent",
        call_id: "call-spawn",
        arguments: JSON.stringify({
          agent_type: "rpivc-codebase-analyzer",
          task_name: "analysis_profile",
          fork_turns: "none",
          model: "gpt-5.6-terra",
          reasoning_effort: "high",
          message: "encrypted-spawn-envelope",
        }),
      },
    },
  });
  const followup = captureAttestationEvent({
    method: "rawResponseItem/completed",
    params: {
      threadId: "parent",
      turnId: "turn-2",
      item: {
        type: "function_call",
        name: "followup_task",
        call_id: "call-followup",
        arguments: JSON.stringify({
          target: "analysis_profile",
          message: "encrypted-followup-envelope",
        }),
      },
    },
  });

  assert.deepEqual([spawn.kind, spawn.dispatch_mode, spawn.task_name], ["dispatch-call", "spawn", "analysis_profile"]);
  assert.equal(spawn.message_sha256.length, 64);
  assert.equal(spawn.agent_type, "rpivc-codebase-analyzer");
  assert.equal(followup, null);
  assert.equal(JSON.stringify(spawn).includes("encrypted-spawn-envelope"), false);
});

test("dependent-card attestation requires a fresh explicitly configured child", () => {
  const sandbox = { type: "workspaceWrite", writableRoots: [], networkAccess: false };
  const card = {
    id: "A4",
    dispatch_protocol: "rpivc-dispatch/v1",
    dispatch_mode: "spawn",
    depends_on: ["A1"],
    task_name: "analysis_profile",
    role: "rpivc-codebase-analyzer",
    model: "gpt-5.6-terra",
    reasoning: "high",
  };
  const events = [
    { kind: "thread-settings", thread_id: "parent", sandbox_policy: sandbox },
    {
      kind: "dispatch-call",
      dispatch_mode: "spawn",
      thread_id: "parent",
      call_id: "call-dependent",
      task_name: "analysis_profile",
      agent_type: "rpivc-codebase-analyzer",
      fork_turns: "none",
      model: "gpt-5.6-terra",
      reasoning_effort: "high",
      message_sha256: "a".repeat(64),
      message_bytes: 128,
      canonical_envelope_sha256: null,
    },
    {
      kind: "subagent-activity",
      activity: "started",
      call_id: "call-dependent",
      child_thread_id: "child",
      agent_path: "/root/analysis_profile",
    },
    {
      kind: "thread-settings",
      thread_id: "child",
      model: "gpt-5.6-terra",
      effort: "high",
      sandbox_policy: sandbox,
      approval_policy: "never",
    },
    { kind: "turn-completed", thread_id: "child", status: "completed", error: null },
    {
      kind: "agent-output",
      author: "/root/analysis_profile",
      content_sha256: "b".repeat(64),
      content_bytes: 256,
    },
  ];

  const attestation = buildDispatchAttestation({ events, parentThreadId: "parent", card });
  assert.equal(attestation.schema, "rpivc-runtime-attestation/v3");
  assert.equal(attestation.dispatch_mode, "spawn");
  assert.deepEqual(attestation.depends_on, ["A1"]);
  assert.equal(attestation.pass, true);

  const inherited = buildDispatchAttestation({
    events,
    parentThreadId: "parent",
    card: { ...card, task_name: "missing" },
  });
  assert.equal(inherited.checks.dispatch_observed, false);
  assert.equal(inherited.pass, false);
});

test("research provider archives each child after effective settings capture", async () => {
  const requests = [];
  const connection = {
    async request(method, params) {
      requests.push({ method, params });
      if (method === "thread/resume") {
        return {
          model: "gpt-5.6-terra",
          reasoningEffort: "high",
          sandbox: { type: "workspaceWrite", writableRoots: [], networkAccess: false },
          approvalPolicy: "never",
        };
      }
      return {};
    },
  };
  const provider = new RpivcResearchProvider();
  const state = {
    delegate: { connections: new Map([["connection", connection]]) },
    attestationEvents: [],
    archivedThreadIds: new Set(),
  };

  await provider.captureEffectiveChildSettings(state, [
    { kind: "subagent-activity", child_thread_id: "child-thread" },
  ]);
  assert.deepEqual(requests.map((request) => request.method), ["thread/resume", "thread/archive"]);
  assert.equal(state.archivedThreadIds.has("child-thread"), true);
});
