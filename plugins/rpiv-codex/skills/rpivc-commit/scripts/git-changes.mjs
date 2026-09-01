// Pre-bake the "what's changed" snapshot for the commit skill.
//
// Prints:
//   in_repo: yes|no
//   ---status---
//   <git status --short>            (capped at 200 lines + footer)
//   ---diffstat---
//   <git diff HEAD --stat --ignore-submodules=all>  | fallback for no-HEAD
//
// Full `git diff` is deliberately NOT included because large diffs can crowd
// the skill context. The parent skill inspects individual files when needed.
//
// Always exits 0. A non-repository working directory or a repository without
// HEAD collapses to safe fallback strings instead of emitting a shell error.
import { execFileSync } from "node:child_process";

const LINE_CAP = 200;

const safe = (args, fallback) => {
	try {
		return execFileSync("git", args, {
			encoding: "utf-8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return fallback;
	}
};

const emitCapped = (raw, emptyLabel) => {
	const lines = raw.split("\n");
	const trailingEmpty = lines.length > 0 && lines.at(-1) === "";
	const real = trailingEmpty ? lines.slice(0, -1) : lines;
	if (real.length === 0 || (real.length === 1 && real[0] === "")) {
		process.stdout.write(`${emptyLabel}\n`);
	} else if (real.length > LINE_CAP) {
		process.stdout.write(real.slice(0, LINE_CAP).join("\n"));
		process.stdout.write(`\n(... ${real.length - LINE_CAP} more files truncated ...)\n`);
	} else {
		process.stdout.write(`${real.join("\n")}\n`);
	}
};

const root = safe(["rev-parse", "--show-toplevel"], "");
const inRepo = root ? "yes" : "no";

process.stdout.write(`in_repo: ${inRepo}\n`);

if (!root) {
	process.exit(0);
}

process.stdout.write("---status---\n");
emitCapped(safe(["status", "--short"], ""), "(working tree clean)");

const hasHead = safe(["rev-parse", "--verify", "--quiet", "HEAD"], "") !== "";
process.stdout.write("---diffstat---\n");
if (!hasHead) {
	process.stdout.write("(no HEAD yet — initial commit; status above lists all files to be added)\n");
} else {
	emitCapped(safe(["diff", "HEAD", "--stat", "--ignore-submodules=all"], ""), "(no changes against HEAD)");
}
