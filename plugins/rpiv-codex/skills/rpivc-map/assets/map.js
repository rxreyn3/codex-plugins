(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('map-data').textContent);
  const by = (name, id) => data[name].find((item) => item.id === id);
  const actionNames = { engineering:'Engineering investigation', coordination:'Owner coordination', user:'User or request-owner decision' };
  const state = { journey:null, ticket:null, connected:null, selection:{type:'component',id:data.components[0].id} };
  const element = (tag, text, attrs = {}) => {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = text;
    for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
    return node;
  };
  const append = (parent,...children) => { for (const child of children) if (child) parent.append(child); return parent; };
  const paragraph = (text, className) => element('p',text,className ? {class:className} : {});
  const heading = (tag,text) => element(tag,text);
  const button = (text,click,attrs = {}) => { const node = element('button',text,{type:'button',...attrs}); node.addEventListener('click',click); return node; };
  const safeLink = (text,url) => {
    try { if (['http:','https:'].includes(new URL(url).protocol)) return element('a',text,{href:url,target:'_blank',rel:'noopener noreferrer'}); } catch {}
    return element('span',text);
  };
  function sources(ids,gap) {
    const box = element('div',null,{class:'evidence'});
    if (gap) box.append(paragraph(gap,'gap'));
    if (ids?.length) {
      const details = element('details'); details.append(element('summary','Supporting sources'));
      const list = element('ul',null,{class:'source-list'});
      for (const id of ids) {
        const source = by('sources',id); const item = element('li');
        item.append(source.url ? safeLink(source.title,source.url) : element('span',source.title));
        if (source.path) item.append(element('div',source.path,{class:'meta'}));
        item.append(element('div',[source.revision ? `Revision: ${source.revision}` : null,source.checkedAt ? `Checked: ${source.checkedAt}` : null].filter(Boolean).join(' · '),{class:'meta'}));
        if (source.note) item.append(paragraph(source.note,source.availability === 'unavailable' ? 'gap' : 'meta'));
        list.append(item);
      }
      details.append(list); box.append(details);
    }
    return box;
  }
  function claims(item) {
    const box = element('section',null,{class:'section'});
    const labels = {scope:'What we agreed',implementation:'What exists',evidence:'What we checked'};
    for (const dimension of ['scope','implementation','evidence']) {
      box.append(heading('h3',labels[dimension]));
      for (const claim of item.claims[dimension]) box.append(append(element('div',null,{class:'claim'}),paragraph(claim.text),element('div',claim.state,{class:'qualifier'}),sources(claim.sourceIds,claim.gap)));
    }
    return box;
  }
  const app = document.getElementById('app');
  const header = append(element('header'),heading('h1',data.title),paragraph('Explore the parts and their connections to find what still needs deciding or building.','tagline'),paragraph(`Started in ${data.origin}. Current evidence: ${data.currentStage}. ${data.owner.artifact ? `Owning record: ${data.owner.artifact}` : 'No owning artifact exists yet.'}`,'meta'));
  const controls = element('div',null,{class:'context-controls'});
  function selector(title,rows,key) {
    const select = element('select',null,{id:`${key}-select`,'aria-label':title});
    select.append(element('option',`All ${key === 'journey' ? 'journeys' : 'tickets'}`,{value:''}));
    rows.forEach((row) => select.append(element('option',row.title,{value:row.id})));
    select.addEventListener('change',() => {state[key] = select.value || null;state.connected = null; update();});
    const label = append(element('label',title),select); controls.append(label); return select;
  }
  const journeySelect = selector('Journey',data.journeys,'journey');
  const ticketSelect = selector('Ticket or delivery slice',data.tickets,'ticket');
  controls.append(button('Review remaining questions',() => {state.selection = {type:'index'};update();focusDetail();}));
  const refresh = element('details',null,{class:'refresh'}); refresh.append(element('summary','Since the last refresh'));
  refresh.append(paragraph(data.refresh.baselineRevision ? `Compared with the last approved map, ${data.refresh.baselineRevision}.` : 'This is the first map; there is no earlier approved map to compare.','meta'));
  if (!data.refresh.changes.length) refresh.append(paragraph(data.refresh.baselineRevision ? 'No meaningful changes recorded. Sources that could not be checked remain coverage gaps.' : 'The first map records the available evidence without inventing a before-and-after comparison.'));
  for (const change of data.refresh.changes) {
    const box = element('div',null,{class:'change'}); box.append(paragraph(change.text));
    const details = element('details'); details.append(element('summary','Change details'));
    if (change.before) details.append(paragraph(`Previously: ${change.before}`)); if (change.after) details.append(paragraph(`Now: ${change.after}`));
    details.append(sources(change.sourceIds,change.gap)); box.append(details);
    const actions = element('div',null,{class:'selection-actions'});
    change.componentIds.forEach((id) => actions.append(button(`Inspect ${by('components',id).name}`,() => selectComponent(id))));
    (change.questionIds || []).forEach((id) => actions.append(button(`Open question: ${by('questions',id).title}`,() => selectQuestion(id))));
    box.append(actions); refresh.append(box);
  }
  const picker = element('details',null,{id:'component-picker',class:'component-picker'}); picker.append(element('summary','Choose a part by responsibility'));
  data.layers.forEach((layer,index) => {
    const group = append(element('div',null,{class:'picker-group'}),heading('h3',layer.title)); const buttons = element('div',null,{class:'picker-items'});
    data.components.filter((item) => item.layerId === layer.id).forEach((item) => {
      const b = button(item.name,() => {picker.open = false;selectComponent(item.id);}); b.style.setProperty('--node-color',`var(--layer${index % 4})`); buttons.append(b);
    }); group.append(buttons); picker.append(group);
  });
  const layout = element('div',null,{class:`layout${data.layers.length >= 4 || data.components.length > 8 ? ' wide' : ''}`});
  const overview = element('section',null,{class:'overview',id:'overview',tabindex:'-1','aria-label':'System overview'});
  const contextBox = element('div'); const diagramBox = element('div',null,{class:'diagram-scroll'}); const diagramHint = paragraph('Scroll sideways to see all responsibility layers.','diagram-hint meta'); const mobileSteps = element('div',null,{class:'journey-steps'});
  const legend = element('div',null,{class:'legend','aria-label':'Connection and shape legend'});
  [['existing','Existing source path'],['draft','Draft implementation'],['undesigned','Mechanism undecided']].forEach(([kind,label]) => legend.append(append(element('span'),element('i',null,{class:kind,'aria-hidden':'true'}),element('span',label))));
  if (data.connections.some((edge) => edge.kind === 'reference')) legend.append(append(element('span'),element('i',null,{class:'undesigned','aria-hidden':'true'}),element('span','Reference context; outside runtime')));
  [['interface','Interface'],['process','Processing'],['store','Saved data']].forEach(([kind,label]) => legend.append(append(element('span'),element('i',null,{class:`shape-key ${kind}`,'aria-hidden':'true'}),element('span',label))));
  legend.append(element('span','Line style describes implementation, not agreed scope.'));
  const connectionList = element('ol',null,{class:'connection-list','aria-label':'Inspectable connections'});
  append(overview,contextBox,diagramBox,diagramHint,mobileSteps,legend,heading('h3','Connections in this view'),connectionList);
  const detail = element('section',null,{class:'detail',id:'detail','aria-live':'polite','aria-label':'Selected detail'});
  append(layout,overview,detail);
  append(app,header,controls,refresh,picker,layout,paragraph('Inspection and discussion only. A click does not approve a decision or change a source document. Journeys explain evidence; they are not live operations.','footer'));
  const firstMissing = data.sources.filter((source) => source.availability === 'unavailable');
  if (firstMissing.length) {
    const coverage = element('details',null,{class:'refresh'}); coverage.append(element('summary',`${firstMissing.length} source coverage gap${firstMissing.length === 1 ? '' : 's'}`),sources(firstMissing.map((source) => source.id))); app.insertBefore(coverage,picker);
  }
  function visibleEdges() {
    if (state.connected) return data.connections.filter((edge) => edge.from === state.connected || edge.to === state.connected);
    let edges = data.connections;
    if (state.journey) { const journey = by('journeys',state.journey); edges = edges.filter((edge) => journey.connectionIds.includes(edge.id)); }
    if (state.ticket) { const ticket = by('tickets',state.ticket); edges = edges.filter((edge) => ticket.connectionIds.includes(edge.id)); }
    return edges;
  }
  function visibleParts(edges) {
    const ids = new Set(edges.flatMap((edge) => [edge.from,edge.to]));
    if (state.connected) ids.add(state.connected);
    else {
      if (state.journey) by('journeys',state.journey).componentIds.forEach((id) => ids.add(id));
      if (state.ticket) { const ticket = by('tickets',state.ticket); [...ticket.scope,...ticket.dependencies].forEach((row) => ids.add(row.componentId)); }
      if (!state.journey && !state.ticket) data.components.forEach((part) => ids.add(part.id));
    }
    return ids;
  }
  function focusDetail(questionId) {
    const target = questionId ? document.getElementById(`question-${questionId}`)?.querySelector('summary') : detail.querySelector('h2');
    if (target) { target.focus({preventScroll:true}); target.scrollIntoView({block:'start',behavior:'instant'}); }
  }
  function selectComponent(id) { state.selection = {type:'component',id};update();focusDetail(); }
  function selectQuestion(id) { const question = by('questions',id);state.selection = {type:'component',id:question.componentId,questionId:id};update();focusDetail(id); }
  function selectConnection(id) { state.selection = {type:'connection',id};update();focusDetail(); }
  function questionView(question,explicit = false) {
    const box = element('details',null,{class:'question',id:`question-${question.id}`}); box.open = explicit;
    const summary = element('summary',question.title);summary.append(element('span',actionNames[question.action],{class:'action'}));box.append(summary);
    const needsLabel = question.status === 'resolved' ? 'Recorded resolution' : question.action === 'user' ? 'Needs a decision' : question.action === 'coordination' ? 'Needs coordination' : 'Needs design or checking';
    const rows = [['Agreed',question.agreed],[needsLabel,question.needs],['Why it matters',question.why],['Next step',question.nextStep]];
    for (const [label,text] of rows) { const p = paragraph();append(p,element('strong',`${label}: `),document.createTextNode(text));box.append(p); }
    if (question.example) box.append(paragraph(`Example (illustrative): ${question.example}`));
    if (question.recommendation) {
      const candidate = question.candidates.find((entry) => entry.id === question.recommendation.candidateId);
      append(box,paragraph(`Recommendation: ${candidate.title}. ${question.recommendation.reason}`),sources(question.recommendation.sourceIds));
    }
    const technical = element('details',null,{class:'technical'});technical.append(element('summary',question.status === 'resolved' ? 'Decision record and evidence' : question.action === 'user' ? 'Options and evidence' : 'Evidence and possibilities for engineers to investigate'));
    technical.append(sources(question.sourceIds,question.gap));
    if (question.decisionRecordId) technical.append(sources([question.decisionRecordId]));
    for (const candidate of question.candidates || []) {
      technical.append(heading('h4',candidate.title),paragraph(candidate.consequence),paragraph(`Feasibility: ${candidate.feasibility}`),paragraph(`Trade-off: ${candidate.tradeoffs}`),sources(candidate.sourceIds,candidate.gap));
    }
    if (!question.recommendation && question.status !== 'resolved') technical.append(paragraph('No option is recommended; review the evidence and next step.','meta'));
    box.append(technical);return box;
  }
  function renderQuestionIndex() {
    detail.append(heading('h2','Remaining questions'));detail.querySelector('h2').tabIndex = -1;
    detail.append(paragraph('Choose a question to inspect its agreed behavior, consequence and next step. Your journey and ticket stay selected.'));
    for (const action of ['engineering','coordination','user']) {
      const rows = data.questions.filter((question) => question.status === 'open' && question.action === action);
      detail.append(heading('h3',actionNames[action]));
      if (!rows.length) { detail.append(paragraph(action === 'user' ? 'No user choice is ready.' : 'No open questions in this group.','no-items'));continue; }
      const group = element('div',null,{class:'question-index'});
      rows.forEach((question) => {
        const b = button(question.title,() => selectQuestion(question.id)); b.append(element('span',`${actionNames[action]} · ${by('components',question.componentId).name}`,{class:'action'})); group.append(b);
      });detail.append(group);
    }
  }
  function connectionView(edge) {
    const title = heading('h2',edge.label);title.tabIndex = -1;detail.append(title);
    detail.append(paragraph(`${by('components',edge.from).name} → ${by('components',edge.to).name}`,'part-label'));
    detail.append(paragraph(`Relationship: ${{data:'Data movement',trigger:'Trigger',dependency:'Dependency',reference:'Reference context'}[edge.kind]}.`,'meta'));
    const dl = element('dl');append(dl,element('dt','What passes or depends on what'),element('dd',edge.payload),element('dt','What triggers it'),element('dd',edge.trigger || edge.triggerUnknown));detail.append(dl);
    if (edge.kind === 'reference') detail.append(paragraph('This is reference context. It does not participate in the runtime path.','gap'));
    detail.append(sources(edge.sourceIds,edge.assumption));
    const actions = element('div',null,{class:'selection-actions'});[edge.from,edge.to].forEach((id) => actions.append(button(`Inspect ${by('components',id).name}`,() => selectComponent(id))));detail.append(actions,claims(edge));
    const related = data.questions.filter((question) => question.status === 'open' && (question.connectionIds || []).includes(edge.id));
    if (related.length) {detail.append(heading('h3','Still to decide'));related.forEach((question) => detail.append(questionView(question)));}
    const remaining = data.work.filter((item) => item.status !== 'done' && (item.connectionIds || []).includes(edge.id));
    detail.append(heading('h3','Agreed work remaining'));remaining.forEach((item) => detail.append(workView(item))); if (!remaining.length) detail.append(paragraph('No new outcome or outstanding check is recorded for this connection.','no-items'));
  }
  function workView(item) { return append(element('div',null,{class:'work-item'}),heading('h4',item.title),paragraph(item.description),item.status === 'deferred' ? paragraph('Explicitly deferred.','meta') : null,sources(item.sourceIds,item.gap)); }
  function componentView(component) {
    const title = heading('h2',component.name);title.tabIndex = -1;detail.append(title,paragraph(component.responsibility));
    if (component.boundaryId) {const boundary = by('boundaries',component.boundaryId);detail.append(paragraph(`${boundary.external ? 'External boundary' : 'Boundary'}: ${boundary.title}. Connections enter and leave through this part.`,'meta'));}
    const actions = element('div',null,{class:'selection-actions'});actions.append(button('Show everything connected to this',() => {state.connected = component.id;update();const back = contextBox.querySelector('button');back?.focus({preventScroll:true});back?.scrollIntoView({block:'nearest',behavior:'instant'});}));detail.append(actions);
    if (state.ticket) {
      const ticket = by('tickets',state.ticket);const scope = ticket.scope.filter((row) => row.componentId === component.id);const dependencies = ticket.dependencies.filter((row) => row.componentId === component.id);
      if (scope.length || dependencies.length) {
        const box = element('section',null,{class:'context'});box.append(heading('h3',`Relationship to ${ticket.title}`));
        scope.forEach((row) => box.append(paragraph(`${row.gap ? 'Scope unresolved' : 'Portion in this ticket'}: ${row.portion}`),sources(row.sourceIds,row.gap)));
        dependencies.forEach((row) => box.append(paragraph(`Outside this ticket (${row.relationship}): ${row.reason}`),paragraph(`Makes possible: ${row.enables}`),sources(row.sourceIds,row.gap)));
        box.append(paragraph('Highlighting this part does not imply that this ticket owns all its responsibilities.','meta'));detail.append(box);
      }
    }
    detail.append(heading('h3','Still to decide'));
    const questions = data.questions.filter((question) => question.status === 'open' && (question.componentId === component.id || (question.componentIds || []).includes(component.id)));
    questions.forEach((question) => detail.append(questionView(question,state.selection.questionId === question.id)));
    if (!questions.length) detail.append(paragraph('No unresolved question is recorded for this part.','no-items'));
    detail.append(heading('h3','Agreed work remaining'));
    const work = data.work.filter((item) => item.status !== 'done' && item.componentIds.includes(component.id));
    work.forEach((item) => detail.append(workView(item))); if (!work.length) detail.append(paragraph('No new outcome or outstanding check is recorded for this part.','no-items'));
    detail.append(claims(component));
    const constraints = (data.constraints || []).filter((item) => item.componentIds.includes(component.id));
    if (constraints.length) {const box = element('details',null,{class:'section'});box.append(element('summary','Requirements and constraints'));constraints.forEach((item) => box.append(paragraph(item.text),sources(item.sourceIds,item.gap)));detail.append(box);}
    const resolved = data.questions.filter((question) => question.status === 'resolved' && question.componentId === component.id);
    if (resolved.length) {const box = element('details',null,{class:'section'});box.open = resolved.some((question) => state.selection.questionId === question.id);box.append(element('summary','Recorded decisions'));resolved.forEach((question) => box.append(questionView(question,state.selection.questionId === question.id)));detail.append(box);}
  }
  function renderDetail() {
    detail.replaceChildren();const choose = element('a','Choose another part',{href:'#component-picker',class:'choose-part'});
    choose.addEventListener('click',() => {picker.open = true;requestAnimationFrame(() => {picker.querySelector('summary').focus();picker.scrollIntoView({block:'start'});});});detail.append(choose);
    const back = element('a','Back to the overview',{href:'#overview',class:'back'});back.addEventListener('click',() => overview.focus({preventScroll:true}));detail.append(back);
    if (state.selection.type === 'index') renderQuestionIndex();
    else if (state.selection.type === 'connection') connectionView(by('connections',state.selection.id));
    else componentView(by('components',state.selection.id));
    if (data.suggestion) {
      const s = data.suggestion;const box = element('details',null,{class:'suggestion'});box.append(element('summary','Suggested next discussion'),heading('h3',s.title),paragraph(s.rationale),paragraph(`Makes possible: ${s.enables}`),paragraph('This is a suggested discussion, not an agreed priority, delivery commitment or replacement for Plan ordering.','meta'));
      for (const dependency of s.dependencies) box.append(paragraph(`${dependency.relationship === 'hard' ? 'Prerequisite' : 'Helpful context'} — ${by('components',dependency.componentId).name}: ${dependency.reason}`),sources(dependency.sourceIds,dependency.gap));
      box.append(sources(s.sourceIds),button('Inspect the question',() => selectQuestion(s.questionId)));detail.append(box);
    }
  }
  function drawDiagram(edges,parts) {
    diagramBox.replaceChildren();
    const NS = 'http://www.w3.org/2000/svg'; const svg = (tag,attrs = {},text) => {const n = document.createElementNS(NS,tag);Object.entries(attrs).forEach(([key,value]) => n.setAttribute(key,value));if(text !== undefined)n.textContent = text;return n;};
    const column = 285,cardWidth = 202,cardHeight = 90,margin = 35,rowGap = 140;
    // Each route has a permanent lane above every card. Vertical legs stay in
    // inter-column corridors, so no path crosses an unrelated component.
    const laneCount = data.connections.length;const cardTop = 85 + laneCount * 15;
    const rows = Math.max(...data.layers.map((layer) => data.components.filter((part) => part.layerId === layer.id).length));
    const width = Math.max(610,data.layers.length * column + 40),height = cardTop + rows * rowGap + 15;
    const root = svg('svg',{viewBox:`0 0 ${width} ${height}`,class:'diagram',role:'img','aria-label':'Responsibility layers and the current visible connections',style:`width:${width}px;min-width:${width}px`});
    const defs = svg('defs');const marker = svg('marker',{id:'arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:6,markerHeight:6,orient:'auto-start-reverse'});marker.append(svg('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'var(--route)'}));defs.append(marker);root.append(defs);
    const positions = new Map();
    data.layers.forEach((layer,index) => {
      const x = margin + index * column;
      root.append(svg('text',{x,y:24,class:'layer-label'},layer.title));
      data.components.filter((part) => part.layerId === layer.id).forEach((part,row) => positions.set(part.id,{x,y:cardTop + row * rowGap,index}));
    });
    for (const edge of edges) {
      const start = positions.get(edge.from),end = positions.get(edge.to);const edgeIndex = data.connections.findIndex((item) => item.id === edge.id);const lane = 48 + edgeIndex * 15;
      const sourceX = start.x + cardWidth,sourceY = start.y + cardHeight / 2,destX = end.x,destY = end.y + cardHeight / 2;
      // Distinct offsets keep routes visibly separate even when sharing ports.
      const offset = (edgeIndex % 5) * 3;const sx = sourceX + 17 + offset,dx = destX - 17 - offset;
      const path = `M ${sourceX} ${sourceY} H ${sx} V ${lane} H ${dx} V ${destY} H ${destX}`;
      const group = svg('g');const route = svg('path',{d:path,class:`route ${edge.implementation} ${edge.kind === 'reference' ? 'reference' : ''}`,'marker-end':'url(#arrow)'});group.append(route,svg('circle',{cx:sourceX,cy:sourceY,r:3,class:'port'}));
      const numberX = (sx + dx) / 2;group.append(svg('circle',{cx:numberX,cy:lane,r:9,class:'route-number'}),svg('text',{x:numberX,y:lane + 4,'text-anchor':'middle',class:'route-number-text'},String(edgeIndex + 1)));
      const title = svg('title',{},`${edgeIndex + 1}. ${edge.label}. Select its entry in the connection list to inspect it.`);group.append(title);root.append(group);
    }
    for (const part of data.components) {
      const p = positions.get(part.id);const selected = state.selection.type === 'component' && state.selection.id === part.id;
      if (part.boundaryId) {
        const boundary = by('boundaries',part.boundaryId);root.append(svg('rect',{x:p.x - 7,y:p.y - 19,width:cardWidth + 14,height:cardHeight + 27,rx:8,class:'boundary'}),svg('text',{x:p.x,y:p.y - 6,class:'boundary-label'},`${boundary.external ? 'External' : 'Boundary'}: ${boundary.title}`));
      }
      const group = svg('g',{class:`node${selected ? ' selected' : ''}${parts.has(part.id) ? '' : ' dim'}`,tabindex:0,role:'button','aria-label':`Inspect ${part.name}`,'aria-pressed':String(selected),style:`--node-color:var(--layer${p.index % 4})`});
      let shape;
      if (part.kind === 'store') shape = svg('path',{d:`M ${p.x} ${p.y + 10} C ${p.x} ${p.y - 3},${p.x + cardWidth} ${p.y - 3},${p.x + cardWidth} ${p.y + 10} V ${p.y + cardHeight - 10} C ${p.x + cardWidth} ${p.y + cardHeight + 3},${p.x} ${p.y + cardHeight + 3},${p.x} ${p.y + cardHeight - 10} Z M ${p.x} ${p.y + 10} C ${p.x} ${p.y + 23},${p.x + cardWidth} ${p.y + 23},${p.x + cardWidth} ${p.y + 10}`,class:'shape'});
      else shape = svg('rect',{x:p.x,y:p.y,width:cardWidth,height:cardHeight,rx:part.kind === 'interface' ? 26 : 5,class:'shape'});
      group.append(shape,svg('title',{},part.responsibility));
      const words = part.name.split(/\s+/);const lines = [];let line = '';
      for (const word of words) {if ((line + ' ' + word).trim().length > 25 && line) {lines.push(line);line = word;}else line = (line + ' ' + word).trim();}if(line)lines.push(line);
      lines.forEach((text,index) => group.append(svg('text',{x:p.x + cardWidth / 2,y:p.y + (part.kind === 'store' ? 39 : 31) + index * 18,'text-anchor':'middle'},text)));
      group.append(svg('text',{x:p.x + cardWidth / 2,y:p.y + cardHeight - 9,'text-anchor':'middle',class:'kind'},part.kind === 'process' ? 'Processing' : part.kind === 'store' ? 'Saved data' : part.kind === 'reference' ? 'Reference context' : 'Interface'));
      group.addEventListener('click',() => selectComponent(part.id));group.addEventListener('keydown',(event) => {if(event.key === 'Enter' || event.key === ' ') {event.preventDefault();selectComponent(part.id);}});root.append(group);
    }
    diagramBox.append(root);
    diagramHint.hidden = diagramBox.scrollWidth <= diagramBox.clientWidth;
  }
  function update() {
    const edges = visibleEdges();const parts = visibleParts(edges);journeySelect.value = state.journey || '';ticketSelect.value = state.ticket || '';
    contextBox.replaceChildren();
    if (state.connected) contextBox.append(append(element('div',null,{class:'context'}),paragraph(`Showing every connection for ${by('components',state.connected).name}. Journey and ticket selections are retained.`),button('Back to the previous view',() => {state.connected = null;update();overview.focus({preventScroll:true});overview.scrollIntoView({block:'start',behavior:'instant'});})));
    if (state.journey) {const journey = by('journeys',state.journey);contextBox.append(append(element('div',null,{class:'context'}),heading('h2',journey.title),paragraph(journey.description)));}
    if (state.ticket) {
      const ticket = by('tickets',state.ticket);const box = element('div',null,{class:'context'});box.append(heading('h2',ticket.title),paragraph(ticket.description));if(ticket.url)box.append(safeLink('Open work item',ticket.url));
      box.append(heading('h3','Direct ticket scope'));
      ticket.scope.forEach((row) => box.append(button(by('components',row.componentId).name,() => selectComponent(row.componentId)),paragraph(`${row.gap ? 'Scope unresolved: ' : ''}${row.portion}`),sources(row.sourceIds,row.gap)));
      box.append(heading('h3','Dependencies outside this ticket'));
      ticket.dependencies.forEach((row) => box.append(append(element('div',null,{class:'dependency'}),button(by('components',row.componentId).name,() => selectComponent(row.componentId)),paragraph(`${row.relationship === 'prerequisite' ? 'Prerequisite' : 'Related work'}: ${row.reason}`),paragraph(`Makes possible: ${row.enables}`),sources(row.sourceIds,row.gap))));
      if (!ticket.dependencies.length) box.append(paragraph('No outside dependency is recorded.','no-items'));contextBox.append(box);
    }
    if (!state.connected && !state.journey && !state.ticket) contextBox.append(paragraph('Showing the full system. Select a journey or ticket to follow a smaller set of connections.','muted'));
    drawDiagram(edges,parts);connectionList.replaceChildren();
    for (const edge of edges) {
      const index = data.connections.findIndex((item) => item.id === edge.id) + 1;
      const b = button('',() => selectConnection(edge.id),{class:state.selection.type === 'connection' && state.selection.id === edge.id ? 'selected' : ''});
      append(b,element('span',String(index),{class:'number'}),element('span',`${edge.label} · ${by('components',edge.from).name} → ${by('components',edge.to).name}`));connectionList.append(append(element('li'),b));
    }
    if (!edges.length) connectionList.append(element('li','No connection is recorded for this combination of filters.',{class:'no-items'}));
    mobileSteps.replaceChildren();mobileSteps.append(heading('h3','Parts in this view'));
    for (const layer of data.layers) {const rows = data.components.filter((part) => part.layerId === layer.id && parts.has(part.id));if(!rows.length)continue;const box = element('details');box.append(element('summary',layer.title));const group = element('div',null,{class:'picker-items'});rows.forEach((part) => group.append(button(part.name,() => selectComponent(part.id))));box.append(group);mobileSteps.append(box);}
    renderDetail();
  }
  update();
  window.addEventListener('resize',() => {diagramHint.hidden = diagramBox.scrollWidth <= diagramBox.clientWidth;});
})();
