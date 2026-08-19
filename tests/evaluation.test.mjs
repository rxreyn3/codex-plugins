import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import RpivcDiscoverProvider from "../evals/discover/provider.mjs";
import {
  cleanupDisposableWorkspace,
  createDisposableWorkspace,
  inventoryChanges,
  snapshotRepository,
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
  assert.equal(pkg.engines.node, ">=22.22.0");
  assert.equal(pkg.scripts["eval:discover:validate"], "node evals/_shared/run.mjs validate");
  assert.equal(pkg.scripts["eval:discover"], "node evals/_shared/run.mjs eval");
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
  assert.match(cases, /###STOP###/);
  assert.match(runner, /PROMPTFOO_DISABLE_TELEMETRY/);
  assert.match(runner, /PROMPTFOO_DISABLE_UPDATE/);
  assert.match(runner, /PROMPTFOO_DISABLE_SHARING/);
  assert.match(runner, /"--no-cache"/);
  assert.match(runner, /"--no-share"/);
  assert.match(runner, /"--repeat", "1"/);
  assert.doesNotMatch(runner, /PROMPTFOO_DISABLE_REMOTE_GENERATION/);
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

  cleanupDisposableWorkspace(state.temporaryParent);
  assert.equal(fs.existsSync(state.temporaryParent), false);
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
    "role: rpivc-codebase-locator\nRun / Edit / Omit / Stop",
    "Repository changed. Refreshed role: rpivc-codebase-locator\nRun / Edit / Omit / Stop",
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
    cleanupDisposableWorkspace(runtime.temporary_parent);
  } finally {
    if (previous.id === undefined) delete process.env.RPIVC_EVAL_ID; else process.env.RPIVC_EVAL_ID = previous.id;
    if (previous.evidence === undefined) delete process.env.RPIVC_EVIDENCE_ROOT; else process.env.RPIVC_EVIDENCE_ROOT = previous.evidence;
    if (previous.source === undefined) delete process.env.RPIVC_SOURCE_ROOT; else process.env.RPIVC_SOURCE_ROOT = previous.source;
    fs.rmSync(source, { force: true, recursive: true });
    fs.rmSync(evidenceRoot, { force: true, recursive: true });
  }
});

