#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { contextSnapshot } from "./context-snapshot.mjs";

const stageSources = new Map([
  ["discover", "packages/rpiv-pi/skills/discover/SKILL.md"],
  ["research", "packages/rpiv-pi/skills/research/SKILL.md"],
]);

export function slugify(value) {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "feature";
}

export function artifactPath(stage, topic, cwd = process.cwd(), now = new Date()) {
  if (!stageSources.has(stage)) {
    throw new Error(`stage must be one of: ${[...stageSources.keys()].join(", ")}`);
  }

  const context = contextSnapshot(cwd, now);
  const relative = path.posix.join(
    ".rpiv-codex",
    "artifacts",
    stage,
    `${context.filename_timestamp}_${slugify(topic)}.md`,
  );
  const absolute = path.join(context.repository, ...relative.split("/"));
  // Allocation happens only after the stage's explicit write gate. Ensure the
  // ignored artifact directory exists so the returned path is immediately
  // writable without requiring the caller to invent a separate setup step.
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  if (fs.existsSync(absolute)) {
    throw new Error(`refusing to overwrite existing path: ${relative}`);
  }
  const commonFrontmatter = {
    stage,
    status: "review",
    rpiv_source: stageSources.get(stage),
    rpiv_commit: "d0eb55371f622ac524b3355711a482f95feb14d4",
    supersedes: null,
    source_artifacts: [],
    repository: context.repository,
    branch: context.branch,
    commit: context.commit,
    working_tree_sha256: context.working_tree_sha256,
    working_tree_scope: context.working_tree_scope,
    created_at: context.created_at,
    author: context.author,
    topic: slugify(topic),
  };
  return {
    stage,
    topic: slugify(topic),
    relative,
    absolute,
    common_frontmatter: commonFrontmatter,
    context,
  };
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  try {
    const [, , stage, ...topicParts] = process.argv;
    if (!stage || topicParts.length === 0) {
      throw new Error("usage: artifact-path.mjs <discover|research> <topic>");
    }
    process.stdout.write(`${JSON.stringify(artifactPath(stage, topicParts.join(" ")), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`rpivc artifact path error: ${error.message}\n`);
    process.exitCode = 1;
  }
}
