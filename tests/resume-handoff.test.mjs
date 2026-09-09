import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = join(repositoryRoot, "plugins/rpiv-codex/skills/rpivc-resume-handoff");
const skillPath = join(skillRoot, "SKILL.md");
const createHandoffPath = join(
  repositoryRoot,
  "plugins/rpiv-codex/skills/rpivc-create-handoff/SKILL.md",
);
const listRecentPath = join(skillRoot, "scripts/list-recent.mjs");

const read = (path) => readFileSync(path, "utf8");
const runNode = (path, cwd, ...args) =>
  execFileSync(process.execPath, [path, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

test("resume-handoff includes exactly its reachable dependencies", () => {
  for (const path of [
    "agents/openai.yaml",
    "references/artifact-context-reader.md",
    "scripts/list-recent.mjs",
  ]) {
    assert.ok(read(join(skillRoot, path)).length > 0, path);
  }
});

test("create-handoff hands off to the installed resume skill without stale setup advice", () => {
  const createHandoff = read(createHandoffPath);
  assert.match(createHandoff, /Recommended next step: \*\*Resume Handoff\*\*/);
  assert.match(createHandoff, /Resume Handoff is a separate skill/);
  assert.doesNotMatch(createHandoff, /Resume Handoff must be installed separately/);
});

test("resume-handoff uses one entry approval and preserves later scope boundaries", () => {
  const skill = read(skillPath);
  const headings = [
    "### 1. Resolve the handoff",
    "### 2. Read and analyze the handoff",
    "### 3. Verify current state",
    "### 4. Present the analysis and approve the continuation plan",
    "### 5. Continue the approved work",
  ];
  for (let index = 1; index < headings.length; index += 1) {
    assert.ok(skill.indexOf(headings[index - 1]) < skill.indexOf(headings[index]));
  }
  assert.match(skill, /Do not start the first task until the developer approves it/);
  assert.match(skill, /do not ask a second Begin question for the same scope/);
  assert.match(skill, /Approval to investigate and propose a provider change does not authorize applying it/);
  assert.doesNotMatch(skill, /After Begin|After Proceed|obtain both approval checkpoints/);
  assert.match(skill, /perform only the approved first task/);
  assert.match(skill, /Do not silently chain the entire continuation plan/);
});

test("resume-handoff preserves explicit and no-argument input behavior", () => {
  const skill = read(skillPath);
  assert.match(skill, /require exactly one path under `\.rpiv\/artifacts\/handoffs\/`/);
  assert.match(skill, /No entries:[\s\S]*ask for a repository-relative path in prose, and stop/);
  assert.match(skill, /Exactly one entry:[\s\S]*Resume <filename> \(Recommended\)/);
  assert.match(skill, /Two or more entries:[\s\S]*four newest filenames/);
  assert.match(skill, /Reject directories, paths outside `\.rpiv\/artifacts\/handoffs\/`, and multiple paths/);
});

test("resume-handoff keeps handoff ingestion and delegated evidence verification", () => {
  const skill = read(skillPath);
  assert.match(skill, /Read the selected handoff completely/);
  assert.match(skill, /Its work is organizational delegation/);
  assert.match(skill, /parent must verify every material claim/);
});

test("resume-handoff verifies repository drift before continuing", () => {
  const skill = read(skillPath);
  assert.match(skill, /compare the recorded repository and branch with the current Git root and branch/);
  assert.match(skill, /compare the recorded commit with current `HEAD`/);
  assert.match(skill, /present, missing, or modified/);
  assert.match(skill, /Never assume the handoff state still matches the repository/);
  assert.match(skill, /verified current facts from handoff claims, inference, and unknowns/);
});

test("resume-handoff labels interpretations and preserves checkpoint-sized tasks", () => {
  const skill = read(skillPath);
  assert.match(skill, /Use `Fact` only for claims directly established/);
  assert.match(skill, /Label conclusions about what that evidence means as `Interpretation` or `Inference`/);
  assert.match(skill, /create one task per unit rather than bundling the remainder into one task/);
});

test("resume-handoff adapts evidence links and preserves structural paths", () => {
  const skill = read(skillPath);
  assert.match(skill, /\[Orders handler — line 42\]\(src\/orders\.ts#L42\)/);
  assert.match(skill, /\[Orders handler — lines 42–55\]\(src\/orders\.ts#L42-L55\)/);
  assert.match(skill, /Keep handoff paths, frontmatter fields, commands, task identifiers/);
  assert.match(skill, /Never add a machine-specific absolute companion path/);
});

test("list-recent keeps source ordering, cap, file-only, and empty behavior", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rpivc-resume-handoff-"));
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

  const empty = mkdtempSync(join(tmpdir(), "rpivc-resume-handoff-empty-"));
  t.after(() => rmSync(empty, { recursive: true, force: true }));
  assert.equal(runNode(listRecentPath, empty, empty), "");
});
