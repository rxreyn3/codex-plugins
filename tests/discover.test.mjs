import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const marketplacePath = join(repositoryRoot, ".agents/plugins/marketplace.json");
const pluginRoot = join(repositoryRoot, "plugins/rpiv-codex");
const manifestPath = join(pluginRoot, ".codex-plugin/plugin.json");
const skillRoot = join(pluginRoot, "skills/rpivc-discover");
const skillPath = join(skillRoot, "SKILL.md");

const read = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(read(path));

const walkFiles = (root) =>
  readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });

test("marketplace and plugin manifests resolve every declared path", () => {
  const marketplace = json(marketplacePath);
  assert.equal(marketplace.name, "rpiv-codex-local");
  assert.equal(marketplace.plugins.length, 1);

  const entry = marketplace.plugins[0];
  assert.equal(entry.name, "rpiv-codex");
  assert.match(entry.source.path, /^\.\//);
  assert.equal(resolve(repositoryRoot, entry.source.path), pluginRoot);
  assert.ok(existsSync(manifestPath));
  assert.deepEqual(entry.policy, {
    installation: "AVAILABLE",
    authentication: "ON_INSTALL",
  });

  const manifest = json(manifestPath);
  assert.equal(manifest.name, "rpiv-codex");
  assert.match(manifest.version, /^0\.1\.0\+codex\.\d{14}$/);
  assert.match(manifest.skills, /^\.\//);
  assert.equal(resolve(pluginRoot, manifest.skills), join(pluginRoot, "skills"));
  assert.ok(existsSync(skillPath));
});

test("skill frontmatter and runtime references are self-contained", () => {
  const skill = read(skillPath);
  assert.match(skill, /^---\nname: rpivc-discover\n/);
  assert.match(skill, /description: .*Feature Requirements Document/);

  const relativeLinks = [...skill.matchAll(/\]\((?!https?:\/\/)([^)#]+)(?:#[^)]+)?\)/g)].map(
    (match) => match[1],
  );
  assert.ok(relativeLinks.length >= 3);
  for (const linkedPath of relativeLinks) {
    assert.ok(existsSync(resolve(skillRoot, linkedPath)), `missing ${linkedPath}`);
  }

  const forbidden = [
    "rpiv-mono",
    ".codex/agents",
    ".agents/skills/port-rpiv-skill",
    "/Users/ryan.reynolds",
    "${SKILL_DIR}/../_shared",
  ];
  for (const path of walkFiles(skillRoot)) {
    const body = read(path);
    for (const value of forbidden) {
      assert.equal(body.includes(value), false, `${relative(repositoryRoot, path)} contains ${value}`);
    }
  }
});

test("discover preserves the source workflow and stage boundary", () => {
  const skill = read(skillPath);
  const required = [
    "Intent before agents",
    "Every invocation writes a new timestamp-distinct artifact",
    "Do not dispatch an agent until this answer",
    "Do not build grandchildren yet",
    "evidence: path:line + confirmed",
    "Do not ask a final “looks good?” question",
    ".rpiv/artifacts/discover/<slug>_<topic>.md",
    "$rpivc-research .rpiv/artifacts/discover",
    "The successor name is a handoff, not permission to invoke or port it",
    "Never edit source files",
  ];
  for (const invariant of required) assert.ok(skill.includes(invariant), invariant);

  assert.ok(skill.indexOf("Ask the foundational intent question") < skill.indexOf("Run the lightweight repository probe"));
  assert.ok(skill.indexOf("Run the lightweight repository probe") < skill.indexOf("Build only the first decision layer"));
  assert.ok(skill.indexOf("Walk the interview lazily") < skill.indexOf("Synthesize the Feature Requirements Document"));
  assert.ok(skill.indexOf("Synthesize the Feature Requirements Document") < skill.indexOf("Write the new artifact"));
});

test("bundled probe roles retain their separate contracts", () => {
  const locator = read(join(skillRoot, "references/codebase-locator.md"));
  assert.match(locator, /Do not analyze implementation behavior/);
  assert.match(locator, /three to five numbered Primary Anchors/);
  assert.match(locator, /\[def\].*\[use\].*\[wiring\].*\[test\].*\[doc\]/s);
  assert.match(locator, /repository-relative and include a line/);

  const analyzer = read(join(skillRoot, "references/codebase-analyzer.md"));
  assert.match(analyzer, /Trace actual code paths/);
  assert.match(analyzer, /validations, transformations, state changes, and side effects/);
  assert.match(analyzer, /Include `file:line` evidence for every behavioral claim/);
  assert.match(analyzer, /Do not recommend changes/);
});

test("Feature Requirements Document template retains artifact compatibility", () => {
  const template = read(join(skillRoot, "references/frd-template.md"));
  const headings = [
    "## Summary",
    "## Problem & Intent",
    "## Goals",
    "## Non-Goals",
    "## Functional Requirements",
    "## Non-Functional Requirements",
    "## Constraints & Assumptions",
    "## Acceptance Criteria",
    "## Recommended Approach",
    "## Decisions",
    "## Open Questions",
    "## Suggested Follow-ups",
    "## References",
  ];
  for (const heading of headings) assert.ok(template.includes(heading), heading);
  assert.match(template, /status: ready/);
  assert.match(template, /\*\*Question\*\*:[\s\S]*\*\*Recommended\*\*:[\s\S]*\*\*Chosen\*\*:[\s\S]*\*\*Rationale\*\*:/);
});

test("timestamp helper works from an unrelated working directory", (t) => {
  const unrelated = mkdtempSync(join(tmpdir(), "rpivc-discover-now-"));
  t.after(() => rmSync(unrelated, { recursive: true, force: true }));
  const helper = join(skillRoot, "scripts/now.mjs");
  const output = execFileSync(process.execPath, [helper], {
    cwd: unrelated,
    encoding: "utf8",
  });
  assert.match(
    output,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}\t\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/,
  );
  const [iso, slug] = output.split("\t");
  assert.equal(slug, iso.slice(0, 19).replaceAll(":", "-").replace("T", "_"));
});

test("Git metadata helper reports stable fallbacks outside a repository", (t) => {
  const unrelated = mkdtempSync(join(tmpdir(), "rpivc-discover-git-"));
  t.after(() => rmSync(unrelated, { recursive: true, force: true }));
  const helper = join(skillRoot, "scripts/git-context.mjs");
  const output = execFileSync(process.execPath, [helper], {
    cwd: unrelated,
    encoding: "utf8",
  });
  assert.match(output, /^branch: no-branch$/m);
  assert.match(output, /^commit: no-commit$/m);
  assert.match(output, /^repo: unknown$/m);
  assert.match(output, /^root: $/m);
  assert.match(output, /^in_repo: no$/m);
  assert.match(output, /^author: .+$/m);
});

test("Git metadata helper describes the caller repository, not the installed skill", () => {
  const helper = join(skillRoot, "scripts/git-context.mjs");
  const output = execFileSync(process.execPath, [helper], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  assert.match(output, /^branch: main$/m);
  assert.match(output, /^commit: [0-9a-f]+$/m);
  assert.match(output, /^repo: rpiv-codex$/m);
  assert.match(output, new RegExp(`^root: ${repositoryRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  assert.match(output, /^in_repo: yes$/m);
});
