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
import { readFileSync } from "node:fs";

const LINE_CAP = 200;

// A workflow may pass its run-start snapshot of paths that were already dirty.
// Those paths are displayed separately and excluded from commit scope.
const baselineFlagIdx = process.argv.indexOf("--baseline");
const BASELINE_PATH = baselineFlagIdx >= 0 ? process.argv[baselineFlagIdx + 1] : undefined;

// Git short status uses two status columns plus a space. For a rename or copy,
// the committed path is the destination on the right side of `old -> new`.
const statusPath = (line) => {
	const rest = line.slice(3).trim();
	const arrow = rest.indexOf(" -> ");
	return arrow >= 0 ? rest.slice(arrow + 4).trim() : rest;
};

const readBaseline = () => {
	if (!BASELINE_PATH) return new Set();
	try {
		const parsed = JSON.parse(readFileSync(BASELINE_PATH, "utf-8"));
		return new Set(Array.isArray(parsed?.paths) ? parsed.paths.filter((path) => typeof path === "string") : []);
	} catch {
		return new Set();
	}
};

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

const baseline = readBaseline();
const statusLines = safe(["status", "--short"], "")
	.split("\n")
	.filter((line) => line.trim() !== "");
const inScope = [];
const preExisting = [];
for (const line of statusLines) {
	(baseline.has(statusPath(line)) ? preExisting : inScope).push(line);
}

process.stdout.write("---status---\n");
emitCapped(inScope.join("\n"), "(working tree clean)");

if (preExisting.length > 0) {
	process.stdout.write("---pre-existing (do NOT commit — dirty before this run)---\n");
	emitCapped(preExisting.join("\n"), "(none)");
}

const hasHead = safe(["rev-parse", "--verify", "--quiet", "HEAD"], "") !== "";
process.stdout.write("---diffstat---\n");
if (!hasHead) {
	process.stdout.write("(no HEAD yet — initial commit; status above lists all files to be added)\n");
} else {
	emitCapped(safe(["diff", "HEAD", "--stat", "--ignore-submodules=all"], ""), "(no changes against HEAD)");
}
