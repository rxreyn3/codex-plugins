// Conservatively partition locked prior phases by file or distinctive-symbol overlap.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const FENCE_RE = /```[^\n]*\n([\s\S]*?)```/g;
const IDENT_RE = /[A-Za-z_][A-Za-z0-9_$]*/g;
const FILE_TOKEN_RE = /[A-Za-z0-9_./@-]+\.[A-Za-z0-9]+/g;

function looksLikePath(value) {
  return /\.[A-Za-z0-9]+$/.test(value) &&
    (value.includes("/") || /^[\w.-]+\.[A-Za-z0-9]+$/.test(value));
}

function distinctive(value) {
  return value.length >= 5 &&
    (/[a-z][A-Z]/.test(value) ||
      /^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(value) ||
      /[A-Za-z]_[A-Za-z]/.test(value));
}

export function parseUnits(text, keyword) {
  const lines = text.split("\n");
  const heading = new RegExp(`^#{2,4}\\s+${keyword}\\s+(\\d+)\\b`, "i");
  const marks = [];
  for (let line = 0; line < lines.length; line += 1) {
    const match = lines[line].match(heading);
    if (match) marks.push({ num: Number(match[1]), line, heading: lines[line].trim() });
  }
  return marks.map((mark, index) => {
    const end = index + 1 < marks.length ? marks[index + 1].line : lines.length;
    return {
      id: `${keyword} ${mark.num}`,
      num: mark.num,
      heading: mark.heading,
      body: lines.slice(mark.line, end).join("\n"),
    };
  });
}

function fencesOf(body) {
  return [...body.matchAll(FENCE_RE)].map((match) => match[1]);
}

function filesOf(body) {
  const files = new Set();
  const add = (raw) => {
    const path = raw.replace(/[`*]/g, "").trim();
    if (path && looksLikePath(path)) files.add(path);
  };
  for (const line of body.split("\n")) {
    const field = line.match(/^\*\*Files?\*\*:\s*(.+)$/);
    if (field) for (const token of field[1].split(/[,\s]+/)) add(token);
    const heading = line.match(/^#{3,4}\s+\d+\.\s+(\S+)/);
    if (heading) add(heading[1]);
  }
  return files;
}

export function symbolsOf(fences) {
  const symbols = new Set();
  const body = fences.join("\n");
  for (const match of body.matchAll(IDENT_RE)) {
    if (distinctive(match[0])) symbols.add(match[0]);
  }
  for (const match of body.matchAll(FILE_TOKEN_RE)) symbols.add(match[0]);
  return symbols;
}

function intersects(left, right) {
  for (const value of left) if (right.has(value)) return value;
  return null;
}

export function partition(text, sliceId) {
  const keyword = String(sliceId).trim().split(/\s+/)[0] || "Phase";
  const number = String(sliceId).match(/(\d+)/);
  const units = parseUnits(text, keyword);
  const currentIndex = number
    ? units.findIndex((unit) => unit.num === Number(number[1]))
    : units.length - 1;

  if (currentIndex < 0) {
    return {
      unitKind: keyword,
      currentId: sliceId,
      error: "current unit not found",
      currentFiles: [],
      priorCount: units.length,
      overlapping: units.map((unit) => unit.id),
      collapsed: [],
      detail: units.map((unit) => `${unit.id}  reason: current-unit-unresolved`),
    };
  }

  const current = units[currentIndex];
  const priors = units.slice(0, currentIndex);
  const currentFiles = filesOf(current.body);
  const currentFences = fencesOf(current.body);
  const currentSymbols = symbolsOf(currentFences);
  const blindCurrent = currentFiles.size === 0 && currentFences.length === 0;
  const overlapping = [];
  const collapsed = [];
  const detail = [];

  for (const prior of priors) {
    const priorFiles = filesOf(prior.body);
    const priorFences = fencesOf(prior.body);
    const blindPrior = priorFiles.size === 0 && priorFences.length === 0;
    let reason = null;
    if (blindCurrent) reason = "current-unit-opaque";
    else if (blindPrior) reason = "prior-unit-opaque";
    else {
      const sharedFile = intersects(priorFiles, currentFiles);
      if (sharedFile) reason = `file: ${sharedFile}`;
      else {
        const sharedSymbol = intersects(symbolsOf(priorFences), currentSymbols);
        if (sharedSymbol) reason = `symbol: ${sharedSymbol}`;
      }
    }

    if (reason) {
      overlapping.push(prior.id);
      detail.push(`${prior.id}  ${reason}`);
    } else {
      collapsed.push(prior.id);
    }
  }

  return {
    unitKind: keyword,
    currentId: current.id,
    currentFiles: [...currentFiles],
    priorCount: priors.length,
    overlapping,
    collapsed,
    detail,
  };
}

function renderList(ids) {
  return ids.length ? `${ids.length} — ${ids.join(", ")}` : "0";
}

function main() {
  const [, , artifactPath, sliceId] = process.argv;
  if (!artifactPath || !sliceId) {
    process.stderr.write('usage: slice-overlap.mjs "<artifact_path>" "<slice_id>"\n');
    process.exit(2);
  }

  let artifact;
  try {
    artifact = readFileSync(artifactPath, "utf8");
  } catch (error) {
    process.stderr.write(`cannot read artifact: ${error.message}\n`);
    process.exit(2);
  }

  const result = partition(artifact, sliceId);
  const lines = [
    `slice_id:        ${result.currentId}`,
    `unit_kind:       ${result.unitKind}`,
    `current_files:   ${result.currentFiles.length ? result.currentFiles.join(", ") : "(none)"}`,
    `prior_units:     ${result.priorCount ?? 0}`,
    `overlapping:     ${renderList(result.overlapping)}`,
    `non_overlapping: ${renderList(result.collapsed)}`,
    "---overlapping-detail---",
    ...(result.detail.length ? result.detail : ["(none)"]),
  ];
  if (result.error) lines.unshift(`note:            ${result.error}`);
  process.stdout.write(lines.join("\n"));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
