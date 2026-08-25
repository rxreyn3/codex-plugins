import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("only the accepted discovery and research vertical units are exposed as development links", () => {
  const entries = fs.readdirSync(path.join(root, ".agents", "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(entries, ["_shared", "rpivc-discover", "rpivc-research"]);
  for (const name of entries) {
    assert.equal(fs.lstatSync(path.join(root, ".agents", "skills", name)).isSymbolicLink(), true);
  }
  assert.equal(fs.realpathSync(path.join(root, ".agents", "skills", "rpivc-discover")), path.join(root, "plugins", "rpiv-codex", "skills", "rpivc-discover"));
  assert.equal(fs.realpathSync(path.join(root, ".agents", "skills", "rpivc-research")), path.join(root, "plugins", "rpiv-codex", "skills", "rpivc-research"));
  assert.equal(fs.realpathSync(path.join(root, ".agents", "skills", "_shared")), path.join(root, "plugins", "rpiv-codex"));
  assert.equal(fs.existsSync(path.join(root, ".agents", "skills", "rpivc-approve")), false);
  assert.equal(fs.existsSync(path.join(root, ".agents", "skills", "rpivc-research")), true);
});

test("plugin source is canonical and remains skills-only", () => {
  const manifest = JSON.parse(read("plugins", "rpiv-codex", ".codex-plugin", "plugin.json"));
  const marketplace = JSON.parse(read(".agents", "plugins", "marketplace.json"));
  assert.equal(manifest.name, "rpiv-codex");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.skills, "./skills/");
  for (const unsupported of ["apps", "mcpServers", "hooks", "authentication"]) {
    assert.equal(Object.hasOwn(manifest, unsupported), false);
  }
  assert.deepEqual(fs.readdirSync(path.join(root, "plugins", "rpiv-codex", "skills")).sort(), ["rpivc-discover", "rpivc-research"]);
  assert.equal(marketplace.name, "rpiv-codex-local");
  assert.equal(marketplace.plugins[0].source.path, "./plugins/rpiv-codex");
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
  assert.match(combined, /Do not search memories or inspect target-repository source/i);
  assert.match(combined, /exact anchor as already known only when the user supplied it or an approved prior artifact/i);
  assert.match(combined, /Never incorporate target files that the parent inspected/i);
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
  assert.match(skill, /Dispatch exactly the displayed logical roles, prompts, inputs, models, reasoning levels/);
  assert.match(skill, /displayed card is the native Codex role instance/);
  assert.match(skill, /JSON object with exactly two top-level fields/);
  assert.match(skill, /`model` to the displayed `model`/);
  assert.match(skill, /`reasoning_effort` to the displayed `reasoning`/);
  assert.match(skill, /stop and report the card as unverified/);
  assert.match(skill, /correct that same unpublished draft once/);
  assert.match(skill, /Never create a second artifact merely because preflight failed/);
  assert.match(skill, /Never modify an artifact after it has been presented/);
  assert.match(skill, /literal repository-relative `path\/to\/file:line` as the label/);
  assert.match(skill, /no inherited conversation beyond the JSON envelope/);
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
    "dispatch_protocol",
    "task_name",
    "role",
    "runtime_agent_type",
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
    "child_agents",
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
  const evaluationGuide = read("evals", "README.md");
  const readme = read("README.md");
  assert.match(skill, /\[path\/to\/file:line\]\(\/absolute\/path\/to\/file:line\)/);
  assert.match(skill, /\[Feature Requirements Document\]\(\/absolute\/path\/to\/artifact\.md\)/);
  assert.match(skill, /never wrap a navigable path in backticks/);
  assert.match(evaluationGuide, /Markdown-link syntax and target existence/);
  assert.match(readme, /\[Parity matrix\]\(\/Users\/ryan\.reynolds\/Projects\/rpiv-codex\/PARITY\.md\)/);
});

test("Promptfoo replaces the manual forward-testing harness", () => {
  assert.equal(fs.existsSync(path.join(root, "MANUAL-TEST.md")), false);
  assert.equal(fs.existsSync(path.join(root, "tests", "FORWARD-TESTING.md")), false);
  assert.equal(fs.existsSync(path.join(root, "tests", "fixtures", "discover")), false);
  assert.equal(fs.existsSync(path.join(root, "evals", "discover", "promptfooconfig.yaml")), true);
  assert.equal(fs.existsSync(path.join(root, "evals", "discover", "cases.yaml")), true);
});

test("bundled specialist contracts are pinned, behaviorally read-only, bounded, and childless", () => {
  const locator = read("plugins", "rpiv-codex", "specialists", "rpivc-codebase-locator.toml");
  const analyzer = read("plugins", "rpiv-codex", "specialists", "rpivc-codebase-analyzer.toml");
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
  for (const name of ["rpivc-codebase-locator.toml", "rpivc-codebase-analyzer.toml"]) {
    const developmentLink = path.join(root, ".codex", "agents", name);
    assert.equal(fs.lstatSync(developmentLink).isSymbolicLink(), true);
    assert.equal(fs.realpathSync(developmentLink), path.join(root, "plugins", "rpiv-codex", "specialists", name));
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
    .map((entry) => path.relative(runtimeRoot, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"))
    .filter((file) => path.basename(file) !== ".DS_Store");
  for (const file of files) {
    assert.match(file, /^(?:artifacts\/(?:discover|research)\/[^/]+\.md|evals\/|promptfoo\/)/);
  }
});
