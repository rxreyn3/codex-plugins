// Print six labeled lines summarising the current cwd's git state.
// Always exits 0 — every failure path collapses to a stable fallback so the
// skill body never receives a shell error substitution.
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
