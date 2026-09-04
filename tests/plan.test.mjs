import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
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
const skillRoot = join(repositoryRoot, "plugins/rpiv-codex/skills/rpivc-plan");
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

test("plan includes exactly its reachable helper and reviewer dependencies", () => {
  for (const path of [
    "references/artifact-code-reviewer.md",
    "references/artifact-coverage-reviewer.md",
    "scripts/now.mjs",
    "scripts/git-context.mjs",
  ]) {
    assert.ok(existsSync(join(skillRoot, path)), path);
  }
});

test("plan keeps the source workflow order and product-code boundary", () => {
  const skill = read(skillPath);
  const headings = [
    "### 1. Validate and read the design",
    "### 2. Inherit phase boundaries",
    "### 3. Write the plan incrementally",
    "### 4. Run independent Plan review",
    "### 5. Triage findings and mark ready",
    "### 6. Handle follow-ups",
  ];
  for (let index = 1; index < headings.length; index += 1) {
    assert.ok(skill.indexOf(headings[index - 1]) < skill.indexOf(headings[index]));
  }
  assert.match(skill, /writes only its plan artifact/i);
  assert.match(skill, /Never edit product source/i);
  assert.match(skill, /Never invoke Implement automatically/);
});

test("plan accepts only one ready design and rejects incomplete inputs", () => {
  const skill = read(skillPath);
  assert.match(skill, /path under `\.rpiv\/artifacts\/designs\/`/);
  assert.match(skill, /frontmatter `status: ready`/);
  assert.match(skill, /read it completely/i);
  assert.match(skill, /unresolved questions or its `## Slices` section is missing or empty/);
  assert.match(skill, /Plan has no standalone mode/);
  assert.match(skill, /report the exact problem and stop/);
});

test("plan preserves the one-to-one design slice contract", () => {
  const skill = read(skillPath);
  assert.match(skill, /Slice is phase, one-to-one/);
  assert.match(skill, /Never merge, split, reorder, reauthor, or re-derive them/);
  assert.match(skill, /Success Criteria.*byte-for-byte unchanged/s);
  assert.match(skill, /code comes only from the matching design Architecture entries/);
  assert.match(skill, /route it back to Design/);
});

test("plan preserves the downstream artifact schema", () => {
  const skill = read(skillPath);
  for (const field of [
    "date: <iso>",
    "author: <author>",
    "commit: <commit>",
    "branch: <branch>",
    "repository: <repo>",
    "status: in-progress",
    "parent: <plain design artifact path>",
    "phase_count: <number of Phase headings>",
    "last_updated: <same iso>",
    "last_updated_by: <author>",
  ]) {
    assert.ok(skill.includes(field), field);
  }
  for (const heading of [
    "## Overview",
    "## Desired End State",
    "## What We're NOT Doing",
    "## Phase N: {slice name}",
    "## Testing Strategy",
    "## Performance Considerations",
    "## Migration Notes",
    "## Developer Context",
    "## References",
  ]) {
    assert.ok(skill.includes(heading), heading);
  }
  assert.match(skill, /files: \[<plain repository-relative paths>\]/);
  assert.match(skill, /depends_on/);
});

test("plan requires parallel semantically isolated reviewers and persists failures", () => {
  const skill = read(skillPath);
  assert.match(skill, /dispatch both native collaboration agents concurrently/);
  assert.match(skill, /Both roles require semantic isolation/);
  assert.match(skill, /If native collaboration agents are unavailable, stop/);
  assert.match(skill, /artifact still `in-review`/);
  assert.match(skill, /If one dispatched reviewer errors, persist the successful side/);
  assert.match(skill, /_No findings — both reviewers cleared the artifact\._/);
  assert.match(skill, /Never invent a finding/);
});

test("plan coverage review excludes operational guidance without suppressing runtime constraints", () => {
  const skill = read(skillPath);
  const reviewer = read(
    join(skillRoot, "references/artifact-coverage-reviewer.md"),
  );

  assert.match(reviewer, /Classify each candidate entry by ownership/);
  assert.match(reviewer, /operational-guidance/);
  assert.match(
    reviewer,
    /Do not run frontend TypeScript type checking unless Ryan explicitly asks/,
  );
  assert.match(
    reviewer,
    /Do not prefetch or retry because each call persists linked backend records/,
  );
  assert.match(reviewer, /Do not use imperative grammar alone/);
  assert.match(skill, /A row targeting purely operational guidance/);
  assert.match(skill, /Do not exclude product or runtime prohibitions/);
});

test("plan preserves developer-owned one-at-a-time triage", () => {
  const skill = read(skillPath);
  assert.match(skill, /Do not auto-apply any finding/);
  assert.match(skill, /present exactly one unresolved row per response/);
  assert.match(skill, /`Apply` —/);
  assert.match(skill, /`Defer` —/);
  assert.match(skill, /`Dismiss` —/);
  assert.match(skill, /A\. Apply/);
  assert.match(skill, /B\. Defer/);
  assert.match(skill, /C\. Dismiss/);
  assert.match(skill, /After every finding has a resolution, rebuild `phase_count` and `phases:`/);
  assert.match(skill, /`status: in-review` to `status: ready`/);
});

test("plan emits relative Markdown evidence and preserves structural paths", () => {
  const skill = read(skillPath);
  assert.match(skill, /\[Orders handler — line 42\]\(src\/orders\.ts#L42\)/);
  assert.match(skill, /\[Orders handler — lines 42–55\]\(src\/orders\.ts#L42-L55\)/);
  assert.match(skill, /Structural plan fields/);
  assert.match(skill, /keep frontmatter values, `files:` entries/);
  assert.match(skill, /Never add a machine-specific absolute companion path/);
});

test("plan hands a ready artifact to Implement without invoking it", () => {
  const skill = read(skillPath);
  assert.ok(
    skill.includes(
      "Recommended next step: **Implement**\n\n```text\n.rpiv/artifacts/plans/{filename}.md Phase 1\n```",
    ),
  );
  assert.match(skill, /A recommendation is a handoff, never permission to invoke/);
});

test("plan metadata helpers report the caller repository", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rpivc-plan-git-context-"));
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
