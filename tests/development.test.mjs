import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, existsSync, realpathSync, writeFileSync, chmodSync } from "node:fs";
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

test("plugin validation uses the pinned source with no installed system validator and preserves failures", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "codex-plugin-validator-runner-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const binary = join(directory, "uv");
  const log = join(directory, "calls.jsonl");
  writeFileSync(binary, `#!${process.execPath}
const fs = require("node:fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.VALIDATOR_CALL_LOG, JSON.stringify(args) + "\\n");
if (process.env.VALIDATOR_FAIL === "yes") process.exit(7);
`);
  chmodSync(binary, 0o755);
  const env = {
    ...process.env,
    PATH: `${directory}:${process.env.PATH}`,
    CODEX_HOME: join(directory, "absent-codex-home"),
    VALIDATOR_CALL_LOG: log,
  };
  const run = () => execFileSync("bash", [join(repositoryRoot, "scripts/validate-plugin.sh")], {
    cwd: repositoryRoot, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  run();
  const calls = readFileSync(log, "utf8").trim().split("\n").map(JSON.parse);
  const validator = join(repositoryRoot, "scripts/vendor/codex-plugin-validator/validate_plugin.py");
  assert.ok(existsSync(validator));
  assert.ok(existsSync(join(dirname(validator), "identifier_validation.py")));
  assert.deepEqual(calls, ["rpiv-codex", "codex-advisor"].map((plugin) => [
    "run", "--no-project", "--with", "pyyaml", "python", "-B", validator, join(repositoryRoot, "plugins", plugin),
  ]));
  writeFileSync(log, "");
  env.VALIDATOR_FAIL = "yes";
  assert.throws(run, (error) => error.status === 7);
  assert.equal(readFileSync(log, "utf8").trim().split("\n").length, 1);
});
