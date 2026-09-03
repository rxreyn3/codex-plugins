import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const marketplacePath = join(repositoryRoot, ".agents/plugins/marketplace.json");
const pluginRoot = join(repositoryRoot, "plugins/rpiv-codex");
const manifestPath = join(pluginRoot, ".codex-plugin/plugin.json");
const skillsRoot = join(pluginRoot, "skills");

const read = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(read(path));
const walkFiles = (root) =>
  readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });

test("plugin packaging is valid and every skill is self-contained", () => {
  const marketplace = json(marketplacePath);
  assert.equal(marketplace.name, "rpiv-codex");
  assert.equal(marketplace.interface.displayName, "RPIV Codex");
  const entry = marketplace.plugins.find((plugin) => plugin.name === "rpiv-codex");
  assert.ok(entry);
  assert.equal(resolve(repositoryRoot, entry.source.path), pluginRoot);

  const manifest = json(manifestPath);
  assert.equal(manifest.name, "rpiv-codex");
  assert.match(manifest.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/);
  assert.doesNotMatch(manifest.version, /\+codex\./);
  assert.equal(resolve(pluginRoot, manifest.skills), skillsRoot);

  const skillNames = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.ok(skillNames.includes("rpivc-discover"));
  assert.ok(skillNames.includes("rpivc-research"));
  assert.ok(skillNames.includes("rpivc-blueprint"));
  assert.ok(skillNames.includes("rpivc-design"));
  assert.ok(skillNames.includes("rpivc-plan"));
  assert.ok(skillNames.includes("rpivc-revise"));
  assert.ok(skillNames.includes("rpivc-implement"));
  assert.ok(skillNames.includes("rpivc-validate"));
  assert.ok(skillNames.includes("rpivc-code-review"));
  assert.ok(skillNames.includes("rpivc-commit"));
  assert.ok(skillNames.includes("rpivc-create-handoff"));
  assert.ok(skillNames.includes("rpivc-resume-handoff"));

  for (const skillName of skillNames) {
    const skillRoot = join(skillsRoot, skillName);
    const skillPath = join(skillRoot, "SKILL.md");
    assert.ok(existsSync(skillPath), skillPath);

    const policy = read(join(skillRoot, "agents/openai.yaml"));
    assert.match(policy, /allow_implicit_invocation:\s*false/);

    const skill = read(skillPath);
    const authoredMarkdown = skill
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`\n]*`/g, "");
    for (const match of authoredMarkdown.matchAll(/\]\((?!https?:\/\/)([^)#]+)(?:#[^)]+)?\)/g)) {
      assert.ok(existsSync(resolve(skillRoot, match[1])), `${skillName} missing ${match[1]}`);
    }
  }

  const forbidden = [
    "rpiv-mono",
    ".codex/agents",
    ".agents/skills/port-rpiv-skill",
    "/Users/ryan.reynolds",
    "${SKILL_DIR}/../_shared",
  ];
  for (const path of walkFiles(skillsRoot)) {
    for (const value of forbidden) {
      assert.equal(read(path).includes(value), false, `${relative(repositoryRoot, path)} contains ${value}`);
    }
  }
});

test("every skill uses the self-contained lettered prose choice contract", () => {
  const skillNames = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const skillName of skillNames) {
    const skill = read(join(skillsRoot, skillName, "SKILL.md"));
    assert.match(skill, /^## Choice response format$/m, skillName);
    assert.match(skill, /prefer native structured input without letter prefixes/, skillName);
    assert.match(skill, /render the same options in prose as `A\.` through `D\.`/, skillName);
    assert.match(skill, /Preserve the recommended option first so it becomes `A`/, skillName);
    assert.match(skill, /write `Reply with A, B, \.\.\.` using only the letters actually shown/, skillName);
    assert.match(skill, /Add `, or write another answer` only when .* permits a custom response/, skillName);
    assert.match(skill, /Accept an uppercase or lowercase letter, the full option label/, skillName);
    assert.match(skill, /Reset the letters for every new question/, skillName);
    assert.match(skill, /Do not letter open-ended requests/, skillName);
  }
});

test("every skill renders recommended actions as labels plus arguments-only fences", () => {
  const skillNames = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const skillName of skillNames) {
    const skill = read(join(skillsRoot, skillName, "SKILL.md"));
    assert.match(skill, /^## Recommended action format$/m, skillName);
    assert.match(skill, /Recommended next step: \*\*\{Action\}\*\*/, skillName);
    assert.match(skill, /Never put `\$`, a skill identifier, or explanatory prose inside the arguments fence/, skillName);
    assert.doesNotMatch(skill, /Next step[^\n]*\$rpivc-/i, skillName);
  }

  const expectedHandoffs = new Map([
    [
      "rpivc-discover",
      "Recommended next step: **Research**\n\n```text\n.rpiv/artifacts/discover/<slug>_<topic>.md\n```",
    ],
    [
      "rpivc-research",
      "**Blueprint**\n\n```text\n.rpiv/artifacts/research/{filename}.md\n```",
    ],
    [
      "rpivc-blueprint",
      "Recommended next step: **Implement**\n\n```text\n.rpiv/artifacts/plans/{filename}.md Phase 1\n```",
    ],
    [
      "rpivc-design",
      "Recommended next step: **Plan**\n\n```text\n.rpiv/artifacts/designs/{filename}.md\n```",
    ],
    [
      "rpivc-plan",
      "Recommended next step: **Implement**\n\n```text\n.rpiv/artifacts/plans/{filename}.md Phase 1\n```",
    ],
    [
      "rpivc-implement",
      "Recommended next step: **Validate**\n\n```text\n.rpiv/artifacts/plans/{filename}.md\n```",
    ],
    [
      "rpivc-revise",
      "Recommended next step: **Implement**\n\n```text\n.rpiv/artifacts/plans/{filename}.md Phase {N}\n```",
    ],
    ["rpivc-validate", "Recommended next step: **Commit**"],
    [
      "rpivc-create-handoff",
      "Recommended next step: **Resume Handoff**\n\n```text\n.rpiv/artifacts/handoffs/{timestamp}_{description}.md\n```",
    ],
    [
      "rpivc-code-review",
      "Recommended next step: **Blueprint**\n\n```text\n.rpiv/artifacts/reviews/{filename}.md \"Address the verified review findings\"\n```",
    ],
  ]);

  for (const [skillName, handoff] of expectedHandoffs) {
    assert.ok(read(join(skillsRoot, skillName, "SKILL.md")).includes(handoff), skillName);
  }
});
