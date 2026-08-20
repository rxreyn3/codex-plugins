#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { contextSnapshot } from "./context-snapshot.mjs";

const requiredArtifactFields = [
  "stage",
  "status",
  "rpiv_source",
  "rpiv_commit",
  "supersedes",
  "source_artifacts",
  "repository",
  "branch",
  "commit",
  "working_tree_sha256",
  "working_tree_scope",
  "created_at",
];

function fail(message) {
  throw new Error(message);
}

function yamlValue(raw) {
  const value = raw.trim();
  if (value.startsWith('"') || value.startsWith("[") || value.startsWith("{")) {
    try {
      return JSON.parse(value);
    } catch {
      fail(`unsupported frontmatter value: ${value}`);
    }
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  return value;
}

export function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---") fail("file must begin with YAML frontmatter");
  const end = lines.indexOf("---", 1);
  if (end < 0) fail("frontmatter closing delimiter is missing");
  const values = {};
  for (const line of lines.slice(1, end)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = /^([a-zA-Z0-9_]+):\s*(.*)$/.exec(line);
    if (!match) fail(`unsupported frontmatter line: ${line}`);
    values[match[1]] = yamlValue(match[2]);
  }
  return values;
}

function locateArtifact(input, context) {
  const absolute = path.resolve(input);
  if (!fs.existsSync(absolute)) fail(`artifact does not exist: ${input}`);
  if (!fs.statSync(absolute).isFile()) fail(`artifact is not a regular file: ${input}`);
  const real = fs.realpathSync(absolute);
  const relative = path.relative(context.repository, real);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    fail("artifact must be inside the current Git repository");
  }
  const normalized = relative.split(path.sep).join("/");
  const match = /^\.rpiv-codex\/artifacts\/([a-z0-9-]+)\/([^/]+\.md)$/.exec(normalized);
  if (!match) {
    fail("artifact must be Markdown under .rpiv-codex/artifacts/<stage>/");
  }
  return { absolute: real, relative: normalized, stage: match[1] };
}

function readArtifact(input, cwd) {
  const context = contextSnapshot(cwd);
  const location = locateArtifact(input, context);
  const bytes = fs.readFileSync(location.absolute);
  const text = bytes.toString("utf8");
  const metadata = parseFrontmatter(text);
  for (const field of requiredArtifactFields) {
    if (!(field in metadata)) fail(`artifact frontmatter is missing required field: ${field}`);
  }
  if (metadata.status !== "review") fail('artifact frontmatter status must be "review"');
  if (metadata.stage !== location.stage) fail("artifact stage does not match its directory");
  return {
    location,
    metadata,
    context,
    byte_length: bytes.length,
    artifact_sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    text,
  };
}

function localMarkdownLinks(text) {
  return [...text.matchAll(/\[([^\]\n]+)\]\((?:<([^>\n]+)>|(\/[^)\n]+))\)/g)]
    .map((match) => ({ label: match[1], target: match[2] || match[3] }));
}

function targetFile(target) {
  return target.replace(/:[0-9]+(?:-[0-9]+)?$/, "");
}

function targetLineRange(target) {
  const match = /:([0-9]+)(?:-([0-9]+))?$/.exec(target);
  return match ? { start: Number(match[1]), end: Number(match[2] ?? match[1]) } : null;
}

function validateCitationLabel(read, link) {
  const range = targetLineRange(link.target);
  if (!range) return;
  const file = fs.realpathSync(targetFile(link.target));
  const relative = path.relative(read.context.repository, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return;
  const normalized = relative.split(path.sep).join("/");
  const suffix = range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`;
  const expected = `${normalized}:${suffix}`;
  if (link.label !== expected) {
    fail(`artifact citation label must be repository-relative: expected [${expected}]`);
  }

  const lineCount = fs.readFileSync(file, "utf8").split(/\r?\n/).length;
  if (range.start < 1 || range.end < range.start || range.end > lineCount) {
    fail(`artifact citation line is outside file bounds: ${link.target}`);
  }
}

function validateLocalMarkdownLinks(read) {
  const links = localMarkdownLinks(read.text);
  for (const link of links) {
    if (!fs.existsSync(targetFile(link.target))) {
      fail(`artifact Markdown link target does not exist: ${link.target}`);
    }
    validateCitationLabel(read, link);
  }

  const lineage = [read.metadata.supersedes, ...read.metadata.source_artifacts]
    .filter((value) => typeof value === "string" && value.length > 0)
    .map((value) => path.resolve(read.context.repository, value));
  const linkedFiles = new Set(links.map(({ target }) => targetFile(target)).map((target) => path.resolve(target)));
  for (const expected of lineage) {
    if (!linkedFiles.has(expected)) {
      fail(`artifact lineage is missing a body Markdown link: ${expected}`);
    }
  }
}

function contextDifferences(metadata, context) {
  const fields = ["repository", "branch", "commit", "working_tree_sha256", "working_tree_scope"];
  return fields
    .filter((field) => metadata[field] !== context[field])
    .map((field) => ({ field, artifact: metadata[field], current: context[field] }));
}

export function compareArtifactContext(input, cwd = process.cwd()) {
  const read = readArtifact(input, cwd);
  const differences = contextDifferences(read.metadata, read.context);
  return {
    artifact: read.location.relative,
    byte_length: read.byte_length,
    artifact_sha256: read.artifact_sha256,
    metadata: read.metadata,
    context: read.context,
    context_match: differences.length === 0,
    differences,
  };
}

export function preflightDiscoveryArtifact(input, cwd = process.cwd()) {
  const read = readArtifact(input, cwd);
  if (read.location.stage !== "discover") {
    fail("research preflight requires a discovery artifact");
  }
  validateLocalMarkdownLinks(read);
  const differences = contextDifferences(read.metadata, read.context);
  return {
    artifact: read.location.relative,
    byte_length: read.byte_length,
    artifact_sha256: read.artifact_sha256,
    metadata: read.metadata,
    artifact_content: read.text,
    context: read.context,
    context_match: differences.length === 0,
    differences,
  };
}

export function inspectArtifact(input, cwd = process.cwd()) {
  const read = readArtifact(input, cwd);
  const differences = contextDifferences(read.metadata, read.context);
  if (differences.length > 0) {
    fail(`artifact repository context has changed: ${differences.map(({ field }) => field).join(", ")}`);
  }
  validateLocalMarkdownLinks(read);
  const { text, ...result } = read;
  return { ...result, context_match: true, differences: [] };
}

function main() {
  const [, , command, ...args] = process.argv;
  if (!["inspect", "compare", "preflight-discovery"].includes(command) || args.length !== 1) {
    fail("usage: artifact-check.mjs <inspect|compare|preflight-discovery> <artifact-path>");
  }
  if (command === "inspect") return inspectArtifact(args[0]);
  if (command === "preflight-discovery") return preflightDiscoveryArtifact(args[0]);
  return compareArtifactContext(args[0]);
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  try {
    process.stdout.write(`${JSON.stringify(main(), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`rpivc artifact check error: ${error.message}\n`);
    process.exitCode = 1;
  }
}
