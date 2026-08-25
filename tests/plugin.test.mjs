import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const pluginRoot = path.join(root, "plugins", "rpiv-codex");

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function runJson(script, args, cwd) {
  return JSON.parse(execFileSync(process.execPath, [script, ...args], { cwd, encoding: "utf8" }));
}

test("portable skills resolve every runtime resource inside the plugin", () => {
  for (const skillName of ["rpivc-discover", "rpivc-research"]) {
    const skillRoot = path.join(pluginRoot, "skills", skillName);
    const skill = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
    assert.match(skill, /<skill-root>\/scripts\//);
    assert.match(skill, /specialist-contract <role>/);
    assert.doesNotMatch(skill, /node \.agents\/skills/);
    assert.doesNotMatch(skill, /\.codex\/agents/);
    const scripts = path.join(skillRoot, "scripts");
    assert.equal(fs.lstatSync(scripts).isDirectory(), true);
    for (const script of ["artifact-check.mjs", "artifact-path.mjs", "context-snapshot.mjs"]) {
      const exposed = path.join(scripts, script);
      assert.equal(fs.lstatSync(exposed).isFile(), true);
      assert.equal(fs.lstatSync(exposed).isSymbolicLink(), false);
    }
  }

  const research = fs.readFileSync(path.join(pluginRoot, "skills", "rpivc-research", "SKILL.md"), "utf8");
  assert.match(research, /runtime_agent_type: default/);
  assert.match(research, /without a target-project profile/);
  assert.match(research, /current project.*\.rpiv-codex\/artifacts/s);
});

test("bundled helpers preflight both Research inputs and allocate artifacts in an unrelated project", (t) => {
  const workspace = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "rpivc-plugin-target-")));
  t.after(() => {
    assert.equal(workspace.startsWith(`${fs.realpathSync(os.tmpdir())}${path.sep}`), true);
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  git(workspace, "init", "-b", "main");
  git(workspace, "config", "user.name", "Plugin Fixture");
  git(workspace, "config", "user.email", "plugin@example.test");
  fs.writeFileSync(path.join(workspace, "product.txt"), "unrelated product\n");
  git(workspace, "add", "product.txt");
  git(workspace, "commit", "-m", "fixture baseline");

  const researchHelper = path.join(pluginRoot, "skills", "rpivc-research", "scripts", "artifact-check.mjs");
  const allocator = path.join(pluginRoot, "skills", "rpivc-discover", "scripts", "artifact-path.mjs");
  assert.equal(fs.realpathSync(researchHelper), researchHelper);

  const prompt = runJson(researchHelper, ["preflight-research", "Trace the unrelated product entry point"], workspace);
  assert.equal(prompt.input_mode, "prompt");
  assert.equal(prompt.context.repository, workspace);
  const specialist = runJson(researchHelper, ["specialist-contract", "rpivc-scope-tracer"], workspace);
  assert.equal(specialist.absolute, path.join(pluginRoot, "specialists", "rpivc-scope-tracer.toml"));
  assert.match(specialist.sha256, /^[0-9a-f]{64}$/);

  const discovery = runJson(allocator, ["discover", "Portable fixture"], workspace);
  assert.equal(discovery.absolute.startsWith(path.join(workspace, ".rpiv-codex", "artifacts", "discover")), true);
  assert.equal(discovery.absolute.startsWith(pluginRoot), false);
  const frontmatter = discovery.common_frontmatter;
  fs.writeFileSync(discovery.absolute, [
    "---",
    "stage: discover",
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
    "# Portable discovery fixture",
    "",
  ].join("\n"));

  const artifact = runJson(researchHelper, ["preflight-research", discovery.absolute], workspace);
  assert.equal(artifact.input_mode, "discovery");
  assert.equal(artifact.context.repository, workspace);
  assert.equal(artifact.artifact, path.relative(workspace, discovery.absolute).split(path.sep).join("/"));
  assert.equal(fs.existsSync(path.join(workspace, ".agents")), false);
  assert.equal(fs.existsSync(path.join(workspace, ".codex")), false);
});
