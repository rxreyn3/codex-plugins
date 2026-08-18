import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  compareArtifactContext,
  inspectArtifact,
} from "../.agents/skills/_shared/scripts/artifact-check.mjs";
import { artifactPath, slugify } from "../.agents/skills/_shared/scripts/artifact-path.mjs";
import { contextSnapshot } from "../.agents/skills/_shared/scripts/context-snapshot.mjs";

const pinnedCommit = "d0eb55371f622ac524b3355711a482f95feb14d4";

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function repositoryFixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "rpivc-artifact-")));
  git(root, "init", "-b", "main");
  git(root, "config", "user.name", "Fixture Reviewer");
  git(root, "config", "user.email", "fixture@example.test");
  fs.writeFileSync(path.join(root, "fixture.txt"), "baseline\n");
  git(root, "add", "fixture.txt");
  git(root, "commit", "-m", "fixture baseline");
  return root;
}

function artifactMarkdown(context, overrides = {}) {
  const values = {
    stage: "discover",
    status: "review",
    rpiv_source: "packages/rpiv-pi/skills/discover/SKILL.md",
    rpiv_commit: pinnedCommit,
    supersedes: null,
    source_artifacts: [],
    repository: context.repository,
    branch: context.branch,
    commit: context.commit,
    working_tree_sha256: context.working_tree_sha256,
    working_tree_scope: context.working_tree_scope,
    created_at: context.created_at,
    ...overrides,
  };
  const value = (input) => input === null ? "null" : JSON.stringify(input);
  return [
    "---",
    `stage: ${values.stage}`,
    `status: ${values.status}`,
    `rpiv_source: ${value(values.rpiv_source)}`,
    `rpiv_commit: ${values.rpiv_commit}`,
    `supersedes: ${value(values.supersedes)}`,
    `source_artifacts: ${value(values.source_artifacts)}`,
    `repository: ${value(values.repository)}`,
    `branch: ${value(values.branch)}`,
    `commit: ${value(values.commit)}`,
    `working_tree_sha256: ${value(values.working_tree_sha256)}`,
    `working_tree_scope: ${value(values.working_tree_scope)}`,
    `created_at: ${value(values.created_at)}`,
    "---",
    "",
    "# Fixture Feature Requirements Document",
    "",
  ].join("\n");
}

function writeArtifact(root, name = "fixture.md", overrides = {}) {
  const context = contextSnapshot(root);
  const directory = path.join(root, ".rpiv-codex", "artifacts", "discover");
  fs.mkdirSync(directory, { recursive: true });
  const target = path.join(directory, name);
  fs.writeFileSync(target, artifactMarkdown(context, overrides));
  return { target, context };
}

test("context snapshot captures stable repository identity", () => {
  const root = repositoryFixture();
  const snapshot = contextSnapshot(root, new Date("2026-08-17T09:10:11.123Z"));
  assert.equal(snapshot.repository, root);
  assert.equal(snapshot.repository_name, path.basename(root));
  assert.equal(snapshot.branch, "main");
  assert.match(snapshot.commit, /^[0-9a-f]{40}$/);
  assert.equal(snapshot.author, "Fixture Reviewer");
  assert.match(snapshot.created_at, /^2026-08-17T/);
  assert.match(snapshot.working_tree_sha256, /^[0-9a-f]{64}$/);
  assert.equal(snapshot.working_tree_file_count, 1);
});

test("working-tree snapshot is deterministic and excludes review and ignored data", () => {
  const root = repositoryFixture();
  const before = contextSnapshot(root);
  const reviewDirectory = path.join(root, ".rpiv-codex", "artifacts", "discover");
  fs.mkdirSync(reviewDirectory, { recursive: true });
  fs.writeFileSync(path.join(reviewDirectory, "review.md"), "review bytes\n");
  assert.equal(contextSnapshot(root).working_tree_sha256, before.working_tree_sha256);

  fs.appendFileSync(path.join(root, ".git", "info", "exclude"), "\nignored.tmp\n");
  fs.writeFileSync(path.join(root, "ignored.tmp"), "ignored generated data\n");
  assert.equal(contextSnapshot(root).working_tree_sha256, before.working_tree_sha256);

  fs.writeFileSync(path.join(root, "fixture.txt"), "source changed\n");
  assert.notEqual(contextSnapshot(root).working_tree_sha256, before.working_tree_sha256);
});

test("artifact path is fresh, stage-scoped, and includes revision lineage", () => {
  const root = repositoryFixture();
  const result = artifactPath(
    "discover",
    "ASCII Widget Spinner!",
    root,
    new Date("2026-08-17T09:10:11.123Z"),
  );
  assert.match(result.relative, /^\.rpiv-codex\/artifacts\/discover\/[0-9T+\-]+_ascii-widget-spinner\.md$/);
  assert.equal(result.common_frontmatter.repository, root);
  assert.equal(result.common_frontmatter.working_tree_sha256, result.context.working_tree_sha256);
  assert.equal(result.common_frontmatter.supersedes, null);
  assert.equal(result.common_frontmatter.topic, "ascii-widget-spinner");
  assert.equal(slugify("!!!"), "feature");
  fs.mkdirSync(path.dirname(result.absolute), { recursive: true });
  fs.writeFileSync(result.absolute, "occupied");
  assert.throws(
    () => artifactPath("discover", "ASCII Widget Spinner!", root, new Date("2026-08-17T09:10:11.123Z")),
    /refusing to overwrite/,
  );
});

test("artifact preflight validates a fresh final artifact without writing sidecars", () => {
  const root = repositoryFixture();
  const { target } = writeArtifact(root);
  const inspected = inspectArtifact(target, root);
  assert.equal(inspected.artifact, ".rpiv-codex/artifacts/discover/fixture.md");
  assert.equal(inspected.context_match, true);
  assert.equal(inspected.metadata.supersedes, null);
  assert.equal(fs.existsSync(path.join(root, ".rpiv-codex", "approvals")), false);
  assert.equal(fs.existsSync(path.join(root, ".rpiv-codex", "dispatch")), false);
});

test("repository drift is reported for a conversational Refresh, Continue, or Stop choice", () => {
  const root = repositoryFixture();
  const { target } = writeArtifact(root);
  fs.writeFileSync(path.join(root, "fixture.txt"), "modified without a new commit\n");
  const compared = compareArtifactContext(target, root);
  assert.equal(compared.context_match, false);
  assert.deepEqual(compared.differences.map(({ field }) => field), ["working_tree_sha256"]);
  assert.throws(() => inspectArtifact(target, root), /repository context has changed: working_tree_sha256/);
});

test("branch and commit differences are visible rather than approval failures", () => {
  const root = repositoryFixture();
  const { target } = writeArtifact(root, "context.md", {
    branch: "older-branch",
    commit: "0000000000000000000000000000000000000000",
  });
  const compared = compareArtifactContext(target, root);
  assert.equal(compared.context_match, false);
  assert.deepEqual(compared.differences.map(({ field }) => field), ["branch", "commit"]);
});

test("artifact checker rejects incomplete and out-of-scope files", () => {
  const root = repositoryFixture();
  const stale = writeArtifact(root, "stale.md", { status: "approved" }).target;
  assert.throws(() => compareArtifactContext(stale, root), /status must be "review"/);

  const outside = path.join(root, "ordinary.md");
  fs.writeFileSync(outside, artifactMarkdown(contextSnapshot(root)));
  assert.throws(() => compareArtifactContext(outside, root), /artifact must be Markdown under/);

  const incomplete = writeArtifact(root, "incomplete.md").target;
  fs.writeFileSync(incomplete, fs.readFileSync(incomplete, "utf8").replace(/^supersedes:.*\n/m, ""));
  assert.throws(() => compareArtifactContext(incomplete, root), /missing required field: supersedes/);
});
