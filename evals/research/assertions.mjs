import fs from "node:fs";
import path from "node:path";

function result(name, pass, reason) {
  return { name, pass, score: pass ? 1 : 0, reason };
}

function readJsonLines(target) {
  if (!fs.existsSync(target)) return [];
  return fs.readFileSync(target, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
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
    const suffix = /:([0-9]+(?:-[0-9]+)?)$/.exec(target)?.[1];
    const file = target.replace(/:[0-9]+(?:-[0-9]+)?$/, "");
    const relative = path.relative(repository, file).split(path.sep).join("/");
    return relative && !relative.startsWith("..") && !path.isAbsolute(relative)
      && label === `${relative}:${suffix}`;
  });
}

export default function assertResearchContract(output, context) {
  const root = process.env.RPIVC_EVIDENCE_ROOT;
  const caseId = String(context?.vars?.case_id ?? "");
  const directory = path.join(root, caseId);
  const latest = JSON.parse(fs.readFileSync(path.join(directory, "latest.json"), "utf8"));
  const turns = readJsonLines(path.join(directory, "turns.jsonl"));
  const attestations = readJsonLines(path.join(directory, "runtime-attestations.jsonl"));
  const revisionObservations = readJsonLines(path.join(directory, "artifact-revisions.jsonl"));
  const artifactDirectory = path.join(directory, "workspace", ".rpiv-codex", "artifacts", "research");
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

  if (artifacts.length === 1) {
    const markdown = fs.readFileSync(path.join(artifactDirectory, artifacts[0]), "utf8");
    const sections = ["Source Feature", "Research Questions", "Coverage Ledger", "Detailed Findings", "Code References", "Integration Points", "Developer Context", "Evidence Conflicts and Gaps", "Dispatch Ledger"];
    components.push(result("required artifact sections", sections.every((section) => markdown.includes(`## ${section}`)), "required research sections present"));
    components.push(result("repository-relative clickable evidence", repositoryRelativeCitationLabels(markdown, path.join(directory, "workspace")), "all current-code citation labels match repository-relative targets"));
    components.push(result("inherited decision", inheritsExternalWebDeferral(markdown), "discovery deferral inherited"));
  }

  const pass = components.every((item) => item.pass);
  return {
    pass,
    score: components.reduce((sum, item) => sum + item.score, 0) / components.length,
    reason: pass ? "all deterministic research contracts passed" : "one or more deterministic research contracts failed",
    componentResults: components,
  };
}
