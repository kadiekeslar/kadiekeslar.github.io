/* Set ?api=http://127.0.0.1:5000 for local backend development. */
const localAPI = new URLSearchParams(location.search).get('api');
const API_BASE = localAPI && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(localAPI)
  ? localAPI : 'https://scripture-graph-backend.onrender.com';
const {validateGraph, mergeGraphs, toMarkdown, textComparison, validateComparison, buildStudyOutline} = ScriptureGraphUtils;
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
let cy = null, currentData = null, selectedPassage = null;
let requestNumber = 0, activeController = null, lastSearch = null;
const cache = new Map();
const insightsCache = new Map();
let currentReport = null, insightsController = null, backgroundController = null;
const STORAGE_KEY = 'scripture-graph-notebook-v1';
let notebook = {version: 1, collections: [{id: 'default', name: 'My study', entries: []}]};
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (saved) {
    const valid = saved.version === 1 && Array.isArray(saved.collections) && saved.collections.length > 0 &&
      saved.collections.every(c => typeof c.id === 'string' && typeof c.name === 'string' && Array.isArray(c.entries) &&
        c.entries.every(e => ['id','reference','text','source','query','note'].every(k => typeof e[k] === 'string')));
    if (!valid) throw new Error('Invalid stored notebook');
    saved.collections.forEach(c=> {
      const o=c.outline;
      if(o && (typeof o.overview!=='string' || !Array.isArray(o.similarities) || !Array.isArray(o.differences) || !Array.isArray(o.study_questions) || !o.study_questions.every(q=>typeof q==='string') || ![...o.similarities,...o.differences].every(i=>typeof i.title==='string' && Array.isArray(i.left_refs) && Array.isArray(i.right_refs)))) delete c.outline;
    });
    notebook = saved;
  }
} catch (_) { $('storageMessage').textContent = 'Saved data could not be read. Export this session before closing it.'; }

function persistNotebook() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notebook)); $('storageMessage').textContent = 'Notebook saved in this browser.'; return true; }
  catch (_) { $('storageMessage').textContent = 'Browser storage is unavailable or full. Your changes are kept for this session; export a backup.'; return false; }
}
function status(message) { $('apiStatus').textContent = message; $('footerMessage').textContent = message; }
function clearInspector() {
  selectedPassage = null;
  $('detailType').textContent = 'NO SELECTION'; $('detailLabel').textContent = 'Select a passage';
  $('detailSummary').textContent = 'Select a graph node or a passage in the shared list.';
  $('verseText').textContent = ''; $('verseText').classList.add('hidden');
  $('detailMeta').replaceChildren(); $('connectionList').replaceChildren(); $('connectionCount').textContent = '—';
  $('saveControls').classList.add('hidden'); $('saveMessage').textContent = '';
}
async function fetchGraph(query, signal) {
  if (cache.has(query)) return structuredClone(cache.get(query));
  const response = await fetch(`${API_BASE}/explore?fast=1&q=${encodeURIComponent(query)}`, {signal});
  let data;
  try { data = await response.json(); }
  catch (_) { throw new Error('The service returned an unreadable response. Please retry.'); }
  if (!response.ok) throw new Error(data.error || 'The service could not complete this search. Please retry.');
  validateGraph(data);
  data.query = query;
  cache.set(query, structuredClone(data));
  if (cache.size > 20) cache.delete(cache.keys().next().value);
  return data;
}
async function runSearch(left = $('searchInput').value, right = $('compareInput').value) {
  left = left.trim(); right = right.trim();
  if (!left) { $('searchInput').focus(); return; }
  if (left.length > 300 || right.length > 300) { showError('Keep each search under 300 characters.'); return; }
  activeController?.abort(); insightsController?.abort(); backgroundController?.abort();
  currentReport = null; $('comparisonInsights').classList.add('hidden');
  const controller = new AbortController(); activeController = controller;
  const started = performance.now();
  const number = ++requestNumber; lastSearch = [left, right];
  let timedOut = false;
  // A single overall deadline includes backend wake-up and both comparison searches.
  const deadline = setTimeout(() => { timedOut = true; controller.abort(); }, 150000);
  const slowNotice = setTimeout(() => { if (number === requestNumber) $('loadingMessage').textContent = 'Still working. The backend may be waking up; you can cancel and retry.'; }, 12000);
  $('errorBanner').classList.add('hidden'); clearInspector();
  $('loadingMessage').textContent = right ? 'RETRIEVING TWO SEARCHES' : 'RETRIEVING + ORGANIZING SCRIPTURE';
  $('loadingState').classList.remove('hidden'); $('cy').setAttribute('aria-busy', 'true'); status('SEARCHING');
  try {
    // Retrieve both sides together; each backend retrieval batches passage requests.
    let first, second;
    if (right) [first, second] = await Promise.all([fetchGraph(left, controller.signal), fetchGraph(right, controller.signal)]);
    else first = await fetchGraph(left, controller.signal);
    const result = right ? mergeGraphs(first, second) : first;
    if (number !== requestNumber) return;
    if (typeof cytoscape !== 'function') throw new Error('The graph library could not load. Check your connection and refresh.');
    renderGraph(result); currentData = result;
    renderFilters(result); renderComparison(result);
    $('sourceList').innerHTML = (result.sources || []).map(s => `<div class="source-item">${escapeHtml(s)}</div>`).join('');
    $('nodeCount').textContent = result.nodes.length; $('edgeCount').textContent = result.edges.length; $('queryType').textContent = result.queryType;
    $('emptyState').classList.add('hidden'); showNodeDetails(cy.getElementById(result.center)); status(`LOADED · ${((performance.now()-started)/1000).toFixed(1)}s`);
    if (right) loadComparison(result, number); else loadExplanations(left, number);
  } catch (error) {
    if (number !== requestNumber) return;
    controller.abort();
    if (cy) { cy.destroy(); cy = null; } currentData = null;
    $('filterList').replaceChildren(); $('comparisonPanel').classList.add('hidden'); $('comparisonInsights').classList.add('hidden'); $('sourceList').textContent = 'No graph loaded.';
    $('nodeCount').textContent = '0'; $('edgeCount').textContent = '0'; $('queryType').textContent = '—';
    clearInspector(); $('emptyState').classList.remove('hidden');
    if (error.name === 'AbortError' && !timedOut) status('SEARCH CANCELLED');
    else { showError(timedOut ? 'This search took too long. The backend may be starting or busy. Please retry.' : error.message); status('SEARCH FAILED'); }
  } finally {
    clearTimeout(deadline); clearTimeout(slowNotice);
    if (number === requestNumber) { $('loadingState').classList.add('hidden'); $('cy').setAttribute('aria-busy', 'false'); activeController = null; }
  }
}
function showError(message) { $('errorMessage').textContent = message; $('errorBanner').classList.remove('hidden'); }
function renderGraph(data) {
  cy?.destroy();
  cy = cytoscape({container: $('cy'), elements: [...data.nodes, ...data.edges], minZoom: 0.08, maxZoom: 3,
    style: [
      {selector:'node',style:{'background-color':'#dce6ed',label:'data(label)',color:'#d4dde2','font-size':11,'text-valign':'bottom','text-margin-y':8,width:26,height:26,'border-width':1,'border-color':'#75828b','text-wrap':'wrap','text-max-width':120}},
      {selector:'node[type="person"]',style:{shape:'round-rectangle','background-color':'#9eb6c7'}},
      {selector:'node[type="place"]',style:{shape:'triangle','background-color':'#9db8a8'}},
      {selector:'node[type="event"], node[type="subtheme"]',style:{shape:'hexagon',width:35,height:35}},
      {selector:'node[type="topic"]',style:{shape:'diamond',width:44,height:44}},
      {selector:'node[membership="left"]',style:{'background-color':'#83b9ed'}},
      {selector:'node[membership="right"]',style:{'background-color':'#d9a5df'}},
      {selector:'node[membership="shared"]',style:{'background-color':'#f1cf75','border-color':'#fff0bf','border-width':3}},
      {selector:'node[?isCenter]',style:{width:46,height:46,'border-width':3}},
      {selector:'edge',style:{width:1.3,'line-color':'#6f7c86','curve-style':'bezier',opacity:0.7}},
      {selector:'edge[type="cross-reference"]',style:{'line-style':'solid'}},
      {selector:'edge[type="context"], edge[type="reference"]',style:{'line-style':'dashed'}},
      {selector:'edge[type="topic"], edge[type="topic-match"], edge[type="direct-match"]',style:{'line-style':'dotted'}},
      {selector:'edge[searchSide=0]',style:{'line-color':'#83b9ed'}},
      {selector:'edge[searchSide=1]',style:{'line-color':'#d9a5df'}},
      {selector:'edge[type="theme-bridge"]',style:{'line-color':'#f1cf75','line-style':'dashed',width:2.5,opacity:.9}},
      {selector:'.faded',style:{opacity:0.16}}, {selector:'.focused',style:{'border-width':4,'border-color':'white'}}
    ], layout:{name:'cose',animate:false,padding:70,nodeRepulsion:180000,idealEdgeLength:115,numIter:1000}
  });
  cy.on('tap','node',event => selectNode(event.target));
  cy.on('tap','edge[type="theme-bridge"]',event => {
    clearInspector(); const e = event.target.data();
    $('detailType').textContent = 'THEMATIC CONNECTION'; $('detailLabel').textContent = e.label;
    $('detailSummary').textContent = e.explanation;
    $('detailMeta').textContent = `${e.sourceName}. Supporting passages: ${event.target.source().data('label')} ↔ ${event.target.target().data('label')}. This is a thematic observation, not a published cross-reference.`;
  });
  cy.on('tap',event => { if (event.target === cy) cy.elements().removeClass('faded focused'); });
  fitGraph();
}
function fitGraph() { if (cy && cy.elements(':visible').length) { cy.resize(); cy.fit(cy.elements(':visible'), 65); } }
function selectNode(node) {
  if (!node?.length) return;
  cy.elements().removeClass('faded focused'); cy.elements().not(node.closedNeighborhood()).addClass('faded'); node.addClass('focused');
  showNodeDetails(node);
}
function showNodeDetails(node) {
  if (!node?.length) return;
  clearInspector(); const d = node.data();
  $('detailType').textContent = `${d.type.toUpperCase()}${d.membership ? ' / ' + d.membership.toUpperCase() : ''}`;
  $('detailLabel').textContent = d.label;
  const evidence = d.evidence || [d];
  $('detailSummary').textContent = evidence.map(e => `${e.query ? e.query + ': ' : ''}${e.summary || 'Retrieved passage.'}`).join('\n\n');
  if (d.type === 'verse' && d.text) {
    $('verseText').textContent = d.text; $('verseText').classList.remove('hidden');
    selectedPassage = {id:d.reference || d.label, reference:d.reference || d.label, text:d.text, source:d.sourceName || 'Berean Standard Bible', query:currentData?.query || '', note:''};
    $('saveControls').classList.remove('hidden');
  }
  const meta = [['SOURCE',d.sourceName],['REFERENCE',d.reference],['SEARCH',d.membership],['EXPLANATIONS','Summaries and connection explanations may be AI-generated.']];
  $('detailMeta').innerHTML = meta.filter(([,v]) => v).map(([k,v]) => `<div class="meta-row"><span class="meta-label">${escapeHtml(k)}</span><span class="meta-value">${escapeHtml(v)}</span></div>`).join('');
  const connections = node.connectedEdges().filter(e => e.visible()); $('connectionCount').textContent = connections.length;
  connections.forEach(edge => {
    const other = edge.source().id() === node.id() ? edge.target() : edge.source(); const e = edge.data();
    const button = document.createElement('button'); button.className = 'connection-item';
    button.innerHTML = `<div class="connection-target">${escapeHtml(other.data('label'))}</div><div class="connection-label">${escapeHtml(e.query ? e.query + ' / ' : '')}${escapeHtml(e.label)}</div>${e.explanation ? `<div class="connection-explanation">${e.interpretationMethod === 'text' ? 'Text-based connection' : 'AI explanation'}: ${escapeHtml(e.explanation)}</div>` : ''}`;
    button.addEventListener('click', () => selectNode(other)); $('connectionList').append(button);
  });
  if (!connections.length) $('connectionList').textContent = 'No visible connections.';
}
function renderFilters(data) {
  const counts = {};
  data.nodes.forEach(n => { counts[n.data.type] = (counts[n.data.type] || 0) + 1; });
  $('filterList').innerHTML = Object.entries(counts).map(([type,count]) => `<label class="filter-row"><input type="checkbox" value="${escapeHtml(type)}" checked /><span>${escapeHtml(type)}</span><span>${count}</span></label>`).join('');
  $('filterList').querySelectorAll('input').forEach(input => input.addEventListener('change',applyFilters));
  $('sharedOnly').checked = false;
}
function renderComparison(data) {
  $('comparisonPanel').classList.toggle('hidden', !data.comparison); $('sharedList').replaceChildren();
  $('themeLinksControl').classList.toggle('hidden', !data.comparison);
  if (!data.comparison) return;
  const c = data.comparison;
  $('comparisonStats').innerHTML = `<div class="comparison-key left-key">A: ${escapeHtml(c.left)} · ${c.leftOnly} unique</div><div class="comparison-key right-key">B: ${escapeHtml(c.right)} · ${c.rightOnly} unique</div><div class="comparison-key shared-key">${c.shared} shared passages</div>`;
  data.nodes.filter(n => n.data.membership === 'shared').forEach(({data:d}) => {
    const button = document.createElement('button'); button.className = 'shared-passage'; button.textContent = d.label;
    button.addEventListener('click', () => { $('sharedOnly').checked = false; $('filterList').querySelectorAll('input').forEach(i => { if (i.value === 'verse') i.checked = true; }); applyFilters(); selectNode(cy.getElementById(d.id)); });
    $('sharedList').append(button);
  });
  if (!c.shared) $('sharedList').textContent = 'No identical references. See the findings above for connections between different passages.';
}
function applyFilters() {
  if (!cy) return;
  const types = [...$('filterList').querySelectorAll('input:checked')].map(i => i.value);
  const shared = $('sharedOnly').checked;
  cy.nodes().forEach(n => n.style('display', types.includes(n.data('type')) && (!shared || n.data('membership') === 'shared') ? 'element' : 'none'));
  cy.edges().forEach(e => e.style('display', e.source().visible() && e.target().visible() && (e.data('type') !== 'theme-bridge' || $('themeLinks').checked) ? 'element' : 'none'));
  cy.elements().removeClass('faded focused'); clearInspector(); fitGraph();
  $('footerMessage').textContent = shared && !cy.nodes(':visible').length ? 'No shared passages visible. Turn off the shared filter or enable verses.' : `${cy.nodes(':visible').length} visible nodes`;
}
function renderCollectionOptions() {
  for (const id of ['saveCollection','notebookCollection']) {
    const previous = $(id).value;
    $(id).innerHTML = notebook.collections.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
    if (notebook.collections.some(c => c.id === previous)) $(id).value = previous;
  }
}
function chosenCollection() { return notebook.collections.find(c => c.id === $('notebookCollection').value) || notebook.collections[0]; }
function renderNotebook() {
  const collection = chosenCollection(); $('notebookEntries').replaceChildren(); $('exportButton').disabled = !collection.entries.length && !collection.outline;
  if (collection.outline) {
    const summary = document.createElement('section'); summary.className = 'saved-outline';
    const title = document.createElement('h3'); title.textContent = 'Your comparison study outline'; summary.append(title);
    const p = document.createElement('p'); p.textContent = collection.outline.overview; summary.append(p);
    const provenance = document.createElement('p'); provenance.className='help-text'; provenance.textContent = collection.outline.method === 'ai' ? 'AI-assisted interpretation of retrieved passages.' : 'Text-based preview from retrieved passages.'; summary.append(provenance);
    [...collection.outline.similarities,...collection.outline.differences].forEach(item=> { const finding=document.createElement('p'); finding.textContent=`${item.title}: ${item.explanation || ('A: '+item.left_focus+' B: '+item.right_focus)} · A: ${item.left_refs.join(', ')} · B: ${item.right_refs.join(', ')}`; summary.append(finding); });
    const list = document.createElement('ol'); collection.outline.study_questions.forEach(q=> { const li=document.createElement('li'); li.textContent=q; list.append(li); }); summary.append(list); $('notebookEntries').append(summary);
  }
  if (!collection.entries.length) { if (!collection.outline) $('notebookEntries').textContent = 'Select a verse in the graph and save it here to start your study.'; return; }
  collection.entries.forEach(entry => {
    const article = document.createElement('article'); article.className = 'saved-entry';
    const heading = document.createElement('h3'); heading.textContent = entry.reference;
    const quote = document.createElement('blockquote'); quote.textContent = entry.text;
    const meta = document.createElement('p'); meta.className = 'help-text'; meta.textContent = `Source: ${entry.source} · Search: ${entry.query}`;
    const label = document.createElement('label'); label.textContent = 'My notes';
    const textarea = document.createElement('textarea'); textarea.value = entry.note; textarea.maxLength = 10000; textarea.rows = 4; label.append(textarea);
    textarea.addEventListener('input', () => { entry.note = textarea.value; persistNotebook(); });
    const remove = document.createElement('button'); remove.textContent = 'Remove passage';
    remove.addEventListener('click', () => { collection.entries = collection.entries.filter(e => e !== entry); persistNotebook(); renderNotebook(); });
    article.append(heading,quote,meta,label,remove); $('notebookEntries').append(article);
  });
}
$('searchForm').addEventListener('submit',event => { event.preventDefault(); runSearch(); });
$('cancelButton').addEventListener('click', () => activeController?.abort());
$('retryButton').addEventListener('click', () => { if (lastSearch) runSearch(...lastSearch); });
$('fitButton').addEventListener('click', fitGraph);
$('resetButton').addEventListener('click', () => { if (!cy) return; $('sharedOnly').checked = false; $('filterList').querySelectorAll('input').forEach(i => i.checked = true); applyFilters(); showNodeDetails(cy.getElementById(currentData.center)); });
$('sharedOnly').addEventListener('change',applyFilters);
document.querySelectorAll('[data-query]').forEach(button => button.addEventListener('click', () => { $('searchInput').value = button.dataset.query; $('compareInput').value = button.dataset.compare || ''; runSearch(); }));
$('notebookButton').addEventListener('click', () => { renderNotebook(); $('notebookDialog').showModal(); });
$('closeNotebook').addEventListener('click', () => $('notebookDialog').close());
$('notebookCollection').addEventListener('change',renderNotebook);
$('collectionForm').addEventListener('submit',event => {
  event.preventDefault(); const name = $('collectionName').value.trim(); if (!name) return;
  const existing = notebook.collections.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) { $('notebookCollection').value = existing.id; renderNotebook(); $('storageMessage').textContent = 'Opened the existing collection with that name.'; return; }
  const collection = {id:crypto.randomUUID(),name,entries:[]}; notebook.collections.push(collection); persistNotebook(); renderCollectionOptions();
  $('notebookCollection').value = collection.id; $('saveCollection').value = collection.id; $('collectionName').value = ''; renderNotebook();
});
$('saveVerseButton').addEventListener('click', () => {
  if (!selectedPassage) return; const collection = notebook.collections.find(c => c.id === $('saveCollection').value);
  if (collection.entries.some(e => e.id === selectedPassage.id)) { $('saveMessage').textContent = 'Already saved in this collection.'; return; }
  collection.entries.push({...selectedPassage});
  $('saveMessage').textContent = persistNotebook() ? `Saved to ${collection.name}.` : 'Saved for this session. Open the notebook and export a backup.';
});
$('exportButton').addEventListener('click', () => {
  const collection = chosenCollection(); const blob = new Blob([toMarkdown(collection)],{type:'text/markdown;charset=utf-8'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
  a.download = `${collection.name.replace(/[^a-z0-9_-]+/gi,'-') || 'study'}.md`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
});
renderCollectionOptions();

function findReference(reference, side) {
  return cy.nodes().filter(n => n.data('type') === 'verse' && (n.data('reference') || n.data('label')) === reference && (!n.data('evidence') || n.data('evidence').some(e=>e.side === side)))[0];
}
function revealReferences(refs) {
  $('sharedOnly').checked = false;
  $('filterList').querySelectorAll('input').forEach(i => { if (i.value === 'verse') i.checked = true; });
  applyFilters();
  const nodes = cy.nodes().filter(n=>refs.includes(n.data('reference') || n.data('label')));
  cy.elements().addClass('faded'); nodes.removeClass('faded').addClass('focused');
  nodes.connectedEdges().filter(e=>nodes.contains(e.source()) && nodes.contains(e.target())).removeClass('faded');
  if (nodes.length) { cy.fit(nodes,90); showNodeDetails(nodes[0]); }
}
function citationButtons(container, references, side) {
  const row=document.createElement('div'); row.className='evidence-chips';
  references.forEach(reference=> { const button=document.createElement('button'); button.textContent=`${side===0?'A':'B'} · ${reference}`; button.className=side===0?'left-key':'right-key';
    button.addEventListener('click',()=> { revealReferences([reference]); const node=findReference(reference,side); if(node) selectNode(node); }); row.append(button); });
  container.append(row);
}
function renderInsights(report, message) {
  currentReport = report;
  $('comparisonInsights').classList.remove('hidden'); $('comparisonOverview').textContent=report.overview; $('insightsStatus').textContent=message;
  $('similarityCards').replaceChildren(); $('differenceCards').replaceChildren();
  for (const [kind,items,id] of [['similarity',report.similarities,'similarityCards'],['difference',report.differences,'differenceCards']]) {
    items.forEach(item=> {
      const card=document.createElement('article'); card.className='insight-card';
      const heading=document.createElement('h4'); heading.textContent=item.title; card.append(heading);
      if(kind==='similarity') { const p=document.createElement('p'); p.textContent=item.explanation; card.append(p); }
      else for(const [side, text] of [[0,item.left_focus],[1,item.right_focus]]) { const p=document.createElement('p'); const label=document.createElement('strong'); label.className=side===0?'left-key':'right-key'; label.textContent=`${side===0?'A':'B'} · ${side===0?currentData.comparison.left:currentData.comparison.right}: `; p.append(label,document.createTextNode(text)); card.append(p); }
      citationButtons(card,item.left_refs,0); citationButtons(card,item.right_refs,1);
      const focus=document.createElement('button'); focus.className='focus-evidence'; focus.textContent='Highlight supporting passages'; focus.addEventListener('click',()=>revealReferences([...item.left_refs,...item.right_refs])); card.append(focus); $(id).append(card);
    });
    if(!items.length) $(id).textContent=kind==='similarity' ? 'No supported connection identified in this selection yet.' : 'No supported difference identified in this selection.';
  }
  $('studyQuestions').replaceChildren(); report.study_questions.forEach(q=> {const li=document.createElement('li'); li.textContent=q; $('studyQuestions').append(li);});
  cy.edges('[type="theme-bridge"]').remove();
  report.similarities.forEach((item,index)=> {
    const a=findReference(item.left_refs[0],0), b=findReference(item.right_refs[0],1);
    if(a && b && a.id()!==b.id()) cy.add({data:{id:`theme-link-${index}`,source:a.id(),target:b.id(),type:'theme-bridge',interpretationMethod:report.method,label:item.title,explanation:item.explanation,sourceName:report.method==='ai'?'AI-assisted thematic interpretation':'Text-based theme match'}});
  });
  cy.edges('[type="theme-bridge"]').style('display',$('themeLinks').checked?'element':'none');
  $('edgeCount').textContent=cy.edges().length; fitGraph();
}
async function loadComparison(data, number) {
  const key=JSON.stringify([data.comparison.left,data.comparison.right]);
  if(insightsCache.has(key)) { renderInsights(insightsCache.get(key),'AI-assisted interpretation · check the supporting passages.'); return; }
  renderInsights(textComparison(data),'Text-based preview. Reading the retrieved passages for a deeper AI comparison…');
  const controller=new AbortController(); insightsController=controller;
  const timer=setTimeout(()=>controller.abort(),70000);
  try {
    const response=await fetch(`${API_BASE}/compare`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({left:data.comparison.left,right:data.comparison.right}),signal:controller.signal});
    if(!response.ok) throw new Error('Comparison unavailable');
    const report=validateComparison(await response.json(),data); report.method='ai';
    if(number!==requestNumber) return;
    insightsCache.set(key,report); if(insightsCache.size>20) insightsCache.delete(insightsCache.keys().next().value);
    renderInsights(report,'AI-assisted interpretation · based on retrieved passages, with evidence for each finding.');
  } catch(_) { if(number===requestNumber) $('insightsStatus').textContent='Text-based preview · AI comparison is unavailable right now. You can still explore and save this study.'; }
  finally {clearTimeout(timer); if(insightsController===controller) insightsController=null;}
}
async function loadExplanations(query, number) {
  if(cache.get(query)?.enriched) return;
  const controller=new AbortController(); backgroundController=controller; const timer=setTimeout(()=>controller.abort(),70000);
  $('footerMessage').textContent='Graph ready · loading AI explanations in the background';
  try {
    const response=await fetch(`${API_BASE}/explain?q=${encodeURIComponent(query)}`,{signal:controller.signal});
    if(!response.ok) throw new Error('Explanation unavailable'); const enriched=validateGraph(await response.json());
    if(number!==requestNumber) return;
    enriched.enriched=true; cache.set(query,enriched); currentData=enriched;
    enriched.nodes.forEach(n=> {const node=cy.getElementById(n.data.id); if(node.length) node.data('summary',n.data.summary);});
    enriched.edges.forEach(e=> {const edge=cy.getElementById(e.data.id); if(edge.length) edge.data('explanation',e.data.explanation || '');});
    const selected=cy.nodes('.focused')[0] || cy.getElementById(enriched.center); showNodeDetails(selected); $('footerMessage').textContent='Graph and explanations ready';
  } catch(_) {if(number===requestNumber) $('footerMessage').textContent='Graph ready · AI explanations unavailable';}
  finally {clearTimeout(timer); if(backgroundController===controller) backgroundController=null;}
}
$('themeLinks').addEventListener('change',applyFilters);
$('toggleInsightsButton').addEventListener('click',()=> {const collapsed=$('insightsBody').classList.toggle('hidden'); $('toggleInsightsButton').textContent=collapsed?'Expand':'Collapse'; $('toggleInsightsButton').setAttribute('aria-expanded',String(!collapsed)); fitGraph();});
$('saveOutlineButton').addEventListener('click',()=> {
  if(!currentReport || !currentData?.comparison) return;
  const collection={id:crypto.randomUUID(),...buildStudyOutline(currentData,currentReport)};
  notebook.collections.push(collection); persistNotebook(); renderCollectionOptions(); $('notebookCollection').value=collection.id; $('saveCollection').value=collection.id;
  renderNotebook(); $('notebookDialog').showModal();
});
// Start waking the backend while the visitor decides what to search.
fetch(`${API_BASE}/health`,{signal:AbortSignal.timeout(90000)}).catch(()=>{});
