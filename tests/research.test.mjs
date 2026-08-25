import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { inheritsExternalWebDeferral, repositoryRelativeCitationLabels } from "../evals/research/assertions.mjs";
import {
  buildDispatchAttestation,
  captureAttestationEvent,
  compareSandboxPolicies,
  extractAgentCards,
} from "../evals/research/runtime-attestation.mjs";
import { artifactPath } from "../.agents/skills/_shared/scripts/artifact-path.mjs";
import {
  finalizeResearch,
  prepareResearchScan,
  validateResearchCard,
  validateResearchScope,
  verifyResearchProjection,
} from "../.agents/skills/_shared/scripts/artifact-check.mjs";
import RpivcResearchProvider, {
  isResearchTransportTimeout,
  observeResearchArtifact,
  researchTransportRetryMarker,
  retainArtifactRevisionObservation,
  retainUniqueAttestation,
  shouldCaptureRuntimeSnapshot,
  supplementRawAttestationEvents,
} from "../evals/research/provider.mjs";

const root = path.resolve(import.meta.dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function researchWorkspaceFixture() {
  const workspace = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "rpivc-research-revision-")));
  git(workspace, "init", "-b", "main");
  git(workspace, "config", "user.name", "Research Fixture");
  git(workspace, "config", "user.email", "research@example.test");
  fs.writeFileSync(path.join(workspace, ".gitignore"), ".rpiv-codex/\n");
  fs.writeFileSync(path.join(workspace, "tracked.txt"), "baseline\n");
  git(workspace, "add", ".");
  git(workspace, "commit", "-m", "fixture baseline");
  const allocation = artifactPath("research", "Revision Fixture", workspace, new Date("2026-08-20T12:00:00.000Z"));
  fs.mkdirSync(path.dirname(allocation.absolute), { recursive: true });
  const frontmatter = allocation.common_frontmatter;
  fs.writeFileSync(allocation.absolute, [
    "---",
    "stage: research",
    "status: review",
    `rpiv_source: ${JSON.stringify(frontmatter.rpiv_source)}`,
    `rpiv_commit: ${frontmatter.rpiv_commit}`,
    "supersedes: null",
    "source_artifacts: []",
    `repository: ${JSON.stringify(frontmatter.repository)}`,
    `branch: ${JSON.stringify(frontmatter.branch)}`,
    `commit: ${JSON.stringify(frontmatter.commit)}`,
    `working_tree_sha256: ${JSON.stringify(frontmatter.working_tree_sha256)}`,
    `working_tree_scope: ${JSON.stringify(frontmatter.working_tree_scope)}`,
    `created_at: ${JSON.stringify(frontmatter.created_at)}`,
    "---",
    "",
    "# Research: Revision Fixture",
    "",
    "## Source Feature",
    "Direct fixture prompt.",
    "",
    "## Research Questions",
    "1. What changed?",
    "",
    "## Summary",
    "- Coverage snapshot: Q1=Unanswered | Totals: Answered=0, Partial=0, Conflicted=0, Unanswered=1",
    "",
    "## Coverage Ledger",
    "- Q1 — **Unanswered** — Clauses: fixture evidence is unavailable.",
    "",
    "## Detailed Findings",
    "Initial reviewed draft.",
    "",
    "## Code References",
    "No current-code evidence.",
    "",
    "## Integration Points",
    "No additional finding.",
    "",
    "## Architecture Insights",
    "No additional finding.",
    "",
    "## Precedents & Lessons",
    "No precedent inspected.",
    "",
    "## Developer Context",
    "No discovery decisions were supplied.",
    "",
    "## Evidence Conflicts and Gaps",
    "Fixture evidence is unavailable.",
    "",
    "## Historical Context",
    "No history inspected.",
    "",
    "## Open Questions",
    "What changed?",
    "",
    "## Dispatch Ledger",
    "No child dispatches.\n",
  ].join("\n"));
  return { workspace, artifact: allocation.absolute };
}

test("research skill exposes the accepted manual gates and boundaries", () => {
  const skill = read(".agents", "skills", "rpivc-research", "SKILL.md");
  const contract = read(".agents", "skills", "rpivc-research", "references", "research-contract.md");
  const combined = `${skill}\n${contract}`;
  assert.deepEqual(skill.split("---")[1].trim().split("\n").map((line) => line.split(":")[0]), ["name", "description"]);
  assert.match(combined, /non-empty free-text research prompt or one.*absolute path/s);
  assert.match(combined, /Never silently reinterpret an invalid artifact path as free text/);
  assert.match(combined, /no discovery decisions were supplied/i);
  assert.match(combined, /Copy its emitted `absolute` path and `common_frontmatter` values literally/);
  assert.match(combined, /discovery mode has exactly one declared discovery source and prompt mode has none/);
  assert.match(combined, /analyzer and pattern finder use Terra\/high/);
  assert.match(combined, /integration scanner and precedent locator use Luna\/low/);
  assert.match(combined, /`functions\.wait` with that exact cell identifier/);
  assert.match(combined, /inner.*(?:wait|same-child).*600|timeout_ms: 600000/s);
  assert.match(combined, /keyed child state is absent or non-final.*same wait again|non-final timeout.*same child/s);
  assert.match(combined, /do not append, stringify, or otherwise echo the full terminal child state/i);
  assert.match(combined, /canonical payload from (?:the|that) (?:completion )?notification/i);
  assert.match(combined, /artifact-check\.mjs finalize-research/);
  assert.match(combined, /compiled scan as well as the artifact.*basename-only label/s);
  assert.match(combined, /prepare-research-scan/);
  assert.match(combined, /source_excerpt/);
  assert.match(combined, /question as a question, not as evidence|question is not evidence/);
  assert.match(combined, /every clause|every named clause/);
  assert.match(combined, /ranges? (?:no wider than|of at most) 15 lines/);
  assert.match(combined, /never invoke (?:this|the) command bare/i);
  assert.match(combined, /replace the complete start-end range/);
  assert.match(combined, /exactly one `working_tree_sha256` key/);
  assert.match(combined, /literal field `reasoning: medium`/);
  assert.match(combined, /`reasoning_effort`.*forbidden as a displayed card field/);
  assert.match(combined, /summary of card identifiers is not an approval surface/);
  assert.match(combined, /inspect no target source before this decision/);
  assert.match(combined, /\*\*Run\*\*, \*\*Edit\*\*, \*\*Omit\*\*, or \*\*Stop\*\*/);
  assert.match(combined, /\*\*Use scope\*\*, \*\*Revise scope\*\*, or \*\*Stop\*\*/);
  assert.match(combined, /no more than three independent cards per wave and three analysis cards total/);
  assert.match(combined, /complete approved scope must fit at most three analysis cards/);
  assert.match(combined, /Never display a four-card plan and then silently regroup|Never present four groups/);
  assert.match(combined, /five tracer sections|literal headings \*\*Discovery Summary\*\*/);
  assert.match(combined, /at least three concrete artifact citations per question/);
  assert.match(combined, /plan without the numbered questions is invalid|incomplete tracer payload/);
  assert.match(combined, /full literal text of every assigned approved question/);
  assert.match(combined, /Use scope authorizes card preparation only/i);
  assert.match(combined, /Only a later \*\*Run\*\*|Only the subsequent \*\*Run\*\*/);
  assert.match(combined, /scan-preparation failure does not consume either artifact-inspection invocation/);
  assert.match(combined, /exact absolute validated path|exact validated absolute discovery/);
  assert.match(combined, /Do not widen, join, or hand-rewrite|without hand-shortening, widening, joining/);
  assert.match(combined, /complete current-code evidence inventory/);
  assert.match(combined, /render-research-scan/);
  assert.match(combined, /byte-for-byte/);
  assert.match(combined, /Coverage snapshot/);
  assert.match(combined, /worst clause/);
  assert.match(combined, /claim.*source_excerpt/s);
  assert.match(combined, /complete rendered scan byte-for-byte|entire rendered scan byte-for-byte/);
  assert.match(combined, /projection failure cannot consume an inspection invocation/i);
  assert.match(combined, /Preserve every inherited discovery decision/);
  assert.match(combined, /`file:\/\/` targets.*invalid/);
  assert.match(combined, /introduce no new current-code claim or citation|must not introduce a new current-code factual claim/);
  assert.doesNotMatch(combined, /followup_task|dispatch_mode: followup/);
  assert.match(combined, /`agent_type` (?:from|equal to).*`role`/);
  assert.match(combined, /requested runtime settings/);
  assert.match(combined, /updates that same absolute draft path/);
  assert.match(combined, /Never attempt a third inspection/);
  assert.match(combined, /Never invent filesystem links such as `.git\/commit\/<sha>`/);
  assert.match(combined, /changed before\/after `artifact_sha256` values/);
  assert.doesNotMatch(combined, /timestamp-distinct artifact|writes a new artifact with `supersedes`/);
  assert.match(combined, /One wave never authorizes another/);
  assert.match(combined, /External web research is deferred/);
  assert.match(combined, /\*\*Write artifact\*\*, \*\*Adjust\*\*, or \*\*Stop\*\*/);
  assert.match(combined, /\*\*Accept\*\*, \*\*Revise\*\*, or \*\*Stop\*\*/);
  assert.match(combined, /Never create, invoke, route to, or imply `rpivc-design`/);
});

test("research specialist definitions are adaptive and childless", () => {
  const expected = {
    "rpivc-scope-tracer.toml": /5-9 dense numbered questions/,
    "rpivc-codebase-pattern-finder.toml": /approved comparison questions/,
    "rpivc-integration-scanner.toml": /connection graph/,
    "rpivc-precedent-locator.toml": /Never fetch/,
  };
  for (const [file, pattern] of Object.entries(expected)) {
    const text = read(".codex", "agents", file);
    assert.match(text, pattern);
    assert.match(text, /spawn children/);
    assert.match(text, /behaviorally read-only|never mutate/i);
  }
  const scopeTracer = read(".codex", "agents", "rpivc-scope-tracer.toml");
  assert.match(scopeTracer, /direct-prompt mode/);
  assert.match(scopeTracer, /do not request, assume, or invent a discovery artifact/);
  assert.match(scopeTracer, /model_reasoning_effort = "medium"/);
  assert.match(scopeTracer, /full repository-relative.*label/);
  assert.match(scopeTracer, /propose four groups/);
  assert.match(scopeTracer, /all five literal Markdown headings/);
  assert.match(scopeTracer, /self-check that all five headings exist/);
  assert.match(scopeTracer, /Do not open or reread `rpivc-research\/SKILL\.md`/);
  assert.match(scopeTracer, /do not rerun `preflight-research`/);
  assert.match(scopeTracer, /second `inputs` entry/);
  assert.match(scopeTracer, /never dump an entire large file or more than 200 source lines/);
  for (const file of [
    "rpivc-codebase-analyzer.toml",
    "rpivc-codebase-pattern-finder.toml",
    "rpivc-integration-scanner.toml",
  ]) {
    const specialist = read(".codex", "agents", file);
    assert.match(specialist, /full repository-relative/);
    assert.match(specialist, /source excerpt|source_excerpt/i);
  }
  assert.equal(fs.existsSync(path.join(root, ".codex", "agents", "rpivc-codebase-analyzer.toml")), true);
});

test("research template is compressed planner context with complete coverage", () => {
  const template = read(".agents", "skills", "rpivc-research", "assets", "research-template.md");
  for (const section of [
    "Source Feature", "Research Questions", "Summary", "Coverage Ledger", "Detailed Findings",
    "Code References", "Integration Points", "Architecture Insights", "Precedents & Lessons",
    "Developer Context", "Evidence Conflicts and Gaps", "Historical Context", "Open Questions", "Dispatch Ledger",
  ]) assert.match(template, new RegExp(`## ${section.replace(/[&]/g, "\\&")}`));
  assert.match(template, /stage: research/);
  assert.match(template, /status: review/);
  assert.match(template, /source_artifacts:/);
  assert.match(template, /EXACT_VALIDATED_ABSOLUTE_ARTIFACT_MARKDOWN_LINK/);
  assert.match(template, /EVERY_NAMED_CLAUSE/);
  assert.match(template, /EXACT_CANONICAL_COVERAGE_SNAPSHOT/);
  assert.match(template, /COMPLETE_RENDERED_SCAN_COPIED_BYTE_FOR_BYTE/);
  assert.match(template, /Do not create a second citation matrix/);
  assert.match(template, /^supersedes: null$/m);
  assert.match(template, /External web research is deferred from this research unit/);
  assert.match(template, /PLAIN_LOCALLY_VERIFIED_GIT_COMMIT_IDENTIFIERS_AND_ONLY_VERIFIED_EXISTING_LOCAL_LINKS/);
});

test("research evaluation covers direct prompt and discovery modes with two independent graders", () => {
  const cases = read("evals", "research", "cases.yaml");
  const config = read("evals", "research", "promptfooconfig.yaml");
  assert.equal((cases.match(/^\s+case_id:/gm) ?? []).length, 3);
  assert.equal((cases.match(/type: agent-rubric/g) ?? []).length, 2, "YAML anchor defines two graders reused by both cases");
  assert.match(cases, /maxTurns: 20/);
  assert.match(cases, /maxTurns: 30/);
  assert.match(cases, /exercise_revision: true/);
  assert.match(cases, /input_mode: prompt/);
  assert.match(cases, /input_mode: discovery/);
  assert.match(cases, /direct-prompt-research/);
  assert.match(cases, /same revised artifact path/);
  assert.match(config, /maxConcurrency: 1/);
  assert.match(config, /repeat: 1/);
  const provider = read("evals", "research", "provider.mjs");
  const assertions = read("evals", "research", "assertions.mjs");
  assert.match(provider, /const turnTimeoutMs = 2700000/);
  assert.match(provider, /two 600-second same-child/);
  assert.match(provider, /openai:codex-app-server:gpt-5\.6-sol/);
  assert.match(provider, /model_reasoning_effort: "xhigh"/);
  assert.match(provider, /Begin every functions\.exec spawn-and-wait script/);
  assert.match(provider, /timeout_ms: 600000/);
  assert.match(provider, /waited\.status\?\.\[spawned\.agent_id\]/);
  assert.match(provider, /Object\.hasOwn\(state, \\"completed\\"\)/);
  assert.match(provider, /never poll a terminal keyed child again/i);
  assert.match(provider, /Do not text, append, stringify, or otherwise echo the full terminal child state/i);
  assert.match(provider, /canonical payload from the notification/i);
  assert.match(provider, /first command must be artifact-check\.mjs preflight-research/i);
  assert.match(provider, /exact first command executable path is node \.agents\/skills\/_shared\/scripts\/artifact-check\.mjs preflight-research/i);
  assert.match(provider, /first command must exit zero/i);
  assert.match(provider, /initial turn must display only one complete YAML card with id S1/i);
  assert.match(provider, /Do not answer the research questions/i);
  assert.match(provider, /never human-readable aliases such as codebase analyzer/i);
  assert.match(provider, /When a later Run authorizes S1/i);
  assert.match(provider, /followed only by Use scope\/Revise scope\/Stop/i);
  assert.match(provider, /Do not construct or display any A-card in the S1 Run response/i);
  assert.match(provider, /every detectable citation defect in one aggregated correction set/i);
  assert.match(provider, /repair every listed defect together/i);
  assert.match(provider, /terminal analysis child omits the required literal-clause matrix/i);
  assert.match(provider, /continue the already-approved turn directly into synthesis/i);
  assert.match(provider, /never parent-author replacement scope for an invalid tracer/i);
  assert.match(provider, /file:\/\/ targets.*invalid/i);
  assert.match(provider, /validate-research-card/);
  assert.match(provider, /validate-research-scope/);
  assert.match(provider, /finalize-research/);
  assert.match(provider, /literal card field reasoning: medium/);
  assert.match(provider, /return claims cite the return object/i);
  assert.match(provider, /do not access SKILL\.md through cat, sed, rg, find/i);
  assert.match(provider, /Never use a current-file citation to claim Git history/i);
  assert.match(provider, /120-second outer yield is not a child deadline/);
  assert.match(provider, /full repository-relative citation labels in the compiled scan/);
  assert.match(provider, /prepare-research-scan.*source_excerpt.*normalized_markdown/);
  assert.match(provider, /Compiled-scan preparation is read-only and has no two-attempt ceiling/);
  assert.match(provider, /Use scope authorizes card preparation only/);
  assert.match(provider, /Source Feature must link the exact validated absolute discovery-artifact path/);
  assert.match(provider, /complete current-code evidence inventory/);
  assert.match(provider, /render-research-scan/);
  assert.match(provider, /Coverage snapshot/);
  assert.match(provider, /projection of that rendered scan|Copy the complete rendered scan byte-for-byte/);
  assert.match(assertions, /Coverage snapshot.*Write artifact/s);
  assert.match(assertions, /coverage projection/);
  assert.match(assertions, /compiled scan projection/);
  assert.match(provider, /artifact-check\.mjs finalize-research/);
  assert.equal((cases.match(/model_reasoning_effort: xhigh/g) ?? []).length, 1, "YAML anchor keeps both graders on extra-high reasoning");
  assert.doesNotMatch(`${cases}\n${config}`, /web-search|network_access_enabled: true/);
});

test("artifact allocator supports research without changing discovery provenance", async () => {
  const module = await import("../.agents/skills/_shared/scripts/artifact-path.mjs");
  const now = new Date("2026-08-19T12:00:00.000Z");
  const discover = module.artifactPath("discover", "Example", root, now);
  const research = module.artifactPath("research", "Example", root, now);
  assert.equal(discover.common_frontmatter.rpiv_source, "packages/rpiv-pi/skills/discover/SKILL.md");
  assert.equal(research.common_frontmatter.rpiv_source, "packages/rpiv-pi/skills/research/SKILL.md");
  assert.match(research.relative, /^\.rpiv-codex\/artifacts\/research\//);
});

test("compiled research scan projection allows nested scan headings and excludes the appended write gate", async () => {
  const { compiledScanProjectedExactly } = await import("../evals/research/assertions.mjs");
  const citation = "- Evidence. [src/example.mjs:1-2](/tmp/repository/src/example.mjs:1-2)";
  const scan = [
    "# Compiled Research Scan",
    "- Coverage snapshot: Q1=Answered | Totals: Answered=1, Partial=0, Conflicted=0, Unanswered=0",
    "- Q1 — **Answered** — Clauses: behavior (Supported).",
    "## Evidence",
    citation,
    "**Gate:** Write artifact / Adjust / Stop",
  ].join("\n");
  const artifact = [
    "## Source Feature",
    "[.rpiv-codex/artifacts/discover/source.md:1-2](/tmp/repository/.rpiv-codex/artifacts/discover/source.md:1-2)",
    "## Detailed Findings",
    "# Compiled Research Scan",
    "- Coverage snapshot: Q1=Answered | Totals: Answered=1, Partial=0, Conflicted=0, Unanswered=0",
    "- Q1 — **Answered** — Clauses: behavior (Supported).",
    "## Evidence",
    citation,
    "## Code References",
    "See Detailed Findings.",
  ].join("\n");

  assert.equal(compiledScanProjectedExactly(scan, artifact), true);
  assert.equal(compiledScanProjectedExactly(scan, artifact.replace(
    "## Code References",
    "- Invented code claim. [src/other.mjs:1](/tmp/repository/src/other.mjs:1)\n## Code References",
  )), false);
});

test("research projection verification binds the artifact to the complete rendered scan", () => {
  const { workspace, artifact } = researchWorkspaceFixture();
  const scan = [
    "# Research Scan",
    "- Coverage snapshot: Q1=Unanswered | Totals: Answered=0, Partial=0, Conflicted=0, Unanswered=1",
    "- Q1 — **Unanswered** — Clauses: fixture evidence remains unavailable.",
    `- Fixture evidence exists. [tracked.txt:1](${workspace}/tracked.txt:1)`,
  ].join("\n");
  fs.writeFileSync(artifact, fs.readFileSync(artifact, "utf8").replace("Initial reviewed draft.", scan));

  assert.equal(verifyResearchProjection(artifact, scan, workspace).projection_match, true);
  assert.throws(
    () => verifyResearchProjection(artifact, scan.replace("Fixture evidence exists.", "Different claim."), workspace),
    /Detailed Findings must equal the complete rendered scan byte-for-byte/,
  );
  fs.writeFileSync(artifact, fs.readFileSync(artifact, "utf8").replace(
    "No discovery decisions were supplied.",
    `No discovery decisions were supplied.\n- Extra claim. [tracked.txt:1](${workspace}/tracked.txt:1)`,
  ));
  assert.throws(
    () => verifyResearchProjection(artifact, scan, workspace),
    /citation lines outside the rendered scan/,
  );
});

test("research scan requires question-labeled evidence for every Answered question", () => {
  const { workspace } = researchWorkspaceFixture();
  const base = [
    "# Research Scan",
    "- Coverage snapshot: Q1=Answered | Totals: Answered=1, Partial=0, Conflicted=0, Unanswered=0",
    "- Q1 — **Answered** — Clauses: fixture behavior is supported.",
  ];
  const citation = `[tracked.txt:1](${workspace}/tracked.txt:1)`;
  assert.throws(
    () => prepareResearchScan([...base, `- Fixture behavior is supported. ${citation}`].join("\n"), workspace),
    /Q1 is Answered but has no evidence bullet beginning/,
  );
  assert.equal(
    prepareResearchScan([...base, `- Q1: Fixture behavior is supported. ${citation}`].join("\n"), workspace).citations.length,
    1,
  );
});

test("research card validation binds profile and context to the authoritative snapshot", () => {
  const { workspace } = researchWorkspaceFixture();
  const snapshot = JSON.parse(execFileSync(
    process.execPath,
    [path.join(root, ".agents/skills/_shared/scripts/context-snapshot.mjs")],
    { cwd: workspace, encoding: "utf8" },
  ));
  const card = [
    "id: S1",
    "role: rpivc-scope-tracer",
    `repository: ${snapshot.repository}`,
    `branch: ${snapshot.branch}`,
    `commit: ${snapshot.commit}`,
    `working_tree_sha256: ${snapshot.working_tree_sha256}`,
    "model: gpt-5.6-terra",
    "reasoning: medium",
  ].join("\n");

  assert.equal(validateResearchCard(card, workspace).valid, true);
  assert.throws(
    () => validateResearchCard(card.replace(snapshot.working_tree_sha256, snapshot.working_tree_sha256.slice(0, 61)), workspace),
    /does not match the authoritative repository snapshot/,
  );
  assert.throws(
    () => validateResearchCard(card.replace("reasoning: medium", "reasoning: high"), workspace),
    /must use gpt-5\.6-terra\/medium/,
  );
});

test("research scope validation checks citations and exact plan coverage", () => {
  const { workspace } = researchWorkspaceFixture();
  const citation = `[tracked.txt:1](${workspace}/tracked.txt:1)`;
  const valid = [
    "## Discovery Summary",
    "Bounded scope.",
    "## Research Questions",
    ...[1, 2, 3, 4, 5].map((question) => `${question}. What remains to trace? ${citation} ${citation} ${citation}`),
    "## Shared Files",
    "- tracked.txt",
    "## Evidence Gaps",
    "- None yet.",
    "## Proposed Execution Plan",
    "1. Analyzer: Q1-Q5.",
  ].join("\n");

  assert.equal(validateResearchScope(valid, workspace).valid, true);
  assert.throws(
    () => validateResearchScope(valid.replaceAll("[tracked.txt:1]", "[file.txt:1]"), workspace),
    /citation label must be repository-relative/,
  );
  assert.throws(
    () => validateResearchScope(valid.replaceAll(`${workspace}/tracked.txt:1`, `${workspace}/missing.txt:1`), workspace),
    /citation target does not exist/,
  );
  assert.throws(
    () => validateResearchScope(valid.replace("Q1-Q5", "Q1-Q4"), workspace),
    /cover Q5 exactly once/,
  );
});

test("research finalization projects before normalization and inspection", () => {
  const { workspace, artifact } = researchWorkspaceFixture();
  const scan = [
    "# Research Scan",
    "- Coverage snapshot: Q1=Unanswered | Totals: Answered=0, Partial=0, Conflicted=0, Unanswered=1",
    "- Q1 — **Unanswered** — Clauses: fixture evidence remains unavailable.",
    `- Fixture evidence exists. [tracked.txt:1](${workspace}/tracked.txt:1)`,
  ].join("\n");
  fs.writeFileSync(artifact, fs.readFileSync(artifact, "utf8").replace("Initial reviewed draft.", scan));

  assert.equal(finalizeResearch(artifact, scan, workspace).context_match, true);
  assert.throws(
    () => finalizeResearch(artifact, scan.replace("Fixture evidence exists.", "Different claim."), workspace),
    /Detailed Findings must equal the complete rendered scan byte-for-byte/,
  );
});

test("tracer scope checkpoint rejects parent-authored recovery from an invalid tracer", async () => {
  const { tracerScopeCheckpointIsValid } = await import("../evals/research/assertions.mjs");
  const { workspace } = researchWorkspaceFixture();
  const links = [1, 2, 3].map(() => `[tracked.txt:1](${workspace}/tracked.txt:1)`).join(" ");
  const valid = [
    "## Discovery Summary",
    "Bounded scope.",
    "## Research Questions",
    ...[1, 2, 3, 4, 5].map((question) => `${question}. What remains to trace? ${links}`),
    "## Shared Files",
    "- src/",
    "## Evidence Gaps",
    "- None yet.",
    "## Proposed Execution Plan",
    "1. Analyzer: Q1-Q5.",
  ].join("\n");

  assert.equal(tracerScopeCheckpointIsValid(valid, workspace), true);
  assert.equal(tracerScopeCheckpointIsValid(valid.replace("Bounded scope.", "The tracer returned an invalid scope."), workspace), false);
  assert.equal(tracerScopeCheckpointIsValid(valid.replaceAll(`(${workspace}/`, `(file://${workspace}/`), workspace), false);
});

test("research attestation recognizes every dispatchable research role", () => {
  const rendered = [
    "```yaml\nid: S1\ntask_name: s1_scope_tracer\nrole: rpivc-scope-tracer\nmodel: gpt-5.6-terra\nreasoning: high\n```",
    "```yaml\nid: A4\ntask_name: a4_precedent\nrole: rpivc-precedent-locator\nmodel: gpt-5.6-luna\nreasoning: low\n```",
  ].join("\n");
  assert.deepEqual(extractAgentCards(rendered).map((card) => card.role), ["rpivc-scope-tracer", "rpivc-precedent-locator"]);
});

test("external-web deferral assertion accepts equivalent inherited wording", () => {
  assert.equal(inheritsExternalWebDeferral("External web research is deferred."), true);
  assert.equal(inheritsExternalWebDeferral("The artifact must defer external web research."), true);
  assert.equal(inheritsExternalWebDeferral("External research remains explicitly deferred."), true);
  assert.equal(inheritsExternalWebDeferral("External web research is enabled."), false);
});

test("research assertion requires repository-relative citation labels", () => {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "rpivc-citation-label-")));
  const repository = path.join(base, "workspace");
  const alias = path.join(base, "workspace-alias");
  fs.mkdirSync(path.join(repository, "src"), { recursive: true });
  fs.writeFileSync(path.join(repository, "src", "provider.mjs"), Array.from({ length: 12 }, () => "line").join("\n"));
  fs.symlinkSync(repository, alias);
  assert.equal(repositoryRelativeCitationLabels(
    `[src/provider.mjs:12](${repository}/src/provider.mjs:12)`,
    repository,
  ), true);
  assert.equal(repositoryRelativeCitationLabels(
    `[provider.mjs:12](${repository}/src/provider.mjs:12)`,
    repository,
  ), false);
  assert.equal(repositoryRelativeCitationLabels(
    `[src/provider.mjs:12-12](${repository}/src/provider.mjs:12)`,
    repository,
  ), true);
  assert.equal(repositoryRelativeCitationLabels(
    `[` + "`src/provider.mjs:12`" + `](${repository}/src/provider.mjs:12)`,
    repository,
  ), true);
  assert.equal(repositoryRelativeCitationLabels(
    `[src/provider.mjs:12](${alias}/src/provider.mjs:12)`,
    repository,
  ), true);
});

test("research provider clears stale cards and retains each child call once", () => {
  const provider = new RpivcResearchProvider();
  const cardState = { latestCards: [{ id: "old" }], phase: "ordinary" };
  provider.afterTurn(cardState, "No dispatch card in this turn.");
  assert.deepEqual(cardState.latestCards, []);

  const state = { attestedCallIds: new Set(), attestations: [] };
  const attestation = { dispatch: { call_id: "call-1" } };
  assert.equal(retainUniqueAttestation(state, attestation), true);
  assert.equal(retainUniqueAttestation(state, attestation), false);
  assert.equal(state.attestations.length, 1);
});

test("research provider captures authoritative context for scope use, refresh, and approved dispatch", () => {
  assert.equal(shouldCaptureRuntimeSnapshot("ordinary answer", []), false);
  assert.equal(shouldCaptureRuntimeSnapshot("initial prompt", [], true), true);
  assert.equal(shouldCaptureRuntimeSnapshot("Use scope", []), true);
  assert.equal(shouldCaptureRuntimeSnapshot("Refresh the cards.", []), true);
  assert.equal(shouldCaptureRuntimeSnapshot("Run", [{ id: "A1" }]), true);
});

test("research provider retries one timed-out turn without granting new authority", async () => {
  const evidenceDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "rpivc-transport-retry-")));
  const calls = [];
  const state = {
    evidenceDir,
    turn: 1,
    pendingCards: [{ id: "S1" }],
    delegate: {
      async callApi(prompt) {
        calls.push(JSON.parse(prompt));
        if (calls.length === 1) return { error: "codex app-server turn timed out after 2700000ms" };
        return { output: "validated scope" };
      },
    },
  };
  const provider = new RpivcResearchProvider();
  const response = await provider.callDelegateWithTransportRetry({
    state,
    appServerInput: [{ type: "text", text: "Run" }],
    delegateContext: {},
    callOptions: {},
    decision: "run",
    retryDelayMs: 0,
  });

  assert.equal(response.output, "validated scope");
  assert.equal(calls.length, 2);
  const marker = calls[1].at(-1).text;
  assert.match(marker, /retry grants no new authority/i);
  assert.match(marker, /do not spawn another child/i);
  assert.match(marker, /approved_card_ids: \["S1"\]/);
  const events = fs.readFileSync(path.join(evidenceDir, "transport-retries.jsonl"), "utf8")
    .trim().split("\n").map((line) => JSON.parse(line));
  assert.deepEqual(events.map((event) => event.event), ["scheduled", "succeeded"]);
  assert.equal(isResearchTransportTimeout(new Error("other failure")), false);
  assert.match(researchTransportRetryMarker({ decision: "run", pendingCardIds: ["S1"] }), /same user decision/i);
});

test("research provider rejects an empty transport retry checkpoint", async () => {
  const evidenceDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "rpivc-empty-retry-")));
  let calls = 0;
  const state = {
    evidenceDir,
    turn: 1,
    pendingCards: [{ id: "S1" }],
    delegate: {
      async callApi() {
        calls += 1;
        return calls === 1
          ? { error: "codex app-server turn timed out after 2700000ms" }
          : { output: "" };
      },
    },
  };
  const provider = new RpivcResearchProvider();

  await assert.rejects(
    provider.callDelegateWithTransportRetry({
      state,
      appServerInput: [{ type: "text", text: "Run" }],
      delegateContext: {},
      callOptions: {},
      decision: "run",
      retryDelayMs: 0,
    }),
    /no checkpoint output/,
  );
  const events = fs.readFileSync(path.join(evidenceDir, "transport-retries.jsonl"), "utf8")
    .trim().split("\n").map((line) => JSON.parse(line));
  assert.deepEqual(events.map((event) => event.event), ["scheduled", "failed"]);
});

test("research provider supplements a raw dispatch when the notification handler misses it", () => {
  const notification = {
    method: "rawResponseItem/completed",
    params: {
      threadId: "parent",
      turnId: "turn-1",
      item: {
        type: "function_call",
        name: "spawn_agent",
        call_id: "raw-spawn",
        arguments: JSON.stringify({
          agent_type: "rpivc-codebase-analyzer",
          task_name: "analysis_profile",
          fork_turns: "none",
          model: "gpt-5.6-terra",
          reasoning_effort: "high",
          message: "approved-envelope",
        }),
      },
    },
  };
  const state = { attestationEvents: [{ kind: "agent-output" }] };
  assert.equal(supplementRawAttestationEvents(state, { notifications: [notification] }, 0), 1);
  assert.equal(state.attestationEvents.some((event) => event.kind === "dispatch-call"), true);

  const alreadyCaptured = { attestationEvents: [captureAttestationEvent(notification)] };
  assert.equal(supplementRawAttestationEvents(alreadyCaptured, { notifications: [notification] }, 0), 0);
  assert.equal(alreadyCaptured.attestationEvents.length, 1);

  const partiallyCaptured = { attestationEvents: [{ kind: "dispatch-call", call_id: "different-spawn" }] };
  assert.equal(supplementRawAttestationEvents(partiallyCaptured, { notifications: [notification] }, 0), 1);
  assert.equal(partiallyCaptured.attestationEvents.length, 2);
});

test("research revision evidence proves changed bytes at one validated path", () => {
  const { workspace, artifact } = researchWorkspaceFixture();
  const evidenceDir = fs.mkdtempSync(path.join(os.tmpdir(), "rpivc-research-evidence-"));
  const state = { workspace, evidenceDir, turn: 1, artifactRevisionObservations: [] };

  const first = observeResearchArtifact(workspace, 1);
  assert.equal(first.artifact_count, 1);
  assert.equal(first.inspection_passed, true);
  assert.equal(retainArtifactRevisionObservation(state).artifact_sha256, first.artifact_sha256);
  assert.equal(retainArtifactRevisionObservation(state), null, "unchanged bytes are not a revision");

  fs.appendFileSync(artifact, "Revised reviewed draft.\n");
  state.turn = 2;
  const second = retainArtifactRevisionObservation(state);
  assert.equal(second.relative_path, first.relative_path);
  assert.notEqual(second.artifact_sha256, first.artifact_sha256);
  assert.equal(second.inspection_passed, true);
  assert.equal(state.artifactRevisionObservations.length, 2);
  assert.equal(fs.readFileSync(path.join(evidenceDir, "artifact-revisions.jsonl"), "utf8").trim().split("\n").length, 2);
});

test("runtime reducer captures only fresh spawn dispatches without plaintext", () => {
  const spawn = captureAttestationEvent({
    method: "rawResponseItem/completed",
    params: {
      threadId: "parent",
      turnId: "turn-1",
      item: {
        type: "function_call",
        name: "spawn_agent",
        call_id: "call-spawn",
        arguments: JSON.stringify({
          agent_type: "rpivc-codebase-analyzer",
          task_name: "analysis_profile",
          fork_turns: "none",
          model: "gpt-5.6-terra",
          reasoning_effort: "high",
          message: "encrypted-spawn-envelope",
        }),
      },
    },
  });
  const followup = captureAttestationEvent({
    method: "rawResponseItem/completed",
    params: {
      threadId: "parent",
      turnId: "turn-2",
      item: {
        type: "function_call",
        name: "followup_task",
        call_id: "call-followup",
        arguments: JSON.stringify({
          target: "analysis_profile",
          message: "encrypted-followup-envelope",
        }),
      },
    },
  });

  assert.deepEqual([spawn.kind, spawn.dispatch_mode, spawn.task_name], ["dispatch-call", "spawn", "analysis_profile"]);
  assert.equal(spawn.message_sha256.length, 64);
  assert.equal(spawn.agent_type, "rpivc-codebase-analyzer");
  assert.equal(followup, null);
  assert.equal(JSON.stringify(spawn).includes("encrypted-spawn-envelope"), false);
});

test("runtime attestation compares visible sandbox policy when parent roots are redacted", () => {
  const child = {
    type: "workspaceWrite",
    writableRoots: [],
    networkAccess: false,
    excludeTmpdirEnvVar: false,
    excludeSlashTmp: false,
  };
  const parent = { ...child, writableRoots: "[...]" };
  assert.deepEqual(compareSandboxPolicies(child, child), { pass: true, status: "exact-match" });
  assert.deepEqual(compareSandboxPolicies(child, parent), {
    pass: true,
    status: "visible-policy-match-parent-roots-redacted",
  });
  assert.deepEqual(compareSandboxPolicies(child, { ...parent, networkAccess: true }), {
    pass: false,
    status: "mismatch",
  });
});

test("runtime reducer resolves the yielded spawn payload variable structurally", () => {
  const card = {
    id: "S1",
    dispatch_protocol: "rpivc-dispatch/v1",
    dispatch_mode: "spawn",
    depends_on: [],
    task_name: "s1_scope_tracer",
    role: "rpivc-scope-tracer",
    model: "gpt-5.6-terra",
    reasoning: "medium",
  };
  const cardYaml = [
    "id: S1",
    "dispatch_protocol: rpivc-dispatch/v1",
    "dispatch_mode: spawn",
    "depends_on: []",
    "task_name: s1_scope_tracer",
    "role: rpivc-scope-tracer",
    "model: gpt-5.6-terra",
    "reasoning: medium",
  ].join("\n");
  const dispatch = captureAttestationEvent({
    method: "rawResponseItem/completed",
    params: {
      threadId: "parent",
      turnId: "turn-1",
      item: {
        type: "custom_tool_call",
        name: "exec",
        call_id: "nested-call",
        input: `// @exec: {"yield_time_ms": 120000}\nconst envelope = \`${cardYaml}\`;\nconst spawned = await tools.multi_agent_v1__spawn_agent({ agent_type: "rpivc-scope-tracer", fork_context: false, message: envelope, model: "gpt-5.6-terra", reasoning_effort: "medium" });`,
      },
    },
  });
  const result = captureAttestationEvent({
    method: "rawResponseItem/completed",
    params: {
      item: {
        type: "custom_tool_call_output",
        call_id: "nested-call",
        output: [{ type: "input_text", text: '{"agent_id":"child-thread","nickname":"Ada"}' }],
      },
    },
  });
  const sandbox = { type: "workspaceWrite", networkAccess: false };
  const attestation = buildDispatchAttestation({
    parentThreadId: "parent",
    card,
    events: [
      { kind: "thread-settings", thread_id: "parent", sandbox_policy: sandbox },
      dispatch,
      result,
      { kind: "thread-settings", thread_id: "child-thread", model: "gpt-5.6-terra", effort: "medium", sandbox_policy: sandbox },
      { kind: "turn-completed", thread_id: "child-thread", status: "completed", error: null },
      { kind: "agent-output", author: "child-thread", content_sha256: "b".repeat(64), content_bytes: 64 },
      { kind: "nested-spawn-observation", thread_id: "child-thread", count: 0 },
    ],
  });

  assert.equal(dispatch.spawn_schema, "multi-agent-v1");
  assert.equal(dispatch.fork_turns, "none");
  assert.equal(result.child_thread_id, "child-thread");
  assert.equal(attestation.prompt_verification.status, "plaintext-envelope-matched");
  assert.equal(attestation.pass, true);

  dispatch.canonical_envelope_sha256 = "c".repeat(64);
  const mismatchedEnvelope = buildDispatchAttestation({
    parentThreadId: "parent",
    card,
    events: [
      { kind: "thread-settings", thread_id: "parent", sandbox_policy: sandbox },
      dispatch,
      result,
      { kind: "thread-settings", thread_id: "child-thread", model: "gpt-5.6-terra", effort: "medium", sandbox_policy: sandbox },
      { kind: "turn-completed", thread_id: "child-thread", status: "completed", error: null },
      { kind: "agent-output", author: "child-thread", content_sha256: "b".repeat(64), content_bytes: 64 },
      { kind: "nested-spawn-observation", thread_id: "child-thread", count: 0 },
    ],
  });
  assert.equal(mismatchedEnvelope.prompt_verification.status, "plaintext-envelope-mismatch");
  assert.equal(mismatchedEnvelope.checks.prompt_envelope_matches_or_is_opaque, false);
  assert.equal(mismatchedEnvelope.pass, false);
  dispatch.canonical_envelope_sha256 = attestation.prompt_verification.displayed_card_sha256;

  const shorthandDispatch = captureAttestationEvent({
    method: "rawResponseItem/completed",
    params: {
      threadId: "parent",
      turnId: "turn-2",
      item: {
        type: "custom_tool_call",
        name: "exec",
        call_id: "shorthand-call",
        input: `const message = \`${cardYaml}\`;\nconst spawned = await tools.multi_agent_v1__spawn_agent({ agent_type: "rpivc-scope-tracer", fork_context: false, model: "gpt-5.6-terra", reasoning_effort: "medium", message });`,
      },
    },
  });
  assert.equal(shorthandDispatch.task_name, "s1_scope_tracer");
  assert.equal(shorthandDispatch.canonical_envelope_sha256, dispatch.canonical_envelope_sha256);

  const objectDispatch = captureAttestationEvent({
    method: "rawResponseItem/completed",
    params: {
      threadId: "parent",
      turnId: "turn-3",
      item: {
        type: "custom_tool_call",
        name: "exec",
        call_id: "object-call",
        input: `const card = {
  id: "S1",
  dispatch_protocol: "rpivc-dispatch/v1",
  dispatch_mode: "spawn",
  depends_on: [],
  task_name: "s1_scope_tracer",
  role: "rpivc-scope-tracer",
  model: "gpt-5.6-terra",
  reasoning: "medium"
};
const spawned = await tools.multi_agent_v1__spawn_agent({
  agent_type: card.role,
  fork_context: false,
  message: JSON.stringify(card),
  model: card.model,
  reasoning_effort: card.reasoning
});`,
      },
    },
  });
  assert.equal(objectDispatch.agent_type, "rpivc-scope-tracer");
  assert.equal(objectDispatch.model, "gpt-5.6-terra");
  assert.equal(objectDispatch.reasoning_effort, "medium");
  assert.equal(objectDispatch.task_name, "s1_scope_tracer");
  assert.equal(objectDispatch.canonical_envelope_sha256, dispatch.canonical_envelope_sha256);
});

test("runtime reducer preserves Markdown backticks inside a spawned YAML template", () => {
  const card = {
    id: "A1",
    dispatch_protocol: "rpivc-dispatch/v1",
    dispatch_mode: "spawn",
    depends_on: [],
    task_name: "a1_markdown_evidence",
    role: "rpivc-codebase-analyzer",
    purpose: "Trace cited evidence",
    inputs: ["Question 1: Trace `source_artifacts` with [`path.js:1`](/repo/path.js:1)"],
    repository: "/repo",
    branch: "main",
    commit: "abc",
    working_tree_sha256: "a".repeat(64),
    model: "gpt-5.6-terra",
    reasoning: "high",
  };
  const yaml = [
    'id: "A1"',
    'dispatch_protocol: "rpivc-dispatch/v1"',
    'dispatch_mode: "spawn"',
    'depends_on: []',
    'task_name: "a1_markdown_evidence"',
    'role: "rpivc-codebase-analyzer"',
    'purpose: "Trace cited evidence"',
    'inputs:',
    '  - "Question 1: Trace `source_artifacts` with [`path.js:1`](/repo/path.js:1)"',
    'repository: "/repo"',
    'branch: "main"',
    'commit: "abc"',
    `working_tree_sha256: "${"a".repeat(64)}"`,
    'model: "gpt-5.6-terra"',
    'reasoning: "high"',
  ].join("\n");
  const escapedYaml = yaml.replaceAll("`", "\\`");
  const event = captureAttestationEvent({
    method: "rawResponseItem/completed",
    params: {
      threadId: "parent",
      turnId: "turn",
      item: {
        type: "custom_tool_call",
        name: "exec",
        call_id: "call",
        input: `const message = \`${escapedYaml}\`;\nconst spawned = await tools.multi_agent_v1__spawn_agent({agent_type:"rpivc-codebase-analyzer", fork_context:false, message, model:"gpt-5.6-terra", reasoning_effort:"high"});`,
      },
    },
  });
  assert.equal(event.kind, "dispatch-call");
  assert.equal(event.task_name, card.task_name);
  assert.equal(event.agent_type, card.role);
  assert.equal(event.fork_turns, "none");
  assert.equal(event.canonical_envelope_sha256, buildDispatchAttestation({
    events: [],
    parentThreadId: "parent",
    card,
  }).prompt_verification.displayed_card_sha256);
});

test("runtime reducer correlates wrapped spawn calls with native collaboration receivers", () => {
  const event = captureAttestationEvent({
    method: "item/completed",
    params: {
      threadId: "parent",
      turnId: "turn",
      item: {
        type: "collabAgentToolCall",
        id: "call",
        tool: "spawnAgent",
        status: "completed",
        senderThreadId: "parent",
        receiverThreadIds: ["child"],
        model: "gpt-5.6-terra",
        reasoningEffort: "high",
      },
    },
  });
  assert.equal(event.kind, "collaboration-call");
  assert.equal(event.child_thread_id, "child");
  assert.equal(event.agent_path, "child");
});

test("runtime reducer correlates an inline nested spawn with its child notification", () => {
  const card = {
    id: "S1",
    dispatch_protocol: "rpivc-dispatch/v1",
    dispatch_mode: "spawn",
    depends_on: [],
    task_name: "s1_scope_tracer",
    role: "rpivc-scope-tracer",
    model: "gpt-5.6-terra",
    reasoning: "medium",
  };
  const cardYaml = [
    "id: S1",
    "dispatch_protocol: rpivc-dispatch/v1",
    "dispatch_mode: spawn",
    "depends_on: []",
    "task_name: s1_scope_tracer",
    "role: rpivc-scope-tracer",
    "model: gpt-5.6-terra",
    "reasoning: medium",
  ].join("\n");
  const dispatch = captureAttestationEvent({
    method: "rawResponseItem/completed",
    params: {
      threadId: "parent",
      turnId: "turn-1",
      item: {
        type: "custom_tool_call",
        name: "exec",
        call_id: "nested-call",
        input: `const spawned = await tools.multi_agent_v1__spawn_agent({ agent_type: "rpivc-scope-tracer", fork_context: false, message: \`${cardYaml}\`, model: "gpt-5.6-terra", reasoning_effort: "medium" });`,
      },
    },
  });
  const notification = captureAttestationEvent({
    method: "rawResponseItem/completed",
    params: {
      threadId: "parent",
      turnId: "turn-1",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: '<subagent_notification>{"agent_path":"child-thread","status":{"completed":"traced scope"}}</subagent_notification>' }],
      },
    },
  });
  const sandbox = { type: "workspaceWrite", networkAccess: false };
  const attestation = buildDispatchAttestation({
    parentThreadId: "parent",
    card,
    events: [
      { kind: "thread-settings", thread_id: "parent", sandbox_policy: sandbox },
      dispatch,
      notification,
      { kind: "thread-settings", thread_id: "child-thread", model: "gpt-5.6-terra", effort: "medium", sandbox_policy: sandbox },
      { kind: "nested-spawn-observation", thread_id: "child-thread", count: 0 },
    ],
  });

  assert.equal(dispatch.task_name, "s1_scope_tracer");
  assert.equal(notification.child_thread_id, "child-thread");
  assert.equal(attestation.prompt_verification.status, "plaintext-envelope-matched");
  assert.equal(attestation.checks.child_completed, true);
  assert.equal(attestation.checks.child_output_observed, true);
  assert.equal(attestation.pass, true);
});

test("dependent-card attestation requires a fresh explicitly configured child", () => {
  const sandbox = { type: "workspaceWrite", writableRoots: [], networkAccess: false };
  const card = {
    id: "A4",
    dispatch_protocol: "rpivc-dispatch/v1",
    dispatch_mode: "spawn",
    depends_on: ["A1"],
    task_name: "analysis_profile",
    role: "rpivc-codebase-analyzer",
    model: "gpt-5.6-terra",
    reasoning: "high",
  };
  const events = [
    { kind: "thread-settings", thread_id: "parent", sandbox_policy: sandbox },
    {
      kind: "dispatch-call",
      dispatch_mode: "spawn",
      thread_id: "parent",
      call_id: "call-dependent",
      task_name: "analysis_profile",
      agent_type: "rpivc-codebase-analyzer",
      fork_turns: "none",
      model: "gpt-5.6-terra",
      reasoning_effort: "high",
      message_sha256: "a".repeat(64),
      message_bytes: 128,
      canonical_envelope_sha256: null,
    },
    {
      kind: "subagent-activity",
      activity: "started",
      call_id: "call-dependent",
      child_thread_id: "child",
      agent_path: "/root/analysis_profile",
    },
    {
      kind: "thread-settings",
      thread_id: "child",
      model: "gpt-5.6-terra",
      effort: "high",
      sandbox_policy: sandbox,
      approval_policy: "never",
    },
    { kind: "turn-completed", thread_id: "child", status: "completed", error: null },
    {
      kind: "agent-output",
      author: "/root/analysis_profile",
      content_sha256: "b".repeat(64),
      content_bytes: 256,
    },
  ];

  const attestation = buildDispatchAttestation({ events, parentThreadId: "parent", card });
  assert.equal(attestation.schema, "rpivc-runtime-attestation/v3");
  assert.equal(attestation.dispatch_mode, "spawn");
  assert.deepEqual(attestation.depends_on, ["A1"]);
  assert.equal(attestation.pass, true);

  const inherited = buildDispatchAttestation({
    events,
    parentThreadId: "parent",
    card: { ...card, task_name: "missing" },
  });
  assert.equal(inherited.checks.dispatch_observed, false);
  assert.equal(inherited.pass, false);
});

test("research provider archives each child after effective settings capture", async () => {
  const requests = [];
  const connection = {
    async request(method, params) {
      requests.push({ method, params });
      if (method === "thread/resume") {
        return {
          model: "gpt-5.6-terra",
          reasoningEffort: "high",
          sandbox: { type: "workspaceWrite", writableRoots: [], networkAccess: false },
          approvalPolicy: "never",
        };
      }
      return {};
    },
  };
  const provider = new RpivcResearchProvider();
  const state = {
    delegate: { connections: new Map([["connection", connection]]) },
    attestationEvents: [],
    archivedThreadIds: new Set(),
  };

  await provider.captureEffectiveChildSettings(state, [
    { kind: "subagent-activity", child_thread_id: "child-thread" },
  ]);
  assert.deepEqual(requests.map((request) => request.method), ["thread/resume", "thread/archive"]);
  assert.equal(state.archivedThreadIds.has("child-thread"), true);
});

test("research provider queries effective parent settings when the stream omits them", async () => {
  const requests = [];
  const connection = {
    async request(method, params) {
      requests.push({ method, params });
      return {
        model: params.threadId === "parent-thread" ? "gpt-5.6-luna" : "gpt-5.6-terra",
        reasoningEffort: params.threadId === "parent-thread" ? "low" : "medium",
        sandbox: { type: "workspaceWrite", writableRoots: [], networkAccess: false },
        approvalPolicy: "never",
      };
    },
  };
  const provider = new RpivcResearchProvider();
  const state = {
    delegate: { connections: new Map([["connection", connection]]) },
    attestationEvents: [],
    archivedThreadIds: new Set(),
  };

  await provider.captureEffectiveChildSettings(state, [
    { kind: "child-notification", child_thread_id: "child-thread" },
  ], "parent-thread");

  assert.deepEqual(requests.map(({ method, params }) => [method, params.threadId]), [
    ["thread/resume", "parent-thread"],
    ["thread/resume", "child-thread"],
    ["thread/archive", "child-thread"],
  ]);
  assert.equal(state.attestationEvents.find((event) => event.thread_id === "parent-thread")?.sandbox_policy?.type, "workspaceWrite");
});
