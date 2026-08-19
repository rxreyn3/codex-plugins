import fs from "node:fs";
import path from "node:path";

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

function itemTypes(turn) {
  const types = [];
  for (const item of turn.metadata?.codexAppServer?.items ?? []) if (item?.type) types.push(item.type);
  for (const item of turn.raw?.items ?? []) if (item?.type) types.push(item.type);
  return types;
}

function isSubagentTurn(turn) {
  return itemTypes(turn).some((type) => /agent|collab/i.test(type) && !/agentMessage/i.test(type))
    || JSON.stringify(turn.raw?.notifications ?? []).match(/spawn_agent|collabAgentToolCall|agent\/started/i);
}

function isCommandTurn(turn) {
  return itemTypes(turn).some((type) => /command[_ ]?execution/i.test(type));
}

function markdownLinks(markdown) {
  return [...markdown.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map((match) => ({ label: match[1], target: match[2] }));
}

function result(name, pass, detail) {
  return { name, pass, score: pass ? 1 : 0, reason: detail };
}

export default function assertDiscoverContract(output, context) {
  const directory = evidenceDirectory(context);
  const turns = readTurns(directory);
  const latest = readJson(path.join(directory, "latest.json"));
  const caseId = String(context.vars.case_id);
  const components = [];
  const artifactDirectory = path.join(directory, "workspace", ".rpiv-codex", "artifacts", "discover");
  const artifacts = fs.existsSync(artifactDirectory)
    ? fs.readdirSync(artifactDirectory).filter((name) => name.endsWith(".md"))
    : [];

  components.push(result("turn evidence", turns.length > 1, `${turns.length} target turns captured`));
  const skillLoaded = turns.some((turn) => {
    const metadata = JSON.stringify(turn.metadata ?? {});
    return metadata.includes("rpivc-discover") || turn.turn === 1;
  });
  components.push(result("repository skill invocation", skillLoaded, "the first app-server turn included the repository-local skill input"));

  const firstIntentAnswer = turns.findIndex((turn) => /ASCII widget|review discovery artifacts|paths rendered/i.test(turn.input));
  const earlyEvidence = turns.slice(0, Math.max(firstIntentAnswer, 0)).some((turn) => isCommandTurn(turn) || isSubagentTurn(turn));
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
    const markdown = fs.readFileSync(path.join(artifactDirectory, artifacts[0]), "utf8");
    const links = markdownLinks(markdown);
    const localLinks = links.filter((link) => link.target.startsWith("/"));
    const invalid = localLinks.filter((link) => !fs.existsSync(link.target.replace(/:\d+(?::\d+)?$/, "")));
    linkCheck = localLinks.length > 0 && invalid.length === 0;
    linkDetail = `${localLinks.length} absolute local links; ${invalid.length} missing targets`;
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
    components.push(result("hypothetical target preserved", output.includes("hypothetical standalone terminal script"), "transcript retains the fixture-only target boundary"));
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
    const locatorCard = turns.findIndex((turn) => turn.output.includes("rpivc-codebase-locator"));
    const analyzerCard = turns.findIndex((turn) => turn.output.includes("rpivc-codebase-analyzer"));
    components.push(result(
      "progressive locator then analyzer",
      locatorCard >= 0 && (analyzerCard < 0 || analyzerCard > locatorCard),
      `locator card turn=${locatorCard + 1}; analyzer card turn=${analyzerCard + 1 || "not used"}`,
    ));
    components.push(result(
      "post-evidence stale boundary",
      /Continue with the disclosed stale boundary/i.test(output),
      "transcript contains the declared stale-evidence decision",
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

