#!/usr/bin/env node

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { contextSnapshot } from "./context-snapshot.mjs";

const requiredArtifactFields = [
  "stage",
  "status",
  "rpiv_source",
  "rpiv_commit",
  "supersedes",
  "source_artifacts",
  "repository",
  "branch",
  "commit",
  "working_tree_sha256",
  "working_tree_scope",
  "created_at",
];

const requiredResearchSections = [
  "Source Feature",
  "Research Questions",
  "Summary",
  "Coverage Ledger",
  "Detailed Findings",
  "Code References",
  "Integration Points",
  "Architecture Insights",
  "Precedents & Lessons",
  "Developer Context",
  "Evidence Conflicts and Gaps",
  "Historical Context",
  "Open Questions",
  "Dispatch Ledger",
];

function fail(message) {
  throw new Error(message);
}

function yamlValue(raw) {
  const value = raw.trim();
  if (value.startsWith('"') || value.startsWith("[") || value.startsWith("{")) {
    try {
      return JSON.parse(value);
    } catch {
      fail(`unsupported frontmatter value: ${value}`);
    }
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  return value;
}

export function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---") fail("file must begin with YAML frontmatter");
  const end = lines.indexOf("---", 1);
  if (end < 0) fail("frontmatter closing delimiter is missing");
  const values = {};
  for (const line of lines.slice(1, end)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = /^([a-zA-Z0-9_]+):\s*(.*)$/.exec(line);
    if (!match) fail(`unsupported frontmatter line: ${line}`);
    values[match[1]] = yamlValue(match[2]);
  }
  return values;
}

function locateArtifact(input, context) {
  const absolute = path.resolve(input);
  if (!fs.existsSync(absolute)) fail(`artifact does not exist: ${input}`);
  if (!fs.statSync(absolute).isFile()) fail(`artifact is not a regular file: ${input}`);
  const real = fs.realpathSync(absolute);
  const relative = path.relative(context.repository, real);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    fail("artifact must be inside the current Git repository");
  }
  const normalized = relative.split(path.sep).join("/");
  const match = /^\.rpiv-codex\/artifacts\/([a-z0-9-]+)\/([^/]+\.md)$/.exec(normalized);
  if (!match) {
    fail("artifact must be Markdown under .rpiv-codex/artifacts/<stage>/");
  }
  return { absolute: real, relative: normalized, stage: match[1] };
}

function readArtifact(input, cwd) {
  const context = contextSnapshot(cwd);
  const location = locateArtifact(input, context);
  const bytes = fs.readFileSync(location.absolute);
  const text = bytes.toString("utf8");
  const metadata = parseFrontmatter(text);
  for (const field of requiredArtifactFields) {
    if (!(field in metadata)) fail(`artifact frontmatter is missing required field: ${field}`);
  }
  if (metadata.status !== "review") fail('artifact frontmatter status must be "review"');
  if (metadata.stage !== location.stage) fail("artifact stage does not match its directory");
  return {
    location,
    metadata,
    context,
    byte_length: bytes.length,
    artifact_sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    text,
  };
}

function localMarkdownLinks(text) {
  return [...text.matchAll(/\[([^\]\n]+)\]\((?:<([^>\n]+)>|(\/[^)\n]+))\)/g)]
    .map((match) => ({ label: match[1], target: match[2] || match[3], index: match.index }));
}

const coverageStatuses = ["Answered", "Partial", "Conflicted", "Unanswered"];

export function parseCoverageProjection(text, subject = "research output", options = {}) {
  const requireRows = options.requireRows !== false;
  const snapshots = [...String(text).matchAll(
    /^- Coverage snapshot: ((?:Q[0-9]+=(?:Answered|Partial|Conflicted|Unanswered)(?:; )?)+) \| Totals: Answered=([0-9]+), Partial=([0-9]+), Conflicted=([0-9]+), Unanswered=([0-9]+)$/gm,
  )];
  if (snapshots.length !== 1) {
    fail(`${subject} must contain exactly one canonical coverage snapshot`);
  }
  const snapshot = snapshots[0];
  const statusPairs = [...snapshot[1].matchAll(/Q([0-9]+)=(Answered|Partial|Conflicted|Unanswered)/g)]
    .map((match) => ({ question: Number(match[1]), status: match[2] }));
  const statusByQuestion = new Map();
  for (const pair of statusPairs) {
    if (statusByQuestion.has(pair.question)) fail(`${subject} coverage snapshot repeats Q${pair.question}`);
    statusByQuestion.set(pair.question, pair.status);
  }
  const expectedQuestions = Array.from({ length: statusPairs.length }, (_value, index) => index + 1);
  if (statusPairs.length === 0
    || expectedQuestions.some((question) => !statusByQuestion.has(question))) {
    fail(`${subject} coverage snapshot question identifiers must be contiguous from Q1`);
  }
  const declaredTotals = Object.fromEntries(coverageStatuses.map((status, index) => [status, Number(snapshot[index + 2])]));
  const actualTotals = Object.fromEntries(coverageStatuses.map((status) => [
    status,
    statusPairs.filter((pair) => pair.status === status).length,
  ]));
  if (coverageStatuses.some((status) => declaredTotals[status] !== actualTotals[status])) {
    fail(`${subject} coverage totals do not match its question statuses`);
  }

  const rows = [...String(text).matchAll(
    /^- Q([0-9]+) — \*\*(Answered|Partial|Conflicted|Unanswered)\*\* — Clauses: (.+)$/gm,
  )].map((match) => ({ question: Number(match[1]), status: match[2], clauses: match[3] }));
  if (requireRows && rows.length !== statusPairs.length) {
    fail(`${subject} must contain one canonical clause row for every coverage question`);
  }
  const rowQuestions = new Set();
  for (const row of rows) {
    if (rowQuestions.has(row.question)) fail(`${subject} coverage rows repeat Q${row.question}`);
    rowQuestions.add(row.question);
    if (statusByQuestion.get(row.question) !== row.status) {
      fail(`${subject} Q${row.question} status differs between its snapshot and clause row`);
    }
    if (row.status === "Answered"
      && /\b(?:unanswered|unsupported|missing (?:clause|evidence)|not (?:evidenced|demonstrated|inspected|performed|found|checked|covered))\b/i.test(row.clauses)) {
      fail(`${subject} Q${row.question} is Answered but its clause row declares a gap`);
    }
  }
  if (requireRows && expectedQuestions.some((question) => !rowQuestions.has(question))) {
    fail(`${subject} coverage rows must be contiguous from Q1`);
  }
  return {
    line: snapshot[0],
    status_by_question: Object.fromEntries(statusPairs.map(({ question, status }) => [`Q${question}`, status])),
    totals: actualTotals,
    rows,
  };
}

function normalizedLocalCitation(read, link) {
  const normalizedTarget = link.target.replace(
    /#L([0-9]+)(?:-L([0-9]+))?$/,
    (_match, start, end) => `:${start}${end ? `-${end}` : ""}`,
  );
  const range = targetLineRange(normalizedTarget);
  if (!fs.existsSync(targetFile(normalizedTarget))) return null;
  const file = fs.realpathSync(targetFile(normalizedTarget));
  const relative = path.relative(read.context.repository, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  if (!range) return `[${link.label}](${file})`;
  const normalized = relative.split(path.sep).join("/");
  const suffix = range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`;
  return `[${normalized}:${suffix}](${file}:${suffix})`;
}

export function normalizeLocalMarkdownCitations(input, cwd = process.cwd()) {
  const read = readArtifact(input, cwd);
  let changed = 0;
  const normalizedText = read.text.replace(
    /\[([^\]\n]+)\]\((?:<([^>\n]+)>|(\/[^)\n]+))\)/g,
    (source, label, angleTarget, plainTarget) => {
      const replacement = normalizedLocalCitation(read, {
        label,
        target: angleTarget || plainTarget,
      });
      if (!replacement || replacement === source) return source;
      changed += 1;
      return replacement;
    },
  );
  if (changed > 0) fs.writeFileSync(read.location.absolute, normalizedText);
  const bytes = fs.readFileSync(read.location.absolute);
  return {
    artifact: read.location.relative,
    normalized_citation_count: changed,
    artifact_sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

function semanticEvidenceDefects(relativeTarget, claim, sourceExcerpt) {
  const defects = [];
  if (relativeTarget.endsWith(".agents/skills/_shared/scripts/artifact-path.mjs")) {
    if (/\b(?:unknown|invalid|unsupported) stage\b|\bthrows? for (?:an )?unknown stage\b/i.test(claim)
      && !/stageSources\.has[\s\S]*throw new Error/.test(sourceExcerpt)) {
      defects.push("unknown-stage claim does not cite the stage guard and throw");
    }
  }
  if (relativeTarget.endsWith(".agents/skills/_shared/scripts/artifact-check.mjs")) {
    if (/\bscan preparation\b/i.test(claim)
      && /\b(?:validates?|checks?) coverage\b/i.test(claim)
      && !/parseCoverageProjection/.test(sourceExcerpt)) {
      defects.push("scan-coverage claim does not cite parseCoverageProjection");
    }
    if (/\bscan preparation\b/i.test(claim)
      && /\b(?:validates?|checks?) citations?\b/i.test(claim)
      && !/(?:localMarkdownLinks|validateCitationLabel|targetLineRange)/.test(sourceExcerpt)) {
      defects.push("scan-citation claim does not cite a citation check");
    }
    if (/\b(?:returns?|emits?) (?:prepared )?normalized Markdown\b/i.test(claim)
      && !/normalized_markdown/.test(sourceExcerpt)) {
      defects.push("normalized-Markdown return claim does not cite the returned field");
    }
    if (/\bcitation validation\b/i.test(claim)
      && /\b(?:format|labels?|evidence[- ]line counts?)\b/i.test(claim)) {
      if (/\blabels?\b/i.test(claim) && !/validateCitationLabel/.test(sourceExcerpt)) {
        defects.push("citation-label claim does not cite validateCitationLabel");
      }
      if (/\bevidence[- ]line counts?\b/i.test(claim) && !/citationCountByLine/.test(sourceExcerpt)) {
        defects.push("citation-count claim does not cite citationCountByLine");
      }
    }
    if (/\b(?:citation )?width\b|\b(?:fifteen|15) lines?\b|\btoo broad\b/i.test(claim)
      && !/(?:lineSpan|>\s*15|at most 15 lines)/.test(sourceExcerpt)) {
      defects.push("citation-width claim does not cite the research-width check");
    }
    if (/\bcontiguous\b/i.test(claim) && !/contiguous/i.test(sourceExcerpt)) {
      defects.push("contiguous-coverage claim does not cite the contiguous-identifier check");
    }
    if (/\bcoverage totals?\b|\btotals? (?:must|match|validation|check)/i.test(claim)
      && !/(?:declaredTotals|actualTotals|coverage totals)/.test(sourceExcerpt)) {
      defects.push("coverage-total claim does not cite the totals check");
    }
    if (/\b(?:clause|question|coverage)[- ]rows?\b/i.test(claim)
      && !/(?:const rows|coverage rows|row\.status|rows\.length)/.test(sourceExcerpt)) {
      defects.push("coverage-row claim does not cite a row check");
    }
  }
  if (relativeTarget.endsWith("evals/research/runtime-attestation.mjs")) {
    if (/\b(?:overall|final) verdict\b[\s\S]*\b(?:every|all) (?:runtime )?checks?\b/i.test(claim)
      && !/Object\.values\(checks\)\.every\(Boolean\)/.test(sourceExcerpt)) {
      defects.push("overall runtime verdict does not cite the every-check pass expression");
    }
    if (/\b(?:no[- ]history|without history|history settings?)\b/i.test(claim)
      && !/context_mode_matches[\s\S]*fork_turns\s*===\s*"none"/.test(sourceExcerpt)) {
      defects.push("no-history verdict does not cite context_mode_matches");
    }
    if (/\b(?:completion|completed)\b/i.test(claim)
      && !/(?:child_completed|completion\?\.status\s*===\s*"completed")/.test(sourceExcerpt)) {
      defects.push("completion verdict does not cite child_completed");
    }
    if (/\boutput(?: hash| observed)?\b/i.test(claim)
      && !/(?:child_output_observed|content_sha256)/.test(sourceExcerpt)) {
      defects.push("output verdict does not cite child_output_observed");
    }
    if (/\b(?:no[- ]fan[- ]out|zero nested spawns?|fan[- ]out)\b/i.test(claim)
      && !/no_child_fanout[\s\S]*(?:===\s*0|length\s*===\s*0)/.test(sourceExcerpt)) {
      defects.push("no-fan-out verdict does not cite no_child_fanout");
    }
  }
  if (relativeTarget.endsWith("evals/research/assertions.mjs")) {
    if (/\b(?:requires?|checks?|enforces?) passing attestations?\b/i.test(claim)
      && !/attestations\.every\(\(item\) => item\.pass\)/.test(sourceExcerpt)) {
      defects.push("passing-attestation claim does not cite attestations.every");
    }
    if (/\b(?:bounded spawn|child budget|spawn limit|at most (?:three|four).{0,20}child)/i.test(claim)
      && !/(?:directChildBudgetPasses|directSpawns\.length\s*<=\s*4|analysisSpawns\.length\s*<=\s*3)/.test(sourceExcerpt)) {
      defects.push("bounded-spawn claim does not cite the direct-child budget expression");
    }
  }
  return defects;
}

export function prepareResearchScan(text, cwd = process.cwd()) {
  const read = { context: contextSnapshot(cwd) };
  let normalizedCitationCount = 0;
  const normalizedMarkdown = String(text).replace(
    /\[([^\]\n]+)\]\((?:<([^>\n]+)>|(\/[^)\n]+))\)/g,
    (source, label, angleTarget, plainTarget) => {
      const replacement = normalizedLocalCitation(read, {
        label,
        target: angleTarget || plainTarget,
      });
      if (!replacement || replacement === source) return source;
      normalizedCitationCount += 1;
      return replacement;
    },
  );
  parseCoverageProjection(normalizedMarkdown, "research compiled scan");
  const links = localMarkdownLinks(normalizedMarkdown);
  if (links.length === 0) fail("research compiled scan must contain current-code citations");
  const errors = new Set();
  const citationCountByLine = new Map();
  for (const link of links) {
    const line = normalizedMarkdown.slice(0, link.index).split(/\r?\n/).length;
    citationCountByLine.set(line, (citationCountByLine.get(line) ?? 0) + 1);
  }
  for (const [lineNumber, count] of citationCountByLine.entries()) {
    if (count > 1) {
      errors.add(`research compiled scan line ${lineNumber} contains multiple citations; split it into one evidence bullet per citation`);
    }
  }
  const normalizedLines = normalizedMarkdown.split(/\r?\n/);
  for (const lineNumber of citationCountByLine.keys()) {
    const claimLine = normalizedLines[lineNumber - 1] ?? "";
    if (/\b(?:Git precedent|historical(?:ly)?|introduced by|inherited from|commit [0-9a-f]{7,40})\b/i.test(claimLine)) {
      errors.add(`research compiled scan line ${lineNumber} uses a current-file citation to support Git history; split current behavior from a plain verified commit statement`);
    }
  }
  const citations = [];
  for (const link of links) {
    if (/#L[0-9]+(?:-L[0-9]+)?$/.test(link.target)) {
      errors.add("research compiled scan links must use :line or :start-end targets, not #L fragments");
    }
    if (!fs.existsSync(targetFile(link.target))) {
      errors.add(`research compiled scan link target does not exist: ${link.target}`);
      continue;
    }
    try {
      validateCitationLabel(read, link);
    } catch (error) {
      errors.add(error instanceof Error ? error.message : String(error));
    }
    const range = targetLineRange(link.target);
    if (!range) continue;
    const lineSpan = range.end - range.start + 1;
    if (lineSpan > 15) {
      errors.add(`research compiled scan citation is too broad: ${link.target}; use one or more directly supporting ranges of at most 15 lines each`);
      continue;
    }
    const file = fs.realpathSync(targetFile(link.target));
    const relativeTarget = path.relative(read.context.repository, file).split(path.sep).join("/");
    const sourceLines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    const claimLine = normalizedMarkdown.slice(0, link.index).split(/\r?\n/).length;
    const claim = normalizedMarkdown.split(/\r?\n/)[claimLine - 1];
    const sourceExcerpt = sourceLines.slice(range.start - 1, range.end)
      .map((line, index) => `${range.start + index}: ${line}`)
      .join("\n");
    for (const defect of semanticEvidenceDefects(relativeTarget, claim, sourceExcerpt)) {
      errors.add(`research compiled scan line ${claimLine} has unsupported claim evidence: ${defect}`);
    }
    citations.push({
      label: link.label,
      target: link.target,
      claim_line: claimLine,
      claim,
      source_excerpt: sourceExcerpt,
    });
  }
  if (errors.size > 0) {
    fail(`research compiled scan validation failed:\n- ${[...errors].join("\n- ")}`);
  }
  return {
    normalized_markdown: normalizedMarkdown,
    normalized_citation_count: normalizedCitationCount,
    citations,
  };
}

function targetFile(target) {
  return target
    .replace(/:[0-9]+(?:-[0-9]+)?$/, "")
    .replace(/#L[0-9]+(?:-L[0-9]+)?$/, "");
}

function targetLineRange(target) {
  const match = /:([0-9]+)(?:-([0-9]+))?$/.exec(target)
    ?? /#L([0-9]+)(?:-L([0-9]+))?$/.exec(target);
  return match ? { start: Number(match[1]), end: Number(match[2] ?? match[1]) } : null;
}

function validateCitationLabel(read, link) {
  const range = targetLineRange(link.target);
  if (!range) return;
  const file = fs.realpathSync(targetFile(link.target));
  const relative = path.relative(read.context.repository, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return;
  const normalized = relative.split(path.sep).join("/");
  const suffix = range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`;
  const expected = `${normalized}:${suffix}`;
  const equivalentSingletonRange = range.start === range.end
    ? `${normalized}:${range.start}-${range.end}`
    : null;
  const semanticLabel = /^`[^`]+`$/.test(link.label) ? link.label.slice(1, -1) : link.label;
  if (semanticLabel !== expected && semanticLabel !== equivalentSingletonRange) {
    fail(`artifact citation label must be repository-relative: expected [${expected}]`);
  }

  const lineCount = fs.readFileSync(file, "utf8").split(/\r?\n/).length;
  if (range.start < 1 || range.end < range.start || range.end > lineCount) {
    fail(`artifact citation line is outside file bounds: ${link.target}; requested ${range.start}-${range.end}, but the file has ${lineCount} lines. Re-read the target and replace the complete start-end range; changing only the end cannot fix a start beyond EOF`);
  }
}

function markdownSection(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start < 0) return "";
  const nextOffset = lines.slice(start + 1).findIndex((line) => /^##\s+/.test(line));
  const end = nextOffset < 0 ? lines.length : start + 1 + nextOffset;
  return lines.slice(start + 1, end).join("\n");
}

export function hasNoDiscoveryContext(text) {
  const context = markdownSection(String(text), "Developer Context");
  return /no discovery (?:decisions|artifact|input)[^\n]*(?:supplied|provided|used)/i.test(context)
    || /no discovery input[^\n]*no inherited discovery decisions/i.test(context);
}

function validateLocalMarkdownLinks(read) {
  const links = localMarkdownLinks(read.text);
  const errors = new Set();
  for (const link of links) {
    if (/#L[0-9]+(?:-L[0-9]+)?$/.test(link.target)) {
      errors.add("artifact local Markdown links must use :line or :start-end targets, not #L fragments");
    }
    if (!fs.existsSync(targetFile(link.target))) {
      errors.add(`artifact Markdown link target does not exist: ${link.target}`);
      continue;
    }
    try {
      validateCitationLabel(read, link);
      const range = targetLineRange(link.target);
      const relativeTarget = path.relative(
        fs.realpathSync(read.context.repository),
        fs.realpathSync(targetFile(link.target)),
      ).split(path.sep).join("/");
      if (read.location.stage === "research"
        && range
        && range.end - range.start + 1 > 15
        && !relativeTarget.startsWith(".rpiv-codex/artifacts/")) {
        errors.add(`research evidence citation is too broad: ${link.target}; use one or more directly supporting ranges of at most 15 lines each`);
      }
    } catch (error) {
      errors.add(error instanceof Error ? error.message : String(error));
    }
  }

  const lineage = [read.metadata.supersedes, ...read.metadata.source_artifacts]
    .filter((value) => typeof value === "string" && value.length > 0)
    .map((value) => path.resolve(read.context.repository, value));
  const linkedFiles = new Set(links.map(({ target }) => targetFile(target)).map((target) => path.resolve(target)));
  for (const expected of lineage) {
    if (!linkedFiles.has(expected)) {
      errors.add(`artifact lineage is missing a body Markdown link: ${expected}`);
    }
  }

  if (read.location.stage === "research") {
    const missingSections = requiredResearchSections.filter(
      (heading) => !read.text.split(/\r?\n/).some((line) => line.trim() === `## ${heading}`),
    );
    if (missingSections.length > 0) {
      errors.add(`research artifact is missing required sections: ${missingSections.join(", ")}`);
    }
    if (Array.isArray(read.metadata.source_artifacts)
      && read.metadata.source_artifacts.length === 0
      && !hasNoDiscoveryContext(read.text)) {
      errors.add("prompt-mode research artifact must state in Developer Context that no discovery decisions were supplied");
    }
    const coverageLedger = markdownSection(read.text, "Coverage Ledger");
    if (coverageLedger) {
      const summarySection = markdownSection(read.text, "Summary");
      if (/^- Q[0-9]+ — \*\*(?:Answered|Partial|Conflicted|Unanswered)\*\* — Clauses:/m.test(summarySection)) {
        fail("research artifact Summary must contain the canonical coverage snapshot but no Q clause rows; rows belong only in Coverage Ledger");
      }
      const summaryCoverage = parseCoverageProjection(
        summarySection,
        "research artifact Summary",
        { requireRows: false },
      );
      const ledgerCoverage = parseCoverageProjection(
        `${summaryCoverage.line}\n${coverageLedger}`,
        "research artifact Coverage Ledger",
      );
      if (JSON.stringify(summaryCoverage.status_by_question) !== JSON.stringify(ledgerCoverage.status_by_question)) {
        fail("research artifact coverage differs between Summary and Coverage Ledger");
      }
    }
    const declaredSources = new Set(read.metadata.source_artifacts
      .filter((value) => typeof value === "string" && value.length > 0)
      .map((value) => path.resolve(read.context.repository, value)));
    const linkedDiscoveryArtifacts = new Set(links
      .map(({ target }) => path.resolve(targetFile(target)))
      .filter((target) => {
        const relative = path.relative(read.context.repository, target).split(path.sep).join("/");
        return relative.startsWith(".rpiv-codex/artifacts/discover/");
      }));
    for (const linkedDiscovery of linkedDiscoveryArtifacts) {
      if (!declaredSources.has(linkedDiscovery)) {
        const relative = path.relative(read.context.repository, linkedDiscovery).split(path.sep).join("/");
        errors.add(`research artifact links discovery input but source_artifacts does not declare it: ${relative}`);
      }
    }

    const precedentSections = ["Precedents & Lessons", "Historical Context"]
      .map((heading) => markdownSection(read.text, heading))
      .join("\n");
    const precedentCommits = new Set(
      [...precedentSections.matchAll(/\b[0-9a-f]{40}\b/g)].map((match) => match[0]),
    );
    precedentCommits.delete(read.metadata.rpiv_commit);
    for (const commit of precedentCommits) {
      try {
        execFileSync("git", ["cat-file", "-e", `${commit}^{commit}`], {
          cwd: read.context.repository,
          stdio: "ignore",
        });
      } catch {
        errors.add(`artifact Git precedent is not a local commit: ${commit}`);
      }
    }
  }
  if (errors.size > 0) fail(`artifact Markdown validation failed:\n- ${[...errors].join("\n- ")}`);
}

function contextDifferences(metadata, context) {
  const fields = ["repository", "branch", "commit", "working_tree_sha256", "working_tree_scope"];
  return fields
    .filter((field) => metadata[field] !== context[field])
    .map((field) => ({ field, artifact: metadata[field], current: context[field] }));
}

export function compareArtifactContext(input, cwd = process.cwd()) {
  const read = readArtifact(input, cwd);
  const differences = contextDifferences(read.metadata, read.context);
  return {
    artifact: read.location.relative,
    byte_length: read.byte_length,
    artifact_sha256: read.artifact_sha256,
    metadata: read.metadata,
    context: read.context,
    context_match: differences.length === 0,
    differences,
  };
}

export function preflightDiscoveryArtifact(input, cwd = process.cwd()) {
  const read = readArtifact(input, cwd);
  if (read.location.stage !== "discover") {
    fail("research preflight requires a discovery artifact");
  }
  validateLocalMarkdownLinks(read);
  const differences = contextDifferences(read.metadata, read.context);
  return {
    artifact: read.location.relative,
    byte_length: read.byte_length,
    artifact_sha256: read.artifact_sha256,
    metadata: read.metadata,
    artifact_content: read.text,
    context: read.context,
    context_match: differences.length === 0,
    differences,
  };
}

function isPathShapedResearchInput(input) {
  const hasWhitespace = /\s/.test(input);
  if (path.isAbsolute(input)) {
    return !hasWhitespace
      || input.endsWith(".md")
      || input.includes(".rpiv-codex/artifacts/");
  }
  if (hasWhitespace) return false;
  return input.startsWith("./")
    || input.startsWith("../")
    || input.startsWith("~/")
    || input.startsWith(".rpiv-codex/")
    || input.endsWith(".md");
}

export function preflightResearchInput(input, cwd = process.cwd()) {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) {
    fail("research input must be a non-empty prompt or one absolute discovery artifact path");
  }
  if (!isPathShapedResearchInput(value)) {
    return {
      input_mode: "prompt",
      research_prompt: value,
      context: contextSnapshot(cwd),
    };
  }
  if (!path.isAbsolute(value)) {
    fail("research artifact input must be one absolute path beneath .rpiv-codex/artifacts/discover/");
  }
  return {
    input_mode: "discovery",
    ...preflightDiscoveryArtifact(value, cwd),
  };
}

export function inspectArtifact(input, cwd = process.cwd()) {
  const read = readArtifact(input, cwd);
  const differences = contextDifferences(read.metadata, read.context);
  if (differences.length > 0) {
    fail(`artifact repository context has changed: ${differences.map(({ field }) => field).join(", ")}`);
  }
  validateLocalMarkdownLinks(read);
  const { text, ...result } = read;
  return { ...result, context_match: true, differences: [] };
}

function readStandardInput(timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    let text = "";
    const timer = setTimeout(() => {
      process.stdin.pause();
      reject(new Error("prepare-research-scan requires redirected input; use a quoted heredoc and never invoke it bare"));
    }, timeoutMs);
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { text += chunk; });
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve(text);
    });
    process.stdin.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    process.stdin.resume();
  });
}

async function main() {
  const [, , command, ...args] = process.argv;
  if (["prepare-research-scan", "render-research-scan"].includes(command)) {
    if (args.length !== 0) fail(`usage: artifact-check.mjs ${command} < scan.md`);
    const prepared = prepareResearchScan(await readStandardInput());
    return command === "render-research-scan" ? prepared.normalized_markdown : prepared;
  }
  if (!["inspect", "compare", "preflight-discovery", "preflight-research", "normalize-citations"].includes(command) || args.length !== 1) {
    fail("usage: artifact-check.mjs <inspect|compare|preflight-discovery|preflight-research|normalize-citations> <input>");
  }
  if (command === "inspect") return inspectArtifact(args[0]);
  if (command === "preflight-discovery") return preflightDiscoveryArtifact(args[0]);
  if (command === "preflight-research") return preflightResearchInput(args[0]);
  if (command === "normalize-citations") return normalizeLocalMarkdownCitations(args[0]);
  return compareArtifactContext(args[0]);
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  main().then((result) => {
    process.stdout.write(typeof result === "string" ? result : `${JSON.stringify(result, null, 2)}\n`);
  }).catch((error) => {
    process.stderr.write(`rpivc artifact check error: ${error.message}\n`);
    process.exitCode = 1;
  });
}
