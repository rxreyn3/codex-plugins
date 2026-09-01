import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = join(repositoryRoot, "plugins/rpiv-codex/skills/rpivc-blueprint");
const skillPath = join(skillRoot, "SKILL.md");
const nowPath = join(skillRoot, "scripts/now.mjs");
const gitContextPath = join(skillRoot, "scripts/git-context.mjs");
const listRecentPath = join(skillRoot, "scripts/list-recent.mjs");
const sliceOverlapPath = join(skillRoot, "scripts/slice-overlap.mjs");

const read = (path) => readFileSync(path, "utf8");
const runNode = (path, cwd, ...args) =>
  execFileSync(process.execPath, [path, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
const gitIn = (cwd, ...args) =>
  execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"] });

test("blueprint includes exactly its reachable helper and role dependencies", () => {
  for (const path of [
    "references/codebase-pattern-finder.md",
    "references/codebase-analyzer.md",
    "references/integration-scanner.md",
    "references/precedent-locator.md",
    "references/web-search-researcher.md",
    "references/slice-verifier.md",
    "references/artifact-code-reviewer.md",
    "references/artifact-coverage-reviewer.md",
    "scripts/now.mjs",
    "scripts/git-context.mjs",
    "scripts/list-recent.mjs",
    "scripts/slice-overlap.mjs",
  ]) {
    assert.ok(existsSync(join(skillRoot, path)), path);
  }
});

test("blueprint keeps the load-bearing workflow order and successor stop", () => {
  const skill = read(skillPath);
  const headings = [
    "### 1. Handle input",
    "### 2. Run targeted research",
    "### 3. Sweep architectural dimensions",
    "### 4. Run the developer checkpoint",
    "### 5. Decompose the feature and create the skeleton",
    "### 6. Generate, verify, and checkpoint each slice",
    "### 7. Finalize the plan",
    "### 8. Run independent review",
    "### 9. Triage findings and mark ready",
    "### 10. Handle follow-ups",
  ];
  for (let index = 1; index < headings.length; index += 1) {
    assert.ok(skill.indexOf(headings[index - 1]) < skill.indexOf(headings[index]));
  }
  assert.match(skill, /successor name is a handoff, not permission/i);
  assert.match(skill, /Never edit product source/i);
});

test("blueprint preserves the downstream plan artifact contract", () => {
  const skill = read(skillPath);
  for (const field of [
    "status: in-progress",
    "phase_count:",
    "phases:",
    "unresolved_phase_count:",
    "last_updated:",
  ]) {
    assert.ok(skill.includes(field), field);
  }
  for (const heading of [
    "## Overview",
    "## Requirements",
    "## Current State Analysis",
    "## Desired End State",
    "## What We're NOT Doing",
    "## Decisions",
    "## Phase N: {slice name}",
    "## Ordering Constraints",
    "## Verification Notes",
    "## Performance Considerations",
    "## Migration Notes",
    "## Pattern References",
    "## Developer Context",
    "## Plan History",
    "## References",
  ]) {
    assert.ok(skill.includes(heading), heading);
  }
  assert.match(skill, /status: in-progress` to `status: in-review/);
  assert.match(skill, /status: in-review` to `status: ready/);
});

test("blueprint preserves no-argument selection and per-phase approval boundaries", () => {
  const skill = read(skillPath);
  assert.match(skill, /If both are empty, ask for a free-text feature description/);
  assert.match(skill, /If exactly one file exists/);
  assert.match(skill, /offer up to four newest entries/);
  assert.match(skill, /Verify and checkpoint every phase separately/);
  assert.match(skill, /approval is the only event that writes its code and criteria/);
});

test("blueprint checkpoint options explain their consequences in plain language", () => {
  const skill = read(skillPath);
  assert.match(skill, /render each option as both a short label and a plain-language description/);
  assert.match(skill, /what choosing the option causes the plan to do/);
  assert.match(skill, /what existing ownership, behavior, or scope remains unchanged/);
  assert.match(skill, /material scope, cost, or trade-off/);
  assert.match(skill, /Do not present bare labels/);
  assert.match(skill, /two to four finite authored options/);
  assert.match(skill, /Offer both options with concrete consequences/);
  assert.match(skill, /offer up to four newest entries/);
  assert.match(skill, /lettered prose choice format, permit another written answer/);
  assert.match(skill, /lettered prose choice format without a custom-answer suffix/);
});

test("blueprint asks one question at a time and uses present-tense triage actions", () => {
  const skill = read(skillPath);
  assert.match(skill, /Ask exactly one developer question per response/);
  assert.match(skill, /Present exactly one unresolved row per response/);
  assert.match(skill, /`Apply`/);
  assert.match(skill, /`Defer`/);
  assert.match(skill, /`Dismiss`/);
  assert.doesNotMatch(skill, /Batch up to four independent concerns or suggestions/);
  assert.doesNotMatch(skill, /Independent questions may be batched/);
});

test("blueprint emits relative Markdown links and preserves structural paths", () => {
  const skill = read(skillPath);
  const reviewer = read(join(skillRoot, "references/artifact-code-reviewer.md"));
  assert.match(skill, /\[descriptive label — line 42\]\(backend\/path\/to\/file\.py#L42\)/);
  assert.match(skill, /\[descriptive label — lines 42–55\]\(backend\/path\/to\/file\.py#L42-L55\)/);
  assert.match(skill, /keep `#### N\. path`, `\*\*File\*\*: path`/);
  assert.match(reviewer, /\[path\/to\/orders\.ts:55\]\(path\/to\/orders\.ts#L55\)/);
});

test("blueprint metadata helpers report the caller repository", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rpivc-blueprint-git-context-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  gitIn(directory, "init", "--initial-branch=main", "-q");
  gitIn(directory, "config", "user.email", "test@example.com");
  gitIn(directory, "config", "user.name", "Test User");
  gitIn(directory, "config", "commit.gpgsign", "false");
  writeFileSync(join(directory, "fixture.txt"), "fixture\n");
  gitIn(directory, "add", "fixture.txt");
  gitIn(directory, "commit", "-m", "fixture", "-q");

  const now = runNode(nowPath, directory);
  assert.equal(now.includes("\n"), false);
  const [iso, slug, ...rest] = now.split("\t");
  assert.equal(rest.length, 0);
  assert.match(iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/);
  assert.equal(slug, iso.slice(0, 19).replaceAll(":", "-").replace("T", "_"));

  const context = runNode(gitContextPath, directory);
  const realDirectory = realpathSync(directory);
  assert.match(context, /^branch: main$/m);
  assert.match(context, /^commit: [0-9a-f]{7,}$/m);
  assert.match(context, new RegExp(`^repo: ${basename(realDirectory)}$`, "m"));
  assert.ok(context.includes(`root: ${realDirectory}\n`));
  assert.match(context, /^author: Test User$/m);
});

test("list-recent keeps newest-first order, cap, and missing-directory fallback", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rpivc-blueprint-recent-"));
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
});

test("slice-overlap conservatively keeps shared files and symbols", async () => {
  const { partition } = await import(pathToFileURL(sliceOverlapPath));
  const artifact = `
## Phase 1: Foundation
#### 1. src/shared.ts
**File**: src/shared.ts
\`\`\`ts
export const loadJsonConfig = () => true;
\`\`\`
## Phase 2: Independent
#### 1. src/other.ts
**File**: src/other.ts
\`\`\`ts
export const unrelatedValue = 1;
\`\`\`
## Phase 3: Consumer
#### 1. src/consumer.ts
**File**: src/consumer.ts
\`\`\`ts
loadJsonConfig();
\`\`\`
## Phase 4: Shared file
#### 1. src/shared.ts
**File**: src/shared.ts
\`\`\`ts
export const anotherValue = 2;
\`\`\`
`;

  const phase3 = partition(artifact, "Phase 3");
  assert.deepEqual(phase3.overlapping, ["Phase 1"]);
  assert.deepEqual(phase3.collapsed, ["Phase 2"]);

  const phase4 = partition(artifact, "Phase 4");
  assert.ok(phase4.overlapping.includes("Phase 1"));
});
