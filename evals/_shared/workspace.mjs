import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Evaluations run in disposable clones but reports outlive those clones. Retain
// only the workflow inputs and evidence needed to reproduce a verdict; copying
// the entire checkout would make reports noisy and could retain local secrets.
const EVIDENCE_PATHS = [
  "PARITY.md",
  ".agents/skills/rpivc-discover",
  ".agents/skills/rpivc-research",
  ".agents/skills/_shared/scripts",
  ".codex/agents/rpivc-codebase-locator.toml",
  ".codex/agents/rpivc-codebase-analyzer.toml",
  ".codex/agents/rpivc-scope-tracer.toml",
  ".codex/agents/rpivc-codebase-pattern-finder.toml",
  ".codex/agents/rpivc-integration-scanner.toml",
  ".codex/agents/rpivc-precedent-locator.toml",
  ".rpiv-codex/artifacts/discover",
  ".rpiv-codex/artifacts/research",
];

const RETAINED_LATEST_FIELDS = ["adapter_phase", "drift_events", "turn_count"];

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

function splitLineSuffix(target) {
  const match = target.match(/^(.*?)(:\d+(?:-\d+|:\d+)?)?$/);
  return { file: match?.[1] ?? target, suffix: match?.[2] ?? "" };
}

// Discovery artifacts contain absolute, clickable file links. Copy link targets
// into retained evidence and rewrite only paths inside the disposable workspace;
// external and sensitive paths remain untouched rather than being exfiltrated.
function rewriteRetainedArtifactLinks(workspace, evidenceWorkspace) {
  const canonicalWorkspace = fs.realpathSync(workspace);
  for (const stage of ["discover", "research"]) {
    const artifactRoot = path.join(evidenceWorkspace, ".rpiv-codex", "artifacts", stage);
    if (!fs.existsSync(artifactRoot)) continue;
    for (const entry of fs.readdirSync(artifactRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const artifact = path.join(artifactRoot, entry.name);
    const markdown = fs.readFileSync(artifact, "utf8");
    const rewritten = markdown.replaceAll(/\[([^\]]+)\]\((\/[^)]+)\)/g, (whole, label, target) => {
      const { file, suffix } = splitLineSuffix(target);
      if (!fs.existsSync(file)) return whole;
      const relative = path.relative(canonicalWorkspace, fs.realpathSync(file));
      if (relative.startsWith("..") || path.isAbsolute(relative) || isSensitivePath(relative)) {
        return whole;
      }
      copyEntry(workspace, evidenceWorkspace, relative);
      return `[${label}](${path.join(evidenceWorkspace, relative)}${suffix})`;
    });
      if (rewritten !== markdown) fs.writeFileSync(artifact, rewritten);
    }
  }
}

export function retainWorkspaceReferences(value, workspace, evidenceDir) {
  if (typeof value !== "string") return value;
  const retainedWorkspace = path.join(evidenceDir, "workspace");
  const aliases = [...new Set([fs.realpathSync(workspace), path.resolve(workspace)])]
    .sort((left, right) => right.length - left.length);
  return aliases.reduce((rewritten, alias) => rewritten.replaceAll(alias, retainedWorkspace), value);
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

// Hash file contents rather than relying on Git status so untracked and modified
// files participate in stale-context checks.
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
  // Preserve macOS's short /tmp spelling for model-visible artifact paths. The
  // cleanup guard resolves it back to the real system temporary directory.
  const shortTemporaryRoot = fs.existsSync("/tmp") ? "/tmp" : os.tmpdir();
  const temporaryParent = fs.mkdtempSync(path.join(shortTemporaryRoot, `rpivc-eval-${caseId}-`));
  const workspace = path.join(temporaryParent, "workspace");
  execFileSync("git", ["clone", "--quiet", "--no-hardlinks", sourceRoot, workspace], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });

  // A clone contains only committed state. Overlay tracked modifications,
  // untracked nonignored files, and deletions so the fixture sees the exact local
  // source tree being evaluated.
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
  // Rebuild the retained snapshot on each turn so deleted evidence cannot linger
  // and accidentally satisfy a later assertion.
  fs.rmSync(evidenceWorkspace, { force: true, recursive: true });
  for (const relative of EVIDENCE_PATHS) {
    const source = path.join(workspace, relative);
    if (!fs.existsSync(source)) continue;
    const destination = path.join(evidenceWorkspace, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(source, destination, { recursive: true, dereference: false });
  }
  rewriteRetainedArtifactLinks(workspace, evidenceWorkspace);
  const latestPath = path.join(evidenceDir, "latest.json");
  const previous = fs.existsSync(latestPath) ? JSON.parse(fs.readFileSync(latestPath, "utf8")) : {};
  // Cleanup performs a final sync without adapter metadata. Preserve the last
  // observed state-machine fields instead of erasing the evidence at shutdown.
  const retained = Object.fromEntries(RETAINED_LATEST_FIELDS
    .filter((field) => previous[field] !== undefined)
    .map((field) => [field, previous[field]]));
  const latest = { ...current, changes, ...retained, ...extra };
  fs.writeFileSync(latestPath, `${JSON.stringify(latest, null, 2)}\n`);
  return latest;
}

export function cleanupDisposableWorkspace(temporaryParent) {
  // realpath plus the exact prefix prevents a bad variable from turning test
  // cleanup into a surprisingly ambitious filesystem operation.
  const resolved = fs.realpathSync(temporaryParent);
  const allocatedRoot = fs.existsSync("/tmp") ? "/tmp" : os.tmpdir();
  const temporaryRoot = fs.realpathSync(allocatedRoot);
  if (path.dirname(resolved) !== temporaryRoot || !path.basename(resolved).startsWith("rpivc-eval-")) {
    throw new Error(`refusing to remove unverified temporary path: ${resolved}`);
  }
  fs.rmSync(resolved, { force: true, recursive: true });
}
