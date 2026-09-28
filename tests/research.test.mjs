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
const skillRoot = join(repositoryRoot, "plugins/rpiv-codex/skills/rpivc-research");
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

test("research includes exactly its reachable role and artifact dependencies", () => {
  for (const path of [
    "references/scope-tracer.md",
    "references/codebase-analyzer.md",
    "references/web-search-researcher.md",
    "references/precedent-locator.md",
    "references/codebase-locator.md",
    "references/research-template.md",
    "scripts/now.mjs",
    "scripts/git-context.mjs",
  ]) {
    assert.ok(existsSync(join(skillRoot, path)), path);
  }
});

test("research keeps the load-bearing stage order and stop boundary", () => {
  const skill = read(skillPath);
  const headings = [
    "### 1. Formulate the research questions",
    "### 2. Dispatch the analysis roles",
    "### 3. Synthesize and checkpoint",
    "### 4. Write the research document",
    "### 5. Present the handoff and stop",
  ];
  for (let index = 1; index < headings.length; index += 1) {
    assert.ok(skill.indexOf(headings[index - 1]) < skill.indexOf(headings[index]));
  }
  assert.match(skill, /\.rpiv\/artifacts\/research\//);
  assert.match(skill, /successor names are handoffs, not permission/i);
});

test("research narrates progress at the four upstream workflow boundaries", () => {
  const skill = read(skillPath);
  const questions = skill.indexOf("Research questions ready:");
  const scoped = skill.indexOf("[Scoped]:");
  const started = skill.indexOf("Starting {N} analysis roles");
  const complete = skill.indexOf("Analysis complete:");
  const synthesize = skill.indexOf("Synthesizing {N} role reports");
  const compile = skill.indexOf("- Match each response to the question or questions it answered.");

  assert.ok(questions > skill.indexOf("### 1. Formulate the research questions"));
  assert.ok(questions < scoped);
  assert.ok(started > skill.indexOf("### 2. Dispatch the analysis roles"));
  assert.ok(complete > started);
  assert.ok(synthesize > complete);
  assert.ok(synthesize < compile);
  assert.match(skill, /progress updates are commentary only/i);
  assert.match(skill, /never name the artifact path in commentary before the write completes/i);

  for (const marker of [
    "Research questions ready:",
    "Starting {N} analysis roles",
    "Analysis complete:",
    "Synthesizing {N} role reports",
  ]) {
    const line = skill.split("\n").find((candidate) => candidate.includes(marker));
    assert.ok(line, marker);
    assert.doesNotMatch(line, /\.rpiv\/artifacts\//);
  }
});

test("research records its upstream review and retains strict citation verification", () => {
  const skill = read(skillPath);
  assert.match(
    skill,
    /Original upstream baseline: 7bf83f7a15c6611bdc114e2da85c32bfc8feb7b7\./,
  );
  assert.match(
    skill,
    /Reviewed through RPIV-Pi commit d74b1c99830a565f3df3f37e0a36616d17ffc574; selected Codex differences remain\./,
  );
  assert.match(skill, /Verify every emitted `file:line` or `file:start-end`/);
  assert.doesNotMatch(skill, /No separate verification pass/i);
});

test("research metadata commands separate the newline-free timestamp from Git context", () => {
  const skill = read(skillPath);
  const nowCommand = "node <research-skill-root>/scripts/now.mjs";
  const separator = "\necho\n";
  const gitCommand = "node <research-skill-root>/scripts/git-context.mjs";
  assert.ok(skill.indexOf(nowCommand) < skill.indexOf(separator, skill.indexOf(nowCommand)));
  assert.ok(skill.indexOf(separator, skill.indexOf(nowCommand)) < skill.indexOf(gitCommand));
});

test("the research template preserves downstream artifact compatibility", () => {
  const template = read(join(skillRoot, "references/research-template.md"));
  assert.match(template, /^---[\s\S]*status: ready[\s\S]*---/);
  for (const heading of [
    "## Research Question",
    "## Summary",
    "## Detailed Findings",
    "## Code References",
    "## Integration Points",
    "### Inbound References",
    "### Outbound Dependencies",
    "### Infrastructure Wiring",
    "## Architecture Insights",
    "## Precedents & Lessons",
    "## Historical Context (from `.rpiv/artifacts/`)",
    "## Developer Context",
    "## Related Research",
    "## Open Questions",
  ]) {
    assert.ok(template.includes(heading), heading);
  }
  assert.match(template, /\[path\/to\/file\.py:NN\]\(path\/to\/file\.py#LNN\)/);
  assert.match(template, /\[another\/file\.ts:NN–MM\]\(another\/file\.ts#LNN-LMM\)/);
});

test("research asks one developer question and separates chat from artifact links", () => {
  const skill = read(skillPath);
  assert.match(skill, /Ask exactly one developer question per response/);
  assert.doesNotMatch(skill, /independent questions may share one structured-input call/i);
  assert.match(skill, /\[descriptive label — lines 42–55\]\(\/absolute\/repository\/backend\/path\/to\/file\.py:42\)/);
  assert.match(skill, /\[descriptive label — lines 42–55\]\(backend\/path\/to\/file\.py#L42-L55\)/);
  assert.match(skill, /Never write an absolute machine path into the artifact/);
  assert.match(skill, /Use the Choice response format with the recommended evidence-based option first, permit another written answer/);
  assert.match(skill, /Use the Choice response format without a custom-answer suffix/);
});

test("research keeps the bounded workflow when agents or live code are unavailable", () => {
  const skill = read(skillPath);
  const scopeTracer = read(join(skillRoot, "references/scope-tracer.md"));

  assert.match(skill, /execute that complete role prompt inline/i);
  assert.match(skill, /execute each analysis task sequentially inline/i);
  assert.doesNotMatch(skill, /required scope-tracer boundary cannot be preserved and stop/i);
  assert.match(skill, /greenfield or external-only mode/i);
  assert.match(skill, /direct primary-source link with a version or date boundary/i);

  assert.match(scopeTracer, /## Greenfield or external-only method/);
  assert.match(scopeTracer, /three to six narrow external-contract slices/i);
  assert.match(scopeTracer, /Never invent a repository file, symbol, integration point, or `file:line` citation/i);
});

test("research now.mjs preserves the upstream timestamp contract", () => {
  const output = runNode(nowPath, repositoryRoot);
  assert.equal(output.includes("\n"), false);
  const [iso, slug, ...rest] = output.split("\t");
  assert.equal(rest.length, 0);
  assert.match(iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/);
  assert.equal(slug, iso.slice(0, 19).replaceAll(":", "-").replace("T", "_"));
});

test("research git-context.mjs reports the caller repository", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rpivc-research-git-context-"));
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

test("research git-context.mjs falls back outside a repository", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rpivc-research-no-repository-"));
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
