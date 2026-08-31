// Print six labeled lines summarising the current cwd's git state.
// Every failure collapses to a stable fallback and the helper always exits 0.
import { execFileSync } from "node:child_process";
import { basename } from "node:path";

const safe = (args, fallback) => {
  try {
    const output = execFileSync("git", args, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return output || fallback;
  } catch {
    return fallback;
  }
};

const root = safe(["rev-parse", "--show-toplevel"], "");
process.stdout.write(
  [
    `branch: ${safe(["branch", "--show-current"], "no-branch")}`,
    `commit: ${safe(["rev-parse", "--short", "HEAD"], "no-commit")}`,
    `repo: ${root ? basename(root) : "unknown"}`,
    `root: ${root}`,
    `in_repo: ${root ? "yes" : "no"}`,
    `author: ${safe(["config", "user.name"], "unknown")}`,
    "",
  ].join("\n"),
);
