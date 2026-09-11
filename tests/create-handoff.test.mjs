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
const skillRoot = join(repositoryRoot, "plugins/rpiv-codex/skills/rpivc-create-handoff");
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

test("create-handoff includes exactly its reachable runtime dependencies", () => {
  for (const path of ["agents/openai.yaml", "scripts/now.mjs", "scripts/git-context.mjs"]) {
    assert.ok(read(join(skillRoot, path)).length > 0, path);
  }
});

test("create-handoff preserves workflow order and the successor stop boundary", () => {
  const skill = read(skillPath);
  const headings = [
    "### 1. Establish current truth",
    "### 2. Choose the artifact path",
    "### 3. Write the handoff",
    "### 4. Verify and save",
    "### 5. Report and stop",
  ];
  for (let index = 1; index < headings.length; index += 1) {
    assert.ok(skill.indexOf(headings[index - 1]) < skill.indexOf(headings[index]));
  }
  assert.match(skill, /successor name is a handoff, not permission to invoke it/i);
  assert.match(skill, /Never commit, push, publish/);
});

test("create-handoff preserves the load-bearing artifact contract", () => {
  const skill = read(skillPath);
  assert.match(skill, /\.rpiv\/artifacts\/handoffs\/<timestamp-slug>_<description-slug>\.md/);
  for (const field of [
    "date:",
    "author:",
    "commit:",
    "branch:",
    "repository:",
    "topic:",
    "tags:",
    "status: complete",
    "last_updated:",
    "last_updated_by:",
    "type:",
  ]) {
    assert.ok(skill.includes(field), field);
  }
  for (const heading of [
    "## Task(s)",
    "## Critical References",
    "## Recent changes",
    "## Learnings",
    "## Artifacts",
    "## Action Items & Next Steps",
    "## Other Notes",
  ]) {
    assert.ok(skill.includes(heading), heading);
  }
  assert.match(skill, /status: complete.*handoff document is complete/s);
  assert.match(skill, /never overwrite an existing handoff/i);
});

test("create-handoff separates Desktop chat, artifact, and structural links", () => {
  const skill = read(skillPath);
  assert.match(skill, /\[Orders handler — lines 42–55\]\(\/absolute\/repository\/src\/orders\.ts:42\)/);
  assert.match(skill, /\[Orders handler — lines 42–55\]\(src\/orders\.ts#L42-L55\)/);
  assert.match(skill, /Keep frontmatter fields, filenames, commands, identifiers/);
  assert.match(skill, /Never write the absolute repository root/);
  assert.match(skill, /\[Handoff document\]\(\/absolute\/repository\/\.rpiv\/artifacts\/handoffs\/\{timestamp\}_\{description\}\.md\)/);
});

test("now preserves the source timestamp and slug contract", () => {
  const output = runNode(nowPath, repositoryRoot);
  assert.equal(output.includes("\n"), false);
  const [iso, slug, ...rest] = output.split("\t");
  assert.equal(rest.length, 0);
  assert.match(iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/);
  assert.equal(slug, iso.slice(0, 19).replaceAll(":", "-").replace("T", "_"));
  assert.equal(iso.endsWith("Z"), false);
});

test("git-context reports the caller repository and falls back outside Git", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rpivc-create-handoff-"));
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

  const outside = mkdtempSync(join(tmpdir(), "rpivc-create-handoff-no-git-"));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  const fallback = runNode(gitContextPath, outside);
  for (const line of ["branch: no-branch", "commit: no-commit", "repo: unknown", "root: ", "in_repo: no"]) {
    assert.ok(fallback.split("\n").includes(line), line);
  }
});
