#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function git(args, cwd, { optional = false } = {}) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (optional) return "";
    const detail = error.stderr?.toString().trim() || error.message;
    throw new Error(`git ${args.join(" ")} failed: ${detail}`);
  }
}

function gitRaw(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const detail = error.stderr?.toString().trim() || error.message;
    throw new Error(`git ${args.join(" ")} failed: ${detail}`);
  }
}

function contentDigest(absolute) {
  return crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
}

export function workingTreeSnapshot(root) {
  const rawPaths = gitRaw(["ls-files", "-c", "-o", "--exclude-standard", "-z"], root)
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  const paths = [...new Set(rawPaths)]
    .map((entry) => entry.split(path.sep).join("/"))
    .filter((entry) => entry !== ".rpiv-codex" && !entry.startsWith(".rpiv-codex/"))
    .sort();
  const hash = crypto.createHash("sha256");

  for (const relative of paths) {
    const absolute = path.join(root, ...relative.split("/"));
    let descriptor;
    try {
      const stats = fs.lstatSync(absolute);
      const executable = stats.mode & 0o111 ? "executable" : "non-executable";
      if (stats.isFile()) {
        descriptor = [relative, "file", executable, contentDigest(absolute)];
      } else if (stats.isSymbolicLink()) {
        descriptor = [relative, "symlink", executable, fs.readlinkSync(absolute)];
      } else if (stats.isDirectory()) {
        const submoduleCommit = git(["rev-parse", "--verify", "HEAD"], absolute, { optional: true }) || "unknown";
        const submoduleStatus = git(["status", "--porcelain=v1", "--untracked-files=all"], absolute, { optional: true });
        descriptor = [relative, "directory-or-submodule", executable, submoduleCommit, submoduleStatus];
      } else {
        descriptor = [relative, "special", executable];
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      descriptor = [relative, "missing"];
    }
    hash.update(`${JSON.stringify(descriptor)}\n`);
  }

  return {
    working_tree_sha256: hash.digest("hex"),
    working_tree_file_count: paths.length,
    working_tree_scope: "Git-visible tracked and untracked files excluding .rpiv-codex/ and ignored files",
  };
}

export function localIso(date = new Date()) {
  const pad = (value, width = 2) => String(value).padStart(width, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const offset = `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`,
    offset,
  ].join("");
}

export function filenameTimestamp(date = new Date()) {
  const pad = (value, width = 2) => String(value).padStart(width, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    pad(date.getMilliseconds(), 3),
    sign,
    pad(Math.floor(absolute / 60)),
    pad(absolute % 60),
  ].join("");
}

export function contextSnapshot(cwd = process.cwd(), now = new Date()) {
  const rootOutput = git(["rev-parse", "--show-toplevel"], cwd);
  const root = path.resolve(rootOutput);
  const branch = git(["symbolic-ref", "--quiet", "--short", "HEAD"], root, {
    optional: true,
  }) || "detached";
  const commit = git(["rev-parse", "--verify", "HEAD"], root, {
    optional: true,
  }) || "no-commit";
  const authorName = git(["config", "--get", "user.name"], root, {
    optional: true,
  }) || "unknown";
  const authorEmail = git(["config", "--get", "user.email"], root, {
    optional: true,
  }) || "unknown";
  const status = git(["status", "--porcelain=v1", "--untracked-files=all"], root, {
    optional: true,
  });
  const dirtyEntries = status ? status.split("\n").filter(Boolean) : [];
  const workingTree = workingTreeSnapshot(root);

  return {
    repository: root,
    repository_name: path.basename(root),
    branch,
    commit,
    author: authorName,
    author_email: authorEmail,
    created_at: localIso(now),
    filename_timestamp: filenameTimestamp(now),
    dirty: dirtyEntries.length > 0,
    dirty_count: dirtyEntries.length,
    ...workingTree,
  };
}

const invokedDirectly = process.argv[1]
  && fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(path.resolve(process.argv[1]));

if (invokedDirectly) {
  try {
    process.stdout.write(`${JSON.stringify(contextSnapshot(), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`rpivc context error: ${error.message}\n`);
    process.exitCode = 1;
  }
}
