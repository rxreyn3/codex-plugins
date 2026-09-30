import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("development builds contain only resolvable copied plugins and unique versions", () => {
  const fixture = mkdtempSync(join(tmpdir(), "codex-marketplace-test-"));
  try {
    for (const directory of ["scripts", "plugins", ".agents/plugins"]) {
      mkdirSync(join(fixture, directory), { recursive: true });
    }
    cpSync(join(repositoryRoot, "scripts/prepare-dev-marketplace.mjs"), join(fixture, "scripts/prepare-dev-marketplace.mjs"));
    cpSync(join(repositoryRoot, "plugins/rpiv-codex"), join(fixture, "plugins/rpiv-codex"), { recursive: true });
    cpSync(join(repositoryRoot, ".agents/plugins/marketplace.json"), join(fixture, ".agents/plugins/marketplace.json"));
    const sourceManifest = join(fixture, "plugins/rpiv-codex/.codex-plugin/plugin.json");
    const sourceCatalog = join(fixture, ".agents/plugins/marketplace.json");
    const beforeManifest = readFileSync(sourceManifest, "utf8");
    const beforeCatalog = readFileSync(sourceCatalog, "utf8");
    const build = () => JSON.parse(execFileSync(process.execPath, [join(fixture, "scripts/prepare-dev-marketplace.mjs")], { encoding: "utf8" }));
    const first = build();
    const second = build();
    assert.notEqual(first.version, second.version);
    assert.equal(second.developmentRoot, realpathSync(join(fixture, ".local/ryan-codex-dev")));
    const catalog = JSON.parse(readFileSync(join(second.developmentRoot, ".agents/plugins/marketplace.json"), "utf8"));
    assert.equal(catalog.name, "ryan-codex-dev");
    assert.deepEqual(catalog.plugins.map((plugin) => plugin.name), ["rpiv-codex"]);
    for (const plugin of catalog.plugins) {
      assert.ok(existsSync(join(second.developmentRoot, plugin.source.path, ".codex-plugin/plugin.json")));
    }
    const builtManifest = JSON.parse(readFileSync(join(second.developmentRoot, "plugins/rpiv-codex/.codex-plugin/plugin.json"), "utf8"));
    assert.equal(builtManifest.version, second.version);
    assert.ok(second.version.startsWith(`${JSON.parse(beforeManifest).version}+codex.local-`));
    assert.equal(readFileSync(sourceManifest, "utf8"), beforeManifest);
    assert.equal(readFileSync(sourceCatalog, "utf8"), beforeCatalog);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
