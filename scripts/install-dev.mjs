import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const run = (command, args, cwd) => execFileSync(command, args, { cwd, encoding: "utf8" });
const codex = (...args) => JSON.parse(run("codex", [...args, "--json"]));
const catalogPath = ".agents/plugins/marketplace.json";
const manifestPath = ".codex-plugin/plugin.json";

export function prepareCandidate(checkout, destination, plugin) {
  const catalog = readJson(join(checkout, catalogPath));
  const packagePath = `plugins/${plugin}`;
  const entry = catalog.plugins.find((item) => item.name === plugin);
  if (entry?.source?.source !== "local" || entry.source.path !== `./${packagePath}`) {
    throw new Error(`Unexpected source for ${plugin} in ${catalogPath}`);
  }
  const source = join(checkout, packagePath);
  const manifest = readJson(join(source, manifestPath));
  if (manifest.name !== plugin) throw new Error(`Unexpected plugin name: ${manifest.name}`);
  const version = `${manifest.version.split("+")[0]}+codex.local-${randomUUID()}`;
  const target = join(destination, packagePath);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, {
    recursive: true,
    filter(path) {
      if (lstatSync(path).isSymbolicLink()) throw new Error(`Cannot snapshot a symbolic link: ${path}`);
      return !["__pycache__", ".DS_Store"].includes(basename(path));
    },
  });
  mkdirSync(dirname(join(destination, catalogPath)), { recursive: true });
  writeJson(join(destination, catalogPath), {
    ...catalog,
    name: `${catalog.name}-dev`,
    interface: { ...catalog.interface, displayName: `${catalog.interface.displayName} Development` },
    plugins: [entry],
  });
  writeJson(join(target, manifestPath), { ...manifest, version });
  return version;
}

function installedPlugin(marketplace, plugin) {
  return codex("plugin", "list", "--marketplace", marketplace).installed.find((item) => item.name === plugin);
}

// Write both enablement flags together using Codex's config editor.
async function selectCopies(settings) {
  const child = spawn("codex", ["app-server", "--listen", "stdio://"], { stdio: ["pipe", "pipe", "inherit"] });
  const lines = createInterface({ input: child.stdout });
  const responses = lines[Symbol.asyncIterator]();
  child.stdin.on("error", () => {});
  const send = (method, params, id) => child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params, id })}\n`);
  const timer = setTimeout(() => child.kill(), 15000);
  try {
    await new Promise((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
    async function request(id, method, params) {
      send(method, params, id);
      for (let line = await responses.next(); !line.done; line = await responses.next()) {
        const response = JSON.parse(line.value);
        if (response.id !== id) continue;
        if (response.error) throw new Error(response.error.message);
        return response.result;
      }
      throw new Error(`Codex exited or timed out during ${method}`);
    }
    await request(1, "initialize", { clientInfo: { name: "local-plugin-installer", version: "1.0.0" } });
    send("initialized", {});
    const result = await request(2, "config/batchWrite", {
      edits: Object.entries(settings).map(([id, enabled]) => ({
        keyPath: `plugins.${id}.enabled`, value: enabled, mergeStrategy: "upsert",
      })),
    });
    if (result.status !== "ok") throw new Error(`Codex could not apply the requested selection: ${result.status}`);
  } finally {
    clearTimeout(timer);
    lines.close();
    child.kill();
  }
}

async function main(plugin, [mode, ...extra]) {
  if (mode === "-h" || mode === "--help") {
    process.stdout.write("Usage: ./scripts/install-dev.sh [--release]\nInstall and select a verified candidate from this checkout, or select the already installed GitHub copy.\n");
    return;
  }
  if (extra.length || (mode && mode !== "--release")) throw new Error("Usage: ./scripts/install-dev.sh [--release]");
  const checkout = realpathSync(fileURLToPath(new URL("..", import.meta.url)));
  const released = readJson(join(checkout, catalogPath)).name;
  const development = `${released}-dev`;
  const releaseId = `${plugin}@${released}`;
  const devId = `${plugin}@${development}`;
  const mainCheckout = run("git", ["worktree", "list", "--porcelain", "-z"], checkout).split("\0")[0];
  if (!mainCheckout.startsWith("worktree ")) throw new Error("Could not resolve the primary checkout");
  const local = join(realpathSync(mainCheckout.slice("worktree ".length)), ".local");
  mkdirSync(local, { recursive: true });
  if (realpathSync(local) !== local) throw new Error(`Refusing to use a symbolic link for ${local}`);
  const root = join(local, development);
  const lock = `${root}.lock`;
  mkdirSync(lock);
  try {
    const releasedInstall = installedPlugin(released, plugin);
    const previous = { [releaseId]: releasedInstall?.enabled ?? false, [devId]: installedPlugin(development, plugin)?.enabled ?? false };
    async function select(useDevelopment) {
      await selectCopies({ [releaseId]: !useDevelopment, [devId]: useDevelopment });
      const releaseEnabled = installedPlugin(released, plugin)?.enabled ?? false;
      const devEnabled = installedPlugin(development, plugin)?.enabled ?? false;
      if (releaseEnabled === useDevelopment || devEnabled !== useDevelopment) {
        throw new Error("Codex did not report the requested plugin selection");
      }
    }
    if (mode === "--release") {
      if (!releasedInstall) throw new Error(`Install the GitHub copy first: codex plugin add ${releaseId}`);
      if (!previous[releaseId] || previous[devId]) {
        try { await select(false); }
        catch (error) {
          try { await selectCopies(previous); }
          catch (recovery) { throw new Error(`${error.message}\nCould not restore plugin selection: ${recovery.message}`); }
          throw error;
        }
      }
      console.log(`Selected ${releaseId} ${releasedInstall.version}. Start a fresh Codex chat.`);
      return;
    }

    const registered = codex("plugin", "marketplace", "list").marketplaces.find((item) => item.name === development);
    if (registered && registered.root !== root) {
      throw new Error(`${development} already points to ${registered.root}. Expected ${root}. Resolve the registration before retrying.`);
    }
    const staging = mkdtempSync(`${root}-`);
    try {
      const version = prepareCandidate(checkout, staging, plugin);
      rmSync(root, { recursive: true, force: true });
      renameSync(staging, root);
      if (!registered) codex("plugin", "marketplace", "add", root);
      try {
        const installed = codex("plugin", "add", devId);
        if (installed.version !== version || !installed.installedPath) throw new Error(`Codex did not install candidate ${version}`);
        execFileSync("diff", ["-qr", join(root, "plugins", plugin), installed.installedPath], { stdio: "inherit" });
        await select(true);
      } catch (error) {
        try { await selectCopies({ [releaseId]: Boolean(releasedInstall), [devId]: false }); }
        catch (recovery) { throw new Error(`${error.message}\nCould not disable the failed candidate: ${recovery.message}`); }
        throw error;
      }
      console.log(`Installed and verified ${devId} ${version} from ${checkout}. Start a fresh Codex chat.`);
    } finally {
      rmSync(staging, { recursive: true, force: true });
    }
  } finally {
    rmSync(lock, { recursive: true, force: true });
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv[2], process.argv.slice(3)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
