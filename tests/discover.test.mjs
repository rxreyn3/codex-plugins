import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const marketplacePath = join(repositoryRoot, ".agents/plugins/marketplace.json");
const pluginRoot = join(repositoryRoot, "plugins/rpiv-codex");
const manifestPath = join(pluginRoot, ".codex-plugin/plugin.json");
const skillRoot = join(pluginRoot, "skills/rpivc-discover");
const skillPath = join(skillRoot, "SKILL.md");
const nowPath = join(skillRoot, "scripts/now.mjs");
const gitContextPath = join(skillRoot, "scripts/git-context.mjs");

const read = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(read(path));
const runNode = (path, cwd) =>
  execFileSync(process.execPath, [path], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
const gitIn = (cwd, ...args) =>
  execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"] });
const walkFiles = (root) =>
  readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });

test("plugin packaging is valid and the skill is self-contained", () => {
  const marketplace = json(marketplacePath);
  const entry = marketplace.plugins.find((plugin) => plugin.name === "rpiv-codex");
  assert.ok(entry);
  assert.equal(resolve(repositoryRoot, entry.source.path), pluginRoot);

  const manifest = json(manifestPath);
  assert.equal(manifest.name, "rpiv-codex");
  assert.match(manifest.version, /^0\.1\.0\+codex\.[A-Za-z0-9.-]+$/);
  assert.equal(resolve(pluginRoot, manifest.skills), join(pluginRoot, "skills"));
  assert.ok(existsSync(skillPath));

  const policy = read(join(skillRoot, "agents/openai.yaml"));
  assert.match(policy, /allow_implicit_invocation:\s*false/);

  const skill = read(skillPath);
  for (const match of skill.matchAll(/\]\((?!https?:\/\/)([^)#]+)(?:#[^)]+)?\)/g)) {
    assert.ok(existsSync(resolve(skillRoot, match[1])), `missing ${match[1]}`);
  }

  const locatorPath = join(skillRoot, "references/codebase-locator.md");
  const analyzerPath = join(skillRoot, "references/codebase-analyzer.md");
  assert.ok(existsSync(locatorPath));
  assert.ok(existsSync(analyzerPath));
  assert.notEqual(read(locatorPath), read(analyzerPath));

  const forbidden = [
    "rpiv-mono",
    ".codex/agents",
    ".agents/skills/port-rpiv-skill",
    "/Users/ryan.reynolds",
    "${SKILL_DIR}/../_shared",
  ];
  for (const path of walkFiles(skillRoot)) {
    for (const value of forbidden) {
      assert.equal(read(path).includes(value), false, `${relative(repositoryRoot, path)} contains ${value}`);
    }
  }
});

test("discover keeps its load-bearing workflow boundaries", () => {
  const skill = read(skillPath);
  assert.ok(
    skill.indexOf("### 1. Ask the foundational intent question") <
      skill.indexOf("### 2. Run the lightweight repository probe"),
  );
  assert.match(skill, /\.rpiv\/artifacts\/discover\//);
  assert.match(skill, /successor name is a handoff/i);
});

test("the Feature Requirements Document template keeps its compatibility skeleton", () => {
  const template = read(join(skillRoot, "references/frd-template.md"));
  assert.match(template, /^---[\s\S]*status: ready[\s\S]*---/);
  for (const heading of [
    "## Problem & Intent",
    "## Functional Requirements",
    "## Acceptance Criteria",
    "## Decisions",
    "## Open Questions",
    "## References",
  ]) {
    assert.ok(template.includes(heading), heading);
  }
  for (const field of ["**Question**:", "**Recommended**:", "**Chosen**:", "**Rationale**:"]) {
    assert.ok(template.includes(field), field);
  }
});

test("now.mjs preserves the upstream timestamp contract", () => {
  const output = runNode(nowPath, repositoryRoot);
  assert.equal(output.includes("\n"), false);
  const [iso, slug, ...rest] = output.split("\t");
  assert.equal(rest.length, 0);
  assert.match(iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/);
  assert.equal(slug, iso.slice(0, 19).replaceAll(":", "-").replace("T", "_"));
});

test("git-context.mjs reports a repository using the caller's working directory", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rpivc-git-context-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  gitIn(directory, "init", "--initial-branch=main", "-q");
  gitIn(directory, "config", "user.email", "test@example.com");
  gitIn(directory, "config", "user.name", "Test User");
  gitIn(directory, "config", "commit.gpgsign", "false");
  writeFileSync(join(directory, "fixture.txt"), "fixture\n");
  gitIn(directory, "add", "fixture.txt");
  gitIn(directory, "commit", "-m", "fixture", "-q");

  const output = runNode(gitContextPath, directory);
  const realDirectory = realpathSync(directory);
  assert.match(output, /^branch: main$/m);
  assert.match(output, /^commit: [0-9a-f]{7,}$/m);
  assert.match(output, new RegExp(`^repo: ${basename(realDirectory)}$`, "m"));
  assert.ok(output.includes(`root: ${realDirectory}\n`));
  assert.match(output, /^in_repo: yes$/m);
  assert.match(output, /^author: Test User$/m);
  assert.ok(output.endsWith("\n"));
});

test("git-context.mjs falls back cleanly outside a repository", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rpivc-no-repository-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const output = runNode(gitContextPath, directory);
  for (const line of [
    "branch: no-branch",
    "commit: no-commit",
    "repo: unknown",
    "root: ",
    "in_repo: no",
  ]) {
    assert.ok(output.split("\n").includes(line), line);
  }
  assert.match(output, /^author: /m);
});
