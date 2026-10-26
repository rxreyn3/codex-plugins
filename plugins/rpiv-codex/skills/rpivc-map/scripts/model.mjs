import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const digest = (value) => createHash('sha256').update(value).digest('hex');
const identifier = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
export function safeUrl(value) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}

export function validate(model) {
  const errors = [];
  const fail = (where, message) => errors.push(`${where}: ${message}`);
  const object = (value, where, keys) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { fail(where, 'must be an object'); return false; }
    for (const key of Object.keys(value)) if (!keys.includes(key)) fail(`${where}.${key}`, 'unknown field');
    return true;
  };
  const str = (value, where, optional = false) => {
    if (optional && value === undefined) return;
    if (typeof value !== 'string' || !value.trim()) fail(where, 'must be a nonempty plain-text string');
  };
  const arr = (value, where, optional = false) => {
    if (optional && value === undefined) return [];
    if (!Array.isArray(value)) { fail(where, 'must be an array'); return []; }
    return value;
  };
  const choice = (value, values, where) => { if (!values.includes(value)) fail(where, `must be one of ${values.join(', ')}`); };
  const id = (value, where) => { if (typeof value !== 'string' || !identifier.test(value)) fail(where, 'must be an identifier'); };
  const time = (value, where) => { if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) || Number.isNaN(Date.parse(value))) fail(where, 'must be a timestamp with time zone'); };
  if (!object(model, 'map', ['schemaVersion','id','title','revision','origin','currentStage','owner','sources','layers','boundaries','components','connections','constraints','questions','work','journeys','tickets','suggestion','refresh','reviews'])) return errors;
  if (model.schemaVersion !== 1) fail('schemaVersion', 'must be 1');
  id(model.id, 'id'); id(model.revision, 'revision'); str(model.title, 'title');
  const stages = ['explore','research','design','plan','blueprint','implementation'];
  choice(model.origin, stages, 'origin'); choice(model.currentStage, stages, 'currentStage');
  if (object(model.owner, 'owner', ['artifact','authority','reason'])) {
    choice(model.owner.authority, ['none','research','design','plan'], 'owner.authority'); str(model.owner.reason, 'owner.reason');
    if (model.owner.artifact !== null) str(model.owner.artifact, 'owner.artifact');
    if ((model.owner.artifact === null) !== (model.owner.authority === 'none')) fail('owner', 'missing artifact must use authority none; an artifact needs an explicit owner');
  }
  const collections = {};
  for (const name of ['sources','layers','boundaries','components','connections','constraints','questions','work','journeys','tickets','reviews']) {
    const rows = arr(model[name], name, ['boundaries','constraints'].includes(name));
    collections[name] = new Map();
    rows.forEach((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) { fail(`${name}[${index}]`, 'must be an object'); return; }
      id(item.id, `${name}[${index}].id`);
      if (collections[name].has(item.id)) fail(name, `duplicate identifier ${item.id}`);
      collections[name].set(item.id, item);
    });
  }
  if (!collections.layers.size || !collections.components.size) fail('map', 'needs at least one responsibility layer and component');
  const ref = (value, type, where) => { if (!collections[type].has(value)) fail(where, `unknown ${type} reference ${String(value)}`); };
  const refs = (value, type, where, optional = false) => {
    const values = arr(value, where, optional);
    if (new Set(values).size !== values.length) fail(where, 'duplicate references');
    values.forEach((entry) => ref(entry, type, where));
    return values;
  };
  const available = (ids) => Array.isArray(ids) && ids.some((entry) => collections.sources.get(entry)?.availability === 'available');
  const evidence = (item, where, gapKey = 'gap') => {
    refs(item.sourceIds, 'sources', `${where}.sourceIds`);
    str(item[gapKey], `${where}.${gapKey}`, true);
    if (!available(item.sourceIds) && !item[gapKey]) fail(where, `needs an available supporting source or explicit ${gapKey}`);
  };
  for (const [key, source] of collections.sources) {
    const p = `sources.${key}`;
    object(source, p, ['id','title','kind','availability','revision','checkedAt','url','path','note']);
    str(source.title, `${p}.title`); str(source.kind, `${p}.kind`); choice(source.availability, ['available','unavailable'], `${p}.availability`);
    str(source.revision, `${p}.revision`, true); str(source.note, `${p}.note`, true); str(source.path, `${p}.path`, true);
    if (source.checkedAt !== undefined) time(source.checkedAt, `${p}.checkedAt`);
    if (!source.revision && !source.checkedAt) fail(p, 'needs revision or checkedAt');
    if (!source.url && !source.path && !source.note) fail(p, 'needs URL, path or provenance note');
    if (source.url !== undefined && !safeUrl(source.url)) fail(`${p}.url`, 'only absolute HTTP or HTTPS links are allowed');
    if (source.availability === 'unavailable' && !source.note) fail(p, 'unavailable evidence needs an explanation');
  }
  for (const [key, layer] of collections.layers) { object(layer, `layers.${key}`, ['id','title']); str(layer.title, `layers.${key}.title`); }
  for (const [key, boundary] of collections.boundaries) {
    object(boundary, `boundaries.${key}`, ['id','title','external']); str(boundary.title, `boundaries.${key}.title`);
    if (typeof boundary.external !== 'boolean') fail(`boundaries.${key}.external`, 'must be boolean');
  }
  const claimIds = new Set();
  const claims = (value, where) => {
    if (!object(value, where, ['scope','implementation','evidence'])) return;
    for (const dimension of ['scope','implementation','evidence']) {
      const entries = arr(value[dimension], `${where}.${dimension}`);
      if (!entries.length) fail(`${where}.${dimension}`, 'needs at least one independently supported claim');
      entries.forEach((entry, index) => {
        const p = `${where}.${dimension}[${index}]`;
        if (!object(entry, p, ['id','text','state','sourceIds','gap'])) return;
        id(entry.id, `${p}.id`); if (claimIds.has(entry.id)) fail(p, `duplicate claim identifier ${entry.id}`); claimIds.add(entry.id);
        str(entry.text, `${p}.text`); str(entry.state, `${p}.state`); evidence(entry, p);
        if (dimension === 'scope' && !available(entry.sourceIds) && entry.state !== 'unresolved') fail(p, 'unsupported scope must remain unresolved');
      });
    }
  };
  for (const [key, component] of collections.components) {
    const p = `components.${key}`;
    object(component, p, ['id','name','responsibility','kind','layerId','boundaryId','claims','sourceIds']);
    str(component.name, `${p}.name`); str(component.responsibility, `${p}.responsibility`);
    choice(component.kind, ['interface','process','store','reference'], `${p}.kind`); ref(component.layerId, 'layers', `${p}.layerId`);
    if (component.boundaryId !== undefined) ref(component.boundaryId, 'boundaries', `${p}.boundaryId`);
    refs(component.sourceIds, 'sources', `${p}.sourceIds`); claims(component.claims, `${p}.claims`);
  }
  for (const [key, connection] of collections.connections) {
    const p = `connections.${key}`;
    object(connection, p, ['id','from','to','label','payload','trigger','triggerUnknown','kind','implementation','claims','sourceIds','assumption']);
    ref(connection.from, 'components', `${p}.from`); ref(connection.to, 'components', `${p}.to`);
    if (connection.from === connection.to) fail(p, 'self connections are not supported; explain the internal behavior in the component');
    for (const field of ['label','payload']) str(connection[field], `${p}.${field}`);
    if (connection.trigger === null) str(connection.triggerUnknown, `${p}.triggerUnknown`); else str(connection.trigger, `${p}.trigger`);
    choice(connection.kind, ['data','trigger','dependency','reference'], `${p}.kind`);
    choice(connection.implementation, ['existing','draft','undesigned'], `${p}.implementation`);
    evidence(connection, p, 'assumption'); claims(connection.claims, `${p}.claims`);
    if (connection.kind !== 'reference' && [connection.from,connection.to].some((entry) => collections.components.get(entry)?.kind === 'reference')) fail(p, 'reference components cannot participate in runtime or dependency paths');
  }
  for (const [key, constraint] of collections.constraints) {
    const p = `constraints.${key}`; object(constraint, p, ['id','text','componentIds','sourceIds','gap']); str(constraint.text, `${p}.text`); refs(constraint.componentIds, 'components', `${p}.componentIds`); evidence(constraint, p);
  }
  for (const [key, question] of collections.questions) {
    const p = `questions.${key}`;
    object(question, p, ['id','title','componentId','componentIds','connectionIds','status','action','agreed','needs','why','nextStep','example','sourceIds','gap','decisionRecordId','candidates','recommendation']);
    for (const field of ['title','agreed','needs','why','nextStep']) str(question[field], `${p}.${field}`);
    str(question.example, `${p}.example`, true); ref(question.componentId, 'components', `${p}.componentId`);
    refs(question.componentIds, 'components', `${p}.componentIds`, true); refs(question.connectionIds, 'connections', `${p}.connectionIds`, true);
    choice(question.status, ['open','resolved'], `${p}.status`); choice(question.action, ['engineering','coordination','user'], `${p}.action`); evidence(question, p);
    if (question.decisionRecordId !== undefined) ref(question.decisionRecordId, 'sources', `${p}.decisionRecordId`);
    if (question.status === 'resolved' && !question.decisionRecordId) fail(p, 'a resolved question needs its authoritative decision record');
    const candidates = arr(question.candidates, `${p}.candidates`, true); const candidateIds = new Set();
    for (const candidate of candidates) {
      if (!object(candidate, `${p}.candidates`, ['id','title','consequence','feasibility','tradeoffs','sourceIds','gap'])) continue;
      id(candidate.id, `${p}.candidates.id`); if (candidateIds.has(candidate.id)) fail(p, 'duplicate candidate identifier'); candidateIds.add(candidate.id);
      for (const field of ['title','consequence','feasibility','tradeoffs']) str(candidate[field], `${p}.candidates.${field}`);
      evidence(candidate, `${p}.candidates.${candidate.id}`);
    }
    if (question.action === 'user' && question.status === 'open' && (candidates.length < 2 || candidates.some((candidate) => !available(candidate.sourceIds)))) fail(p, 'a ready user choice needs at least two investigated candidates with feasibility evidence');
    if (question.recommendation !== undefined) {
      const r = question.recommendation;
      if (object(r, `${p}.recommendation`, ['candidateId','reason','sourceIds'])) {
        if (!candidateIds.has(r.candidateId)) fail(p, 'recommendation must name an investigated candidate'); str(r.reason, `${p}.recommendation.reason`);
        refs(r.sourceIds, 'sources', `${p}.recommendation.sourceIds`);
        if (!available(r.sourceIds)) fail(p, 'recommendation needs available evidence supporting the preference');
      }
    }
  }
  for (const [key, item] of collections.work) {
    const p = `work.${key}`; object(item, p, ['id','title','description','kind','status','componentIds','connectionIds','sourceIds','gap']);
    str(item.title, `${p}.title`); str(item.description, `${p}.description`); choice(item.kind, ['outcome','check'], `${p}.kind`); choice(item.status, ['remaining','deferred','done'], `${p}.status`);
    refs(item.componentIds, 'components', `${p}.componentIds`); refs(item.connectionIds, 'connections', `${p}.connectionIds`, true); evidence(item, p);
  }
  for (const [key, journey] of collections.journeys) {
    const p = `journeys.${key}`; object(journey, p, ['id','title','description','componentIds','connectionIds']); str(journey.title, `${p}.title`); str(journey.description, `${p}.description`);
    const ids = refs(journey.componentIds, 'components', `${p}.componentIds`); const connections = refs(journey.connectionIds, 'connections', `${p}.connectionIds`);
    for (const value of connections) {
      const edge = collections.connections.get(value);
      if (edge && (!ids.includes(edge.from) || !ids.includes(edge.to))) fail(p, 'journey must include both connection endpoints');
      if (edge?.kind === 'reference') fail(p, 'reference connections are context, not runtime journey steps');
    }
  }
  for (const [key, ticket] of collections.tickets) {
    const p = `tickets.${key}`; object(ticket, p, ['id','title','url','description','sourceIds','scope','connectionIds','dependencies']);
    str(ticket.title, `${p}.title`); str(ticket.description, `${p}.description`); refs(ticket.sourceIds, 'sources', `${p}.sourceIds`);
    if (ticket.url !== undefined && !safeUrl(ticket.url)) fail(`${p}.url`, 'only HTTP and HTTPS links are allowed');
    refs(ticket.connectionIds, 'connections', `${p}.connectionIds`);
    for (const row of arr(ticket.scope, `${p}.scope`)) { if (!object(row, `${p}.scope`, ['componentId','portion','sourceIds','gap'])) continue; ref(row.componentId, 'components', `${p}.scope.componentId`); str(row.portion, `${p}.scope.portion`); evidence(row, `${p}.scope`); }
    for (const row of arr(ticket.dependencies, `${p}.dependencies`)) { if (!object(row, `${p}.dependencies`, ['componentId','relationship','reason','enables','sourceIds','gap'])) continue; ref(row.componentId, 'components', `${p}.dependencies.componentId`); choice(row.relationship, ['prerequisite','related'], `${p}.dependencies.relationship`); str(row.reason, `${p}.dependencies.reason`); str(row.enables, `${p}.dependencies.enables`); evidence(row, `${p}.dependencies`); }
  }
  if (model.suggestion != null) {
    const p = 'suggestion'; const s = model.suggestion;
    if (object(s, p, ['title','questionId','enables','rationale','dependencies','sourceIds'])) {
      for (const field of ['title','enables','rationale']) str(s[field], `${p}.${field}`); ref(s.questionId, 'questions', `${p}.questionId`); refs(s.sourceIds, 'sources', `${p}.sourceIds`);
      if (!available(s.sourceIds)) fail(p, 'suggestion needs available supporting evidence');
      const dependencies = arr(s.dependencies, `${p}.dependencies`); if (!dependencies.length) fail(p, 'suggested ordering needs dependency evidence');
      for (const row of dependencies) { if (!object(row, `${p}.dependencies`, ['componentId','relationship','reason','sourceIds','gap'])) continue; ref(row.componentId, 'components', `${p}.dependencies.componentId`); choice(row.relationship, ['hard','helpful'], `${p}.dependencies.relationship`); str(row.reason, `${p}.dependencies.reason`); evidence(row, `${p}.dependencies`); }
    }
  }
  if (object(model.refresh, 'refresh', ['baselineRevision','changes'])) {
    if (model.refresh.baselineRevision !== null) id(model.refresh.baselineRevision, 'refresh.baselineRevision');
    const changeIds = new Set();
    for (const change of arr(model.refresh.changes, 'refresh.changes')) {
      const p = 'refresh.changes'; if (!object(change, p, ['id','text','dimension','componentIds','questionIds','workIds','sourceIds','gap','before','after'])) continue;
      id(change.id, `${p}.id`); if (changeIds.has(change.id)) fail(p, 'duplicate change identifier'); changeIds.add(change.id);
      str(change.text, `${p}.text`); choice(change.dimension, ['scope','implementation','evidence','ownership','dependency','question','work'], `${p}.dimension`);
      refs(change.componentIds, 'components', `${p}.componentIds`); refs(change.questionIds, 'questions', `${p}.questionIds`, true); refs(change.workIds, 'work', `${p}.workIds`, true); evidence(change, p);
      str(change.before, `${p}.before`, true); str(change.after, `${p}.after`, true);
      if (model.refresh.baselineRevision === null && change.before !== undefined) fail(p, 'first map cannot invent a before comparison');
    }
  }
  for (const [key, review] of collections.reviews) {
    const p = `reviews.${key}`; object(review, p, ['id','reviewer','result','reviewedAt','revision','notes']);
    for (const field of ['reviewer','notes']) str(review[field], `${p}.${field}`); id(review.revision, `${p}.revision`); choice(review.result, ['approved','changes-requested'], `${p}.result`); time(review.reviewedAt, `${p}.reviewedAt`);
  }
  return errors;
}

export function assertValid(model) {
  const errors = validate(model);
  if (errors.length) throw new Error(`Companion validation failed:\n${errors.map((entry) => `- ${entry}`).join('\n')}`);
  return model;
}

export function checkBaseline(candidate, baseline) {
  const errors = [];
  if (candidate.id !== baseline.id) errors.push('map identity changed');
  if (candidate.origin !== baseline.origin) errors.push('map origin changed');
  if (candidate.revision === baseline.revision) errors.push('candidate must use a new revision');
  if (candidate.refresh.baselineRevision !== baseline.revision) errors.push('refresh must compare against the last approved revision');
  const changes = candidate.refresh.changes;
  const same = (left,right) => JSON.stringify(left) === JSON.stringify(right);
  const coverage = (dimensions,componentIds = [],field,id) => changes.some((entry) => dimensions.includes(entry.dimension) && (field ? (entry[field] || []).includes(id) : !componentIds.length || componentIds.some((value) => entry.componentIds.includes(value))));
  if ((candidate.currentStage !== baseline.currentStage || JSON.stringify(candidate.owner) !== JSON.stringify(baseline.owner)) && !changes.some((entry) => entry.dimension === 'ownership')) errors.push('stage or owner changed without an ownership change record');
  if (baseline.owner.authority === 'plan' && candidate.owner.authority !== 'plan') errors.push('intended-behavior authority cannot silently move back from Plan; retain the current Plan owner');
  for (const source of baseline.sources) if (!candidate.sources.some((entry) => entry.id === source.id)) errors.push(`historical source ${source.id} was removed; retain provenance and mark unavailable evidence explicitly`);
  const components = new Map(candidate.components.map((entry) => [entry.id, entry]));
  for (const component of baseline.components) {
    if (!components.has(component.id)) errors.push(`established component ${component.id} was removed; retain its identity and explain a changed responsibility`);
  }
  for (const name of ['components','connections']) {
    const prior = new Map(baseline[name].map((entry) => [entry.id,entry]));
    for (const item of candidate[name]) {
      const old = prior.get(item.id);const parts = name === 'components' ? [item.id] : [item.from,item.to];
      if (!old) {if (!coverage(['implementation','dependency'],parts)) errors.push(`new ${name} ${item.id} needs a recorded implementation or dependency change`);continue;}
      for (const dimension of ['scope','implementation','evidence']) if (!same(old.claims[dimension],item.claims[dimension]) && !coverage([dimension],parts)) errors.push(`${name} ${item.id} ${dimension} claims changed without a matching refresh record`);
      const omit = (value,keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
      const keys = name === 'components' ? ['claims','sourceIds'] : ['claims'];
      if (!same(omit(old,keys),omit(item,keys)) && !coverage(name === 'components' ? ['implementation'] : ['implementation','dependency','evidence'],parts)) errors.push(`${name} ${item.id} behavior or relationships changed without a matching refresh record`);
    }
    for (const item of baseline[name]) if (!candidate[name].some((entry) => entry.id === item.id) && name === 'connections' && !coverage(['dependency','implementation'],[item.from,item.to])) errors.push(`removed connection ${item.id} needs a recorded change`);
  }
  for (const [name,dimension,field] of [['questions','question','questionIds'],['work','work','workIds']]) {
    const prior = new Map(baseline[name].map((entry) => [entry.id,entry]));
    for (const item of candidate[name]) if (!same(prior.get(item.id),item) && !coverage([dimension],[],field,item.id)) errors.push(`${name} ${item.id} changed without a matching ${dimension} refresh record`);
    for (const item of baseline[name]) if (!candidate[name].some((entry) => entry.id === item.id)) errors.push(`${name} ${item.id} was removed; preserve resolved decisions and completed or deferred work`);
  }
  for (const [name,dimensions] of [['tickets',['scope','dependency']],['constraints',['scope']],['journeys',['dependency']]]) {
    if (!same(candidate[name] || [],baseline[name] || []) && !coverage(dimensions)) errors.push(`${name} changed without a matching refresh record`);
  }
  if (!same(candidate.suggestion,baseline.suggestion) && !coverage(['dependency','question'])) errors.push('suggested next discussion changed without dependency or question evidence');
  return errors;
}

const assetRoot = new URL('../assets/', import.meta.url);
const escapeText = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export function render(model, companionDigest) {
  assertValid(model);
  const css = readFileSync(fileURLToPath(new URL('map.css', assetRoot)), 'utf8');
  const script = readFileSync(fileURLToPath(new URL('map.js', assetRoot)), 'utf8');
  const data = JSON.stringify(model).replaceAll('&','\\u0026').replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
  const scriptHash = createHash('sha256').update(script).digest('base64');
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="rpivc-companion-sha256" content="${companionDigest}"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${scriptHash}'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'"><title>${escapeText(model.title)}</title><style>${css}</style></head><body><a class="skip" href="#detail">Skip to selected detail</a><main id="app"></main><noscript>This map needs JavaScript for inspection. Read the companion JSON for the complete source-backed record.</noscript><script id="map-data" type="application/json">${data}</script><script>${script}</script></body></html>\n`;
}

export function verify(companionText, html, { currentRenderer = true } = {}) {
  const model = assertValid(JSON.parse(companionText));
  const match = html.match(/<script id="map-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match || JSON.stringify(JSON.parse(match[1])) !== JSON.stringify(model)) throw new Error('Rendered companion differs from the editable companion');
  const recordedDigest = html.match(/<meta name="rpivc-companion-sha256" content="([a-f0-9]{64})">/)?.[1];
  if (recordedDigest !== digest(companionText)) throw new Error('Rendered companion digest does not match the editable companion');
  if (currentRenderer && html !== render(model, digest(companionText))) throw new Error('Rendered output is stale or edited; regenerate it from the companion and current renderer');
  return model;
}
