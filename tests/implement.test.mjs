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
  assert.match(
    completion,
    /Recommended next step: \*\*Implement\*\*\n\n```text\n\.rpiv\/artifacts\/plans\/\{filename\}\.md \{next phase\}\n```/,
  );
  assert.match(completion, /single-phase mode completes the final implementation phase/);
  assert.match(completion, /Implementation phases remaining: none/);
  assert.match(
    completion,
    /Recommended next step: \*\*Validate\*\*\n\n```text\n\.rpiv\/artifacts\/plans\/\{filename\}\.md\n```/,
  );
  assert.match(skill, /Do not use `Manual Verification`.*to decide whether implementation phases remain/);
  assert.match(skill, /Never invoke the next phase or validation automatically/);
});

test("implement keeps mismatch handling inline and stops before successor stages", () => {
  const skill = read(skillPath);
  assert.doesNotMatch(skill, /Update the plan/);
  for (const option of ["Follow the plan", "Skip this change", "Revise the plan"]) {
    assert.ok(skill.includes(option), option);
  }
  assert.match(skill, /Ask exactly one focused question/);
  const fallbackStart = skill.indexOf("If it does not return an answer, state the observed mismatch");
  const fallbackEnd = skill.indexOf("Do not use this mismatch flow", fallbackStart);
  assert.ok(fallbackStart >= 0);
  assert.ok(fallbackEnd > fallbackStart);
  const fallback = skill.slice(fallbackStart, fallbackEnd);
  assert.match(fallback, /What should I do about this mismatch\?/);
  for (const [letter, option] of [
    ["A", "Follow the plan"],
    ["B", "Skip this change"],
    ["C", "Revise the plan"],
  ]) {
    assert.ok(fallback.includes(`${letter}. **${option}**`), `direct fallback missing ${letter}. ${option}`);
  }
  assert.match(fallback, /Reply with A, B, or C\./);
  assert.doesNotMatch(fallback, /or write another answer/);
  assert.match(fallback, /final response carries the complete question and all three consequences/);
  assert.match(fallback, /Tool acceptance or a displayed input surface is not an answer/);
  assert.match(skill, /Successor names are handoffs, not permission/);
  assert.match(skill, /Never invoke a successor skill, commit, push, publish/);
});

test("implement routes confirmed plan-owned failures directly to revise", () => {
  const skill = read(skillPath);
  const mismatchStart = skill.indexOf("## Handle a mismatch");
  const ambiguityStart = skill.indexOf("An **implementation ambiguity**", mismatchStart);
  assert.ok(mismatchStart >= 0);
  assert.ok(ambiguityStart > mismatchStart);
  const planOwned = skill.slice(mismatchStart, ambiguityStart);

  assert.match(planOwned, /unavailable or invalid verification command/);
  assert.match(planOwned, /Do not ask the generic mismatch question/);
  assert.match(planOwned, /Implementation paused at Phase \{N\}/);
  assert.match(
    planOwned,
    /Recommended next step: \*\*Revise\*\*\n\n  ```text\n  <plan-path> "<specific plan correction grounded in the observed mismatch>"\n  ```/,
  );
  assert.match(planOwned, /Do not invoke Revise automatically/);
  assert.doesNotMatch(planOwned, /What should I do about this mismatch\?/);
});

test("implement keeps plan structure literal and adapts Desktop chat links", () => {
  const skill = read(skillPath);
  assert.match(skill, /\[Orders service — lines 42–55\]\(\/absolute\/repository\/src\/orders\.ts:42\)/);
  assert.match(skill, /frontmatter `files:`/);
  assert.match(skill, /plain repository-relative values/);
  assert.match(skill, /Do not convert them to links/);
});
