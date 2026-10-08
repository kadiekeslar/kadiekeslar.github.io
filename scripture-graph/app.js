/* Set ?api=http://127.0.0.1:5000 for local backend development. */
const localAPI = new URLSearchParams(location.search).get('api');
const API_BASE = localAPI && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(localAPI)
  ? localAPI : 'https://scripture-graph-backend.onrender.com';
const {validateGraph, mergeGraphs, toMarkdown} = ScriptureGraphUtils;
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
let cy = null, currentData = null, selectedPassage = null;
let requestNumber = 0, activeController = null, lastSearch = null;
const cache = new Map();
const STORAGE_KEY = 'scripture-graph-notebook-v1';
let notebook = {version: 1, collections: [{id: 'default', name: 'My study', entries: []}]};
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (saved) {
    const valid = saved.version === 1 && Array.isArray(saved.collections) && saved.collections.length > 0 &&
      saved.collections.every(c => typeof c.id === 'string' && typeof c.name === 'string' && Array.isArray(c.entries) &&
        c.entries.every(e => ['id','reference','text','source','query','note'].every(k => typeof e[k] === 'string')));
    if (!valid) throw new Error('Invalid stored notebook');
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
  const response = await fetch(`${API_BASE}/explore?q=${encodeURIComponent(query)}`, {signal});
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
  activeController?.abort();
  const controller = new AbortController(); activeController = controller;
  const number = ++requestNumber; lastSearch = [left, right];
  let timedOut = false;
  // A single overall deadline includes backend wake-up and both comparison searches.
  const deadline = setTimeout(() => { timedOut = true; controller.abort(); }, 150000);
  const slowNotice = setTimeout(() => { if (number === requestNumber) $('loadingMessage').textContent = 'Still working. The backend may be waking up; you can cancel and retry.'; }, 12000);
  $('errorBanner').classList.add('hidden'); clearInspector();
  $('loadingMessage').textContent = right ? 'RETRIEVING TWO SEARCHES' : 'RETRIEVING + ORGANIZING SCRIPTURE';
  $('loadingState').classList.remove('hidden'); $('cy').setAttribute('aria-busy', 'true'); status('SEARCHING');
  try {
    // Sequential requests also work on a single-worker backend.
    const first = await fetchGraph(left, controller.signal);
    const result = right ? mergeGraphs(first, await fetchGraph(right, controller.signal)) : first;
    if (number !== requestNumber) return;
    if (typeof cytoscape !== 'function') throw new Error('The graph library could not load. Check your connection and refresh.');
    renderGraph(result); currentData = result;
    renderFilters(result); renderComparison(result);
    $('sourceList').innerHTML = (result.sources || []).map(s => `<div class="source-item">${escapeHtml(s)}</div>`).join('');
    $('nodeCount').textContent = result.nodes.length; $('edgeCount').textContent = result.edges.length; $('queryType').textContent = result.queryType;
    $('emptyState').classList.add('hidden'); showNodeDetails(cy.getElementById(result.center)); status('LOADED');
  } catch (error) {
    if (number !== requestNumber) return;
    controller.abort();
    if (cy) { cy.destroy(); cy = null; } currentData = null;
    $('filterList').replaceChildren(); $('comparisonPanel').classList.add('hidden'); $('sourceList').textContent = 'No graph loaded.';
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
      {selector:'.faded',style:{opacity:0.16}}, {selector:'.focused',style:{'border-width':4,'border-color':'white'}}
    ], layout:{name:'cose',animate:false,padding:70,nodeRepulsion:180000,idealEdgeLength:115,numIter:1000}
  });
  cy.on('tap','node',event => selectNode(event.target));
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
    button.innerHTML = `<div class="connection-target">${escapeHtml(other.data('label'))}</div><div class="connection-label">${escapeHtml(e.query ? e.query + ' / ' : '')}${escapeHtml(e.label)}</div>${e.explanation ? `<div class="connection-explanation">AI explanation: ${escapeHtml(e.explanation)}</div>` : ''}`;
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
  if (!data.comparison) return;
  const c = data.comparison;
  $('comparisonStats').innerHTML = `<div class="comparison-key left-key">A: ${escapeHtml(c.left)} · ${c.leftOnly} unique</div><div class="comparison-key right-key">B: ${escapeHtml(c.right)} · ${c.rightOnly} unique</div><div class="comparison-key shared-key">${c.shared} shared passages</div>`;
  data.nodes.filter(n => n.data.membership === 'shared').forEach(({data:d}) => {
    const button = document.createElement('button'); button.className = 'shared-passage'; button.textContent = d.label;
    button.addEventListener('click', () => { $('sharedOnly').checked = false; $('filterList').querySelectorAll('input').forEach(i => { if (i.value === 'verse') i.checked = true; }); applyFilters(); selectNode(cy.getElementById(d.id)); });
    $('sharedList').append(button);
  });
  if (!c.shared) $('sharedList').textContent = 'No exact reference overlap in these results. Try another pair.';
}
function applyFilters() {
  if (!cy) return;
  const types = [...$('filterList').querySelectorAll('input:checked')].map(i => i.value);
  const shared = $('sharedOnly').checked;
  cy.nodes().forEach(n => n.style('display', types.includes(n.data('type')) && (!shared || n.data('membership') === 'shared') ? 'element' : 'none'));
  cy.edges().forEach(e => e.style('display', e.source().visible() && e.target().visible() ? 'element' : 'none'));
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
  const collection = chosenCollection(); $('notebookEntries').replaceChildren(); $('exportButton').disabled = !collection.entries.length;
  if (!collection.entries.length) { $('notebookEntries').textContent = 'Select a verse in the graph and save it here to start your study.'; return; }
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
