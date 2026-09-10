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
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = join(repositoryRoot, "plugins/rpiv-codex/skills/rpivc-design");
const skillPath = join(skillRoot, "SKILL.md");
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
const gitIn = (cwd, ...args) =>
  execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"] });

test("design includes exactly its reachable helper and role dependencies", () => {
  for (const path of [
    "references/codebase-pattern-finder.md",
    "references/codebase-analyzer.md",
    "references/integration-scanner.md",
    "references/precedent-locator.md",
    "references/web-search-researcher.md",
    "references/slice-verifier.md",
    "scripts/now.mjs",
    "scripts/git-context.mjs",
    "scripts/list-recent.mjs",
  ]) {
    assert.ok(existsSync(join(skillRoot, path)), path);
  }
});

test("design keeps the source workflow order and product-code boundary", () => {
  const skill = read(skillPath);
  const headings = [
    "### 1. Handle input",
    "### 2. Run targeted research",
    "### 3. Sweep architectural dimensions",
    "### 4. Run the developer checkpoint",
    "### 5. Decompose the feature and create the skeleton",
    "### 6. Generate, verify, and checkpoint one slice",
    "### 7. Finalize the design",
    "### 8. Present the design artifact",
    "### 9. Handle follow-ups",
  ];
  for (let index = 1; index < headings.length; index += 1) {
    assert.ok(skill.indexOf(headings[index - 1]) < skill.indexOf(headings[index]));
  }
  assert.match(skill, /writes only its design artifact/i);
  assert.match(skill, /Never edit product source/i);
  assert.match(skill, /Never invoke Plan, implementation/);
});

test("design preserves start, recent-selection, and resumable input modes", () => {
  const skill = read(skillPath);
  assert.match(skill, /Start.*\.rpiv\/artifacts\/research\//s);
  assert.match(skill, /\.rpiv\/artifacts\/solutions\//);
  assert.match(skill, /Resume.*--resume <path>/s);
  assert.match(skill, /status: in-progress/);
  assert.match(skill, /first Design History entry still marked `pending`/);
  assert.match(skill, /artifact, not conversation memory or a task summary, is authoritative/);
  assert.match(skill, /If both are empty, explain that Design requires upstream evidence/);
  assert.match(skill, /If exactly one file exists/);
  assert.match(skill, /offer up to four newest entries/);
  assert.match(skill, /no standalone free-text mode/i);
});

test("design transfers authority to the first ready plan", () => {
  const skill = read(skillPath);
  assert.match(skill, /until its initial implementation plan first reaches `status: ready`/);
  assert.match(skill, /design becomes immutable provenance/);
  assert.match(skill, /initial `in-progress` or `in-review` plan that has never reached ready/);
  assert.match(skill, /route the feedback to that plan and leave the design byte-identical/);
});

test("design preserves the downstream artifact contract", () => {
  const skill = read(skillPath);
  for (const field of [
    "date: <iso>",
    "author: <author>",
    "commit: <commit>",
    "branch: <branch>",
    "repository: <repo>",
    "topic: <topic>",
    "status: in-progress",
    "parent: <upstream artifact path>",
    "last_updated: <iso>",
    "last_updated_by: <author>",
  ]) {
    assert.ok(skill.includes(field), field);
  }
  for (const heading of [
    "## Summary",
    "## Requirements",
    "## Current State Analysis",
    "## Scope",
    "## Decisions",
    "## Architecture",
    "## Slices",
    "## Desired End State",
    "## File Map",
    "## Ordering Constraints",
    "## Verification Notes",
    "## Performance Considerations",
    "## Migration Notes",
    "## Pattern References",
    "## Developer Context",
    "## Design History",
    "## References",
  ]) {
    assert.ok(skill.includes(heading), heading);
  }
  assert.match(skill, /status: in-progress` to `status: ready/);
  assert.match(skill, /has no `in-review` state/);
  assert.match(skill, /each `### Slice N: \{name\}` becomes `## Phase N: \{name\}` one-to-one/);
  assert.match(skill, /Automated and Manual Verification bullets pass through unchanged/);
});

test("design preserves research roles and classifies collaboration fallbacks", () => {
  const skill = read(skillPath);
  for (const role of [
    "Codebase Pattern Finder",
    "Codebase Analyzer",
    "Integration Scanner",
    "Precedent Locator",
    "Web Search Researcher",
  ]) {
    assert.ok(skill.includes(role), role);
  }
  assert.match(skill, /separation is organizational rather than a trust boundary/);
  assert.match(skill, /run the same research roles inline, one at a time/);
  assert.match(skill, /Slice Verifier is a semantic-isolation dependency/);
  assert.match(skill, /do not simulate approval inline/);
});

test("design preserves per-slice approval, persistence, and fresh-task boundaries", () => {
  const skill = read(skillPath);
  assert.match(skill, /Generate, independently verify, and checkpoint exactly one slice at a time/);
  assert.match(skill, /Approval is the only event that writes slice code and Success Criteria/);
  assert.match(skill, /verify they byte-match the approved payload/);
  assert.match(skill, /stop the task immediately after that byte check/);
  assert.match(skill, /--resume \.rpiv\/artifacts\/designs\/\{filename\}\.md/);
  assert.match(skill, /Recommended next step: \*\*Plan\*\*/);
  assert.match(skill, /Never invoke or port it automatically/);
});

test("design emits relative Markdown evidence and preserves structural paths", () => {
  const skill = read(skillPath);
  assert.match(skill, /\[descriptive label — line 42\]\(backend\/path\/to\/file\.py#L42\)/);
  assert.match(skill, /\[descriptive label — lines 42–55\]\(backend\/path\/to\/file\.py#L42-L55\)/);
  assert.match(skill, /Structural artifact fields/);
  assert.match(skill, /keep frontmatter values, filenames, `\*\*Files\*\*:` values/);
  assert.match(skill, /never add a machine-specific absolute companion link/);
});

test("design metadata helpers report the caller repository", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rpivc-design-git-context-"));
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

test("design list-recent keeps source ordering, cap, and empty fallback", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rpivc-design-recent-"));
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
