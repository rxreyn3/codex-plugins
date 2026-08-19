import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const EVIDENCE_PATHS = [
  "PARITY.md",
  ".agents/skills/rpivc-discover",
  ".agents/skills/_shared/scripts",
  ".codex/agents/rpivc-codebase-locator.toml",
  ".codex/agents/rpivc-codebase-analyzer.toml",
  ".rpiv-codex/artifacts/discover",
];

function git(root, ...args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function assertSafeSegment(value, label) {
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
    throw new Error(`${label} contains unsafe path characters: ${value}`);
  }
}

function isSensitivePath(relative) {
  const normalized = relative.split(path.sep).join("/");
  const basename = path.posix.basename(normalized).toLowerCase();
  if (basename === ".env.example") return false;
  return basename === ".env"
    || basename.startsWith(".env.")
    || basename === "id_rsa"
    || basename === "id_ed25519"
    || /\.(?:pem|p12|pfx|key)$/.test(basename);
}

function copyEntry(sourceRoot, destinationRoot, relative) {
  if (isSensitivePath(relative)) return;
  const source = path.join(sourceRoot, relative);
  const destination = path.join(destinationRoot, relative);
  if (!fs.existsSync(source)) {
    fs.rmSync(destination, { force: true, recursive: true });
    return;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) {
    fs.rmSync(destination, { force: true, recursive: true });
    fs.symlinkSync(fs.readlinkSync(source), destination);
  } else if (stat.isFile()) {
    fs.copyFileSync(source, destination);
    fs.chmodSync(destination, stat.mode);
  }
}

function listedWorkingTreePaths(root) {
  return execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: root, encoding: "buffer", maxBuffer: 32 * 1024 * 1024 },
  ).toString("utf8").split("\0").filter(Boolean);
}

function walkFiles(root, options = {}) {
  const files = [];
  const visit = (directory, prefix = "") => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (relative === ".git" || relative.startsWith(".git/")) continue;
      if (relative === "node_modules" || relative.startsWith("node_modules/")) continue;
      if (options.excludeRuntime && (relative === ".rpiv-codex" || relative.startsWith(".rpiv-codex/"))) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute, relative);
      else if (entry.isFile() || entry.isSymbolicLink()) files.push(relative);
    }
  };
  visit(root);
  return files.sort();
}

export function fileInventory(root, options = {}) {
  const inventory = {};
  for (const relative of walkFiles(root, options)) {
    const absolute = path.join(root, relative);
    const stat = fs.lstatSync(absolute);
    const bytes = stat.isSymbolicLink()
      ? Buffer.from(`symlink:${fs.readlinkSync(absolute)}`)
      : fs.readFileSync(absolute);
    inventory[relative] = {
      bytes: bytes.length,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    };
  }
  return inventory;
}

export function snapshotRepository(root, options = {}) {
  const inventory = fileInventory(root, { excludeRuntime: options.excludeRuntime ?? false });
  return {
    repository: fs.realpathSync(root),
    branch: git(root, "branch", "--show-current") || "detached",
    commit: git(root, "rev-parse", "HEAD"),
    git_status: git(root, "status", "--short", "--branch"),
    working_tree_sha256: crypto.createHash("sha256").update(JSON.stringify(inventory)).digest("hex"),
    files: inventory,
  };
}

export function inventoryChanges(before, after) {
  const created = [];
  const modified = [];
  const deleted = [];
  for (const [file, metadata] of Object.entries(after)) {
    if (!(file in before)) created.push(file);
    else if (before[file].sha256 !== metadata.sha256) modified.push(file);
  }
  for (const file of Object.keys(before)) {
    if (!(file in after)) deleted.push(file);
  }
  return { created, modified, deleted };
}

export function createDisposableWorkspace({ sourceRoot, evaluationId, caseId, evidenceDir }) {
  assertSafeSegment(evaluationId, "evaluationId");
  assertSafeSegment(caseId, "caseId");
  const temporaryParent = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `rpivc-eval-${caseId}-`)));
  const workspace = path.join(temporaryParent, "workspace");
  execFileSync("git", ["clone", "--quiet", "--no-hardlinks", sourceRoot, workspace], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });

  for (const relative of listedWorkingTreePaths(sourceRoot)) copyEntry(sourceRoot, workspace, relative);
  for (const relative of git(sourceRoot, "ls-files", "--deleted").split("\n").filter(Boolean)) {
    fs.rmSync(path.join(workspace, relative), { force: true, recursive: true });
  }

  fs.rmSync(path.join(workspace, ".rpiv-codex"), { force: true, recursive: true });
  fs.rmSync(path.join(workspace, "node_modules"), { force: true, recursive: true });
  for (const relative of walkFiles(workspace)) {
    if (isSensitivePath(relative)) fs.rmSync(path.join(workspace, relative), { force: true });
  }

  const baseline = snapshotRepository(workspace);
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, "baseline.json"), `${JSON.stringify(baseline, null, 2)}\n`);
  fs.writeFileSync(path.join(evidenceDir, "runtime.json"), `${JSON.stringify({
    evaluation_id: evaluationId,
    case_id: caseId,
    source_root: fs.realpathSync(sourceRoot),
    temporary_parent: temporaryParent,
    workspace,
    evidence_dir: fs.realpathSync(evidenceDir),
  }, null, 2)}\n`);
  syncEvidence({ workspace, evidenceDir, baseline });
  return { temporaryParent, workspace, baseline, evidenceDir };
}

export function syncEvidence({ workspace, evidenceDir, baseline, extra = {} }) {
  const current = snapshotRepository(workspace);
  const changes = inventoryChanges(baseline.files, current.files);
  const evidenceWorkspace = path.join(evidenceDir, "workspace");
  fs.rmSync(evidenceWorkspace, { force: true, recursive: true });
  for (const relative of EVIDENCE_PATHS) {
    const source = path.join(workspace, relative);
    if (!fs.existsSync(source)) continue;
    const destination = path.join(evidenceWorkspace, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(source, destination, { recursive: true, dereference: false });
  }
  const latest = { ...current, changes, ...extra };
  fs.writeFileSync(path.join(evidenceDir, "latest.json"), `${JSON.stringify(latest, null, 2)}\n`);
  return latest;
}

export function cleanupDisposableWorkspace(temporaryParent) {
  const resolved = fs.realpathSync(temporaryParent);
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  if (path.dirname(resolved) !== temporaryRoot || !path.basename(resolved).startsWith("rpivc-eval-")) {
    throw new Error(`refusing to remove unverified temporary path: ${resolved}`);
  }
  fs.rmSync(resolved, { force: true, recursive: true });
}

