import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = join(repositoryRoot, "plugins/rpiv-codex/skills/rpivc-implement");
const skillPath = join(skillRoot, "SKILL.md");
const read = (path) => readFileSync(path, "utf8");

test("implement has no runtime dependencies beyond its skill and invocation policy", () => {
  assert.ok(existsSync(skillPath));
  assert.ok(existsSync(join(skillRoot, "agents/openai.yaml")));
});

test("implement preserves the full-plan and named-phase execution boundaries", () => {
  const skill = read(skillPath);
  assert.match(skill, /If the input names a phase, use \*\*single-phase mode\*\*/);
  assert.match(skill, /Otherwise use \*\*sequential full-plan mode\*\*/);
  assert.match(skill, /Touch only files owned by the named phase/);
  assert.match(skill, /prerequisite missing: <path> \(expected from an earlier phase\)/);
  assert.match(skill, /Run only commands under the named phase's `#### Automated Verification:` section/);
  assert.match(skill, /Stop immediately after the named phase's own checks pass/);
  assert.match(skill, /Complete one phase fully before starting the next/);
});

test("implement preserves checkbox ownership and reconciliation restrictions", () => {
  const skill = read(skillPath);
  assert.match(skill, /Flip only the corresponding `#### Automated Verification:` items/);
  assert.match(skill, /full unique line/);
  assert.match(skill, /Implement owns verification checkboxes, not plan content/);
  assert.match(skill, /`\*\.test\.ts`, `\*\.test\.tsx`, `\*\.test\.js`, or `\*\.test\.jsx`/);
  assert.match(skill, /never target snapshots, fixtures, golden masters/);
});

test("implement hands off named phases before reserving validation for plan completion", () => {
  const skill = read(skillPath);
  const completionStart = skill.indexOf("## Completion and pause reports");
  const completionEnd = skill.indexOf("If implementation pauses", completionStart);
  assert.ok(completionStart >= 0);
  assert.ok(completionEnd > completionStart);
  const completion = skill.slice(completionStart, completionEnd);

  assert.match(completion, /single-phase mode completes and a later implementation phase remains/);
  assert.match(completion, /Phase \{N\} complete:/);
  assert.match(completion, /Implementation phases remaining: \{remaining phase names in declared order\}/);
  assert.match(completion, /Next step: `\$rpivc-implement .* \{next phase\}`/);
  assert.match(completion, /single-phase mode completes the final implementation phase/);
  assert.match(completion, /Implementation phases remaining: none/);
  assert.match(completion, /Next step: `\$rpivc-validate /);
  assert.match(skill, /Do not use `Manual Verification`.*to decide whether implementation phases remain/);
  assert.match(skill, /Never invoke the next phase or validation automatically/);
});

test("implement keeps mismatch handling inline and stops before successor stages", () => {
  const skill = read(skillPath);
  for (const option of ["Follow the plan", "Skip this change", "Update the plan"]) {
    assert.ok(skill.includes(option), option);
  }
  assert.match(skill, /Ask exactly one focused question/);
  const fallbackStart = skill.indexOf("When structured input is unavailable");
  const fallbackEnd = skill.indexOf("Do not use this mismatch flow", fallbackStart);
  assert.ok(fallbackStart >= 0);
  assert.ok(fallbackEnd > fallbackStart);
  const fallback = skill.slice(fallbackStart, fallbackEnd);
  assert.match(fallback, /What should I do about this mismatch\?/);
  for (const option of ["Follow the plan", "Skip this change", "Update the plan"]) {
    assert.ok(fallback.includes(option), `direct fallback missing ${option}`);
  }
  assert.match(fallback, /Never refer to a "displayed prompt"/);
  assert.match(skill, /Successor names are handoffs, not permission/);
  assert.match(skill, /Never invoke a successor skill, commit, push, publish/);
});

test("implement keeps plan structure literal and chat references as relative Markdown links", () => {
  const skill = read(skillPath);
  assert.match(skill, /\[Orders service — line 42\]\(src\/orders\.ts#L42\)/);
  assert.match(skill, /\[Orders service — lines 42–55\]\(src\/orders\.ts#L42-L55\)/);
  assert.match(skill, /frontmatter `files:`/);
  assert.match(skill, /plain repository-relative values/);
  assert.match(skill, /Do not convert them to links/);
});
