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
  const entry = marketplace.plugins.find((plugin) => plugin.name === "rpiv-codex");
  assert.ok(entry);
  assert.equal(resolve(repositoryRoot, entry.source.path), pluginRoot);

  const manifest = json(manifestPath);
  assert.equal(manifest.name, "rpiv-codex");
  assert.match(manifest.version, /^0\.1\.0\+codex\.[A-Za-z0-9.-]+$/);
  assert.equal(resolve(pluginRoot, manifest.skills), skillsRoot);

  const skillNames = readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.ok(skillNames.includes("rpivc-discover"));
  assert.ok(skillNames.includes("rpivc-research"));
  assert.ok(skillNames.includes("rpivc-blueprint"));
  assert.ok(skillNames.includes("rpivc-revise"));
  assert.ok(skillNames.includes("rpivc-implement"));

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
