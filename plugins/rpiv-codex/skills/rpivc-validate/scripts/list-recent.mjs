// List N most recently modified files in a directory, newest first, one per line.
// Relative directories resolve against the git root, or cwd outside a repository.
// A missing or empty directory is recoverable and produces empty stdout.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

const [rawDir = ".", nStr = "10"] = process.argv.slice(2);
const n = Math.max(1, Number.parseInt(nStr, 10) || 10);

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

const dir = isAbsolute(rawDir) ? rawDir : resolve(gitRoot || process.cwd(), rawDir);
if (!existsSync(dir)) process.exit(0);

const items = readdirSync(dir, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => ({ name: entry.name, mtime: statSync(join(dir, entry.name)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime)
  .slice(0, n);

for (const item of items) console.log(item.name);
