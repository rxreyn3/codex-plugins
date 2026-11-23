#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, realpathSync } from 'node:fs';
import { dirname, resolve, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertValid, checkBaseline, digest, render, verify } from './model.mjs';

const read = (path) => readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const identity = (path) => existsSync(path) ? realpathSync(path) : resolve(path);
function refuseSnapshotOutput(path) {
  const actual = existsSync(path) ? realpathSync(path) : existsSync(dirname(path)) ? join(realpathSync(dirname(path)),basename(path)) : resolve(path);
  if (actual.split(/[\\/]/).some((part) => part.endsWith('.map-snapshots'))) throw new Error('Cannot write into an immutable approved snapshot directory');
}
function distinct(output, inputs) {
  if (inputs.filter(Boolean).some((input) => identity(output) === identity(input))) throw new Error('Output aliases an input or approval record; choose a separate path');
}
function atomic(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, contents, { flag: 'wx' });
  renameSync(temporary, path);
}
function snapshot(path, contents) {
  if (existsSync(path)) {
    if (read(path) !== contents) throw new Error(`Immutable approved snapshot differs: ${path}`);
  } else writeFileSync(path, contents, { flag: 'wx', mode: 0o444 });
}
function loadApproval(path) {
  const record = json(path);
  if (record.schemaVersion !== 1 || record.result !== 'approved' || !record.companion || !record.rendered || !record.review) throw new Error('Invalid approval record');
  const checked = {};
  for (const field of ['companion','rendered','review']) {
    const item = record[field];
    if (typeof item.path !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error(`Invalid approval ${field}`);
    const full = resolve(dirname(path), item.path);
    const contents = read(full);
    if (digest(contents) !== item.sha256) throw new Error(`Approved ${field} snapshot digest mismatch`);
    checked[field] = { path: full, contents };
  }
  const baseline = verify(checked.companion.contents, checked.rendered.contents, {currentRenderer:false});
  const review = JSON.parse(checked.review.contents);
  if (record.mapId !== baseline.id || record.revision !== baseline.revision || review.result !== 'approved' || review.companionSha256 !== record.companion.sha256 || review.renderedSha256 !== record.rendered.sha256) throw new Error('Approval record does not match its reviewed revision');
  return { record, baseline, checked };
}
function requireBaseline(model, approvalPath) {
  if (!approvalPath || !existsSync(approvalPath)) {
    if (model.refresh.baselineRevision !== null) throw new Error('Refresh needs the last approved record; a candidate is not a baseline');
    return null;
  }
  const approved = loadApproval(approvalPath);
  const errors = checkBaseline(model, approved.baseline);
  if (errors.length) throw new Error(`Refresh validation failed:\n- ${errors.join('\n- ')}`);
  return approved;
}
export function main(argv = process.argv.slice(2)) {
  const command = argv.shift(); const positions = []; const options = {};
  const allowed = new Set(['output','approval','review','reviewer','result','notes','replace-candidate']);
  while (argv.length) {
    const value = argv.shift();
    if (value.startsWith('--')) {
      const key = value.slice(2);
      if (!allowed.has(key) || options[key] !== undefined) throw new Error(`Unknown or duplicate option ${value}`);
      options[key] = key === 'replace-candidate' ? true : argv.shift();
      if (options[key] === undefined || (typeof options[key] === 'string' && options[key].startsWith('--'))) throw new Error(`Missing value for ${value}`);
    } else positions.push(value);
  }
  if (!['validate','render','verify','refresh','record-review','approve'].includes(command) || positions.length !== (['verify','record-review','approve'].includes(command) ? 2 : 1)) throw new Error('Usage: map.mjs validate|render|verify|refresh|record-review|approve companion.json [candidate.html] [--output path] [--approval path] [--review path]');
  const companionPath = resolve(positions[0]); const companionText = read(companionPath); const model = assertValid(JSON.parse(companionText));
  const approvalPath = options.approval ? resolve(options.approval) : null;
  if (command === 'validate') { console.log(`Valid companion: ${model.id} ${model.revision}`); return; }
  if (command === 'render') {
    if (!options.output) throw new Error('render requires --output');
    const output = resolve(options.output);
    distinct(output,[companionPath,approvalPath]);
    // Snapshot directories are owned only by approve. Even --replace-candidate
    // cannot turn a draft render into a mutation of the accepted baseline.
    refuseSnapshotOutput(output);
    const approved = requireBaseline(model, approvalPath);
    if (approved && Object.values(approved.checked).some((entry) => entry.path === output || (existsSync(output) && realpathSync(entry.path) === realpathSync(output)))) throw new Error('Cannot overwrite an approved snapshot');
    if (existsSync(output) && !options['replace-candidate']) throw new Error('Candidate output exists; use a new path or --replace-candidate');
    atomic(output, render(model, digest(companionText)));
    console.log(`Rendered candidate: ${output}`); return;
  }
  if (command === 'refresh') {
    if (!approvalPath || !existsSync(approvalPath)) throw new Error('refresh requires an existing --approval record');
    requireBaseline(model, approvalPath);
    console.log(`Valid candidate against last approved ${model.refresh.baselineRevision}. ${model.refresh.changes.length ? model.refresh.changes.map((change) => change.text).join('\n') : 'No meaningful changes recorded; source coverage gaps remain visible.'}`); return;
  }
  const htmlPath = resolve(positions[1]); const htmlText = read(htmlPath); verify(companionText, htmlText);
  if (command === 'verify') { console.log(`Exact companion/render parity: ${model.id} ${model.revision}`); return; }
  if (command === 'record-review') {
    if (!options.output || !options.reviewer || !options.notes || !['approved','changes-requested'].includes(options.result)) throw new Error('record-review requires --output, --reviewer, --result approved|changes-requested and --notes');
    const output = resolve(options.output);
    distinct(output,[companionPath,htmlPath,approvalPath]);
    refuseSnapshotOutput(output);
    if (existsSync(output)) throw new Error('Review records are immutable; use a new path');
    const record = { schemaVersion:1, mapId:model.id, revision:model.revision, companionSha256:digest(companionText), renderedSha256:digest(htmlText), reviewer:options.reviewer, result:options.result, notes:options.notes, reviewedAt:new Date().toISOString() };
    atomic(output, `${JSON.stringify(record,null,2)}\n`);
    console.log(`Recorded supplied review: ${output}`); return;
  }
  if (!approvalPath || !options.review) throw new Error('approve requires --review and --approval');
  distinct(approvalPath,[companionPath,htmlPath,resolve(options.review)]);
  refuseSnapshotOutput(approvalPath);
  requireBaseline(model, approvalPath);
  const reviewText = read(resolve(options.review)); const review = JSON.parse(reviewText);
  if (review.schemaVersion !== 1 || review.result !== 'approved' || review.mapId !== model.id || review.revision !== model.revision || !review.reviewer || !review.notes || !review.reviewedAt || review.companionSha256 !== digest(companionText) || review.renderedSha256 !== digest(htmlText)) throw new Error('Approval requires an approved review of these exact companion and rendered digests');
  const snapshotName = `${basename(approvalPath)}.map-snapshots`; const snapshotRoot = join(dirname(approvalPath), snapshotName); mkdirSync(snapshotRoot,{recursive:true});
  const prefix = `${model.revision}-${digest(companionText).slice(0,12)}-${digest(htmlText).slice(0,12)}`;
  const paths = { companion:join(snapshotRoot,`${prefix}.json`), rendered:join(snapshotRoot,`${prefix}.html`), review:join(snapshotRoot,`${prefix}.review.json`) };
  snapshot(paths.companion,companionText); snapshot(paths.rendered,htmlText); snapshot(paths.review,reviewText);
  const record = { schemaVersion:1, mapId:model.id, revision:model.revision, result:'approved', approvedAt:new Date().toISOString(), previousRevision:model.refresh.baselineRevision };
  for (const [field,contents] of [['companion',companionText],['rendered',htmlText],['review',reviewText]]) record[field] = {path:`${snapshotName}/${basename(paths[field])}`,sha256:digest(contents)};
  atomic(approvalPath,`${JSON.stringify(record,null,2)}\n`);
  console.log(`Recorded approval: ${approvalPath}\nApproved rendering: ${paths.rendered}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
