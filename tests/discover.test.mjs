import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = join(repositoryRoot, "plugins/rpiv-codex");
const skillRoot = join(pluginRoot, "skills/rpivc-discover");
const skillPath = join(skillRoot, "SKILL.md");
const nowPath = join(skillRoot, "scripts/now.mjs");
const gitContextPath = join(skillRoot, "scripts/git-context.mjs");

const read = (path) => readFileSync(path, "utf8");
const runNode = (path, cwd) =>
  execFileSync(process.execPath, [path], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
const gitIn = (cwd, ...args) =>
  execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"] });

test("discover keeps its load-bearing workflow boundaries", () => {
  const skill = read(skillPath);
  assert.ok(
    skill.indexOf("### 1. Ask the foundational intent question") <
      skill.indexOf("### 2. Run the lightweight repository probe"),
  );
  assert.match(skill, /\.rpiv\/artifacts\/discover\//);
  assert.match(skill, /successor name is a handoff/i);
});

test("discover keeps a bounded probe path without collaboration agents", () => {
  const skill = read(skillPath);
  assert.match(skill, /If the repository contains no project files, record `no codebase precedent`/);
  assert.match(skill, /separation is organizational rather than semantic/);
  assert.match(skill, /execute each chosen role inline under its complete bundled prompt/);
  assert.match(skill, /Files already read by an inline analyzer count toward this cap/);
  assert.doesNotMatch(skill, /required probe roles cannot be preserved and stop/);
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
