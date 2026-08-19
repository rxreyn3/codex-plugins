import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("only the simplified discovery vertical unit is present", () => {
  const entries = fs.readdirSync(path.join(root, ".agents", "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(entries, ["_shared", "rpivc-discover"]);
  assert.equal(fs.existsSync(path.join(root, ".agents", "skills", "rpivc-approve")), false);
  assert.equal(fs.existsSync(path.join(root, ".agents", "skills", "rpivc-research")), false);
});

test("skill frontmatter and generated metadata match the discovery contract", () => {
  const skill = read(".agents", "skills", "rpivc-discover", "SKILL.md");
  const frontmatter = skill.split("---")[1].trim().split("\n");
  assert.deepEqual(frontmatter.map((line) => line.split(":")[0]), ["name", "description"]);
  assert.match(skill.split("---")[1], /conversational Run, Edit, Omit, or Stop/);
  assert.doesNotMatch(skill.split("---")[1], /allowed-tools|argument-hint|disable-model-invocation/);
  const metadata = read(".agents", "skills", "rpivc-discover", "agents", "openai.yaml");
  assert.match(metadata, /\$rpivc-discover/);
});

test("discovery preserves adaptive RPIV interview behavior", () => {
  const skill = read(".agents", "skills", "rpivc-discover", "SKILL.md");
  const contract = read(".agents", "skills", "rpivc-discover", "references", "discovery-contract.md");
  const combined = `${skill}\n${contract}`;
  assert.match(combined, /Before Git context collection, repository search, codebase inspection, or subagent dispatch, ask one foundational intent question/);
  assert.match(combined, /run, do, or observe/);
  assert.match(combined, /not whether another person or animal will feel pleased/);
  assert.match(combined, /no more than three intent questions/i);
  assert.match(combined, /target context/);
  assert.match(combined, /Pre-resolve explicit wording/);
  assert.match(combined, /Never infer that the skill-hosting repository is the product target/);
  assert.match(combined, /Do not bundle placement, runtime, appearance, and success/i);
  assert.match(combined, /Lazy decision tree/);
  assert.match(combined, /depth test, not a document-bucket test/);
  assert.match(combined, /two genuine options/);
  assert.match(combined, /what it optimizes and what it sacrifices/);
  assert.match(combined, /only explicitly deferred decisions/i);
  assert.match(combined, /Never redirect silently/i);
  assert.match(combined, /cross-cutting answer/i);
  assert.match(combined, /valid roster is zero, one, or two agents/i);
  assert.match(combined, /“At most two” must never become “always two.”/);
  assert.match(combined, /at most five files/i);
  assert.match(combined, /stop before surfacing more distinct repository files than its displayed `max_files`/i);
  assert.match(combined, /final authorized probe evidence in its own response/i);
  assert.match(combined, /no codebase precedent/);
  assert.match(combined, /Batch two to four independent leaves into one compact numbered checkpoint/);
  assert.match(combined, /at most one such checkpoint/i);
  assert.match(combined, /constraint, exclusion, other-outcome, and observable-success branch/);
  assert.match(combined, /“that's it”[\s\S]*does not confirm suggested defaults|“that's it” as approval of proposed defaults/);
  assert.match(combined, /Never infer dependency, lifecycle, interruption, rendering, or timing requirements/i);
  assert.match(combined, /do not reopen its unanswered routine items one by one/i);
  assert.match(combined, /“I don't know,” “none,” silence[\s\S]*not (?:an )?explicit deferral/i);
  assert.match(combined, /leave (?:that )?implementation degree(?:s)? of freedom unspecified/i);
  assert.match(combined, /explicit only when the user says to defer the decision or decide it later/i);
});

test("every agent dispatch uses a conversational gate", () => {
  const skill = read(".agents", "skills", "rpivc-discover", "SKILL.md");
  for (const decision of ["Run", "Edit", "Omit", "Stop"]) {
    assert.match(skill, new RegExp(`\\*\\*${decision}\\*\\*`));
  }
  assert.match(skill, /End the response and run nothing yet/);
  assert.match(skill, /only an explicit \*\*Run\*\* as authorization for the most recently displayed cards/);
  assert.match(skill, /show a refreshed complete card and require a new \*\*Run\*\* decision/);
  assert.match(skill, /Dispatch exactly the displayed roles, prompts, inputs, models, reasoning levels/);
  assert.match(skill, /no inherited conversation beyond named inputs/);
  assert.match(skill, /Do not allow child or follow-up agents/);
  assert.match(skill, /without writing a dispatch file/);
});

test("dependent analysis receives a new card with real locator anchors", () => {
  const skill = read(".agents", "skills", "rpivc-discover", "SKILL.md");
  const contract = read(".agents", "skills", "rpivc-discover", "references", "discovery-contract.md");
  const cards = read(".agents", "skills", "rpivc-discover", "assets", "agent-card-templates.md");
  const combined = `${skill}\n${contract}\n${cards}`;
  assert.match(combined, /new analyzer-only card containing the actual repository-relative anchors/);
  assert.match(combined, /prior locator decision does not authorize it|Never dispatch it from the locator authorization/);
  assert.match(combined, /all anchors in `inputs` already exist/);
  assert.doesNotMatch(combined, /D1 ranked anchors/);
});

test("repository evidence is rechecked and stale evidence requires a conversational gate", () => {
  const skill = read(".agents", "skills", "rpivc-discover", "SKILL.md");
  const contract = read(".agents", "skills", "rpivc-discover", "references", "discovery-contract.md");
  const combined = `${skill}\n${contract}`;
  assert.match(combined, /Retain the repository snapshot that covered the incorporated evidence/);
  assert.match(combined, /before artifact creation/i);
  assert.match(combined, /\*\*Refresh evidence\*\*/);
  assert.match(combined, /\*\*Continue with the disclosed stale boundary\*\*/);
  assert.match(combined, /irrelevant repository change still requires this gate/i);
  assert.match(combined, /records both the evidence snapshot and current snapshot in the artifact/);
  assert.match(combined, /Refresh evidence[\s\S]*newly gated cards/);
});

test("agent cards expose the complete editable contract and current context", () => {
  const cards = read(".agents", "skills", "rpivc-discover", "assets", "agent-card-templates.md");
  for (const field of [
    "id",
    "role",
    "purpose",
    "prompt",
    "inputs",
    "repository",
    "branch",
    "commit",
    "working_tree_sha256",
    "model",
    "reasoning",
    "sandbox_request",
    "sandbox_enforcement",
    "behavioral_permissions",
    "intended_tools",
    "budget",
    "expected_evidence",
    "output_schema",
    "stop_when",
  ]) {
    assert.match(cards, new RegExp(`^${field}:`, "m"));
  }
  assert.doesNotMatch(cards, /^decision:/m);
  assert.match(cards, /model: gpt-5\.6-luna[\s\S]*reasoning: low/);
  assert.match(cards, /model: gpt-5\.6-terra[\s\S]*reasoning: high/);
});

test("final artifact gate is conversational and never chains onward", () => {
  const skill = read(".agents", "skills", "rpivc-discover", "SKILL.md");
  for (const decision of ["Accept", "Revise", "Stop"]) {
    assert.match(skill, new RegExp(`\\*\\*${decision}\\*\\*`));
  }
  assert.match(skill, /Accept[\s\S]*write no sidecar record/);
  assert.match(skill, /new immutable artifact with `supersedes` pointing to the prior artifact/);
  assert.match(skill, /Never invoke, select, or imply that another workflow stage has begun/);
  assert.doesNotMatch(skill, /\$rpivc-(approve|research|design|plan|implement|validate|code-review)/);
  assert.doesNotMatch(skill, /--resume|approval-record-path/);
});

test("Feature Requirements Document is complete, immutable, and link-oriented", () => {
  const template = read(".agents", "skills", "rpivc-discover", "assets", "frd-template.md");
  for (const heading of [
    "Summary",
    "Problem & Intent",
    "Goals",
    "Non-Goals",
    "Functional Requirements",
    "Non-Functional Requirements",
    "Constraints & Assumptions",
    "Acceptance Criteria",
    "Recommended Approach",
    "Decisions",
    "Open Questions",
    "Suggested Follow-ups",
    "Dispatch Ledger",
    "References",
  ]) {
    assert.match(template, new RegExp(`^## ${heading.replace(/[&]/g, "&")}$`, "m"));
  }
  assert.match(template, /^status: review$/m);
  assert.match(template, /^supersedes:/m);
  assert.match(template, /^working_tree_sha256:/m);
  assert.match(template, /MARKDOWN_LINKS_WITH_REPOSITORY_RELATIVE_LABELS_AND_ABSOLUTE_LOCAL_TARGETS/);
  const ledger = template.split("## Dispatch Ledger")[1].split("## References")[0];
  assert.doesNotMatch(ledger, /^\|/m);
  assert.doesNotMatch(ledger, /MANIFEST|APPROVAL_PATH/);
});

test("human-facing local paths use clickable Markdown links", () => {
  const skill = read(".agents", "skills", "rpivc-discover", "SKILL.md");
  const manual = read("MANUAL-TEST.md");
  const readme = read("README.md");
  assert.match(skill, /\[path\/to\/file:line\]\(\/absolute\/path\/to\/file:line\)/);
  assert.match(skill, /\[Feature Requirements Document\]\(\/absolute\/path\/to\/artifact\.md\)/);
  assert.match(skill, /never wrap a navigable path in backticks/);
  assert.match(manual, /clickable Markdown links/);
  assert.match(readme, /\[the parity matrix\]\(\/Users\/ryan\.reynolds\/Projects\/rpiv-codex\/PARITY\.md\)/);
});

test("manual discovery fixtures track the conversational gate design", () => {
  const fixtures = path.join(root, "tests", "fixtures", "discover");
  const manualFixtures = fs.readdirSync(fixtures)
    .filter((name) => name.endsWith(".md") && name !== "RUBRIC.md")
    .sort();
  assert.deepEqual(manualFixtures, [
    "01-no-probe-discovery.md",
    "02-brownfield-agent-gates.md",
  ]);
  for (const name of manualFixtures) {
    const fixture = read("tests", "fixtures", "discover", name);
    assert.match(fixture, /^## Paste this prompt into the Codex editor$/m, `${name} needs a paste heading`);
    assert.match(fixture, /```text\n\$rpivc-discover [^\n]+\n```/, `${name} needs one copyable prompt`);
    assert.match(fixture, /^## Answers to give only when asked$/m, `${name} needs an answer heading`);
    assert.match(fixture, /Do not paste (?:this section|the rest of this file) into the editor/, `${name} must distinguish answers from the prompt`);
  }

  const noProbe = read("tests", "fixtures", "discover", "01-no-probe-discovery.md");
  assert.match(noProbe, /no probe justified/);
  assert.match(noProbe, /runs no agent/);
  assert.match(noProbe, /\*\*Accept\*\*/);

  const brownfield = read("tests", "fixtures", "discover", "02-brownfield-agent-gates.md");
  assert.match(brownfield, /\*\*Run \/ Edit \/ Omit \/ Stop\*\*/);
  assert.match(brownfield, /locator-only/);
  assert.match(brownfield, /new analyzer-only card containing actual locator anchors/);
  assert.match(brownfield, /tests\/\.rpivc-eval-drift-<run-id>\.txt/);
  assert.match(brownfield, /stale card must dispatch nothing/);
  assert.match(brownfield, /complete refreshed card/);
  assert.match(brownfield, /Refresh evidence \/ Continue with the disclosed stale boundary \/ Stop/);
  assert.match(brownfield, /exact observed runtime sandbox or `unverified`/);
  assert.match(brownfield, /clickable Markdown links/);
  assert.doesNotMatch(brownfield, /dispatch manifest|approval record is supplied/i);

  const rubric = read("tests", "fixtures", "discover", "RUBRIC.md");
  for (const dimension of [
    "Agent minimality",
    "Gate fidelity",
    "Evidence conflict handling",
    "Link usability",
    "Interaction friction",
  ]) {
    assert.match(rubric, new RegExp(`\\| ${dimension} \\|`));
  }
  assert.match(rubric, /Scenario-specific pass conditions/);
  assert.match(rubric, /Reference-parity pass conditions/);
  assert.match(rubric, /only through `rpivc-discover`/);
  assert.match(rubric, /do not execute it or require line-by-line equality/);
  assert.doesNotMatch(rubric, /both runs|same answers/);
});

test("forward-testing guide defines the reusable single-pass two-harness contract", () => {
  const guide = read("tests", "FORWARD-TESTING.md");
  const manual = read("MANUAL-TEST.md");
  assert.match(guide, /\*\*Minimal path\*\*/);
  assert.match(guide, /\*\*Integration path\*\*/);
  assert.match(guide, /exactly two read-only reviewers in parallel/);
  assert.match(guide, /Contract and evidence reviewer/);
  assert.match(guide, /Interaction and product-fidelity reviewer/);
  assert.match(guide, /raw evidence/);
  assert.match(guide, /Use RPIV as a reference, not a second runtime/);
  assert.match(guide, /Do not run RPIV-Pi, install or invoke Pi extensions/);
  assert.match(guide, /parity matrix/);
  assert.match(guide, /no meaningful parity gap remains unexplained/);
  assert.match(guide, /Do not give either reviewer[\s\S]*earlier evaluation findings[\s\S]*intended patch/);
  assert.match(guide, /fresh isolated Codex task/);
  assert.match(guide, /Run each harness exactly once/);
  assert.match(guide, /apply at most one bounded correction set/);
  assert.match(guide, /FAIL — candidate fixes applied; rerun required/);
  assert.match(guide, /Do not restart or rerun a harness during the same evaluation/);
  assert.doesNotMatch(guide, /ten iterations|repeat until|Validate and repeat|Start the next iteration/);
  assert.match(guide, /delete only artifact paths created after the recorded baseline/);
  assert.match(guide, /Never use a broad recursive deletion/);
  assert.match(guide, /## Reusable `\/goal` template/);
  assert.match(guide, /\/goal Evaluate rpivc-discover exactly once/);
  assert.match(guide, /do not run RPIV, invoke Pi extensions, or require line-by-line output equality/);
  assert.match(guide, /Do not rerun a harness, respawn reviewers, start a second correction pass/);
  assert.match(guide, /report FAIL with candidate fixes applied and rerun required/);
  assert.match(guide, /implement research or another stage, install anything, commit, push, or modify rpiv-mono/);
  assert.match(manual, /tests\/FORWARD-TESTING\.md/);
  assert.match(manual, /01-no-probe-discovery\.md/);
  assert.match(manual, /02-brownfield-agent-gates\.md/);
});

test("project agents are pinned, behaviorally read-only, bounded, and childless", () => {
  const locator = read(".codex", "agents", "rpivc-codebase-locator.toml");
  const analyzer = read(".codex", "agents", "rpivc-codebase-analyzer.toml");
  assert.match(locator, /model = "gpt-5\.6-luna"/);
  assert.match(locator, /model_reasoning_effort = "low"/);
  assert.match(analyzer, /model = "gpt-5\.6-terra"/);
  assert.match(analyzer, /model_reasoning_effort = "high"/);
  for (const agent of [locator, analyzer]) {
    assert.doesNotMatch(agent, /sandbox_mode/);
    assert.match(agent, /parent's broader sandbox/);
    assert.match(agent, /behaviorally read-only/);
    assert.match(agent, /Never edit files/);
    assert.match(agent, /spawn child agents/);
    assert.match(agent, /repository-relative file:line/);
  }
});

test("artifact helpers contain no approval or dispatch persistence", () => {
  const context = read(".agents", "skills", "_shared", "scripts", "context-snapshot.mjs");
  const artifactPath = read(".agents", "skills", "_shared", "scripts", "artifact-path.mjs");
  const checker = read(".agents", "skills", "_shared", "scripts", "artifact-check.mjs");
  assert.match(context, /working_tree_sha256/);
  assert.match(context, /!entry\.startsWith\("\.rpiv-codex\/"\)/);
  assert.match(artifactPath, /"artifacts"/);
  assert.doesNotMatch(artifactPath, /"dispatch"/);
  assert.match(checker, /compareArtifactContext/);
  assert.match(checker, /context_match/);
  assert.doesNotMatch(checker, /writeApproval|verifyApproval|approvals/);
  assert.equal(fs.existsSync(path.join(root, ".agents", "skills", "_shared", "scripts", "approval.mjs")), false);
  assert.equal(fs.existsSync(path.join(root, ".agents", "skills", "rpivc-discover", "assets", "dispatch-template.md")), false);
});

test("RPIV source and omission choices are explicit", () => {
  const parity = read("PARITY.md");
  assert.match(parity, /d0eb55371f622ac524b3355711a482f95feb14d4/);
  assert.match(parity, /Preserve/);
  assert.match(parity, /Codex adaptation/);
  assert.match(parity, /Deferred/);
  assert.match(parity, /Intentionally omitted/);
  assert.match(parity, /Run \/ Edit \/ Omit \/ Stop/);
  assert.match(parity, /inherited-parent sandbox enforcement/);
  assert.match(parity, /behavioral reference contract, not a differential test/);
  assert.match(parity, /does not run RPIV-Pi/);
  assert.match(parity, /line-by-line equality/);
  assert.match(parity, /## Verification rule/);
  assert.doesNotMatch(parity, /read-only sandbox is enforced by the agent configuration/i);
});

test("runtime data contains final artifacts but no obsolete dispatch or approval records", () => {
  const runtimeRoot = path.join(root, ".rpiv-codex");
  assert.equal(fs.existsSync(path.join(runtimeRoot, "dispatch")), false);
  assert.equal(fs.existsSync(path.join(runtimeRoot, "approvals")), false);
  if (!fs.existsSync(runtimeRoot)) return;

  const files = fs.readdirSync(runtimeRoot, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(runtimeRoot, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"));
  assert.ok(files.length > 0);
  for (const file of files) {
    assert.match(file, /^artifacts\/discover\/[^/]+\.md$/);
  }
});
