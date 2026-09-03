// List the N most recently modified files in a directory, newest first.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

const [rawDir = ".", nStr = "10"] = process.argv.slice(2);
const count = Math.max(1, Number.parseInt(nStr, 10) || 10);

const gitRoot = (() => {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
})();

const directory = isAbsolute(rawDir)
  ? rawDir
  : resolve(gitRoot || process.cwd(), rawDir);

if (!existsSync(directory)) process.exit(0);

const items = readdirSync(directory, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => ({
    name: entry.name,
    mtime: statSync(join(directory, entry.name)).mtimeMs,
  }))
  .sort((left, right) => right.mtime - left.mtime)
  .slice(0, count);

for (const item of items) console.log(item.name);
