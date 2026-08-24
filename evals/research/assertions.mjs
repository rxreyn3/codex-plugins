import fs from "node:fs";
import path from "node:path";

import {
  hasNoDiscoveryContext,
  parseCoverageProjection,
  parseFrontmatter,
  validateResearchScope,
} from "../../.agents/skills/_shared/scripts/artifact-check.mjs";

function result(name, pass, reason) {
  return { name, pass, score: pass ? 1 : 0, reason };
}

function readJsonLines(target) {
  if (!fs.existsSync(target)) return [];
  return fs.readFileSync(target, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
}

function commandExecutions(turn) {
  return (turn?.metadata?.codexAppServer?.items ?? [])
    .filter((item) => item?.type === "commandExecution")
    .map((item) => ({
      command: String(item.command ?? ""),
      status: String(item.status ?? ""),
      exitCode: item.exitCode,
    }));
}

export function inheritsExternalWebDeferral(markdown) {
  return /(?:external web research|web evidence|external research)[^.\n]*(?:defer|deferred)/i.test(markdown)
    || /(?:defer|deferred)[^.\n]*(?:external web research|web evidence|external research)/i.test(markdown);
}

export function repositoryRelativeCitationLabels(markdown, repository) {
  const citations = [...markdown.matchAll(/\[([^\]\n]+)\]\((?:<([^>\n]+)>|(\/[^)\n]+))\)/g)]
    .map((match) => ({ label: match[1], target: match[2] || match[3] }))
    .filter(({ target }) => /:[0-9]+(?:-[0-9]+)?$/.test(target));
  if (citations.length === 0) return false;
  return citations.every(({ label, target }) => {
    const semanticLabel = /^`[^`]+`$/.test(label) ? label.slice(1, -1) : label;
    const range = /:([0-9]+)(?:-([0-9]+))?$/.exec(target);
    const file = target.replace(/:[0-9]+(?:-[0-9]+)?$/, "");
    let relative;
    try {
      relative = path.relative(fs.realpathSync(repository), fs.realpathSync(file)).split(path.sep).join("/");
    } catch {
      return false;
    }
    const start = range?.[1];
    const end = range?.[2] ?? start;
    const acceptedLabels = start === end
      ? new Set([`${relative}:${start}`, `${relative}:${start}-${end}`])
      : new Set([`${relative}:${start}-${end}`]);
    return relative && !relative.startsWith("..") && !path.isAbsolute(relative)
      && acceptedLabels.has(semanticLabel);
  });
}

function preciseCitationRanges(markdown) {
  const ranges = [...markdown.matchAll(/\]\((?:<[^>\n]+>|\/[^)\n]+):([0-9]+)(?:-([0-9]+))?\)/g)]
    .map((match) => ({ start: Number(match[1]), end: Number(match[2] ?? match[1]) }));
  return ranges.length > 0 && ranges.every(({ start, end }) => end - start + 1 <= 15);
}

function markdownSection(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start < 0) return "";
  const nextOffset = lines.slice(start + 1).findIndex((line) => /^##\s+/.test(line));
  const end = nextOffset < 0 ? lines.length : start + 1 + nextOffset;
  return lines.slice(start + 1, end).join("\n");
}

function coverageProjectionMatches(compiledScan, markdown) {
  try {
    const scanCoverage = parseCoverageProjection(compiledScan, "compiled scan");
    const artifactCoverage = parseCoverageProjection(
      `${markdownSection(markdown, "Summary")}\n${markdownSection(markdown, "Coverage Ledger")}`,
      "artifact coverage",
    );
    return scanCoverage.line === artifactCoverage.line
      && JSON.stringify(scanCoverage.status_by_question) === JSON.stringify(artifactCoverage.status_by_question);
  } catch {
    return false;
  }
}

export function tracerScopeCheckpointIsValid(output, repository) {
  if (/tracer (?:returned|result|payload).{0,40}invalid|schema self-check is not satisfied/i.test(output)) return false;
  try {
    return validateResearchScope(output, repository, { repository }).valid;
  } catch {
    return false;
  }
}

export function compiledScanProjectedExactly(compiledScan, markdown) {
  const scanLines = compiledScan.split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line)
    .filter((line) => !/(?:Write artifact\s*\/\s*Adjust\s*\/\s*Stop|Accept\s*\/\s*Revise\s*\/\s*Stop)/i.test(line));
  const artifactLines = markdown.split(/\r?\n/);
  const detailedStart = artifactLines.findIndex((line) => line.trim() === "## Detailed Findings");
  const detailedEnd = artifactLines.findIndex((line, index) => index > detailedStart && line.trim() === "## Code References");
  const detailedFindings = detailedStart < 0
    ? ""
    : artifactLines.slice(detailedStart + 1, detailedEnd < 0 ? artifactLines.length : detailedEnd).join("\n");
  if (!scanLines.every((line) => detailedFindings.split(/\r?\n/).includes(line))) return false;

  const scanLineSet = new Set(scanLines);
  const artifactCitationLines = markdown.split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => /\]\((?:<)?\/[^)\n]+:[0-9]+(?:-[0-9]+)?(?:>)?\)/.test(line))
    .filter((line) => !/\/\.rpiv-codex\/artifacts\//.test(line));
  return artifactCitationLines.every((line) => scanLineSet.has(line));
}

export default function assertResearchContract(output, context) {
  const root = process.env.RPIVC_EVIDENCE_ROOT;
  const caseId = String(context?.vars?.case_id ?? "");
  const inputMode = String(context?.vars?.input_mode ?? "discovery");
  const directory = path.join(root, caseId);
  const latest = JSON.parse(fs.readFileSync(path.join(directory, "latest.json"), "utf8"));
  const turns = readJsonLines(path.join(directory, "turns.jsonl"));
  const attestations = readJsonLines(path.join(directory, "runtime-attestations.jsonl"));
  const cardValidations = readJsonLines(path.join(directory, "card-validations.jsonl"));
  const scopeValidations = readJsonLines(path.join(directory, "scope-validations.jsonl"));
  const revisionObservations = readJsonLines(path.join(directory, "artifact-revisions.jsonl"));
  const artifactDirectory = path.join(directory, "workspace", ".rpiv-codex", "artifacts", "research");
  const discoveryDirectory = path.join(directory, "workspace", ".rpiv-codex", "artifacts", "discover");
  const artifacts = fs.existsSync(artifactDirectory)
    ? fs.readdirSync(artifactDirectory).filter((name) => name.endsWith(".md"))
    : [];
  const components = [];
  const transcript = turns.map((turn) => `User: ${turn.input}\nAssistant: ${turn.output}`).join("\n");
  const changes = latest.changes ?? { created: [], modified: [], deleted: [] };
  const unexpected = [...changes.created, ...changes.modified, ...changes.deleted]
    .filter((file) => !/^\.rpiv-codex\/artifacts\/research\/[^/]+\.md$/.test(file));
  const directSpawns = attestations.filter((item) => item.dispatch_mode === "spawn");
  const analysisSpawns = directSpawns.filter((item) => item.role !== "rpivc-scope-tracer");
  const directChildBudgetPasses = directSpawns.length <= 4 && analysisSpawns.length <= 3;
  const expectsRevision = context?.vars?.exercise_revision === true || context?.vars?.exercise_revision === "true";
  const revisionPaths = new Set(revisionObservations.map((item) => item.relative_path));
  const revisionHashes = new Set(revisionObservations.map((item) => item.artifact_sha256));
  const observationsValidate = revisionObservations.every((item) => item.artifact_count === 1 && item.inspection_passed);
  const revisionLifecyclePasses = expectsRevision
    ? revisionObservations.length === 2
      && revisionPaths.size === 1
      && revisionHashes.size === 2
      && observationsValidate
      && /User: Revise[\s\S]*User: Accept/i.test(transcript)
    : revisionObservations.length === 1 && observationsValidate && !/User: Revise/i.test(transcript);
  const compiledScan = turns.find((turn) =>
    /^- Coverage snapshot:\s*Q1=/m.test(turn.output)
      && /Write artifact\s*\/\s*Adjust\s*\/\s*Stop/i.test(turn.output))?.output ?? "";
  const initialCommands = commandExecutions(turns[0]);
  const firstCommand = initialCommands[0];
  const preflightWasFirstCommand = firstCommand?.status === "completed"
    && firstCommand.exitCode === 0
    && /node \.agents\/skills\/_shared\/scripts\/artifact-check\.mjs preflight-research\b/.test(firstCommand.command);
  const firstOutput = turns[0]?.output ?? "";
  const tracerOutput = turns.find((turn) => String(turn.input ?? "").trim().replaceAll("*", "").toLowerCase() === "run"
    && /^## Discovery Summary\b/m.test(turn.output))?.output ?? "";
  const initialCardValidation = cardValidations.find((item) => item.turn === 1 && item.card_id === "S1");
  const initialCardError = initialCardValidation?.error ?? (initialCardValidation ? null : "initial live card validation was not retained");
  const initialTracerGatePasses = initialCardValidation?.pass === true
    && /(?:^|\n)\s*role:\s*["']?rpivc-scope-tracer["']?\s*(?:\n|$)/i.test(firstOutput)
    && /(?:^|\n)\s*id:\s*["']?S1["']?\s*(?:\n|$)/i.test(firstOutput)
    && /Run[\s\S]*Edit[\s\S]*Omit[\s\S]*Stop/i.test(firstOutput)
    && !/##\s+(?:Discovery Summary|Proposed Execution Plan)/i.test(firstOutput);

  components.push(result("input preflight first command", preflightWasFirstCommand, preflightWasFirstCommand ? "successful deterministic input preflight preceded all shell reads" : `first command: ${firstCommand?.status ?? "none"}/${firstCommand?.exitCode ?? "none"} ${firstCommand?.command ?? "none"}`));
  components.push(result("initial scope tracer gate", initialTracerGatePasses, initialTracerGatePasses ? "initial turn displayed one snapshot-bound S1 approval card" : initialCardError ?? "initial turn did not preserve the S1 card-before-tracing boundary"));
  const tracerScopeValidation = scopeValidations.find((item) => item.pass === true);
  components.push(result("valid tracer scope checkpoint", Boolean(tracerScopeValidation), tracerScopeValidation ? "live tracer validation confirmed repository citations and exact question coverage" : scopeValidations.at(-1)?.error ?? "live tracer validation was not retained"));
  components.push(result("one research artifact", artifacts.length === 1, `${artifacts.length} research artifacts`));
  components.push(result("single-draft revision lifecycle", revisionLifecyclePasses, `${revisionObservations.length} validated observations; ${revisionPaths.size} paths; ${revisionHashes.size} hashes`));
  components.push(result("write scope", unexpected.length === 0, unexpected.length ? unexpected.join(", ") : "only research artifact changed"));
  components.push(result("scope gate before analysis", /role: rpivc-scope-tracer[\s\S]*User: Run[\s\S]*User: Use scope[\s\S]*role: rpivc-(?:codebase|integration|precedent)/i.test(transcript), "scope card, Run, scope review, and later analysis observed"));
  const finalGatesObserved = /User: Write artifact[\s\S]*User: Accept/i.test(transcript);
  components.push(result("write and final gates", finalGatesObserved, finalGatesObserved ? "explicit write and acceptance decisions observed" : "write and acceptance decisions incomplete"));
  components.push(result("runtime attestation", attestations.length >= 2 && attestations.every((item) => item.pass), `${attestations.length} attestations; ${attestations.filter((item) => !item.pass).length} failed`));
  components.push(result("direct child budget", directChildBudgetPasses, `${directSpawns.length} direct children; ${analysisSpawns.length} analysis profiles`));
  components.push(result("spawn-only analysis", attestations.every((item) => item.dispatch_mode === "spawn"), "every approved card used a fresh child"));
  components.push(result("no successor", ![...changes.created, ...changes.modified].some((file) => file.includes("rpivc-design")) && !/invok(?:e|ed|ing) [`$]?rpivc-design/i.test(output), "no design stage created or invoked"));
  components.push(result(
    "compiled scan canonical evidence",
    repositoryRelativeCitationLabels(compiledScan, path.join(directory, "workspace"))
      && preciseCitationRanges(compiledScan),
    "compiled scan current-code citations use full repository-relative labels and ranges no wider than 15 lines",
  ));

  if (artifacts.length === 1) {
    const markdown = fs.readFileSync(path.join(artifactDirectory, artifacts[0]), "utf8");
    const metadata = parseFrontmatter(markdown);
    const sections = ["Source Feature", "Research Questions", "Coverage Ledger", "Detailed Findings", "Code References", "Integration Points", "Developer Context", "Evidence Conflicts and Gaps", "Dispatch Ledger"];
    components.push(result("required artifact sections", sections.every((section) => markdown.includes(`## ${section}`)), "required research sections present"));
    components.push(result("repository-relative clickable evidence", repositoryRelativeCitationLabels(markdown, path.join(directory, "workspace")), "all current-code citation labels match repository-relative targets"));
    components.push(result("coverage projection", coverageProjectionMatches(compiledScan, markdown), "compiled scan and artifact use one canonical question-status projection"));
    components.push(result("compiled scan projection", compiledScanProjectedExactly(compiledScan, markdown), "Detailed Findings preserves the rendered scan and artifact citation lines come from it verbatim"));
    components.push(result("external-web boundary", inheritsExternalWebDeferral(markdown), "external web research remains deferred"));
    if (inputMode === "prompt") {
      const expectedPrompt = String(context?.vars?.expected_prompt ?? "");
      const firstOutput = turns[0]?.output ?? "";
      const discoverArtifacts = fs.existsSync(discoveryDirectory)
        ? fs.readdirSync(discoveryDirectory).filter((name) => name.endsWith(".md"))
        : [];
      const promptReachedCard = firstOutput.includes("inputs:")
        && firstOutput.includes(expectedPrompt)
        && /(?:prompt|direct)/i.test(firstOutput);
      components.push(result("direct prompt scope card", promptReachedCard, promptReachedCard ? "exact prompt and prompt mode visible before Run" : "direct prompt or mode missing from first scope card"));
      components.push(result("prompt-only lineage", Array.isArray(metadata.source_artifacts) && metadata.source_artifacts.length === 0, JSON.stringify(metadata.source_artifacts)));
      const noDiscoveryContext = hasNoDiscoveryContext(markdown);
      components.push(result("no discovery dependency", discoverArtifacts.length === 0 && noDiscoveryContext, `${discoverArtifacts.length} discovery artifacts; explicit no-discovery context ${noDiscoveryContext}`));
    } else {
      components.push(result("discovery lineage", Array.isArray(metadata.source_artifacts) && metadata.source_artifacts.length === 1, JSON.stringify(metadata.source_artifacts)));
      components.push(result("inherited decision", inheritsExternalWebDeferral(markdown), "discovery deferral inherited"));
    }
  }

  const pass = components.every((item) => item.pass);
  return {
    pass,
    score: components.reduce((sum, item) => sum + item.score, 0) / components.length,
    reason: pass ? "all deterministic research contracts passed" : "one or more deterministic research contracts failed",
    componentResults: components,
  };
}
