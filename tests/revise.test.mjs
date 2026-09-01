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
const skillRoot = join(repositoryRoot, "plugins/rpiv-codex/skills/rpivc-revise");
const skillPath = join(skillRoot, "SKILL.md");
const nowPath = join(skillRoot, "scripts/now.mjs");
const listRecentPath = join(skillRoot, "scripts/list-recent.mjs");

const read = (path) => readFileSync(path, "utf8");
const runNode = (path, cwd, ...args) =>
  execFileSync(process.execPath, [path, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

test("revise includes exactly its reachable script and research-role dependencies", () => {
  for (const path of [
    "agents/openai.yaml",
    "scripts/now.mjs",
    "scripts/list-recent.mjs",
    "references/codebase-locator.md",
    "references/codebase-analyzer.md",
    "references/codebase-pattern-finder.md",
    "references/artifacts-locator.md",
    "references/artifacts-analyzer.md",
  ]) {
    assert.ok(read(join(skillRoot, path)).length > 0, path);
  }
});

test("revise preserves the load-bearing workflow order and edit gate", () => {
  const skill = read(skillPath);
  const headings = [
    "### 1. Resolve the plan and feedback",
    "### 2. Research only when needed",
    "### 3. Present the proposed revision and gate the edit",
    "### 4. Update the plan surgically",
    "### 5. Report the update and stop",
  ];
  for (let index = 1; index < headings.length; index += 1) {
    assert.ok(skill.indexOf(headings[index - 1]) < skill.indexOf(headings[index]));
  }
  assert.match(skill, /Do not edit until the developer chooses Proceed/);
  assert.match(skill, /successor name is a handoff, not permission to invoke it/i);
  assert.match(skill, /Never edit product source, a review artifact, or another plan/);
  assert.match(skill, /Never commit, invoke implementation/);
});

test("revise preserves standalone input boundaries", () => {
  const skill = read(skillPath);
  assert.match(skill, /Treat all text following `\$rpivc-revise` as `<plan-path> <feedback>`/);
  assert.match(skill, /Feedback may cite one or more review artifacts/);
  assert.match(skill, /Read every distinct cited review completely/);
  assert.match(skill, /updates implementation plans, not review artifacts/);
  assert.match(skill, /If a plan path exists but feedback is empty, ask what should change and stop/);
  assert.match(skill, /feedback cites one or more review artifacts[\s\S]*read every distinct review completely/i);
  assert.match(skill, /No entries:[\s\S]*\.rpiv\/artifacts\/plans\//);
});

test("revise expands repeated plan invariants inside one approval proposal", () => {
  const skill = read(skillPath);
  const readStart = skill.indexOf("#### Read the artifact");
  const researchStart = skill.indexOf("### 2. Research only when needed", readStart);
  const proposalStart = skill.indexOf("### 3. Present the proposed revision", researchStart);
  const updateStart = skill.indexOf("### 4. Update the plan surgically", proposalStart);
  assert.ok(readStart >= 0);
  assert.ok(researchStart > readStart);
  assert.ok(proposalStart > researchStart);
  assert.ok(updateStart > proposalStart);

  const readBoundary = skill.slice(readStart, researchStart);
  const proposalBoundary = skill.slice(proposalStart, updateStart);
  assert.match(readBoundary, /plan-consistency cone/);
  assert.match(readBoundary, /executable, command convention, path, dependency, environment assumption/);
  assert.match(readBoundary, /search the entire plan/);
  assert.match(readBoundary, /include every same-correction occurrence.*another phase/s);
  assert.match(readBoundary, /not a general plan audit and does not authorize edits/);
  assert.match(proposalBoundary, /Plan consistency scan:/);
  assert.match(proposalBoundary, /expands the proposal, not the edit authorization/);
  assert.match(proposalBoundary, /Never change an analogous occurrence unless the developer approves/);
});

test("revise keeps optional research bounded with a verified inline fallback", () => {
  const skill = read(skillPath);
  assert.match(skill, /Skip this step for a purely editorial or structural change/);
  assert.match(skill, /These roles are organizational delegation/);
  assert.match(skill, /When native collaboration agents are available/);
  assert.match(skill, /When collaboration agents are unavailable/);
  assert.match(skill, /separately labeled, bounded inline tasks/);
  assert.match(skill, /parent reads relevant files and verifies every finding/);
  assert.match(skill, /Research carrier: \{collaboration agents \| bounded inline \| not used\}/);
});

test("revise preserves plan state, phase metadata, and append-only history", () => {
  const skill = read(skillPath);
  assert.match(skill, /change each affected item back to `- \[ \]`/);
  assert.match(skill, /Leave a checkmark intact only when current implementation still satisfies/);
  assert.match(skill, /set `last_updated` to the exact retained `<iso>` value/);
  assert.match(skill, /set `last_updated_by: Codex`/);
  assert.match(skill, /set `last_updated_note`/);
  assert.match(skill, /rebuild its body-order entries from the final `## Phase N: \{title\}` headings/);
  assert.match(skill, /Append one new `## Follow-up \{ISO 8601 timestamp\}` section/);
  assert.match(skill, /Never collapse or rewrite earlier Follow-up sections/);
  assert.match(skill, /preserve separate `#### Automated Verification:` and `#### Manual Verification:` subsections/);
});

test("revise emits relative Markdown evidence and preserves structural paths", () => {
  const skill = read(skillPath);
  assert.match(skill, /\[Orders handler — line 42\]\(src\/orders\.ts#L42\)/);
  assert.match(skill, /\[Orders handler — lines 42–55\]\(src\/orders\.ts#L42-L55\)/);
  assert.match(skill, /preserve frontmatter paths, `files:` values, phase headings/);
  assert.match(skill, /Never add a machine-specific absolute companion path/);
});

test("now keeps the source timestamp and slug contract", () => {
  const output = runNode(nowPath, repositoryRoot);
  assert.equal(output.includes("\n"), false);
  const [iso, slug, ...rest] = output.split("\t");
  assert.equal(rest.length, 0);
  assert.match(iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/);
  assert.equal(slug, iso.slice(0, 19).replaceAll(":", "-").replace("T", "_"));
  assert.equal(iso.endsWith("Z"), false);
  assert.doesNotMatch(iso, /[+-]\d{2}:\d{2}$/);
});

test("list-recent keeps source ordering, count, and recoverable empty behavior", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rpivc-revise-recent-"));
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

  const empty = mkdtempSync(join(tmpdir(), "rpivc-revise-empty-"));
  t.after(() => rmSync(empty, { recursive: true, force: true }));
  assert.equal(runNode(listRecentPath, empty, empty), "");
});
