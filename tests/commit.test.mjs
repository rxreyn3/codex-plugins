import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = join(repositoryRoot, "plugins/rpiv-codex/skills/rpivc-commit");
const skillPath = join(skillRoot, "SKILL.md");
const gitChangesPath = join(skillRoot, "scripts/git-changes.mjs");

const read = (path) => readFileSync(path, "utf8");
const gitIn = (cwd, ...args) => execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"] });
const run = (cwd, ...args) =>
  execFileSync(process.execPath, [gitChangesPath, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

const temporaryDirectory = (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rpivc-commit-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
};

const initRepository = (directory) => {
  gitIn(directory, "init", "--initial-branch=main", "-q");
  gitIn(directory, "config", "user.email", "test@example.com");
  gitIn(directory, "config", "user.name", "Test User");
  gitIn(directory, "config", "commit.gpgsign", "false");
};

const commitFile = (directory, path = "f.txt", contents = "hi\n") => {
  writeFileSync(join(directory, path), contents);
  gitIn(directory, "add", "--", path);
  gitIn(directory, "commit", "-m", "init", "-q");
};

test("commit includes exactly its reachable helper and local invocation policy", () => {
  assert.ok(read(join(skillRoot, "agents/openai.yaml")).length > 0);
  assert.ok(read(gitChangesPath).length > 0);
});

test("commit preserves the load-bearing workflow order and approval boundary", () => {
  const skill = read(skillPath);
  const headings = [
    "### 1. Check the repository and establish scope",
    "### 2. Understand the changes",
    "### 3. Plan the commit or commits",
    "### 4. Present and gate the plan",
    "### 5. Execute the approved plan",
  ];
  for (let index = 1; index < headings.length; index += 1) {
    assert.ok(skill.indexOf(headings[index - 1]) < skill.indexOf(headings[index]));
  }
  assert.match(skill, /Do not stage or commit anything until the developer chooses `Commit`/);
  assert.match(skill, /git add -- <path>/);
  assert.match(skill, /never use `git add -A`, `git add \.`/);
  assert.match(skill, /Never push, publish, or invoke another workflow stage/);
});

test("commit preserves the baseline fence and direct approval fallback", () => {
  const skill = read(skillPath);
  assert.match(skill, /--baseline <path>/);
  assert.match(skill, /Never stage a path from the pre-existing section/);
  assert.match(skill, /Commit \(Recommended\)/);
  assert.match(skill, /Adjust/);
  assert.match(skill, /Review files/);
  assert.match(skill, /If structured input is unavailable or fails to display/);
});

test("git-changes emits in_repo no and stops outside a repository", (t) => {
  const directory = temporaryDirectory(t);
  const output = run(directory);
  assert.match(output, /in_repo: no/);
  assert.doesNotMatch(output, /---status---/);
  assert.doesNotMatch(output, /---diffstat---/);
});

test("git-changes emits the no-HEAD fallback for an initial repository", (t) => {
  const directory = temporaryDirectory(t);
  initRepository(directory);
  writeFileSync(join(directory, "f.txt"), "hi\n");
  gitIn(directory, "add", "--", "f.txt");
  const output = run(directory);
  assert.match(output, /in_repo: yes/);
  assert.match(output, /^A\s+f\.txt$/m);
  assert.match(output, /---diffstat---/);
  assert.match(output, /\(no HEAD yet/);
});

test("git-changes reports a clean repository and a changed diffstat", (t) => {
  const directory = temporaryDirectory(t);
  initRepository(directory);
  commitFile(directory);

  const clean = run(directory);
  assert.match(clean, /---status---\n\(working tree clean\)/);
  assert.match(clean, /---diffstat---\n\(no changes against HEAD\)/);

  writeFileSync(join(directory, "f.txt"), "hi\nworld\n");
  const changed = run(directory);
  assert.match(changed.slice(changed.indexOf("---diffstat---")), /f\.txt\s*\|\s*\d+/);
});

test("git-changes caps status and diffstat at 200 lines", (t) => {
  const statusDirectory = temporaryDirectory(t);
  initRepository(statusDirectory);
  commitFile(statusDirectory, ".gitignore", "");
  for (let index = 0; index < 250; index += 1) writeFileSync(join(statusDirectory, `f${index}.txt`), "");
  const statusOutput = run(statusDirectory);
  const statusBlock = statusOutput.slice(statusOutput.indexOf("---status---"), statusOutput.indexOf("---diffstat---"));
  assert.equal(statusBlock.split("\n").filter((line) => line.startsWith("??")).length, 200);
  assert.match(statusBlock, /\(\.\.\. 50 more files truncated \.\.\.\)/);

  const diffDirectory = temporaryDirectory(t);
  initRepository(diffDirectory);
  writeFileSync(join(diffDirectory, ".gitignore"), "");
  for (let index = 0; index < 250; index += 1) writeFileSync(join(diffDirectory, `f${index}.txt`), "a\n");
  gitIn(diffDirectory, "add", "--", ".gitignore", ...Array.from({ length: 250 }, (_, index) => `f${index}.txt`));
  gitIn(diffDirectory, "commit", "-m", "seed", "-q");
  for (let index = 0; index < 250; index += 1) writeFileSync(join(diffDirectory, `f${index}.txt`), "b\nc\n");
  const diffOutput = run(diffDirectory);
  assert.match(diffOutput.slice(diffOutput.indexOf("---diffstat---")), /more files truncated/);
});

test("git-changes fences baseline paths without changing standalone behavior", (t) => {
  const directory = temporaryDirectory(t);
  initRepository(directory);
  commitFile(directory, ".gitignore", "");
  writeFileSync(join(directory, "blog.md"), "unrelated edit\n");
  writeFileSync(join(directory, "src.ts"), "the run's own change\n");
  mkdirSync(join(directory, ".rpiv/artifacts/goal"), { recursive: true });
  writeFileSync(
    join(directory, ".rpiv/artifacts/goal/baseline-t1.json"),
    JSON.stringify({ paths: ["blog.md"] }),
  );

  const fenced = run(directory, "--baseline", ".rpiv/artifacts/goal/baseline-t1.json");
  const statusBlock = fenced.slice(fenced.indexOf("---status---"), fenced.indexOf("---pre-existing"));
  assert.match(statusBlock, /src\.ts/);
  assert.doesNotMatch(statusBlock, /blog\.md/);
  assert.match(fenced.slice(fenced.indexOf("---pre-existing")), /blog\.md/);

  const standalone = run(directory);
  assert.doesNotMatch(standalone, /---pre-existing/);
  assert.match(standalone.slice(standalone.indexOf("---status---")), /blog\.md/);
  assert.match(standalone.slice(standalone.indexOf("---status---")), /src\.ts/);
});
