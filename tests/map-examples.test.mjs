import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assertValid, checkBaseline, render, verify, digest } from '../plugins/rpiv-codex/skills/rpivc-map/scripts/model.mjs';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/map/${name}.json`, import.meta.url), 'utf8'));
const clone = (value) => structuredClone(value);

test('portable worked examples retain agreed outcomes when design progresses', () => {
  const research = assertValid(fixture('export-research'));
  const design = assertValid(fixture('export-design'));
  assert.deepEqual(checkBaseline(design, research), []);
  assert.equal(design.id, research.id);
  assert.deepEqual(design.components.map(x => x.id), research.components.map(x => x.id));
  for (const old of research.components) {
    const next = design.components.find(x => x.id === old.id);
    assert.deepEqual(next.claims.scope, old.claims.scope);
    assert.deepEqual(next.claims.evidence, old.claims.evidence);
  }
  assert.equal(research.questions.find(x => x.id === 'revision').status, 'open');
  assert.equal(design.questions.find(x => x.id === 'revision').status, 'resolved');
  assert.ok(design.questions.find(x => x.id === 'revision').decisionRecordId);
  assert.equal(design.work.find(x => x.id === 'build').status, 'remaining');
  for (const model of [research, design]) {
    const source = JSON.stringify(model);
    assert.deepEqual(verify(source, render(model, digest(source))), model);
  }
});

test('one identity can reflect Explore through Plan or alternative Blueprint without changing implementation evidence', () => {
  const original = fixture('export-research');
  const explore = clone(original);
  explore.origin = 'explore'; explore.currentStage = 'explore'; explore.revision = 'explore-1';
  explore.owner = { artifact: null, authority: 'none', reason: 'Bounded fictional exploration; no owner yet.' };
  let prior = assertValid(explore);
  for (const stage of ['research','design','plan','blueprint']) {
    const next = clone(prior);
    next.currentStage = stage; next.revision = `${stage}-next`;
    next.owner = { artifact: `sources/${stage}.md`, authority: stage === 'blueprint' ? 'plan' : stage, reason: 'Fictional test of recorded ownership; pending checkpoints remain pending.' };
    next.refresh = { baselineRevision: prior.revision, changes: [{ id: 'owner', text: 'The owning document changed; code and checks did not.', dimension: 'ownership', componentIds: [], sourceIds: ['research'] }] };
    assertValid(next);
    assert.deepEqual(checkBaseline(next, prior), []);
    assert.equal(next.id, explore.id);
    assert.equal(next.origin, 'explore');
    assert.deepEqual(next.components, explore.components);
    assert.deepEqual(next.work, explore.work);
    // Blueprint is an alternative fork from Design in this fixture, not a required post-Plan stage.
    if (stage !== 'plan') prior = next;
  }
});

test('a no-change refresh can disclose an unavailable source without claiming completion', () => {
  const baseline = fixture('export-research');
  const next = clone(baseline);
  next.revision = 'research-2';
  next.refresh = { baselineRevision: baseline.revision, changes: [] };
  next.sources.push({ id: 'runtime-gap', title: 'Running application', kind: 'runtime', availability: 'unavailable', checkedAt: '2026-10-26T12:00:00+01:00', note: 'Fictional test: no running application is available.' });
  assertValid(next);
  assert.deepEqual(checkBaseline(next, baseline), []);
  assert.deepEqual(next.components, baseline.components);
  assert.deepEqual(next.work, baseline.work);
});

test('a material change cannot hide behind a no-change refresh', () => {
  const baseline = fixture('export-research');
  const next = clone(baseline);
  next.revision = 'research-2'; next.refresh = { baselineRevision: baseline.revision, changes: [] };
  next.components[0].claims.evidence[0].text = 'A new check ran.';
  assert.ok(checkBaseline(next, baseline).length);
  const work = clone(baseline);
  work.revision = 'research-2'; work.refresh = { baselineRevision: baseline.revision, changes: [] };
  work.work[0].status = 'done';
  assert.ok(checkBaseline(work, baseline).length);
});
