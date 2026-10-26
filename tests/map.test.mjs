import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validate, assertValid, checkBaseline, render, verify, digest, safeUrl } from '../plugins/rpiv-codex/skills/rpivc-map/scripts/model.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)),'..');
const script = join(root,'plugins/rpiv-codex/skills/rpivc-map/scripts/map.mjs');
const fixture = () => JSON.parse(readFileSync(join(root,'tests/fixtures/map/export-research.json'),'utf8'));
const run = (...args) => execFileSync(process.execPath,[script,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const temporary = (fn) => {
  const folder = mkdtempSync(join(tmpdir(),'rpivc-map-test-'));
  try { return fn(folder); } finally { rmSync(folder,{recursive:true,force:true}); }
};
const writeModel = (folder,model = fixture(),name = 'map.json') => {const path = join(folder,name);writeFileSync(path,`${JSON.stringify(model,null,2)}\n`);return path;};
const createReviewed = (folder,model = fixture(),name = 'map') => {
  const companion = writeModel(folder,model,`${name}.json`);const html = join(folder,`${name}.html`);const review = join(folder,`${name}.review.json`);
  run('render',companion,'--output',html);
  run('record-review',companion,html,'--output',review,'--reviewer','Test reviewer','--result','approved','--notes','Synthetic helper test only; this is not advisor or browser approval.');
  return {companion,html,review};
};

test('map packages the renderer, validator and documented schema without dependencies',() => {
  for (const path of ['SKILL.md','references/schema.md','scripts/map.mjs','scripts/model.mjs','assets/map.js','assets/map.css']) assert.ok(existsSync(join(root,'plugins/rpiv-codex/skills/rpivc-map',path)),path);
  assert.doesNotThrow(() => assertValid(fixture()));
});

test('validation fails closed for unknown fields, endpoints and evidence references',() => {
  for (const mutate of [
    (m) => {m.componnets = [];},
    (m) => {m.connections[0].to = 'missing';},
    (m) => {m.components[0].claims.scope[0].sourceIds = ['missing'];},
    (m) => {m.connections[0].trigger = null;},
    (m) => {m.sources[0].availability = 'unavailable';delete m.sources[0].note;},
    (m) => {m.components[0].claims.implementation = [];},
    (m) => {m.journeys[0].componentIds = ['editor'];},
  ]) { const model = fixture();mutate(model);assert.ok(validate(model).length); }
});

test('explicit evidence gaps stay gaps and do not establish scope or a recommendation',() => {
  const model = fixture();const claim = model.components[0].claims.scope[0];claim.sourceIds = [];claim.gap = 'No scope record has been found.';
  assert.ok(validate(model).some((message) => message.includes('unsupported scope')));
  claim.state = 'unresolved';assert.deepEqual(validate(model),[]);
  const question = model.questions[0];question.recommendation = {candidateId:'uninvestigated',reason:'Seems convenient.',sourceIds:[]};
  assert.ok(validate(model).some((message) => message.includes('investigated candidate')));
  assert.ok(validate(model).some((message) => message.includes('preference')));
});

test('a connection needs real evidence or an explicit assumption and unknown trigger',() => {
  const model = fixture();const edge = model.connections[0];edge.sourceIds = [];edge.trigger = null;
  assert.ok(validate(model).length);
  edge.assumption = 'Illustrative path; the trigger has not been found.';edge.triggerUnknown = 'We have not found what starts this path.';
  assert.deepEqual(validate(model),[]);
  model.components[0].kind = 'reference';assert.ok(validate(model).some((message) => message.includes('reference components')));
  edge.kind = 'reference';assert.ok(validate(model).some((message) => message.includes('runtime journey')));
});

test('ready user choices require investigated candidates and resolved questions require decision records',() => {
  const model = fixture();const question = model.questions.find((item) => item.action === 'user');question.candidates = [];
  assert.ok(validate(model).some((message) => message.includes('two investigated')));
  question.status = 'resolved';assert.ok(validate(model).some((message) => message.includes('authoritative decision')));
});

test('the export contains only the companion factual model and escapes script-breaking text',() => {
  const model = fixture();model.title = '</script><script>alert("unexpected")</script> & test';model.questions[0].why = '<img src=x onerror=alert(1)>';
  const text = JSON.stringify(model);const html = render(model,digest(text));
  assert.ok(!html.includes('<script>alert("unexpected")</script>'));
  assert.ok(html.includes('\\u003c/script\\u003e'));
  assert.ok(html.includes("connect-src 'none'"));assert.ok(html.includes("form-action 'none'"));
  assert.deepEqual(verify(text,html),model);
  assert.throws(() => verify(text,html.replace('Explore the parts','Altered displayed copy')),/stale or edited/);
  assert.throws(() => verify(text,html.replace('Fictional Research','Edited source')),/differs/);
});

test('only HTTP and HTTPS source links are clickable',() => {
  for (const url of ['https://example.com/source','http://example.com/source']) assert.ok(safeUrl(url));
  for (const url of ['javascript:alert(1)','data:text/html,hello','file:///tmp/source','//example.com','/local/path','mailto:person@example.com']) assert.ok(!safeUrl(url));
  const model = fixture();model.sources[0].url = 'javascript:alert(1)';assert.ok(validate(model).some((message) => message.includes('HTTP')));
});

test('historical rendering verification survives a renderer change without weakening current parity',() => {
  const text = JSON.stringify(fixture());const historical = `${render(JSON.parse(text),digest(text))}<!-- historical renderer variation -->`;
  assert.throws(() => verify(text,historical),/stale or edited/);
  assert.deepEqual(verify(text,historical,{currentRenderer:false}),JSON.parse(text));
  assert.throws(() => verify(`${text}\n`,historical,{currentRenderer:false}),/digest/);
});

test('refresh cannot hide material dimension, question, work, dependency or scope changes',() => {
  const baseline = fixture();
  const mutations = [
    (m) => {m.components[0].claims.scope[0].text = 'A new scope agreement.';},
    (m) => {m.components[0].claims.implementation[0].text = 'Built elsewhere.';},
    (m) => {m.components[0].claims.evidence[0].text = 'A check passed.';},
    (m) => {m.connections[0].trigger = 'Another writer starts this.';},
    (m) => {m.questions[0].needs = 'A different mechanism.';},
    (m) => {m.work[0].status = 'done';},
    (m) => {m.tickets[0].dependencies[0].reason = 'A new dependency reason.';},
    (m) => {m.sources = [];},
    (m) => {m.components.splice(0,1);},
    (m) => {m.questions.splice(0,1);},
  ];
  for (const mutate of mutations) {
    const model = structuredClone(baseline);model.revision = 'next';model.refresh = {baselineRevision:baseline.revision,changes:[]};mutate(model);assert.ok(checkBaseline(model,baseline).length);
  }
  const plan = structuredClone(baseline);plan.owner.authority = 'plan';const model = structuredClone(plan);model.revision = 'next';model.refresh = {baselineRevision:plan.revision,changes:[{dimension:'ownership',componentIds:[]}]};model.owner.authority = 'design';assert.ok(checkBaseline(model,plan).some((message) => message.includes('back from Plan')));
});

test('review records bind exact companion/render digests without a self hash',() => temporary((folder) => {
  const files = createReviewed(folder);const review = JSON.parse(readFileSync(files.review,'utf8'));
  assert.equal(review.companionSha256,digest(readFileSync(files.companion)));assert.equal(review.renderedSha256,digest(readFileSync(files.html)));assert.ok(!('reviewSha256' in review));
  assert.throws(() => run('record-review',files.companion,files.html,'--output',files.review,'--reviewer','Other','--result','approved','--notes','Second review.'),/immutable/);
}));

test('approval snapshots are immutable and failed refresh leaves last approval untouched',() => temporary((folder) => {
  const files = createReviewed(folder);const approval = join(folder,'approval.json');run('approve',files.companion,files.html,'--review',files.review,'--approval',approval);
  const previous = readFileSync(approval,'utf8');const accepted = JSON.parse(previous);const snapshot = resolve(folder,accepted.rendered.path);const snapshotText = readFileSync(snapshot,'utf8');
  assert.equal(digest(snapshotText),accepted.rendered.sha256);
  assert.throws(() => run('render',files.companion,'--output',snapshot,'--replace-candidate'),/immutable approved snapshot/);
  const symlink = join(folder,'snapshot-alias.html');symlinkSync(snapshot,symlink);assert.throws(() => run('render',files.companion,'--output',symlink,'--replace-candidate'),/immutable approved snapshot/);
  const failed = fixture();failed.revision = 'unreviewed';failed.refresh.baselineRevision = 'not-approved';const candidate = writeModel(folder,failed,'failed.json');
  assert.throws(() => run('refresh',candidate,'--approval',approval),/last approved/);
  assert.equal(readFileSync(approval,'utf8'),previous);assert.equal(readFileSync(snapshot,'utf8'),snapshotText);
}));

test('approval rejects a stale or rejected review and unsafe output aliases',() => temporary((folder) => {
  const files = createReviewed(folder);const approval = join(folder,'approval.json');const review = JSON.parse(readFileSync(files.review,'utf8'));review.renderedSha256 = '0'.repeat(64);writeFileSync(files.review,JSON.stringify(review));
  assert.throws(() => run('approve',files.companion,files.html,'--review',files.review,'--approval',approval),/exact companion and rendered digests/);assert.ok(!existsSync(approval));
  assert.throws(() => run('render',files.companion,'--output',files.companion,'--replace-candidate'),/aliases/);
  const alias = join(folder,'input-alias.json');symlinkSync(files.companion,alias);assert.throws(() => run('render',files.companion,'--output',alias,'--replace-candidate'),/aliases/);
  assert.throws(() => run('record-review',files.companion,files.html,'--output',files.html,'--reviewer','Reviewer','--result','approved','--notes','Synthetic.'),/aliases/);
  assert.throws(() => run('approve',files.companion,files.html,'--review',files.review,'--approval',files.html),/aliases/);
}));

test('a candidate refresh compares with the approved snapshot and advances only after exact review',() => temporary((folder) => {
  const first = createReviewed(folder);const approval = join(folder,'approval.json');run('approve',first.companion,first.html,'--review',first.review,'--approval',approval);const oldRecord = JSON.parse(readFileSync(approval,'utf8'));
  const model = fixture();model.revision = 'research-2';model.refresh = {baselineRevision:'research-1',changes:[]};const companion = writeModel(folder,model,'next.json');const html = join(folder,'next.html');const review = join(folder,'next.review.json');
  assert.match(run('refresh',companion,'--approval',approval),/No meaningful changes/);
  run('render',companion,'--output',html,'--approval',approval);assert.equal(JSON.parse(readFileSync(approval,'utf8')).revision,'research-1');
  run('record-review',companion,html,'--output',review,'--reviewer','Test reviewer','--result','approved','--notes','Synthetic revision test.');run('approve',companion,html,'--review',review,'--approval',approval);
  const accepted = JSON.parse(readFileSync(approval,'utf8'));assert.equal(accepted.revision,'research-2');assert.equal(accepted.previousRevision,'research-1');assert.ok(existsSync(resolve(folder,oldRecord.rendered.path)));
}));
