import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = join(repositoryRoot, "plugins/rpiv-codex/skills/rpivc-validate");
const skillPath = join(skillRoot, "SKILL.md");
const templatePath = join(skillRoot, "references/validation-template.md");
const nowPath = join(skillRoot, "scripts/now.mjs");
const gitContextPath = join(skillRoot, "scripts/git-context.mjs");
const listRecentPath = join(skillRoot, "scripts/list-recent.mjs");

const read = (path) => readFileSync(path, "utf8");
const runNode = (path, cwd, ...args) =>
  execFileSync(process.execPath, [path, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
const git = (cwd, ...args) => execFileSync("git", args, { cwd, stdio: "ignore" });

test("validate includes exactly its reachable runtime and report dependencies", () => {
  for (const path of [
    "SKILL.md",
    "agents/openai.yaml",
    "scripts/now.mjs",
    "scripts/git-context.mjs",
    "scripts/list-recent.mjs",
    "references/validation-template.md",
  ]) {
    assert.ok(read(join(skillRoot, path)).length > 0, path);
  }
});

test("validate preserves the audit, verdict, report, and stop order", () => {
  const skill = read(skillPath);
  const headings = [
    "### 1. Resolve the plan and implementation context",
    "### 2. Validate every phase systematically",
    "### 3. Determine the verdict and write one report",
    "### 4. Present the result and stop",
  ];
  for (let index = 1; index < headings.length; index += 1) {
    assert.ok(skill.indexOf(headings[index - 1]) < skill.indexOf(headings[index]));
  }
  assert.match(skill, /Run every command from that phase's `#### Automated Verification:` section exactly as written/);
  assert.match(skill, /Never overwrite an existing validation report, patch a previous report, or append/);
  assert.match(skill, /Validate does not edit product code or plans/);
  assert.match(skill, /If the verdict passes, render `Recommended next step: \*\*Commit\*\*`/);
  assert.match(skill, /If it fails, do not recommend Commit/);
  assert.match(skill, /Always stop after the report and handoff/);
});

test("validate preserves baseline, scope, goal, risk, and blocker adjudication", () => {
  const skill = read(skillPath);
  assert.match(skill, /Subtract those pre-existing paths from the dirty set/);
  assert.match(skill, /prove it per file with `git diff --quiet <base> -- <file>`/);
  assert.match(skill, /pre-existing at base — criterion unachievable as written/);
  assert.match(skill, /inspect every `.rpiv\/artifacts\/verdicts\/scope-quarantine__\*\.json` manifest/);
  assert.match(skill, /A moved or refused load-bearing deliverable is a blocking plan deviation/);
  assert.match(skill, /Only when `--goal` was supplied, read the goal file completely/);
  assert.match(skill, /run the declared `procedure`; reading code alone is insufficient/);
  assert.match(skill, /Any `pass: false` forces `verdict: fail`/);
  assert.match(skill, /These are the remediation stage's only structured handles/);
});

test("validate uses relative Markdown evidence and literal structural paths", () => {
  const skill = read(skillPath);
  const template = read(templatePath);
  for (const contents of [skill, template]) {
    assert.match(contents, /\[Orders handler — line 42\]\(src\/orders\.ts#L42\)|\[Descriptive evidence — line 42\]\(src\/example\.ts#L42\)/);
    assert.match(contents, /#L42-L55/);
  }
  assert.match(skill, /preserve the report's `parent`, `blockers\[\]\.file`/);
  assert.match(skill, /plain repository-relative values/);
  assert.match(skill, /Never add a machine-specific absolute companion path/);
});

test("now keeps the source timestamp and slug contract", () => {
  const output = runNode(nowPath, repositoryRoot);
  assert.equal(output.includes("\n"), false);
  const [iso, slug, ...rest] = output.split("\t");
  assert.equal(rest.length, 0);
  assert.match(iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/);
  assert.equal(slug, iso.slice(0, 19).replaceAll(":", "-").replace("T", "_"));
});

test("git-context keeps source repository and graceful fallback behavior", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rpivc-validate-git-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));

  const outside = runNode(gitContextPath, directory);
  assert.match(outside, /^branch: no-branch$/m);
  assert.match(outside, /^commit: no-commit$/m);
  assert.match(outside, /^in_repo: no$/m);

  git(directory, "init", "--initial-branch=main", "-q");
  git(directory, "config", "user.email", "test@example.com");
  git(directory, "config", "user.name", "Test User");
  git(directory, "config", "commit.gpgsign", "false");
  writeFileSync(join(directory, "f.txt"), "hello");
  git(directory, "add", "f.txt");
  git(directory, "commit", "-m", "init", "-q");

  const inside = runNode(gitContextPath, directory);
  assert.match(inside, /^branch: main$/m);
  assert.match(inside, /^commit: [0-9a-f]{7,}$/m);
  assert.match(inside, new RegExp(`^repo: ${basename(realpathSync(directory))}$`, "m"));
  assert.match(inside, /^in_repo: yes$/m);
  assert.match(inside, /^author: Test User$/m);
  assert.equal(inside.endsWith("\n"), true);
});

test("list-recent keeps source ordering, count, file-only, and empty behavior", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rpivc-validate-recent-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, "nested"));

  for (const [name, time] of [["old.md", 1_000], ["mid.md", 2_000], ["new.md", 3_000]]) {
    const path = join(directory, name);
    writeFileSync(path, "");
    utimesSync(path, time, time);
  }

  assert.deepEqual(runNode(listRecentPath, directory, directory, "2").trim().split("\n"), [
    "new.md",
    "mid.md",
  ]);
  assert.equal(runNode(listRecentPath, directory, join(directory, "missing")), "");

  const empty = mkdtempSync(join(tmpdir(), "rpivc-validate-empty-"));
  t.after(() => rmSync(empty, { recursive: true, force: true }));
  assert.equal(runNode(listRecentPath, empty, empty), "");
});
