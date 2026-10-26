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
import { createFixture } from "./fixtures/design-context/create-fixture.mjs";

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
    "references/creation-progress.md",
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
    "### 5. Decompose the feature and enrich the skeleton",
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

test("design separates Desktop chat, artifact, and structural links", () => {
  const skill = read(skillPath);
  assert.match(skill, /\[descriptive label — lines 42–55\]\(\/absolute\/repository\/backend\/path\/to\/file\.py:42\)/);
  assert.match(skill, /\[descriptive label — lines 42–55\]\(backend\/path\/to\/file\.py#L42-L55\)/);
  assert.match(skill, /Structural artifact fields/);
  assert.match(skill, /keep frontmatter values, filenames, `\*\*Files\*\*:` values/);
  assert.match(skill, /Never write an absolute machine path into the design/);
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

// These assertions protect prompt contracts. Behavioral recovery is exercised
// separately in design-acceptance.md with fresh native agent context.
const progressPath = join(skillRoot, "references/creation-progress.md");
const section = (text, start, end) => {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing or out-of-order section: ${start} -> ${end}`);
  return text.slice(from, to);
};

test("design creates one early document and enriches it only after decomposition approval", () => {
  const skill = read(skillPath);
  const start = section(skill, "#### Start mode", "#### No argument");
  const decomposition = section(skill, "### 5.", "### 6.");
  assert.match(start, /Read the artifact completely/);
  assert.match(start, /Create exactly one design document/);
  assert.match(start, /Architecture and Slices remain empty until decomposition approval/);
  assert.match(start, /readback|Read back/);
  assert.match(decomposition, /enrich the existing document/);
  assert.match(decomposition, /Do not create a second artifact/);
  assert.doesNotMatch(decomposition, /after approval, create exactly one/);
  assert.match(skill, /Read \[Creation progress\].*completely/);
});

test("design resumes verified roles, settled choices and exact pending questions", () => {
  const skill = read(skillPath);
  const progress = read(progressPath);
  const resume = section(skill, "#### Resume mode", "#### Start mode");
  assert.match(resume, /Read the design artifact completely/);
  assert.match(resume, /Read the parent upstream artifact completely/);
  assert.match(resume, /repeat only unfinished or invalidated work/);
  assert.match(resume, /Present an unanswered checkpoint directly/);
  assert.match(skill, /run only roles whose saved findings are unfinished or invalidated/);
  assert.match(progress, /exact question, ordered option labels and consequences/);
  assert.match(progress, /original answer, interpretation and resulting decision identifiers/);
  assert.match(progress, /Repeated resume without an answer or relevant drift/);
  assert.match(progress, /must not manufacture another approval, duplicate question history/);
});

test("saved progress never supplies summary or decomposition approval", () => {
  const skill = read(skillPath);
  const progress = read(progressPath);
  for (const step of ["input", "research", "dimensions", "decisions", "decomposition", "slices", "finalization", "complete"]) {
    assert.ok(progress.includes(`\`${step}\``), step);
  }
  assert.match(progress, /not an approval/);
  assert.match(progress, /Architecture-summary approval precedes decomposition approval/);
  assert.match(progress, /preserve the document, report the specific discrepancy/);
  assert.match(progress, /Do not guess from timestamps or the most advanced field/);
  assert.match(skill, /summary and architecture-summary checkpoint as unapproved/);
  assert.match(skill, /breakdown and decomposition checkpoint as unapproved/);
});

test("design saves coherently, reads back and stops on persistence failure", () => {
  const progress = read(progressPath);
  assert.match(progress, /Before presenting a checkpoint, write its exact question/);
  assert.match(progress, /one coherent edit updating the question record, current decisions, affected approval state/);
  assert.match(progress, /update `last_updated`.*exact timestamp/s);
  assert.match(progress, /Read back the written affected sections and metadata/);
  assert.match(progress, /If writing or readback fails, report the specific failure and stop dependent work/);
  assert.match(progress, /reconcile any partial write against the approved answer/);
});

test("early reconsideration preserves history and reopens only affected work in Design", () => {
  const skill = read(skillPath);
  const progress = read(progressPath);
  assert.match(progress, /Before decomposition approval.*stays in Design/s);
  assert.match(progress, /preserve the original answer/);
  assert.match(progress, /Reopen only affected work/);
  assert.match(progress, /A saved decision is not a revision boundary/);
  assert.match(skill, /Saving a decision does not itself trigger Revise/);
  assert.match(progress, /Changes to approved slice material or completed designs use Revise/);
});

test("source drift invalidates evidence without silently replacing developer intent", () => {
  const progress = read(progressPath);
  assert.match(progress, /Fingerprint content even when files are uncommitted/);
  assert.match(progress, /Identify which verified claims and dependent work each change invalidates/);
  assert.match(progress, /rerun only unfinished or invalidated roles/);
  assert.match(progress, /cannot silently replace a developer decision/);
  assert.match(progress, /no longer ready.*stop and resolve/s);
});

test("legacy resume requires a coherent skeleton and cannot finalize empty designs", () => {
  const skill = read(skillPath);
  const resume = section(skill, "#### Resume mode", "#### Start mode");
  const finalize = section(skill, "### 7.", "### 8.");
  assert.match(resume, /legacy documents without `workflow_step`/);
  assert.match(resume, /decomposition approval, Architecture, Slices, and Design History/);
  assert.match(resume, /Missing or contradictory legacy state, including an empty design, requires clarification/);
  assert.match(finalize, /at least one valid slice/);
  assert.match(finalize, /no pending checkpoint or revision/);
  assert.ok(finalize.indexOf("Verify every required Step 5 section") < finalize.indexOf("status: ready"));
  assert.match(finalize, /set `workflow_step: complete`/);
  const progress = read(progressPath);
  assert.match(progress, /enrich that same document with Workflow Progress before the next save/);
  assert.match(progress, /not recorded in legacy artifact/);
  assert.match(progress, /historical unknowns are not unfinished modern research roles for routing/);
  assert.match(progress, /without inventing historical findings/);
});

test("interrupted slice recovery preserves verification and revision precedence", () => {
  const skill = read(skillPath);
  const resume = section(skill, "#### Resume mode", "#### Start mode");
  assert.match(resume, /Pending revision work takes precedence/);
  assert.match(resume, /unapproved slice must be regenerated and independently verified/);
  assert.match(skill, /keep proposed implementation code and verification criteria out of the artifact until approval/);
  assert.match(read(progressPath), /excluding code blocks, diffs, and criteria/);
  assert.match(skill, /Stop after persisting and byte-checking any approved non-final slice/);
});

test("context fixture exposes late constraints and materially different tool representations", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "rpivc-design-context-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  createFixture(directory);
  const source = read(join(directory, "src/inspection.js")).trimEnd().split("\n");
  assert.ok(source.length > 700);
  assert.match(source.at(-1), /requestBody.*transportCredentials/);
  const upstream = read(join(directory, ".rpiv/artifacts/research/input.md"));
  assert.match(upstream, /status: ready/);
  assert.match(upstream, /## Code References[\s\S]*src\/inspection\.js/);
  assert.match(upstream, /## Developer Context[\s\S]*inherited decision/);
  assert.match(upstream, /cancellable by the caller/);
  assert.match(upstream.trimEnd().split("\n").at(-1), /do not log request bodies/);
  const envelope = (name) => JSON.parse(read(join(directory, `synthetic-tool-results/${name}.json`)));
  const duplicate = envelope("duplicate");
  assert.deepEqual(JSON.parse(duplicate.content[0].text), duplicate.structuredContent);
  assert.match(duplicate.content[1].text, /text-only warning/);
  assert.ok(duplicate.structuredContent.nextCursor);
  assert.ok(duplicate._meta.provenance);
  const distinct = envelope("distinct");
  assert.match(distinct.content[0].text, /ownership remains unresolved/);
  assert.equal(distinct.structuredContent.configuration, "config/retry.json");
  assert.equal(distinct.structuredContent.hasMore, true);
  assert.ok(distinct.structuredContent.nextCursor);
  assert.ok(distinct._meta.provenance);
  const error = envelope("error");
  assert.equal(error.isError, true);
  assert.equal(error.structuredContent.error.code, "SOURCE_UNAVAILABLE");
  assert.ok(error.structuredContent.nextCursor);
  const truncated = envelope("truncated");
  assert.equal(truncated.structuredContent.truncated, true);
  assert.deepEqual(truncated.structuredContent.coveredLines, [1, 80]);
  assert.equal(truncated.structuredContent.nextLine, 81);
});

test("input creates durable progress before source reads and resumes before research", () => {
  const skill = read(skillPath);
  const start = section(skill, "#### Start mode", "#### No argument");
  const resume = section(skill, "#### Resume mode", "#### Start mode");
  assert.ok(start.indexOf("Read the artifact completely") < start.indexOf("Create exactly one design document"));
  assert.ok(start.indexOf("Create exactly one design document") < start.indexOf("Read every key source file"));
  assert.match(start, /workflow_step: input/);
  assert.match(start, /before.*(?:source|full|complete).*read/i);
  assert.match(resume, /(?:input queue|`input`)/);
  assert.match(resume, /input.*before entering research/is);
  // Existing role and approval tests remain in force: input handling is not an
  // extra preliminary reader role or permission to skip complete source reads.
  assert.match(skill, /(?:no|do not add|do not create).*preliminary.*(?:reader|role)/i);
});

test("input evidence persists coverage and verifies fingerprints before reuse", () => {
  const progress = read(progressPath);
  const input = section(progress, "## Input evidence and complete reads", "## Save protocol");
  const queueRecord = progress.split("\n").find((line) => line.startsWith("- **Input evidence:**"));
  assert.ok(queueRecord);
  for (const field of [/(?:path|identifier)/i, /fingerprint/i, /revision/i, /(?:line ranges|ranges)/i, /complete/, /partial/, /invalidated/, /findings/i, /gaps/i, /next action/i]) {
    assert.match(queueRecord, field);
  }
  assert.match(input, /(?:chunk|bounded).*save|save.*(?:chunk|bounded)/is);
  assert.match(input, /read.?back/i);
  assert.match(input, /(?:verify|verified|matching).*fingerprint/is);
  assert.match(input, /(?:unchanged|matching).*partial/is);
  assert.match(input, /(?:changed|mismatch).*invalidat/is);
  assert.match(input, /(?:missing|ambiguous).*(?:redo|reread|read again|repeat)/is);
  assert.match(input, /temporary execution storage.*never a baseline/is);
  assert.match(input, /cold resume/i);
  assert.match(input, /complete only when all ranges or sections.*inspected/is);
});

test("bounded tool output preserves evidence and recovers truncation", () => {
  const skill = read(skillPath);
  const bounded = section(skill, "## Bounded evidence handling", "## Workflow");
  for (const concept of [/outer/i, /inner/i, /4[,.]?000/, /error/i, /nested errors/i, /provenance/i, /pagination|cursor/i, /distinct text and structured evidence/i, /truncat/i, /incomplete/i, /recover the missing range/i]) {
    assert.match(bounded, concept);
  }
  assert.match(bounded, /Budget each inner command.*combined outer orchestration output/is);
  assert.match(bounded, /Never assume `structuredContent` alone is complete/);
  assert.match(bounded, /field names and bounded sections/);
  assert.match(bounded, /(?:store|persist|save).*(?:finding|evidence|result)/is);
});

test("resume searches for relevant additions beyond the saved fingerprint list", () => {
  const drift = section(read(progressPath), "## Relevant source drift", "## Reconsideration during creation");
  assert.match(drift, /(?:new|added).*caller/is);
  assert.match(drift, /config/i);
  assert.match(drift, /(?:bounded|targeted).*search|search.*(?:bounded|targeted)/is);
  assert.match(drift, /(?:known|saved|previous).*(?:path|file).*(?:not|insufficient)|(?:not|insufficient).*(?:known|saved|previous).*(?:path|file)/is);
});
