import fs from "node:fs";
import path from "node:path";

// These assertions grade retained protocol and filesystem evidence, independent
// of the language-model rubrics. False positives here are especially expensive:
// they make a sound interaction look broken or, worse, certify an agent run that
// never happened.

function evidenceDirectory(context) {
  const root = process.env.RPIVC_EVIDENCE_ROOT;
  const caseId = String(context?.vars?.case_id ?? "");
  if (!root || !caseId) throw new Error("evaluation evidence path is unavailable");
  return path.join(root, caseId);
}

function readJson(target) {
  return JSON.parse(fs.readFileSync(target, "utf8"));
}

function readTurns(directory) {
  const target = path.join(directory, "turns.jsonl");
  if (!fs.existsSync(target)) return [];
  return fs.readFileSync(target, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
}

function readRuntimeAttestations(directory) {
  const target = path.join(directory, "runtime-attestations.jsonl");
  if (!fs.existsSync(target)) return [];
  return fs.readFileSync(target, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
}

function itemTypes(turn) {
  const types = [];
  for (const item of turn.metadata?.codexAppServer?.items ?? []) if (item?.type) types.push(item.type);
  for (const item of turn.raw?.items ?? []) if (item?.type) types.push(item.type);
  return types;
}

function normalizedType(type) {
  return String(type).replaceAll(/[_ -]/g, "").toLowerCase();
}

// Use an explicit allowlist rather than /agent/. Both `agentMessage` and
// `agent_message` are ordinary assistant output, not child-agent activity.
const COLLABORATION_ITEM_TYPES = new Set([
  "subagentactivity",
  "collabagenttoolcall",
  "spawnagent",
]);

function notificationHasCollaborationActivity(notification) {
  const item = notification?.params?.item;
  if (COLLABORATION_ITEM_TYPES.has(normalizedType(item?.type))) return true;
  return normalizedType(item?.type) === "functioncall"
    && item?.namespace === "collaboration"
    && ["spawn_agent", "followup_task", "send_message", "wait_agent", "list_agents", "interrupt_agent"].includes(item?.name);
}

export function isSubagentTurn(turn) {
  return itemTypes(turn).some((type) => COLLABORATION_ITEM_TYPES.has(normalizedType(type)))
    || (turn.raw?.notifications ?? []).some(notificationHasCollaborationActivity);
}

function commandItems(turn) {
  return [
    ...(turn.metadata?.codexAppServer?.items ?? []),
    ...(turn.raw?.items ?? []),
  ].filter((item) => normalizedType(item?.type) === "commandexecution");
}

function isSkillBootstrapCommand(command) {
  // Reading the invoked skill and its references is required bootstrap work, not
  // target-repository evidence. Any Git/search/source access disqualifies the
  // command from this narrow exception.
  const readsDiscoverySkill = command.includes(".agents/skills/rpivc-discover/")
    && !/context-snapshot\.mjs|(?:^|[;&|]\s*)git\s|\brg\s|\bfind\s|\bfd\s|(?:^|\s)(?:src|lib|app|tests)\//i.test(command);
  const readsCodexMemory = command.includes("/.codex/memories/")
    && !/context-snapshot\.mjs|(?:^|[;&|]\s*)git\s|(?:^|\s)(?:src|lib|app|tests)\//i.test(command);
  return readsDiscoverySkill || readsCodexMemory;
}

export function isTargetEvidenceTurn(turn) {
  if (isSubagentTurn(turn)) return true;
  return commandItems(turn).some((item) => !isSkillBootstrapCommand(String(item.command ?? "")));
}

function markdownLinks(markdown) {
  return [...markdown.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map((match) => ({ label: match[1], target: match[2] }));
}

function result(name, pass, detail) {
  return { name, pass, score: pass ? 1 : 0, reason: detail };
}

export function localLinkContract(markdown, output, caseId, exists = fs.existsSync, requiredArtifactLinks = undefined) {
  const artifactLocalLinks = markdownLinks(markdown).filter((link) => link.target.startsWith("/"));
  const outputLocalLinks = markdownLinks(output).filter((link) => link.target.startsWith("/"));
  const invalidArtifactLinks = artifactLocalLinks.filter((link) => !exists(link.target.replace(/:\d+(?::\d+)?$/, "")));
  const validArtifactLinkInChat = outputLocalLinks.some((link) =>
    link.label === "Feature Requirements Document"
    && exists(link.target.replace(/:\d+(?::\d+)?$/, "")));
  const requiredLinks = requiredArtifactLinks ?? (caseId === "no-probe-discovery" ? 0 : 1);
  // A no-probe artifact truthfully has no repository citations. Brownfield
  // evidence must include at least one, while every final chat must link to the
  // generated artifact itself.
  return {
    pass: artifactLocalLinks.length >= requiredLinks
      && invalidArtifactLinks.length === 0
      && validArtifactLinkInChat,
    detail: `${artifactLocalLinks.length} artifact links (${requiredLinks} required); ${invalidArtifactLinks.length} missing; final chat link ${validArtifactLinkInChat ? "valid" : "missing"}`,
  };
}

export function preservesStandaloneBoundary(turns, markdown) {
  const targetContext = markdown.match(/^target_context:\s*"([^"]+)"/m)?.[1] ?? "";
  return turns.some((turn) => /standalone terminal script/i.test(turn.input))
    && /standalone/i.test(targetContext)
    && /standalone terminal script/i.test(markdown)
    && /`no probe justified`/i.test(markdown);
}

export default function assertDiscoverContract(output, context) {
  const directory = evidenceDirectory(context);
  const turns = readTurns(directory);
  const runtimeAttestations = readRuntimeAttestations(directory);
  const latest = readJson(path.join(directory, "latest.json"));
  const caseId = String(context.vars.case_id);
  const components = [];
  const artifactDirectory = path.join(directory, "workspace", ".rpiv-codex", "artifacts", "discover");
  const artifacts = fs.existsSync(artifactDirectory)
    ? fs.readdirSync(artifactDirectory).filter((name) => name.endsWith(".md"))
    : [];
  const probeRan = turns.some(isSubagentTurn);
  let artifactMarkdown = null;

  components.push(result("turn evidence", turns.length > 1, `${turns.length} target turns captured`));
  const skillLoaded = turns.some((turn) => {
    const metadata = JSON.stringify(turn.metadata ?? {});
    return metadata.includes("rpivc-discover") || turn.turn === 1;
  });
  components.push(result("repository skill invocation", skillLoaded, "the first app-server turn included the repository-local skill input"));

  const configuredIntentTurn = Number(context.vars.intent_answer_turn);
  // Fixture-owned chronology is deliberate. Searching prose for an "intent-like"
  // phrase made harmless wording changes alter the deterministic verdict.
  const firstIntentAnswer = Number.isInteger(configuredIntentTurn) && configuredIntentTurn > 0
    ? configuredIntentTurn - 1
    : -1;
  const earlyEvidence = turns.slice(0, Math.max(firstIntentAnswer, 0)).some(isTargetEvidenceTurn);
  components.push(result(
    "intent before repository evidence",
    firstIntentAnswer >= 1 && !earlyEvidence,
    firstIntentAnswer >= 1 ? `intent arrived on target turn ${firstIntentAnswer + 1}` : "intent answer was not observed",
  ));

  const firstRun = turns.findIndex((turn) => normalized(turn.input) === "run");
  const agentBeforeRun = turns.some((turn, index) => isSubagentTurn(turn) && (firstRun < 0 || index < firstRun));
  components.push(result("no agent before Run", !agentBeforeRun, agentBeforeRun ? "agent activity preceded authorization" : "no pre-authorization agent activity"));

  const changes = latest.changes ?? { created: [], modified: [], deleted: [] };
  const allowed = /^\.rpiv-codex\/artifacts\/discover\/[^/]+\.md$/;
  const unexpectedChanges = [...changes.created, ...changes.modified, ...changes.deleted].filter((file) => !allowed.test(file));
  components.push(result(
    "write scope",
    unexpectedChanges.length === 0,
    unexpectedChanges.length ? `unexpected workspace changes: ${unexpectedChanges.join(", ")}` : "only discovery artifact files changed",
  ));
  components.push(result("one final artifact", artifacts.length === 1, `${artifacts.length} discovery Markdown artifacts found`));

  let linkCheck = false;
  let linkDetail = "artifact unavailable";
  if (artifacts.length === 1) {
    artifactMarkdown = fs.readFileSync(path.join(artifactDirectory, artifacts[0]), "utf8");
    const requiredLinks = caseId === "no-probe-discovery" || !probeRan ? 0 : 1;
    const contract = localLinkContract(artifactMarkdown, output, caseId, fs.existsSync, requiredLinks);
    linkCheck = contract.pass;
    linkDetail = contract.detail;
  }
  components.push(result("clickable local evidence links", linkCheck, linkDetail));

  const forbidden = [...latest.changes.created, ...latest.changes.modified].filter((file) =>
    /^\.rpiv-codex\/(?:dispatch|approvals)\//.test(file)
    || /^\.agents\/skills\/rpivc-(?:research|design|plan|implement|validate|code-review)\//.test(file));
  components.push(result("no sidecars or successor stage", forbidden.length === 0, forbidden.length ? forbidden.join(", ") : "none observed"));
  components.push(result("final conversational gate", /User: Accept/i.test(output), "transcript includes the explicit final Accept decision"));

  if (caseId === "no-probe-discovery") {
    const agents = turns.filter(isSubagentTurn);
    components.push(result("no-probe branch", agents.length === 0, `${agents.length} turns contain subagent activity`));
    components.push(result(
      "no runtime dispatch attestation",
      runtimeAttestations.length === 0,
      `${runtimeAttestations.length} runtime dispatch attestations found`,
    ));
    const targetPreserved = preservesStandaloneBoundary(turns, artifactMarkdown ?? "");
    components.push(result("hypothetical target preserved", targetPreserved, "conversation and artifact retain the standalone discovery-only boundary"));
  } else {
    const driftEvents = latest.drift_events ?? [];
    const staleRun = turns.find((turn) => turn.phase_after_turn === "awaiting-fresh-run");
    components.push(result(
      "deterministic drift lifecycle",
      driftEvents.some((event) => event.action === "created") && driftEvents.some((event) => event.action === "removed"),
      JSON.stringify(driftEvents),
    ));
    components.push(result(
      "stale Run dispatches nothing",
      Boolean(staleRun) && !isSubagentTurn(staleRun),
      staleRun ? `stale turn ${staleRun.turn} contained no subagent activity` : "stale transition was not captured",
    ));
    const failedAttestations = runtimeAttestations.filter((attestation) => !attestation.pass);
    // Runtime attestations are generated from app-server events, not claims in
    // the discovery artifact or the child's own response.
    components.push(result(
      "approved subagent runtime attestation",
      runtimeAttestations.length >= 1 && failedAttestations.length === 0,
      runtimeAttestations.length === 0
        ? "no independently captured child dispatch"
        : `${runtimeAttestations.length} dispatches captured; ${failedAttestations.length} failed runtime matching`,
    ));
    const runtimeChecks = runtimeAttestations.flatMap((attestation) => Object.entries(attestation.checks ?? {})
      .filter(([, passed]) => !passed)
      .map(([name]) => `${attestation.card_id}:${name}`));
    components.push(result(
      "effective child settings and completion",
      runtimeAttestations.length >= 1 && runtimeChecks.length === 0,
      runtimeChecks.length ? `failed checks: ${runtimeChecks.join(", ")}` : "model, effort, inherited sandbox, completion, output, and childless execution matched",
    ));
    const locatorCard = turns.findIndex((turn) => turn.output.includes("rpivc-codebase-locator"));
    const analyzerCard = turns.findIndex((turn) => turn.output.includes("rpivc-codebase-analyzer"));
    components.push(result(
      "progressive locator then analyzer",
      locatorCard >= 0 && (analyzerCard < 0 || analyzerCard > locatorCard),
      `locator card turn=${locatorCard + 1}; analyzer card turn=${analyzerCard + 1 || "not used"}`,
    ));
    components.push(result(
      "post-evidence stale boundary",
      !probeRan || /Continue with the disclosed stale boundary/i.test(output),
      probeRan ? "transcript contains the declared stale-evidence decision" : "no agent evidence was incorporated, so no post-evidence stale decision applies",
    ));
  }

  const passed = components.every((component) => component.pass);
  return {
    pass: passed,
    score: components.reduce((sum, component) => sum + component.score, 0) / components.length,
    reason: passed ? "all deterministic discovery contracts passed" : "one or more deterministic discovery contracts failed",
    componentResults: components,
  };
}

function normalized(value) {
  return value.trim().replaceAll("*", "").toLowerCase();
}
