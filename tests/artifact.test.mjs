import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  compareArtifactContext,
  inspectArtifact,
  hasNoDiscoveryContext,
  normalizeLocalMarkdownCitations,
  prepareResearchScan,
  preflightDiscoveryArtifact,
  preflightResearchInput,
} from "../.agents/skills/_shared/scripts/artifact-check.mjs";
import { artifactPath, slugify } from "../.agents/skills/_shared/scripts/artifact-path.mjs";
import { contextSnapshot } from "../.agents/skills/_shared/scripts/context-snapshot.mjs";

const pinnedCommit = "d0eb55371f622ac524b3355711a482f95feb14d4";
const projectRoot = path.resolve(import.meta.dirname, "..");

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function repositoryFixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "rpivc-artifact-")));
  git(root, "init", "-b", "main");
  git(root, "config", "user.name", "Fixture Reviewer");
  git(root, "config", "user.email", "fixture@example.test");
  fs.writeFileSync(path.join(root, "fixture.txt"), "baseline\n");
  git(root, "add", "fixture.txt");
  git(root, "commit", "-m", "fixture baseline");
  return root;
}

function artifactMarkdown(context, overrides = {}) {
  const values = {
    stage: "discover",
    status: "review",
    rpiv_source: "packages/rpiv-pi/skills/discover/SKILL.md",
    rpiv_commit: pinnedCommit,
    supersedes: null,
    source_artifacts: [],
    repository: context.repository,
    branch: context.branch,
    commit: context.commit,
    working_tree_sha256: context.working_tree_sha256,
    working_tree_scope: context.working_tree_scope,
    created_at: context.created_at,
    ...overrides,
  };
  const value = (input) => input === null ? "null" : JSON.stringify(input);
  return [
    "---",
    `stage: ${values.stage}`,
    `status: ${values.status}`,
    `rpiv_source: ${value(values.rpiv_source)}`,
    `rpiv_commit: ${values.rpiv_commit}`,
    `supersedes: ${value(values.supersedes)}`,
    `source_artifacts: ${value(values.source_artifacts)}`,
    `repository: ${value(values.repository)}`,
    `branch: ${value(values.branch)}`,
    `commit: ${value(values.commit)}`,
    `working_tree_sha256: ${value(values.working_tree_sha256)}`,
    `working_tree_scope: ${value(values.working_tree_scope)}`,
    `created_at: ${value(values.created_at)}`,
    "---",
    "",
    "# Fixture Feature Requirements Document",
    "",
  ].join("\n");
}

function appendBody(root, target, body) {
  fs.appendFileSync(target, body.replaceAll("{{ROOT}}", root));
}

function appendMissingResearchSections(target, existing = []) {
  const all = [
    "Source Feature", "Research Questions", "Summary", "Coverage Ledger", "Detailed Findings",
    "Code References", "Integration Points", "Architecture Insights", "Precedents & Lessons",
    "Developer Context", "Evidence Conflicts and Gaps", "Historical Context", "Open Questions",
    "Dispatch Ledger",
  ];
  fs.appendFileSync(target, all
    .filter((heading) => !existing.includes(heading))
    .map((heading) => {
      if (heading === "Summary") {
        return "## Summary\n\n- Coverage snapshot: Q1=Unanswered | Totals: Answered=0, Partial=0, Conflicted=0, Unanswered=1\n";
      }
      if (heading === "Coverage Ledger") {
        return "## Coverage Ledger\n\n- Q1 — **Unanswered** — Clauses: fixture evidence is unavailable.\n";
      }
      if (heading === "Developer Context") return "## Developer Context\n\nNo discovery decisions were supplied.\n";
      return `## ${heading}\n\nFixture content.\n`;
    })
    .join("\n"));
}

function writeArtifact(root, name = "fixture.md", overrides = {}) {
  const context = contextSnapshot(root);
  const directory = path.join(root, ".rpiv-codex", "artifacts", "discover");
  fs.mkdirSync(directory, { recursive: true });
  const target = path.join(directory, name);
  fs.writeFileSync(target, artifactMarkdown(context, overrides));
  return { target, context };
}

test("context snapshot captures stable repository identity", () => {
  const root = repositoryFixture();
  const snapshot = contextSnapshot(root, new Date("2026-08-17T09:10:11.123Z"));
  assert.equal(snapshot.repository, root);
  assert.equal(snapshot.repository_name, path.basename(root));
  assert.equal(snapshot.branch, "main");
  assert.match(snapshot.commit, /^[0-9a-f]{40}$/);
  assert.equal(snapshot.author, "Fixture Reviewer");
  assert.match(snapshot.created_at, /^2026-08-17T/);
  assert.match(snapshot.working_tree_sha256, /^[0-9a-f]{64}$/);
  assert.equal(snapshot.working_tree_file_count, 1);
});

test("working-tree snapshot is deterministic and excludes review and ignored data", () => {
  const root = repositoryFixture();
  const before = contextSnapshot(root);
  const reviewDirectory = path.join(root, ".rpiv-codex", "artifacts", "discover");
  fs.mkdirSync(reviewDirectory, { recursive: true });
  fs.writeFileSync(path.join(reviewDirectory, "review.md"), "review bytes\n");
  assert.equal(contextSnapshot(root).working_tree_sha256, before.working_tree_sha256);

  fs.appendFileSync(path.join(root, ".git", "info", "exclude"), "\nignored.tmp\n");
  fs.writeFileSync(path.join(root, "ignored.tmp"), "ignored generated data\n");
  assert.equal(contextSnapshot(root).working_tree_sha256, before.working_tree_sha256);

  fs.writeFileSync(path.join(root, "fixture.txt"), "source changed\n");
  assert.notEqual(contextSnapshot(root).working_tree_sha256, before.working_tree_sha256);
});

test("artifact path is fresh, stage-scoped, and includes revision lineage", () => {
  const root = repositoryFixture();
  const result = artifactPath(
    "discover",
    "ASCII Widget Spinner!",
    root,
    new Date("2026-08-17T09:10:11.123Z"),
  );
  assert.match(result.relative, /^\.rpiv-codex\/artifacts\/discover\/[0-9T+\-]+_ascii-widget-spinner\.md$/);
  assert.equal(result.common_frontmatter.repository, root);
  assert.equal(result.common_frontmatter.working_tree_sha256, result.context.working_tree_sha256);
  assert.equal(result.common_frontmatter.supersedes, null);
  assert.equal(result.common_frontmatter.topic, "ascii-widget-spinner");
  assert.equal(fs.existsSync(path.dirname(result.absolute)), true);
  assert.equal(fs.existsSync(result.absolute), false);
  assert.equal(slugify("!!!"), "feature");
  fs.mkdirSync(path.dirname(result.absolute), { recursive: true });
  fs.writeFileSync(result.absolute, "occupied");
  assert.throws(
    () => artifactPath("discover", "ASCII Widget Spinner!", root, new Date("2026-08-17T09:10:11.123Z")),
    /refusing to overwrite/,
  );
});

test("research inspection requires linked discovery input in source_artifacts", () => {
  const root = repositoryFixture();
  const discovery = writeArtifact(root, "research-source.md");
  const researchDirectory = path.join(root, ".rpiv-codex", "artifacts", "research");
  fs.mkdirSync(researchDirectory, { recursive: true });
  const research = path.join(researchDirectory, "research.md");
  fs.writeFileSync(research, artifactMarkdown(discovery.context, {
    stage: "research",
    rpiv_source: "packages/rpiv-pi/skills/research/SKILL.md",
  }));
  appendBody(root, research, "[.rpiv-codex/artifacts/discover/research-source.md]({{ROOT}}/.rpiv-codex/artifacts/discover/research-source.md)\n");

  assert.throws(
    () => inspectArtifact(research, root),
    /research artifact links discovery input but source_artifacts does not declare it/,
  );
});

test("artifact preflight validates a fresh final artifact without writing sidecars", () => {
  const root = repositoryFixture();
  const { target } = writeArtifact(root);
  const inspected = inspectArtifact(target, root);
  assert.equal(inspected.location.relative, ".rpiv-codex/artifacts/discover/fixture.md");
  assert.equal(inspected.context_match, true);
  assert.equal(inspected.metadata.supersedes, null);
  assert.match(inspected.artifact_sha256, /^[0-9a-f]{64}$/);
  assert.equal(fs.existsSync(path.join(root, ".rpiv-codex", "approvals")), false);
  assert.equal(fs.existsSync(path.join(root, ".rpiv-codex", "dispatch")), false);
});

test("artifact preflight validates local Markdown targets and required lineage links", () => {
  const root = repositoryFixture();
  const source = path.join(root, "source.md");
  fs.writeFileSync(source, "source\n");
  const { target } = writeArtifact(root, "linked.md", { source_artifacts: ["source.md"] });

  assert.throws(() => inspectArtifact(target, root), /lineage is missing a body Markdown link/);
  appendBody(root, target, "[source.md]({{ROOT}}/source.md)\n");
  assert.equal(inspectArtifact(target, root).context_match, true);

  appendBody(root, target, "[missing.md]({{ROOT}}/missing.md)\n");
  assert.throws(() => inspectArtifact(target, root), /Markdown link target does not exist/);
});

test("research preflight emits the complete validated discovery artifact", () => {
  const root = repositoryFixture();
  const { target } = writeArtifact(root, "research-input.md");
  appendBody(root, target, "Complete dependency body.\n");
  const preflight = preflightDiscoveryArtifact(target, root);
  assert.equal(preflight.artifact, ".rpiv-codex/artifacts/discover/research-input.md");
  assert.match(preflight.artifact_content, /Complete dependency body\./);
  assert.equal(Buffer.byteLength(preflight.artifact_content), preflight.byte_length);
  assert.match(preflight.artifact_sha256, /^[0-9a-f]{64}$/);

  const researchDirectory = path.join(root, ".rpiv-codex", "artifacts", "research");
  fs.mkdirSync(researchDirectory, { recursive: true });
  const wrongStage = path.join(researchDirectory, "wrong-stage.md");
  fs.writeFileSync(wrongStage, artifactMarkdown(contextSnapshot(root), { stage: "research" }));
  assert.throws(() => preflightDiscoveryArtifact(wrongStage, root), /requires a discovery artifact/);
});

test("research input preflight accepts direct prompts without inventing lineage", () => {
  const root = repositoryFixture();
  const preflight = preflightResearchInput("Trace how artifact inspection validates links", root);
  assert.equal(preflight.input_mode, "prompt");
  assert.equal(preflight.research_prompt, "Trace how artifact inspection validates links");
  assert.equal(preflight.context.repository, root);
  assert.equal("artifact" in preflight, false);
  assert.equal("artifact_content" in preflight, false);
  assert.equal(preflightResearchInput("/api route behavior", root).input_mode, "prompt");
});

test("research input preflight preserves discovery validation and rejects path-shaped fallbacks", () => {
  const root = repositoryFixture();
  const { target } = writeArtifact(root, "research-input.md");
  appendBody(root, target, "Complete dependency body.\n");
  const discovery = preflightResearchInput(target, root);
  assert.equal(discovery.input_mode, "discovery");
  assert.match(discovery.artifact_content, /Complete dependency body\./);

  assert.throws(() => preflightResearchInput("", root), /non-empty prompt or one absolute discovery artifact path/);
  assert.throws(() => preflightResearchInput("./research-input.md", root), /must be one absolute path/);
  assert.throws(() => preflightResearchInput("missing.md", root), /must be one absolute path/);
  assert.throws(() => preflightResearchInput(path.join(root, "missing.md"), root), /artifact does not exist/);

  const ordinary = path.join(root, "ordinary.md");
  fs.writeFileSync(ordinary, "not an artifact\n");
  assert.throws(() => preflightResearchInput(ordinary, root), /must be Markdown under/);
});

test("artifact inspection enforces repository-relative citation labels and line bounds", () => {
  const root = repositoryFixture();
  const { target } = writeArtifact(root, "citations.md");
  appendBody(root, target, "[fixture.txt:1]({{ROOT}}/fixture.txt:1)\n");
  assert.equal(inspectArtifact(target, root).context_match, true);

  appendBody(root, target, "[wrong-label:1]({{ROOT}}/fixture.txt:1)\n");
  assert.throws(() => inspectArtifact(target, root), /citation label must be repository-relative/);

  fs.writeFileSync(target, fs.readFileSync(target, "utf8").replace(
    "[wrong-label:1]({{ROOT}}/fixture.txt:1)".replace("{{ROOT}}", root),
    `[fixture.txt:99](${root}/fixture.txt:99)`,
  ));
  assert.throws(
    () => inspectArtifact(target, root),
    (error) => error.message.includes("citation line is outside file bounds")
      && error.message.includes("requested 99-99")
      && error.message.includes("changing only the end cannot fix a start beyond EOF"),
  );
});

test("artifact inspection accepts equivalent singleton citation ranges", () => {
  const root = repositoryFixture();
  const { target } = writeArtifact(root, "singleton-range.md");
  appendBody(root, target, "[fixture.txt:1-1]({{ROOT}}/fixture.txt:1)\n");
  assert.equal(inspectArtifact(target, root).context_match, true);
});

test("artifact inspection treats one enclosing citation code span as presentation markup", () => {
  const root = repositoryFixture();
  const { target } = writeArtifact(root, "code-span-label.md");
  appendBody(root, target, "[`fixture.txt:1`]({{ROOT}}/fixture.txt:1)\n");
  assert.equal(inspectArtifact(target, root).context_match, true);

  appendBody(root, target, "[`wrong-label:1`]({{ROOT}}/fixture.txt:1)\n");
  assert.throws(() => inspectArtifact(target, root), /citation label must be repository-relative/);
});

test("artifact inspection aggregates GitHub fragments and repository-relative label corrections", () => {
  const root = repositoryFixture();
  const { target } = writeArtifact(root, "aggregate-citations.md");
  appendBody(root, target, "[`fixture.txt:1`](not-used)\n".replace(
    "(not-used)",
    `(${root}/fixture.txt#L1)`,
  ));
  appendBody(root, target, `[wrong-label:1](${root}/fixture.txt:1)\n`);

  assert.throws(
    () => inspectArtifact(target, root),
    (error) => error.message.includes("must use :line or :start-end")
      && error.message.includes("expected [fixture.txt:1]"),
  );
});

test("research inspection rejects invented local Git precedent", () => {
  const root = repositoryFixture();
  const context = contextSnapshot(root);
  const directory = path.join(root, ".rpiv-codex", "artifacts", "research");
  fs.mkdirSync(directory, { recursive: true });
  const target = path.join(directory, "precedent.md");
  fs.writeFileSync(target, artifactMarkdown(context, {
    stage: "research",
    rpiv_source: "packages/rpiv-pi/skills/research/SKILL.md",
  }));
  appendBody(root, target, [
    "## Precedents & Lessons",
    `- \`${context.commit}\` is verified local precedent.`,
    "- `0000000000000000000000000000000000000000` is invented.",
    "",
    "## Historical Context",
    `- \`${pinnedCommit}\` remains the external RPIV source pin.`,
    "",
  ].join("\n"));
  appendMissingResearchSections(target, ["Precedents & Lessons", "Historical Context"]);

  assert.throws(
    () => inspectArtifact(target, root),
    /Git precedent is not a local commit: 0000000000000000000000000000000000000000/,
  );

  fs.writeFileSync(target, fs.readFileSync(target, "utf8").replace(
    "0000000000000000000000000000000000000000",
    context.commit,
  ));
  assert.equal(inspectArtifact(target, root).context_match, true);
});

test("citation normalization derives canonical labels and targets without touching findings", () => {
  const root = repositoryFixture();
  const alias = path.join(root, "fixture-alias.txt");
  fs.symlinkSync(path.join(root, "fixture.txt"), alias);
  const { target } = writeArtifact(root, "normalize-citations.md");
  appendBody(root, target, [
    `[fixture.txt:1](${root}/fixture.txt:1)`,
    `[\\.wrong-label:1](${root}/fixture.txt#L1)`,
    `[Source fixture](${alias})`,
    "Finding text remains byte-for-byte unchanged.",
    "",
  ].join("\n"));

  const normalized = normalizeLocalMarkdownCitations(target, root);
  assert.equal(normalized.normalized_citation_count, 2);
  assert.match(normalized.artifact_sha256, /^[0-9a-f]{64}$/);
  const text = fs.readFileSync(target, "utf8");
  assert.equal((text.match(/\[fixture\.txt:1\]/g) ?? []).length, 2);
  assert.match(text, new RegExp(`\\[Source fixture\\]\\(${root}/fixture\\.txt\\)`));
  assert.match(text, /Finding text remains byte-for-byte unchanged\./);
  assert.equal(inspectArtifact(target, root).context_match, true);
});

test("compiled scan preparation canonicalizes labels and returns numbered evidence excerpts", () => {
  const root = repositoryFixture();
  const scan = [
    "# Research Scan",
    `- Claim. [ fixture.txt:1](${root}/fixture.txt#L1)`,
    "- Coverage snapshot: Q1=Answered | Totals: Answered=1, Partial=0, Conflicted=0, Unanswered=0",
    "- Q1 — **Answered** — Clauses: fixture claim is directly evidenced.",
  ].join("\n");
  const prepared = prepareResearchScan(scan, root);

  assert.equal(prepared.normalized_citation_count, 1);
  assert.equal(prepared.normalized_markdown, [
    "# Research Scan",
    `- Claim. [fixture.txt:1](${root}/fixture.txt:1)`,
    "- Coverage snapshot: Q1=Answered | Totals: Answered=1, Partial=0, Conflicted=0, Unanswered=0",
    "- Q1 — **Answered** — Clauses: fixture claim is directly evidenced.",
  ].join("\n"));
  assert.deepEqual(prepared.citations, [{
    label: "fixture.txt:1",
    target: `${root}/fixture.txt:1`,
    claim_line: 2,
    claim: `- Claim. [fixture.txt:1](${root}/fixture.txt:1)`,
    source_excerpt: "1: baseline",
  }]);

  fs.writeFileSync(path.join(root, "wide.txt"), Array.from({ length: 20 }, (_, index) => `line ${index + 1}`).join("\n"));
  git(root, "add", "wide.txt");
  git(root, "commit", "-m", "add wide fixture");
  const wideScan = [
    `- Broad claim. [wide.txt:1-16](${root}/wide.txt:1-16)`,
    "- Coverage snapshot: Q1=Answered | Totals: Answered=1, Partial=0, Conflicted=0, Unanswered=0",
    "- Q1 — **Answered** — Clauses: broad claim is directly evidenced.",
  ].join("\n");
  assert.throws(
    () => prepareResearchScan(wideScan, root),
    /citation is too broad.*at most 15 lines/,
  );

  const crowdedScan = [
    `- Two ranges. [fixture.txt:1](${root}/fixture.txt:1) [fixture.txt:1](${root}/fixture.txt:1)`,
    "- Coverage snapshot: Q1=Answered | Totals: Answered=1, Partial=0, Conflicted=0, Unanswered=0",
    "- Q1 — **Answered** — Clauses: fixture claim is directly evidenced.",
  ].join("\n");
  assert.throws(
    () => prepareResearchScan(crowdedScan, root),
    /contains multiple citations.*one evidence bullet per citation/,
  );

  const historicalScan = [
    `- Git precedent introduced this behavior. [fixture.txt:1](${root}/fixture.txt:1)`,
    "- Coverage snapshot: Q1=Answered | Totals: Answered=1, Partial=0, Conflicted=0, Unanswered=0",
    "- Q1 — **Answered** — Clauses: current behavior is directly evidenced; history is recorded separately.",
  ].join("\n");
  assert.throws(
    () => prepareResearchScan(historicalScan, root),
    /current-file citation to support Git history.*plain verified commit statement/,
  );

  const aggregateDefectsScan = [
    `- Broad evidence. [wide.txt:1-16](${root}/wide.txt:1-16)`,
    `- Missing evidence. [missing.txt:1](${root}/missing.txt:1)`,
    "- Coverage snapshot: Q1=Answered | Totals: Answered=1, Partial=0, Conflicted=0, Unanswered=0",
    "- Q1 — **Answered** — Clauses: evidence is claimed for both lines.",
  ].join("\n");
  assert.throws(
    () => prepareResearchScan(aggregateDefectsScan, root),
    (error) => error.message.includes("citation is too broad")
      && error.message.includes("link target does not exist"),
  );

  const researchDirectory = path.join(root, ".rpiv-codex", "artifacts", "research");
  const researchTarget = path.join(researchDirectory, "wide-evidence.md");
  fs.mkdirSync(researchDirectory, { recursive: true });
  fs.writeFileSync(researchTarget, artifactMarkdown(contextSnapshot(root), {
    stage: "research",
    rpiv_source: "packages/rpiv-pi/skills/research/SKILL.md",
  }));
  appendBody(root, researchTarget, `- Broad claim. [wide.txt:1-16](${root}/wide.txt:1-16)\n`);
  assert.throws(
    () => inspectArtifact(researchTarget, root),
    /research evidence citation is too broad.*at most 15 lines/,
  );
});

test("compiled scan preparation rejects known verdict claims that cite only staged values", () => {
  const root = repositoryFixture();
  const artifactCheck = path.join(root, ".agents", "skills", "_shared", "scripts", "artifact-check.mjs");
  const artifactPath = path.join(root, ".agents", "skills", "_shared", "scripts", "artifact-path.mjs");
  const runtimeAttestation = path.join(root, "evals", "research", "runtime-attestation.mjs");
  const researchAssertions = path.join(root, "evals", "research", "assertions.mjs");
  fs.mkdirSync(path.dirname(artifactCheck), { recursive: true });
  fs.mkdirSync(path.dirname(runtimeAttestation), { recursive: true });
  fs.writeFileSync(artifactCheck, [
    "const range = selectedRange;",
    "const relativeTarget = selectedTarget;",
    "const lineSpan = range.end - range.start + 1;",
    "if (lineSpan > 15) fail('at most 15 lines');",
    "export function prepareResearchScan(text) {",
    "  const normalizedMarkdown = String(text);",
    "  parseCoverageProjection(normalizedMarkdown);",
    "  const links = localMarkdownLinks(normalizedMarkdown);",
    "  validateCitationLabel(links[0]);",
    "  return { normalized_markdown: normalizedMarkdown };",
    "}",
  ].join("\n"));
  fs.writeFileSync(artifactPath, [
    "const stageSources = new Map();",
    "export function artifactPath(stage) {",
    "  if (!stageSources.has(stage)) {",
    "    throw new Error('unknown stage');",
    "  }",
    "}",
  ].join("\n"));
  fs.writeFileSync(runtimeAttestation, [
    "const nestedSpawns = events.filter(Boolean);",
    "const completion = selectedCompletion;",
    "const checks = {",
    "  context_mode_matches: dispatch?.fork_turns === \"none\",",
    "  child_completed: completion?.status === \"completed\",",
    "  child_output_observed: Boolean(childOutput?.content_sha256),",
    "  no_child_fanout: nestedSpawns.length === 0,",
    "};",
    "const pass = Object.values(checks).every(Boolean);",
  ].join("\n"));
  fs.writeFileSync(researchAssertions, [
    "const directSpawns = attestations.filter(Boolean);",
    "const analysisSpawns = directSpawns.slice(1);",
    "const directChildBudgetPasses = directSpawns.length <= 4 && analysisSpawns.length <= 3;",
    "const runtimePasses = attestations.every((item) => item.pass);",
  ].join("\n"));

  const scan = (claim) => [
    claim,
    "- Coverage snapshot: Q1=Answered | Totals: Answered=1, Partial=0, Conflicted=0, Unanswered=0",
    "- Q1 — **Answered** — Clauses: verdict is directly evidenced.",
  ].join("\n");
  assert.throws(
    () => prepareResearchScan(scan(`- Inspection enforces citation width. [.agents/skills/_shared/scripts/artifact-check.mjs:1-2](${artifactCheck}:1-2)`), root),
    /citation-width claim does not cite the research-width check/,
  );
  assert.doesNotThrow(
    () => prepareResearchScan(scan(`- Inspection enforces citation width. [.agents/skills/_shared/scripts/artifact-check.mjs:3-4](${artifactCheck}:3-4)`), root),
  );
  assert.throws(
    () => prepareResearchScan(scan(`- Attestation proves no fan-out. [evals/research/runtime-attestation.mjs:1](${runtimeAttestation}:1)`), root),
    /no-fan-out verdict does not cite no_child_fanout/,
  );
  assert.doesNotThrow(
    () => prepareResearchScan(scan(`- Attestation proves no fan-out. [evals/research/runtime-attestation.mjs:7](${runtimeAttestation}:7)`), root),
  );
  assert.throws(
    () => prepareResearchScan(scan(`- Allocator throws for an unknown stage. [.agents/skills/_shared/scripts/artifact-path.mjs:1-2](${artifactPath}:1-2)`), root),
    /unknown-stage claim does not cite the stage guard and throw/,
  );
  assert.doesNotThrow(
    () => prepareResearchScan(scan(`- Allocator throws for an unknown stage. [.agents/skills/_shared/scripts/artifact-path.mjs:3-4](${artifactPath}:3-4)`), root),
  );
  assert.throws(
    () => prepareResearchScan(scan(`- Scan preparation returns normalized Markdown. [.agents/skills/_shared/scripts/artifact-check.mjs:5-6](${artifactCheck}:5-6)`), root),
    /normalized-Markdown return claim does not cite the returned field/,
  );
  assert.doesNotThrow(
    () => prepareResearchScan(scan(`- Scan preparation returns normalized Markdown. [.agents/skills/_shared/scripts/artifact-check.mjs:10](${artifactCheck}:10)`), root),
  );
  assert.throws(
    () => prepareResearchScan(scan(`- The overall verdict requires every runtime check to pass. [evals/research/runtime-attestation.mjs:3-8](${runtimeAttestation}:3-8)`), root),
    /overall runtime verdict does not cite the every-check pass expression/,
  );
  assert.doesNotThrow(
    () => prepareResearchScan(scan(`- The overall verdict requires every runtime check to pass. [evals/research/runtime-attestation.mjs:9](${runtimeAttestation}:9)`), root),
  );
  assert.throws(
    () => prepareResearchScan(scan(`- Evaluation requires passing attestations. [evals/research/assertions.mjs:1-3](${researchAssertions}:1-3)`), root),
    /passing-attestation claim does not cite attestations\.every/,
  );
  assert.doesNotThrow(
    () => prepareResearchScan(scan(`- Evaluation requires passing attestations. [evals/research/assertions.mjs:4](${researchAssertions}:4)`), root),
  );
});

test("compiled scan render command emits only validated canonical Markdown", () => {
  const root = repositoryFixture();
  const scan = [
    `- Claim. [ wrong:1](${root}/fixture.txt#L1)`,
    "- Coverage snapshot: Q1=Answered | Totals: Answered=1, Partial=0, Conflicted=0, Unanswered=0",
    "- Q1 — **Answered** — Clauses: fixture claim is directly evidenced.",
  ].join("\n");
  const output = execFileSync(process.execPath, [
    path.join(projectRoot, ".agents", "skills", "_shared", "scripts", "artifact-check.mjs"),
    "render-research-scan",
  ], { cwd: root, input: scan, encoding: "utf8" });
  assert.equal(output, [
    `- Claim. [fixture.txt:1](${root}/fixture.txt:1)`,
    "- Coverage snapshot: Q1=Answered | Totals: Answered=1, Partial=0, Conflicted=0, Unanswered=0",
    "- Q1 — **Answered** — Clauses: fixture claim is directly evidenced.",
  ].join("\n"));
});

test("coverage projection rejects inconsistent totals, rows, and answered gaps", () => {
  const root = repositoryFixture();
  const citation = `- Claim. [fixture.txt:1](${root}/fixture.txt:1)`;
  assert.throws(() => prepareResearchScan([
    citation,
    "- Coverage snapshot: Q1=Answered | Totals: Answered=0, Partial=1, Conflicted=0, Unanswered=0",
    "- Q1 — **Answered** — Clauses: supported.",
  ].join("\n"), root), /coverage totals do not match/);
  assert.throws(() => prepareResearchScan([
    citation,
    "- Coverage snapshot: Q1=Answered | Totals: Answered=1, Partial=0, Conflicted=0, Unanswered=0",
    "- Q1 — **Partial** — Clauses: one clause is missing evidence.",
  ].join("\n"), root), /status differs/);
  assert.throws(() => prepareResearchScan([
    citation,
    "- Coverage snapshot: Q1=Answered | Totals: Answered=1, Partial=0, Conflicted=0, Unanswered=0",
    "- Q1 — **Answered** — Clauses: one clause is unsupported.",
  ].join("\n"), root), /Answered but its clause row declares a gap/);
});

test("research artifact inspection enforces one internally consistent coverage projection", () => {
  const root = repositoryFixture();
  const directory = path.join(root, ".rpiv-codex", "artifacts", "research");
  fs.mkdirSync(directory, { recursive: true });
  const target = path.join(directory, "coverage.md");
  const coverageLine = "- Coverage snapshot: Q1=Partial | Totals: Answered=0, Partial=1, Conflicted=0, Unanswered=0";
  fs.writeFileSync(target, [
    artifactMarkdown(contextSnapshot(root), {
      stage: "research",
      rpiv_source: "packages/rpiv-pi/skills/research/SKILL.md",
    }),
    "## Summary",
    coverageLine,
    "",
    "## Coverage Ledger",
    "- Q1 — **Partial** — Clauses: allocation is supported; overwrite behavior lacks evidence.",
    "",
  ].join("\n"));
  appendMissingResearchSections(target, ["Summary", "Coverage Ledger"]);
  assert.equal(inspectArtifact(target, root).context_match, true);

  const validText = fs.readFileSync(target, "utf8");
  fs.writeFileSync(target, validText.replace(
    `${coverageLine}\n`,
    `${coverageLine}\n- Q1 — **Partial** — Clauses: duplicate Summary row.\n`,
  ));
  assert.throws(() => inspectArtifact(target, root), /Summary must contain.*no Q clause rows/);

  fs.writeFileSync(target, validText.replace("**Partial**", "**Answered**"));
  assert.throws(() => inspectArtifact(target, root), /status differs between its snapshot and clause row/);
});

test("research artifact inspection rejects a draft that omits required template sections", () => {
  const root = repositoryFixture();
  const directory = path.join(root, ".rpiv-codex", "artifacts", "research");
  fs.mkdirSync(directory, { recursive: true });
  const target = path.join(directory, "missing-sections.md");
  fs.writeFileSync(target, artifactMarkdown(contextSnapshot(root), {
    stage: "research",
    rpiv_source: "packages/rpiv-pi/skills/research/SKILL.md",
  }));
  appendBody(root, target, "## Source Feature\n\nDirect prompt.\n");

  assert.throws(
    () => inspectArtifact(target, root),
    (error) => error.message.includes("research artifact is missing required sections")
      && error.message.includes("Research Questions")
      && error.message.includes("Dispatch Ledger"),
  );
});

test("prompt-mode research inspection accepts explicit equivalent no-discovery context", () => {
  assert.equal(hasNoDiscoveryContext("## Developer Context\n\nNo discovery decisions were supplied.\n"), true);
  assert.equal(hasNoDiscoveryContext("## Developer Context\n\nNo discovery input; no inherited discovery decisions.\n"), true);
  assert.equal(hasNoDiscoveryContext("## Developer Context\n\nExternal web research is deferred.\n"), false);

  const root = repositoryFixture();
  const directory = path.join(root, ".rpiv-codex", "artifacts", "research");
  fs.mkdirSync(directory, { recursive: true });
  const target = path.join(directory, "prompt-context.md");
  fs.writeFileSync(target, artifactMarkdown(contextSnapshot(root), {
    stage: "research",
    rpiv_source: "packages/rpiv-pi/skills/research/SKILL.md",
  }));
  appendMissingResearchSections(target);
  assert.equal(inspectArtifact(target, root).context_match, true);

  fs.writeFileSync(target, fs.readFileSync(target, "utf8").replace(
    "No discovery decisions were supplied.",
    "External web research is deferred.",
  ));
  assert.throws(
    () => inspectArtifact(target, root),
    /prompt-mode research artifact must state in Developer Context/,
  );
});

test("repository drift is reported for a conversational Refresh, Continue, or Stop choice", () => {
  const root = repositoryFixture();
  const { target } = writeArtifact(root);
  fs.writeFileSync(path.join(root, "fixture.txt"), "modified without a new commit\n");
  const compared = compareArtifactContext(target, root);
  assert.equal(compared.context_match, false);
  assert.deepEqual(compared.differences.map(({ field }) => field), ["working_tree_sha256"]);
  assert.throws(() => inspectArtifact(target, root), /repository context has changed: working_tree_sha256/);
});

test("branch and commit differences are visible rather than approval failures", () => {
  const root = repositoryFixture();
  const { target } = writeArtifact(root, "context.md", {
    branch: "older-branch",
    commit: "0000000000000000000000000000000000000000",
  });
  const compared = compareArtifactContext(target, root);
  assert.equal(compared.context_match, false);
  assert.deepEqual(compared.differences.map(({ field }) => field), ["branch", "commit"]);
});

test("artifact checker rejects incomplete and out-of-scope files", () => {
  const root = repositoryFixture();
  const stale = writeArtifact(root, "stale.md", { status: "approved" }).target;
  assert.throws(() => compareArtifactContext(stale, root), /status must be "review"/);

  const outside = path.join(root, "ordinary.md");
  fs.writeFileSync(outside, artifactMarkdown(contextSnapshot(root)));
  assert.throws(() => compareArtifactContext(outside, root), /artifact must be Markdown under/);

  const incomplete = writeArtifact(root, "incomplete.md").target;
  fs.writeFileSync(incomplete, fs.readFileSync(incomplete, "utf8").replace(/^supersedes:.*\n/m, ""));
  assert.throws(() => compareArtifactContext(incomplete, root), /missing required field: supersedes/);
});
