#!/usr/bin/env node

import { cpSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const developmentRoot = join(repositoryRoot, ".local", "rpiv-codex-dev");
const sourcePlugin = join(repositoryRoot, "plugins", "rpiv-codex");
const sourceMarketplace = join(repositoryRoot, ".agents", "plugins", "marketplace.json");

if (!developmentRoot.startsWith(`${repositoryRoot}/.local/`)) {
  throw new Error(`Refusing to rebuild unexpected path: ${developmentRoot}`);
}

rmSync(developmentRoot, { recursive: true, force: true });
mkdirSync(join(developmentRoot, ".agents", "plugins"), { recursive: true });
mkdirSync(join(developmentRoot, "plugins"), { recursive: true });
cpSync(sourcePlugin, join(developmentRoot, "plugins", "rpiv-codex"), { recursive: true });

const marketplace = JSON.parse(readFileSync(sourceMarketplace, "utf8"));
marketplace.name = "rpiv-codex-dev";
marketplace.interface.displayName = "RPIV Codex Development";
writeFileSync(
  join(developmentRoot, ".agents", "plugins", "marketplace.json"),
  `${JSON.stringify(marketplace, null, 2)}\n`,
);

const manifestPath = join(developmentRoot, "plugins", "rpiv-codex", ".codex-plugin", "plugin.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const baseVersion = manifest.version.split("+")[0];
const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
manifest.version = `${baseVersion}+codex.local-${timestamp}`;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

process.stdout.write(`${JSON.stringify({
  candidateCommit: process.env.RPIV_CODEX_CANDIDATE_COMMIT ?? "unknown",
  developmentRoot: realpathSync(developmentRoot),
  version: manifest.version,
})}\n`);
