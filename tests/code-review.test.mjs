import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = join(repositoryRoot, "plugins/rpiv-codex/skills/rpivc-code-review");
const skillPath = join(skillRoot, "SKILL.md");
const helperPath = join(skillRoot, "scripts/review-range.mjs");
const read = (path) => readFileSync(path, "utf8");

const git = (cwd, ...args) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const write = (root, path, contents = "export const value = true;\n") => {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, contents);
};
const createRepo = (t) => {
  const root = mkdtempSync(join(tmpdir(), "rpivc-code-review-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, "init", "--initial-branch=main", "-q");
  return root;
};
const runHelper = (cwd, scope) =>
  execFileSync(process.execPath, [helperPath, scope], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
const valueFor = (output, key) => {
  const prefix = `${key}:`;
  return output.split(/\r?\n/).find((line) => line.startsWith(prefix))?.slice(prefix.length).trim() ?? "";
};
const changedFiles = (output) =>
  (output.split("---changed-files---")[1] ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

test("code review bundles exactly its reachable runtime and role dependencies", () => {
  for (const path of [
    "SKILL.md",
    "agents/openai.yaml",
    "scripts/now.mjs",
    "scripts/git-context.mjs",
    "scripts/review-range.mjs",
    "templates/review.md",
    "references/integration-scanner.md",
    "references/precedent-locator.md",
    "references/codebase-analyzer.md",
    "references/web-search-researcher.md",
    "references/peer-comparator.md",
    "references/diff-auditor.md",
    "references/claim-verifier.md",
  ]) {
    assert.ok(existsSync(join(skillRoot, path)), path);
  }
});

test("code review preserves the source wave, reconciliation, verification, artifact, and stop order", () => {
  const skill = read(skillPath);
  const headings = [
    "### Step 1: Resolve Scope and Assemble the Diff",
    "### Step 2: Dispatch Wave-1",
    "### Step 3: Dispatch Wave-2",
    "### Step 4: Dispatch Wave-3",
    "### Step 5: Reconcile Findings",
    "### Step 6: Verify Findings",
    "### Step 7: Write the Review Document",
    "### Step 8: Present Summary",
    "### Step 9: Handle Follow-ups",
  ];
  for (let index = 1; index < headings.length; index += 1) {
    assert.ok(skill.indexOf(headings[index - 1]) < skill.indexOf(headings[index]));
  }
  assert.match(skill, /quality and security lenses must judge independently/i);
  assert.match(skill, /claim verifier must independently ground/i);
  assert.match(skill, /If they are unavailable, report that independent review cannot be preserved and stop/);
  assert.match(skill, /Precedents is a hard gate/i);
  assert.match(skill, /Do not skip this step/i);
  assert.match(skill, /successor name is a handoff, not permission/i);
  assert.match(skill, /never edits reviewed source, invokes a successor, commits, pushes, publishes/i);
});

test("code review excludes reviewed commits from precedent evidence", () => {
  const skill = read(skillPath);
  const reconciliation = skill.slice(
    skill.indexOf("### Step 5: Reconcile Findings"),
    skill.indexOf("### Step 6: Verify Findings"),
  );

  assert.match(skill, /`ReviewedCommits` — commit hashes that belong to the review itself/);
  assert.match(skill, /Input it needs: `ChangedFiles` plus `ReviewedCommits`/);
  assert.match(skill, /Exclude every hash in ReviewedCommits/);
  assert.match(reconciliation, /drop every returned precedent whose hash is in `ReviewedCommits`/);
  assert.match(reconciliation, /cannot appear in `## Precedents`/);
  assert.match(reconciliation, /If no independent precedents remain, treat Precedents as empty/);
});

test("code review preserves artifact structure and adapts human-facing links", () => {
  const skill = read(skillPath);
  const template = read(join(skillRoot, "templates/review.md"));
  for (const field of ["status: ready", "blockers_count:", "severity:", "verification:"]) {
    assert.ok(template.includes(field), field);
  }
  assert.match(skill, /\[Orders handler — line 42\]\(src\/orders\.ts#L42\)/);
  assert.match(skill, /\[Orders handler — lines 42–55\]\(src\/orders\.ts#L42-L55\)/);
  assert.match(skill, /keep frontmatter values, filenames, finding identifiers, commit hashes, `scope`/);
  assert.match(template, /\[\{descriptive label — line N\}\]\(\{repository-relative-path\}#LN\)/);
  assert.match(skill, /Recommended next step: \*\*Blueprint\*\*/);
  assert.match(skill, /\[Review artifact\]\(\.rpiv\/artifacts\/reviews\/\{filename\}\.md\)/);
});

test("review-range resolves folder scopes to tracked files including staged-only files", (t) => {
  const repo = createRepo(t);
  git(repo, "config", "user.email", "test@example.com");
  git(repo, "config", "user.name", "Test User");
  git(repo, "config", "commit.gpgsign", "false");
  write(repo, "src/committed.ts");
  git(repo, "add", "src/committed.ts");
  git(repo, "commit", "-m", "init", "-q");
  write(repo, "src/staged-only.ts");
  write(repo, "src/untracked.ts");
  git(repo, "add", "src/staged-only.ts");

  const output = runHelper(repo, "--folder src");
  assert.equal(valueFor(output, "strategy"), "tree");
  assert.equal(valueFor(output, "tree_path"), "src");
  assert.match(valueFor(output, "null_tree"), /^[0-9a-f]{40,64}$/);
  assert.deepEqual(changedFiles(output), ["src/committed.ts", "src/staged-only.ts"]);
});

test("review-range keeps file paths, aliases, and first-seen order", (t) => {
  const repo = createRepo(t);
  write(repo, "src/name with spaces.ts");
  write(repo, "src/other.ts");
  git(repo, "add", "src/name with spaces.ts", "src/other.ts");

  const spaced = runHelper(repo, "--file src/name with spaces.ts");
  assert.equal(valueFor(spaced, "files_list"), "src/name with spaces.ts");
  const equals = runHelper(repo, "--file=src/other.ts");
  assert.deepEqual(changedFiles(equals), ["src/other.ts"]);
  const deduped = runHelper(repo, "--file src/other.ts,src/name with spaces.ts,src/other.ts");
  assert.deepEqual(changedFiles(deduped), ["src/other.ts", "src/name with spaces.ts"]);
  const folderAlias = runHelper(repo, "folder:src");
  assert.equal(valueFor(folderAlias, "tree_path"), "src");
  const fileAlias = runHelper(repo, "file:src/other.ts");
  assert.equal(valueFor(fileAlias, "files_list"), "src/other.ts");
});

test("review-range rejects missing, empty, and non-file scopes without narrowing", (t) => {
  const repo = createRepo(t);
  write(repo, "src/a.ts");
  write(repo, "src/b.ts");
  git(repo, "add", "src/a.ts", "src/b.ts");

  const missing = runHelper(repo, "--file src/a.ts,missing.ts");
  assert.equal(valueFor(missing, "strategy"), "unrecognised");
  assert.match(valueFor(missing, "note"), /missing\.ts/);
  assert.deepEqual(changedFiles(missing), []);

  assert.equal(valueFor(runHelper(repo, "--folder="), "note"), "--folder scope requires a path");
  assert.equal(valueFor(runHelper(repo, "--file="), "note"), "--file scope requires at least one path");
  assert.equal(
    valueFor(runHelper(repo, "--file src"), "note"),
    "file scope path(s) must resolve to exactly one tracked file: src",
  );
});

test("review-range protects folder pathspecs that resemble Git flags", (t) => {
  const repo = createRepo(t);
  write(repo, "--help/a.ts");
  git(repo, "add", "--", "--help/a.ts");
  const output = runHelper(repo, "--folder --help");
  assert.equal(valueFor(output, "strategy"), "tree");
  assert.deepEqual(changedFiles(output), ["--help/a.ts"]);
});
