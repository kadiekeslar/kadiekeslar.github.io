/*
 * Scripture Graph browser controller.
 * Read in this order: configuration/state -> search -> graph selection -> notebook
 * -> save/delete events -> comparison/background explanation requests.
 * Pure data transformations live in graph-utils.js; this file handles the UI.
 */
// -----------------------------------------------------------------------------
// 1. CONFIGURATION AND SHARED STATE
// -----------------------------------------------------------------------------

/* Set ?api=http://127.0.0.1:5000 for local backend development. */
const localAPI = new URLSearchParams(location.search).get("api");
const API_BASE =
  localAPI && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(localAPI)
    ? localAPI
    : "https://scripture-graph-backend.onrender.com";
const {
  validateGraph,
  mergeGraphs,
  toMarkdown,
  textComparison,
  validateComparison,
  buildStudyOutline,
} = ScriptureGraphUtils;
// Find an HTML element by its id. This keeps repeated DOM lookups short.
function getElement(id) {
  return document.getElementById(id);
}
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c],
  );
// These values change as the user searches and selects passages.
let cy = null; // The Cytoscape graph currently shown on screen.
let currentData = null; // The passages and relationships from the latest search.
let selectedPassage = null; // The passage the user can save.
let pendingSave = null;
let requestNumber = 0;
let activeController = null;
let lastSearch = null;
const cache = new Map();
const insightsCache = new Map();
let currentReport = null;
let insightsController = null;
let backgroundController = null;
// -----------------------------------------------------------------------------
// 2. NOTEBOOK STORAGE: LOAD AND SAVE
// -----------------------------------------------------------------------------

// Notebook data belongs to this browser, not the Flask server. Keep the v1 key
// so the redesigned folders can still open earlier saved studies.
const STORAGE_KEY = "scripture-graph-notebook-v1";
let notebook = {
  version: 1,
  trash: [],
  collections: [{ id: "default", name: "My study", entries: [] }],
};
// A saved passage needs these strings so the notebook can display and export it.
function isValidSavedPassage(passage) {
  if (!passage || typeof passage !== "object") {
    return false;
  }
  const requiredFields = ["id", "reference", "text", "source", "query", "note"];
  return requiredFields.every((field) => typeof passage[field] === "string");
}

function isValidSavedFolder(folder) {
  if (!folder || typeof folder !== "object") {
    return false;
  }
  return (
    typeof folder.id === "string" &&
    typeof folder.name === "string" &&
    Array.isArray(folder.entries) &&
    folder.entries.every(isValidSavedPassage)
  );
}

// Old folders can have no outline. This check only runs when an outline exists.
function isValidSavedOutline(outline) {
  if (!outline || typeof outline.overview !== "string") {
    return false;
  }
  if (
    !Array.isArray(outline.similarities) ||
    !Array.isArray(outline.differences) ||
    !Array.isArray(outline.study_questions)
  ) {
    return false;
  }
  if (
    !outline.study_questions.every((question) => typeof question === "string")
  ) {
    return false;
  }
  const findings = [...outline.similarities, ...outline.differences];
  return findings.every(
    (finding) =>
      finding &&
      typeof finding.title === "string" &&
      Array.isArray(finding.left_refs) &&
      Array.isArray(finding.right_refs),
  );
}

// Read once at startup. If storage is unavailable, the default folder still works
// for this visit. We leave unreadable stored data alone instead of deleting it.
function loadNotebook() {
  try {
    const savedNotebook = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "null",
    );
    if (!savedNotebook) {
      return;
    }
    const validFolders =
      Array.isArray(savedNotebook.collections) &&
      savedNotebook.collections.length > 0 &&
      savedNotebook.collections.every(isValidSavedFolder);
    if (savedNotebook.version !== 1 || !validFolders) {
      throw new Error("Invalid stored notebook");
    }

    // Earlier versions did not have Recently deleted. Give them an empty list.
    savedNotebook.trash = Array.isArray(savedNotebook.trash)
      ? savedNotebook.trash.filter(isValidSavedFolder)
      : [];
    const allFolders = [...savedNotebook.collections, ...savedNotebook.trash];
    for (const folder of allFolders) {
      if (folder.outline && !isValidSavedOutline(folder.outline)) {
        delete folder.outline;
      }
    }
    notebook = savedNotebook;
  } catch (error) {
    getElement("storageMessage").textContent =
      "Saved data could not be read. Export this session before closing it.";
  }
}
loadNotebook();

// Save a snapshot of folders, notes, and Recently deleted, then refresh counts.
function persistNotebook() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notebook));
    getElement("storageMessage").textContent = "Saved in this browser.";
    updateNotebookCounts();
    return true;
  } catch (_) {
    getElement("storageMessage").textContent =
      "Browser storage is unavailable or full. Your changes are kept for this session; export a backup.";
    return false;
  }
}
// -----------------------------------------------------------------------------
// 3. SEARCH REQUESTS AND STATUS
// -----------------------------------------------------------------------------

function status(message) {
  getElement("apiStatus").textContent = message;
  getElement("footerMessage").textContent = message;
}
function clearInspector() {
  selectedPassage = null;
  getElement("detailType").textContent = "NO SELECTION";
  getElement("detailLabel").textContent = "Select a passage";
  getElement("detailSummary").textContent =
    "Select a graph node or a supporting passage.";
  getElement("verseText").textContent = "";
  getElement("verseText").classList.add("hidden");
  getElement("detailMeta").replaceChildren();
  getElement("connectionList").replaceChildren();
  getElement("connectionCount").textContent = "—";
  getElement("detailMore").classList.add("hidden");
  getElement("detailMore").open = false;
  getElement("inspectorConnectionsTitle").textContent = "CONNECTIONS";
  getElement("saveControls").classList.add("hidden");
  getElement("saveMessage").textContent = "";
}
// Return a cached graph copy when possible; validate new JSON before rendering it.
async function fetchGraph(query, signal) {
  if (cache.has(query)) return structuredClone(cache.get(query));
  const response = await fetch(
    `${API_BASE}/explore?fast=1&q=${encodeURIComponent(query)}`,
    { signal },
  );
  let data;
  try {
    data = await response.json();
  } catch (_) {
    throw new Error(
      "The service returned an unreadable response. Please retry.",
    );
  }
  if (!response.ok)
    throw new Error(
      data.error || "The service could not complete this search. Please retry.",
    );
  validateGraph(data);
  data.query = query;
  cache.set(query, structuredClone(data));
  if (cache.size > 20) cache.delete(cache.keys().next().value);
  return data;
}
// Each search has a number. Background responses check it before changing the UI,
// so a slow older request cannot overwrite a newer search.
async function runSearch(
  left = getElement("searchInput").value,
  right = getElement("compareInput").value,
) {
  left = left.trim();
  right = right.trim();
  if (!left) {
    getElement("searchInput").focus();
    return;
  }
  if (left.length > 300 || right.length > 300) {
    showError("Keep each search under 300 characters.");
    return;
  }
  activeController?.abort();
  insightsController?.abort();
  backgroundController?.abort();
  currentReport = null;
  getElement("comparisonInsights").classList.add("hidden");
  const controller = new AbortController();
  activeController = controller;
  const started = performance.now();
  const number = ++requestNumber;
  lastSearch = [left, right];
  let timedOut = false;
  // A single overall deadline includes backend wake-up and both comparison searches.
  const deadline = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 150000);
  const slowNotice = setTimeout(() => {
    if (number === requestNumber)
      getElement("loadingMessage").textContent =
        "Still working. The backend may be waking up; you can cancel and retry.";
  }, 12000);
  getElement("errorBanner").classList.add("hidden");
  clearInspector();
  getElement("loadingMessage").textContent = right
    ? "RETRIEVING TWO SEARCHES"
    : "RETRIEVING + ORGANIZING SCRIPTURE";
  getElement("loadingState").classList.remove("hidden");
  getElement("cy").setAttribute("aria-busy", "true");
  status("SEARCHING");
  try {
    // Retrieve both sides together; each backend retrieval batches passage requests.
    let first, second;
    if (right)
      [first, second] = await Promise.all([
        fetchGraph(left, controller.signal),
        fetchGraph(right, controller.signal),
      ]);
    else first = await fetchGraph(left, controller.signal);
    const result = right ? mergeGraphs(first, second) : first;
    if (number !== requestNumber) return;
    if (typeof cytoscape !== "function")
      throw new Error(
        "The graph library could not load. Check your connection and refresh.",
      );
    renderGraph(result);
    currentData = result;
    renderFilters(result);
    renderComparison(result);
    getElement("sourceList").innerHTML = (result.sources || [])
      .map((s) => `<div class="source-item">${escapeHtml(s)}</div>`)
      .join("");
    getElement("nodeCount").textContent = result.nodes.length;
    getElement("edgeCount").textContent = result.edges.length;
    getElement("queryType").textContent = result.queryType;
    getElement("emptyState").classList.add("hidden");
    showNodeDetails(cy.getElementById(result.center));
    status(`LOADED · ${((performance.now() - started) / 1000).toFixed(1)}s`);
    if (right) loadComparison(result, number);
    else loadExplanations(left, number);
  } catch (error) {
    if (number !== requestNumber) return;
    controller.abort();
    if (cy) {
      cy.destroy();
      cy = null;
    }
    currentData = null;
    getElement("filterList").replaceChildren();
    getElement("comparisonPanel").classList.add("hidden");
    getElement("comparisonInsights").classList.add("hidden");
    getElement("sourceList").textContent = "No graph loaded.";
    getElement("nodeCount").textContent = "0";
    getElement("edgeCount").textContent = "0";
    getElement("queryType").textContent = "—";
    clearInspector();
    getElement("emptyState").classList.remove("hidden");
    if (error.name === "AbortError" && !timedOut) status("SEARCH CANCELLED");
    else {
      showError(
        timedOut
          ? "This search took too long. The backend may be starting or busy. Please retry."
          : error.message,
      );
      status("SEARCH FAILED");
    }
  } finally {
    clearTimeout(deadline);
    clearTimeout(slowNotice);
    if (number === requestNumber) {
      getElement("loadingState").classList.add("hidden");
      getElement("cy").setAttribute("aria-busy", "false");
      activeController = null;
    }
  }
}
function showError(message) {
  getElement("errorMessage").textContent = message;
  getElement("errorBanner").classList.remove("hidden");
}
// -----------------------------------------------------------------------------
// 4. GRAPH DISPLAY AND PASSAGE SELECTION
// -----------------------------------------------------------------------------

// Cytoscape draws the network. Node/edge data determine its colors and styles.
// A yellow thematic edge has its own click handler, separate from selecting a verse.
function renderGraph(data) {
  cy?.destroy();
  cy = cytoscape({
    container: getElement("cy"),
    elements: [...data.nodes, ...data.edges],
    minZoom: 0.08,
    maxZoom: 3,
    style: [
      {
        selector: "node",
        style: {
          "background-color": "#dce6ed",
          label: "data(label)",
          color: "#d4dde2",
          "font-size": 11,
          "text-valign": "bottom",
          "text-margin-y": 8,
          width: 26,
          height: 26,
          "border-width": 1,
          "border-color": "#75828b",
          "text-wrap": "wrap",
          "text-max-width": 120,
        },
      },
      {
        selector: 'node[type="person"]',
        style: { shape: "round-rectangle", "background-color": "#9eb6c7" },
      },
      {
        selector: 'node[type="place"]',
        style: { shape: "triangle", "background-color": "#9db8a8" },
      },
      {
        selector: 'node[type="event"], node[type="subtheme"]',
        style: { shape: "hexagon", width: 35, height: 35 },
      },
      {
        selector: 'node[type="topic"]',
        style: { shape: "diamond", width: 44, height: 44 },
      },
      {
        selector: 'node[membership="left"]',
        style: { "background-color": "#83b9ed" },
      },
      {
        selector: 'node[membership="right"]',
        style: { "background-color": "#d9a5df" },
      },
      {
        selector: 'node[membership="shared"]',
        style: {
          "background-color": "#f1cf75",
          "border-color": "#fff0bf",
          "border-width": 3,
        },
      },
      {
        selector: "node[?isCenter]",
        style: { width: 46, height: 46, "border-width": 3 },
      },
      {
        selector: "edge",
        style: {
          width: 1.3,
          "line-color": "#6f7c86",
          "curve-style": "bezier",
          opacity: 0.7,
        },
      },
      {
        selector: 'edge[type="cross-reference"]',
        style: { "line-style": "solid" },
      },
      {
        selector: 'edge[type="context"], edge[type="reference"]',
        style: { "line-style": "dashed" },
      },
      {
        selector:
          'edge[type="topic"], edge[type="topic-match"], edge[type="direct-match"]',
        style: { "line-style": "dotted" },
      },
      { selector: "edge[searchSide=0]", style: { "line-color": "#83b9ed" } },
      { selector: "edge[searchSide=1]", style: { "line-color": "#d9a5df" } },
      {
        selector: 'edge[type="theme-bridge"]',
        style: {
          "line-color": "#f1cf75",
          "line-style": "dashed",
          width: 2.5,
          opacity: 0.9,
        },
      },
      { selector: ".faded", style: { opacity: 0.16 } },
      {
        selector: ".focused",
        style: { "border-width": 4, "border-color": "white" },
      },
    ],
    layout: {
      name: "cose",
      animate: false,
      padding: 70,
      nodeRepulsion: 180000,
      idealEdgeLength: 115,
      numIter: 1000,
    },
  });
  cy.on("tap", "node", (event) => selectNode(event.target));
  cy.on("tap", 'edge[type="theme-bridge"]', (event) =>
    showThematicConnection(event.target),
  );
  cy.on("tap", (event) => {
    if (event.target === cy) cy.elements().removeClass("faded focused");
  });
  fitGraph();
}
function fitGraph() {
  if (cy && cy.elements(":visible").length) {
    cy.resize();
    cy.fit(cy.elements(":visible"), 65);
  }
}
function selectNode(node) {
  if (!node?.length) return;
  cy.elements().removeClass("faded focused");
  cy.elements().not(node.closedNeighborhood()).addClass("faded");
  node.addClass("focused");
  showNodeDetails(node);
}
// Reset the inspector before showing a node. A verse exposes the save controls;
// non-verse nodes keep those controls hidden so we cannot save the wrong item.
function showNodeDetails(node) {
  if (!node?.length) return;
  clearInspector();
  const d = node.data();
  getElement("detailType").textContent =
    `${d.type.toUpperCase()}${d.membership ? " / " + d.membership.toUpperCase() : ""}`;
  getElement("detailLabel").textContent = d.label;
  const evidence = d.evidence || [d];
  const summary = evidence
    .map(
      (e) =>
        `${e.query ? e.query + ": " : ""}${e.summary || "Retrieved passage."}`,
    )
    .join("\n\n");
  getElement("detailSummary").textContent =
    summary.length > 240 ? summary.slice(0, 240) + "…" : summary;
  getElement("detailFullSummary").textContent = summary;
  getElement("detailMore").classList.toggle("hidden", summary.length <= 240);
  if (d.type === "verse" && d.text) {
    getElement("verseText").textContent = d.text;
    getElement("verseText").classList.remove("hidden");
    selectedPassage = {
      id: d.reference || d.label,
      reference: d.reference || d.label,
      text: d.text,
      source: d.sourceName || "Berean Standard Bible",
      query: currentData?.query || "",
      note: "",
    };
    getElement("saveControls").classList.remove("hidden");
    updatePassageSavePreview();
  }
  const meta = [
    ["SOURCE", d.sourceName],
    ["REFERENCE", d.reference],
    ["SEARCH", d.membership],
    [
      "EXPLANATIONS",
      "Summaries and connection explanations may be AI-generated.",
    ],
  ];
  getElement("detailMeta").innerHTML = meta
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<div class="meta-row"><span class="meta-label">${escapeHtml(k)}</span><span class="meta-value">${escapeHtml(v)}</span></div>`,
    )
    .join("");
  const connections = node.connectedEdges().filter((e) => e.visible());
  getElement("connectionCount").textContent = connections.length;
  connections.forEach((edge) => {
    const other =
      edge.source().id() === node.id() ? edge.target() : edge.source();
    const e = edge.data();
    const button = document.createElement("button");
    button.className = "connection-item";
    button.innerHTML = `<div class="connection-target">${escapeHtml(other.data("label"))}</div><div class="connection-label">${escapeHtml(e.query ? e.query + " / " : "")}${escapeHtml(e.label)}</div>${e.explanation ? `<div class="connection-explanation">${e.interpretationMethod === "text" ? "Text-based connection" : "AI explanation"}: ${escapeHtml(e.explanation)}</div>` : ""}`;
    button.addEventListener("click", () =>
      e.type === "theme-bridge"
        ? showThematicConnection(edge)
        : selectNode(other),
    );
    getElement("connectionList").append(button);
  });
  if (!connections.length)
    getElement("connectionList").textContent = "No visible connections.";
}
// Count actual thematic edges, rather than confusing them with identical verses.
function updateThematicStats() {
  if (!cy || !currentData?.comparison) return;
  const links = cy.edges('[type="theme-bridge"]');
  const visible = links.filter((e) => e.visible()).length;
  getElement("thematicStats").textContent =
    `${links.length} thematic ${links.length === 1 ? "connection" : "connections"}${visible !== links.length ? ` · ${visible} visible` : ""}`;
  getElement("thematicList").replaceChildren();
  links.forEach((link) => {
    const button = document.createElement("button");
    button.className = "thematic-choice";
    button.textContent = link.data("label");
    button.addEventListener("click", () => showThematicConnection(link));
    getElement("thematicList").append(button);
  });
}
// Both sidebar titles and yellow-line clicks use this same explanation view.
// Explain the relation first; full verse readings stay collapsed until requested.
function showThematicConnection(link) {
  if (!link?.length) return;
  getElement("themeLinks").checked = true;
  getElement("filterList")
    .querySelectorAll("input")
    .forEach((i) => {
      if (i.value === "verse") i.checked = true;
    });
  applyFilters();
  const a = link.source(),
    b = link.target(),
    d = link.data();
  cy.elements().removeClass("faded focused");
  cy.elements().not(a.union(b).union(link)).addClass("faded");
  a.union(b).addClass("focused");
  cy.fit(a.union(b).union(link), 75);
  clearInspector();
  getElement("detailType").textContent = "WHY THESE PASSAGES CONNECT";
  getElement("detailLabel").textContent = d.label;
  getElement("detailSummary").textContent = d.explanation;
  getElement("detailMeta").textContent =
    d.interpretationMethod === "text"
      ? "Word-match preview; AI interpretation is still separate."
      : "AI interpretation of the retrieved passages.";
  getElement("inspectorConnectionsTitle").textContent = "SUPPORTING PASSAGES";
  getElement("connectionCount").textContent = "2";
  [
    [a, "A", d.leftFocus],
    [b, "B", d.rightFocus],
  ].forEach(([n, side, focus]) => {
    const section = document.createElement("section");
    section.className = "connection-evidence";
    const heading = document.createElement("h3");
    heading.textContent = `${side} · ${n.data("label")}`;
    section.append(heading);
    if (focus) {
      const reason = document.createElement("p");
      reason.textContent = focus;
      section.append(reason);
    }
    const reading = document.createElement("details"),
      label = document.createElement("summary"),
      quote = document.createElement("p");
    label.textContent = "Read this passage";
    quote.textContent = n.data("text");
    reading.append(label, quote);
    section.append(reading);
    const open = document.createElement("button");
    open.textContent = `Open ${n.data("label")}`;
    open.addEventListener("click", () => selectNode(n));
    section.append(open);
    getElement("connectionList").append(section);
  });
}
function renderFilters(data) {
  const counts = {};
  data.nodes.forEach((n) => {
    counts[n.data.type] = (counts[n.data.type] || 0) + 1;
  });
  getElement("filterList").innerHTML = Object.entries(counts)
    .map(
      ([type, count]) =>
        `<label class="filter-row"><input type="checkbox" value="${escapeHtml(type)}" checked /><span>${escapeHtml(type)}</span><span>${count}</span></label>`,
    )
    .join("");
  getElement("filterList")
    .querySelectorAll("input")
    .forEach((input) => input.addEventListener("change", applyFilters));
}
function renderComparison(data) {
  getElement("comparisonPanel").classList.toggle("hidden", !data.comparison);
  getElement("themeLinksControl").classList.toggle("hidden", !data.comparison);
  if (!data.comparison) return;
  const c = data.comparison;
  getElement("comparisonStats").innerHTML =
    `<div class="comparison-key left-key">A: ${escapeHtml(c.left)} · ${c.leftOnly + c.shared} passages</div><div class="comparison-key right-key">B: ${escapeHtml(c.right)} · ${c.rightOnly + c.shared} passages</div>`;
}
function applyFilters() {
  if (!cy) return;
  const types = [
    ...getElement("filterList").querySelectorAll("input:checked"),
  ].map((i) => i.value);
  cy.nodes().forEach((n) =>
    n.style("display", types.includes(n.data("type")) ? "element" : "none"),
  );
  cy.edges().forEach((e) =>
    e.style(
      "display",
      e.source().visible() &&
        e.target().visible() &&
        (e.data("type") !== "theme-bridge" || getElement("themeLinks").checked)
        ? "element"
        : "none",
    ),
  );
  cy.elements().removeClass("faded focused");
  clearInspector();
  fitGraph();
  updateThematicStats();
  getElement("footerMessage").textContent =
    `${cy.nodes(":visible").length} visible nodes`;
}
// -----------------------------------------------------------------------------
// 5. NOTEBOOK DISPLAY: FOLDERS, OUTLINES, AND NOTES
// -----------------------------------------------------------------------------

// "Collection" is the storage name for a notebook folder. This fallback ensures
// the UI always has a valid folder even after the previously selected one is deleted.
// The page says "folder"; older saved data calls the same object a "collection".
function chosenCollection() {
  return (
    notebook.collections.find((c) => c.id === notebook.activeCollectionId) ||
    notebook.collections[0]
  );
}
function renderCollectionOptions() {
  const previous = getElement("saveCollection").value;
  getElement("saveCollection").innerHTML = notebook.collections
    .map(
      (c) =>
        `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`,
    )
    .join("");
  if (notebook.collections.some((c) => c.id === previous))
    getElement("saveCollection").value = previous;
  updateNotebookCounts();
  updatePassageSavePreview();
}
// Refresh counts without rebuilding passage cards. Rebuilding a textarea on
// every keystroke would move the cursor while the user is writing a note.
function updateNotebookCounts() {
  let passageCount = 0;
  for (const folder of notebook.collections) {
    passageCount += folder.entries.length;
  }
  const folderCount = notebook.collections.length;
  const folderWord = folderCount === 1 ? "folder" : "folders";
  const passageWord = passageCount === 1 ? "passage" : "passages";
  getElement("notebookHomeCount").textContent =
    `${folderCount} ${folderWord} · ${passageCount} saved ${passageWord}`;
  getElement("folderCount").textContent = folderCount;
  renderFolderList();
  renderDeletedFolders();
  renderFolderSummary();
}

// Each folder button opens that folder. aria-current marks the selected button
// for screen readers as well as the active-folder styling.
function renderFolderList() {
  const folderList = getElement("folderList");
  folderList.replaceChildren();
  const activeFolder = chosenCollection();
  for (const folder of notebook.collections) {
    const button = document.createElement("button");
    button.className = "notebook-folder";
    button.setAttribute("aria-current", String(folder.id === activeFolder.id));
    const title = document.createElement("span");
    title.textContent = `▱ ${folder.name}`;
    const count = document.createElement("small");
    const passageWord = folder.entries.length === 1 ? "passage" : "passages";
    count.textContent = `${folder.entries.length} ${passageWord}`;
    if (folder.outline) {
      count.textContent += " · study outline";
    }
    button.append(title, count);
    button.addEventListener("click", () => openNotebook(folder.id));
    folderList.append(button);
  }
}

function renderDeletedFolders() {
  getElement("deletedFoldersTitle").textContent =
    `Recently deleted (${notebook.trash.length})`;
  const deletedList = getElement("deletedFolderList");
  deletedList.replaceChildren();
  if (notebook.trash.length === 0) {
    deletedList.textContent = "Deleted folders can be restored here.";
    return;
  }
  for (const folder of notebook.trash) {
    const row = document.createElement("div");
    row.className = "deleted-folder";
    const name = document.createElement("p");
    name.textContent = `${folder.name} · ${folder.entries.length} passages`;
    const restoreButton = document.createElement("button");
    restoreButton.textContent = `Restore ${folder.name}`;
    restoreButton.addEventListener("click", () => restoreFolder(folder.id));
    row.append(name, restoreButton);
    deletedList.append(row);
  }
}

function renderFolderSummary() {
  const folder = chosenCollection();
  const passageCount = folder.entries.length;
  const noteCount = folder.entries.filter((passage) =>
    passage.note.trim(),
  ).length;
  const passageWord = passageCount === 1 ? "passage" : "passages";
  const noteWord = noteCount === 1 ? "note" : "notes";
  let summary = `${passageCount} saved ${passageWord} · ${noteCount} ${noteWord}`;
  if (folder.outline) {
    summary += " · 1 study outline";
  }
  getElement("folderSummary").textContent = summary;
}

function openNotebook(id) {
  if (id && notebook.collections.some((c) => c.id === id)) {
    notebook.activeCollectionId = id;
    persistNotebook();
  }
  getElement("saveCollection").value = chosenCollection().id;
  getElement("notebookSearch").value = "";
  getElement("renameFolderForm").classList.add("hidden");
  getElement("deleteFolderConfirm").classList.add("hidden");
  renderNotebook();
  if (!getElement("notebookDialog").open)
    getElement("notebookDialog").showModal();
}
// This function is the notebook's main display step. It chooses which data to
// show; the smaller functions below build the outline, empty state, and cards.
function renderNotebook() {
  const folder = chosenCollection();
  const entryList = getElement("notebookEntries");
  const search = getElement("notebookSearch").value.trim().toLowerCase();

  updateNotebookCounts();
  getElement("folderTitle").textContent = folder.name;
  getElement("folderBreadcrumb").textContent = folder.name;
  entryList.replaceChildren();
  getElement("exportButton").disabled =
    !folder.entries.length && !folder.outline;

  // Search only changes what is visible. It never deletes saved passages or
  // changes the complete folder that the Export button downloads.
  if (folder.outline && !search) {
    entryList.append(createSavedOutline(folder.outline));
  }
  const matchingPassages = folder.entries.filter((passage) => {
    const searchableText = `${passage.reference} ${passage.text} ${passage.note}`;
    return searchableText.toLowerCase().includes(search);
  });
  if (matchingPassages.length === 0) {
    entryList.append(createNotebookEmptyState(folder, search));
    return;
  }
  for (const passage of matchingPassages) {
    entryList.append(createSavedPassageCard(folder, passage));
  }
}

// textContent displays user notes and AI text as plain text, not executable HTML.
function createNotebookEmptyState(folder, search) {
  const emptyState = document.createElement("div");
  emptyState.className = "notebook-empty";
  const title = document.createElement("h4");
  const instructions = document.createElement("p");
  if (search) {
    title.textContent = "No matching passages";
    instructions.textContent =
      "Try a verse reference or a word from your notes.";
  } else {
    title.textContent = `No saved passages in “${folder.name}” yet`;
    instructions.textContent = `To add a verse, select it in the graph and choose Review & save passage. Pick “${folder.name}” in the save window, then confirm. Your verse and notes will appear here. Use Review & save study to keep a whole comparison.`;
  }
  emptyState.append(title, instructions);
  return emptyState;
}

// A saved comparison has its own collapsible section above the passage cards.
function createSavedOutline(savedOutline) {
  const outline = document.createElement("details");
  outline.className = "notebook-outline";
  const heading = document.createElement("summary");
  heading.textContent = "Saved comparison outline";
  const overview = document.createElement("p");
  overview.textContent = savedOutline.overview;
  const method = document.createElement("p");
  method.className = "help-text";
  method.textContent =
    savedOutline.method === "ai"
      ? "AI interpretation with supporting passages."
      : "Text-based study preview.";
  outline.append(heading, overview, method);

  const findings = [...savedOutline.similarities, ...savedOutline.differences];
  for (const finding of findings) {
    outline.append(createSavedFinding(finding));
  }
  const questionHeading = document.createElement("h4");
  questionHeading.textContent = "Study questions";
  const questionList = document.createElement("ol");
  for (const question of savedOutline.study_questions) {
    const listItem = document.createElement("li");
    listItem.textContent = question;
    questionList.append(listItem);
  }
  outline.append(questionHeading, questionList);
  return outline;
}

function createSavedFinding(finding) {
  const details = document.createElement("details");
  const title = document.createElement("summary");
  title.textContent = finding.title;
  const explanation = document.createElement("p");
  explanation.textContent =
    finding.explanation || `A: ${finding.left_focus} B: ${finding.right_focus}`;
  const references = document.createElement("p");
  references.className = "help-text";
  references.textContent = `A: ${finding.left_refs.join(", ")} · B: ${finding.right_refs.join(", ")}`;
  details.append(title, explanation, references);
  return details;
}

function createSavedPassageCard(folder, passage) {
  const card = document.createElement("details");
  card.className = "saved-entry";

  // The closed card shows its verse reference and whether it has a note.
  const heading = document.createElement("summary");
  const reference = document.createElement("span");
  reference.textContent = passage.reference;
  const noteBadge = document.createElement("small");
  noteBadge.textContent = passage.note.trim() ? "Has a note" : "Add a note";
  heading.append(reference, noteBadge);
  const quotation = document.createElement("blockquote");
  quotation.textContent = passage.text;

  // Keep extra source information collapsed so the notebook is less crowded.
  const sourceDetails = document.createElement("details");
  sourceDetails.className = "saved-source";
  const sourceHeading = document.createElement("summary");
  sourceHeading.textContent = "Source & original search";
  const sourceText = document.createElement("p");
  sourceText.textContent = `${passage.source} · ${passage.query}`;
  sourceDetails.append(sourceHeading, sourceText);

  const noteLabel = document.createElement("label");
  noteLabel.textContent = "Your notes";
  const noteInput = document.createElement("textarea");
  noteInput.value = passage.note;
  noteInput.maxLength = 10000;
  noteInput.rows = 3;
  noteInput.placeholder = "What stands out to you in this passage?";
  noteLabel.append(noteInput);

  // Update the existing passage object and save after each edit. Do not rebuild
  // the whole card here: the user should keep their place in the textarea.
  noteInput.addEventListener("input", () => {
    passage.note = noteInput.value;
    noteBadge.textContent = passage.note.trim() ? "Has a note" : "Add a note";
    persistNotebook();
  });
  const removeButton = document.createElement("button");
  removeButton.className = "remove-passage";
  removeButton.textContent = "Remove from folder";
  removeButton.addEventListener("click", () => {
    folder.entries = folder.entries.filter(
      (savedPassage) => savedPassage !== passage,
    );
    persistNotebook();
    renderNotebook();
  });
  card.append(heading, quotation, sourceDetails, noteLabel, removeButton);
  return card;
}

// -----------------------------------------------------------------------------
// 6. SEARCH BUTTONS AND NOTEBOOK FOLDER ACTIONS
// -----------------------------------------------------------------------------

getElement("searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch();
});
getElement("cancelButton").addEventListener("click", () =>
  activeController?.abort(),
);
getElement("retryButton").addEventListener("click", () => {
  if (lastSearch) runSearch(...lastSearch);
});
getElement("fitButton").addEventListener("click", fitGraph);
getElement("resetButton").addEventListener("click", () => {
  if (!cy) return;
  getElement("filterList")
    .querySelectorAll("input")
    .forEach((i) => (i.checked = true));
  applyFilters();
  showNodeDetails(cy.getElementById(currentData.center));
});
document.querySelectorAll("[data-query]").forEach((button) =>
  button.addEventListener("click", () => {
    getElement("searchInput").value = button.dataset.query;
    getElement("compareInput").value = button.dataset.compare || "";
    runSearch();
  }),
);
getElement("notebookButton").addEventListener("click", () => openNotebook());
getElement("notebookHomeButton").addEventListener("click", () =>
  openNotebook(),
);
getElement("notebookSearch").addEventListener("input", renderNotebook);
getElement("closeNotebook").addEventListener("click", () =>
  getElement("notebookDialog").close(),
);
// Create a folder or open the existing one if that name is already in use.
function createNotebookFolder(event) {
  event.preventDefault();
  const name = getElement("collectionName").value.trim();
  if (!name) return;
  const existing = notebook.collections.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) {
    openNotebook(existing.id);
    getElement("storageMessage").textContent =
      "Opened the existing folder with that name.";
    return;
  }
  const collection = { id: crypto.randomUUID(), name, entries: [] };
  notebook.collections.push(collection);
  persistNotebook();
  renderCollectionOptions();
  getElement("saveCollection").value = collection.id;
  getElement("collectionName").value = "";
  openNotebook(collection.id);
}
getElement("collectionForm").addEventListener("submit", createNotebookFolder);
getElement("renameFolderButton").addEventListener("click", () => {
  getElement("renameFolderName").value = chosenCollection().name;
  getElement("renameFolderForm").classList.remove("hidden");
  getElement("renameFolderName").focus();
});
getElement("cancelRenameButton").addEventListener("click", () =>
  getElement("renameFolderForm").classList.add("hidden"),
);
// Change only the name. The folder id and its saved passages stay the same.
function renameNotebookFolder(event) {
  event.preventDefault();
  const name = getElement("renameFolderName").value.trim(),
    collection = chosenCollection();
  if (!name) return;
  if (
    notebook.collections.some(
      (c) =>
        c.id !== collection.id && c.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    getElement("storageMessage").textContent =
      "Another folder already has that name.";
    return;
  }
  collection.name = name;
  persistNotebook();
  renderCollectionOptions();
  renderNotebook();
  getElement("renameFolderForm").classList.add("hidden");
}
getElement("renameFolderForm").addEventListener("submit", renameNotebookFolder);
// -----------------------------------------------------------------------------
// 7. NOTEBOOK SAVE REVIEW, DELETE, RESTORE, AND EXPORT
// -----------------------------------------------------------------------------

function updatePassageSavePreview() {
  if (!selectedPassage) return;
  const folder =
    notebook.collections.find(
      (c) => c.id === getElement("saveCollection").value,
    ) || chosenCollection();
  getElement("savePassageTitle").textContent =
    `Saving: ${selectedPassage.reference}`;
  getElement("saveDestination").textContent = `My notebook / ${folder.name}`;
}
function updateSaveReview() {
  const creating = getElement("saveReviewFolder").value === "__new__";
  getElement("saveNewFolderFields").classList.toggle("hidden", !creating);
  getElement("saveNewFolderName").required = creating;
  const folder = notebook.collections.find(
    (c) => c.id === getElement("saveReviewFolder").value,
  );
  const name = creating
    ? getElement("saveNewFolderName").value.trim() || "New folder"
    : folder?.name;
  getElement("saveReviewDestination").textContent =
    `Destination: My notebook / ${name}`;
  getElement("confirmSaveReview").textContent = creating
    ? "Create folder & save"
    : `Save to ${name}`;
  // Warn about an outline update or duplicate passage before the user confirms.
  let notice = "";
  if (pendingSave?.kind === "outline" && folder?.outline) {
    notice =
      "This updates this folder’s saved comparison outline. Existing passage notes are kept.";
  } else if (pendingSave?.kind === "passage" && folder) {
    const alreadySaved = folder.entries.some(
      (passage) => passage.id === pendingSave.passage.id,
    );
    if (alreadySaved) {
      notice =
        "This passage is already in this folder; its notes will be kept.";
    }
  }
  getElement("saveReviewNotice").textContent = notice;
  getElement("saveReviewError").textContent = "";
}
// Snapshot the chosen passage/report when opening the review. Later AI updates
// must not silently change what the user is about to save. Cancel makes no edits.
function reviewSave(kind) {
  if (
    (kind === "passage" && !selectedPassage) ||
    (kind === "outline" && (!currentReport || !currentData?.comparison))
  )
    return;
  pendingSave =
    kind === "passage"
      ? { kind, passage: structuredClone(selectedPassage) }
      : { kind, study: buildStudyOutline(currentData, currentReport) };
  getElement("saveReviewFolder").innerHTML =
    notebook.collections
      .map(
        (c) =>
          `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`,
      )
      .join("") + '<option value="__new__">+ Create a new folder</option>';
  getElement("saveReviewFolder").value =
    kind === "outline" ? "__new__" : getElement("saveCollection").value;
  getElement("saveNewFolderName").value =
    kind === "outline" ? pendingSave.study.name : "";
  getElement("saveReviewTitle").textContent =
    kind === "passage" ? "Save this passage" : "Save this study";
  getElement("saveReviewItem").textContent =
    kind === "passage" ? pendingSave.passage.reference : pendingSave.study.name;
  getElement("saveReviewContents").textContent =
    kind === "passage"
      ? "Includes this verse’s text and the search it came from. Add personal notes in your notebook."
      : `${pendingSave.study.entries.length} supporting passages, similarities and differences, and study questions. ${pendingSave.study.outline.method === "ai" ? "Includes AI interpretation." : "This is a text-based preview."}`;
  getElement("saveReviewPreview").textContent =
    kind === "passage"
      ? pendingSave.passage.text
      : pendingSave.study.outline.overview;
  updateSaveReview();
  getElement("saveReviewDialog").showModal();
}
getElement("saveCollection").addEventListener("change", () => {
  updatePassageSavePreview();
  getElement("saveMessage").textContent = "";
});
getElement("saveVerseButton").addEventListener("click", () =>
  reviewSave("passage"),
);
getElement("saveReviewFolder").addEventListener("change", updateSaveReview);
getElement("saveNewFolderName").addEventListener("input", updateSaveReview);
getElement("cancelSaveReview").addEventListener("click", () =>
  getElement("saveReviewDialog").close(),
);
// Confirming is the first point where a review actually changes the notebook.
// Canceling the review leaves folders and passages untouched.
function confirmNotebookSave(event) {
  event.preventDefault();
  if (!pendingSave) return;
  let folder = notebook.collections.find(
    (c) => c.id === getElement("saveReviewFolder").value,
  );
  if (getElement("saveReviewFolder").value === "__new__") {
    const name = getElement("saveNewFolderName").value.trim();
    if (!name) return;
    if (
      notebook.collections.some(
        (c) => c.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      getElement("saveReviewError").textContent =
        "That folder already exists. Choose it above or use another name.";
      return;
    }
    folder = { id: crypto.randomUUID(), name, entries: [] };
    notebook.collections.push(folder);
  }
  if (!folder) return;
  const incoming =
    pendingSave.kind === "passage"
      ? [pendingSave.passage]
      : pendingSave.study.entries;
  // Add missing passages only. A duplicate must not replace someone's notes.
  incoming.forEach((entry) => {
    if (!folder.entries.some((e) => e.id === entry.id))
      folder.entries.push({ ...entry });
  });
  if (pendingSave.kind === "outline")
    folder.outline = pendingSave.study.outline;
  const item =
    pendingSave.kind === "passage"
      ? pendingSave.passage.reference
      : "Study outline and supporting passages";
  notebook.activeCollectionId = folder.id;
  const saved = persistNotebook();
  renderCollectionOptions();
  getElement("saveCollection").value = folder.id;
  updatePassageSavePreview();
  getElement("saveReviewDialog").close();
  pendingSave = null;
  openNotebook(folder.id);
  getElement("storageMessage").textContent = saved
    ? `${item} saved to My notebook / ${folder.name}.`
    : "Saved for this session. Export this folder to keep a backup.";
  getElement("saveMessage").textContent =
    `${item} → My notebook / ${folder.name}`;
}
getElement("saveReviewForm").addEventListener("submit", confirmNotebookSave);
function showFolderDeleteConfirmation() {
  const folder = chosenCollection();
  getElement("deleteFolderSummary").textContent =
    `“${folder.name}” contains ${folder.entries.length} saved passages${folder.outline ? " and a study outline" : ""}. It will move to Recently deleted, where you can restore it.`;
  getElement("deleteFolderConfirm").classList.remove("hidden");
}
getElement("deleteFolderButton").addEventListener(
  "click",
  showFolderDeleteConfirmation,
);
getElement("cancelDeleteFolder").addEventListener("click", () =>
  getElement("deleteFolderConfirm").classList.add("hidden"),
);
// Keep the whole folder in trash so restoring it also restores notes and outlines.
function deleteNotebookFolder() {
  // Move rather than permanently erase: Recently deleted retains the whole folder.
  const folder = chosenCollection();
  notebook.collections = notebook.collections.filter((c) => c.id !== folder.id);
  notebook.trash.push(folder);
  if (!notebook.collections.length)
    notebook.collections.push({
      id: crypto.randomUUID(),
      name: "My study",
      entries: [],
    });
  notebook.activeCollectionId = notebook.collections[0].id;
  persistNotebook();
  renderCollectionOptions();
  openNotebook(notebook.activeCollectionId);
  getElement("storageMessage").textContent =
    `${folder.name} moved to Recently deleted. You can restore it from the folder sidebar.`;
}
getElement("confirmDeleteFolder").addEventListener(
  "click",
  deleteNotebookFolder,
);
// Restore the stored folder object, including its notes and outline. Resolve name
// or ID collisions if a new folder was created while this one was deleted.
function restoreFolder(id) {
  const folder = notebook.trash.find((c) => c.id === id);
  if (!folder) return;
  notebook.trash = notebook.trash.filter((c) => c.id !== id);
  if (notebook.collections.some((c) => c.id === id))
    folder.id = crypto.randomUUID();
  if (notebook.collections.some((c) => c.name === folder.name)) {
    const base = folder.name;
    let count = 1;
    while (notebook.collections.some((c) => c.name === folder.name))
      folder.name = `${base} (restored ${count++})`;
  }
  notebook.collections.push(folder);
  persistNotebook();
  renderCollectionOptions();
  openNotebook(folder.id);
  getElement("storageMessage").textContent =
    `Restored ${folder.name}, including its passages and notes.`;
}
// Export uses the complete folder object, even when its UI search hides some entries.
function exportNotebookFolder() {
  const collection = chosenCollection();
  const blob = new Blob([toMarkdown(collection)], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${collection.name.replace(/[^a-z0-9_-]+/gi, "-") || "study"}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
getElement("exportButton").addEventListener("click", exportNotebookFolder);
renderCollectionOptions();

// -----------------------------------------------------------------------------
// 8. COMPARISON FINDINGS AND BACKGROUND AI REQUESTS
// -----------------------------------------------------------------------------

function findReference(reference, side) {
  return cy
    .nodes()
    .filter(
      (n) =>
        n.data("type") === "verse" &&
        (n.data("reference") || n.data("label")) === reference &&
        (!n.data("evidence") ||
          n.data("evidence").some((e) => e.side === side)),
    )[0];
}
function revealReferences(refs) {
  getElement("filterList")
    .querySelectorAll("input")
    .forEach((i) => {
      if (i.value === "verse") i.checked = true;
    });
  applyFilters();
  const nodes = cy
    .nodes()
    .filter((n) => refs.includes(n.data("reference") || n.data("label")));
  cy.elements().addClass("faded");
  nodes.removeClass("faded").addClass("focused");
  nodes
    .connectedEdges()
    .filter((e) => nodes.contains(e.source()) && nodes.contains(e.target()))
    .removeClass("faded");
  if (nodes.length) {
    cy.fit(nodes, 90);
    showNodeDetails(nodes[0]);
  }
}
function citationButtons(container, references, side) {
  const row = document.createElement("div");
  row.className = "evidence-chips";
  references.forEach((reference) => {
    const button = document.createElement("button");
    button.textContent = `${side === 0 ? "A" : "B"} · ${reference}`;
    button.className = side === 0 ? "left-key" : "right-key";
    button.addEventListener("click", () => {
      revealReferences([reference]);
      const node = findReference(reference, side);
      if (node) selectNode(node);
    });
    row.append(button);
  });
  container.append(row);
}
function renderInsights(report, message, loading = false) {
  currentReport = report;
  getElement("comparisonInsights").setAttribute("aria-busy", String(loading));
  getElement("retryComparisonButton").classList.add("hidden");
  getElement("comparisonInsights").classList.remove("hidden");
  getElement("comparisonOverview").textContent = report.overview;
  getElement("insightsStatus").textContent = message;
  getElement("similarityCards").replaceChildren();
  getElement("differenceCards").replaceChildren();
  for (const [kind, items, id] of [
    ["similarity", report.similarities, "similarityCards"],
    ["difference", report.differences, "differenceCards"],
  ]) {
    items.forEach((item) => {
      const card = document.createElement("details");
      card.className = "insight-card";
      const heading = document.createElement("summary");
      heading.textContent = item.title;
      card.append(heading);
      if (kind === "similarity") {
        const p = document.createElement("p");
        p.textContent = item.explanation;
        card.append(p);
      } else
        for (const [side, text] of [
          [0, item.left_focus],
          [1, item.right_focus],
        ]) {
          const p = document.createElement("p");
          const label = document.createElement("strong");
          label.className = side === 0 ? "left-key" : "right-key";
          label.textContent = `${side === 0 ? "A" : "B"} · ${side === 0 ? currentData.comparison.left : currentData.comparison.right}: `;
          p.append(label, document.createTextNode(text));
          card.append(p);
        }
      citationButtons(card, item.left_refs, 0);
      citationButtons(card, item.right_refs, 1);
      const focus = document.createElement("button");
      focus.className = "focus-evidence";
      focus.textContent =
        kind === "similarity"
          ? "Why are these connected?"
          : "Highlight supporting passages";
      focus.addEventListener("click", () => {
        const connection = cy.getElementById(
          `theme-link-${report.similarities.indexOf(item)}`,
        );
        if (kind === "similarity" && connection.length)
          showThematicConnection(connection);
        else revealReferences([...item.left_refs, ...item.right_refs]);
      });
      card.append(focus);
      getElement(id).append(card);
    });
    if (!items.length) {
      const placeholder = document.createElement("p");
      placeholder.className = loading
        ? "help-text insight-loading"
        : "help-text";
      placeholder.textContent = loading
        ? kind === "similarity"
          ? "Loading similarities…"
          : "Loading differences…"
        : kind === "similarity"
          ? "No supported connection identified in this selection."
          : "No supported difference identified in this selection.";
      getElement(id).append(placeholder);
    }
  }
  getElement("studyQuestions").replaceChildren();
  report.study_questions.forEach((q) => {
    const li = document.createElement("li");
    li.textContent = q;
    getElement("studyQuestions").append(li);
  });
  cy.edges('[type="theme-bridge"]').remove();
  report.similarities.forEach((item, index) => {
    const a = findReference(item.left_refs[0], 0),
      b = findReference(item.right_refs[0], 1);
    if (a && b && a.id() !== b.id())
      cy.add({
        data: {
          id: `theme-link-${index}`,
          source: a.id(),
          target: b.id(),
          type: "theme-bridge",
          interpretationMethod: report.method,
          label: item.title,
          explanation: item.explanation,
          leftFocus: item.left_focus || "",
          rightFocus: item.right_focus || "",
          sourceName:
            report.method === "ai"
              ? "AI-assisted thematic interpretation"
              : "Text-based theme match",
        },
      });
  });
  cy.edges('[type="theme-bridge"]').style(
    "display",
    getElement("themeLinks").checked ? "element" : "none",
  );
  getElement("edgeCount").textContent = cy.edges().length;
  updateThematicStats();
  fitGraph();
}
// Show an explicitly labeled word-match preview while optional AI runs. Only a
// report whose citations belong to the retrieved selections can replace it.
async function loadComparison(data, number) {
  const key = JSON.stringify([data.comparison.left, data.comparison.right]);
  if (insightsCache.has(key)) {
    renderInsights(
      insightsCache.get(key),
      "AI-assisted interpretation · check the supporting passages.",
    );
    return;
  }
  const preview = textComparison(data);
  renderInsights(
    preview,
    "Loading similarities and differences… Any findings below are a text-based preview.",
    true,
  );
  const controller = new AbortController();
  insightsController = controller;
  const timer = setTimeout(() => controller.abort(), 70000);
  try {
    const response = await fetch(`${API_BASE}/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        left: data.comparison.left,
        right: data.comparison.right,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Comparison unavailable");
    const report = validateComparison(await response.json(), data);
    report.method = "ai";
    if (number !== requestNumber) return;
    insightsCache.set(key, report);
    if (insightsCache.size > 20)
      insightsCache.delete(insightsCache.keys().next().value);
    renderInsights(
      report,
      "AI-assisted interpretation · based on retrieved passages, with evidence for each finding.",
    );
  } catch (_) {
    if (number === requestNumber) {
      renderInsights(
        preview,
        "AI comparison could not finish. The findings below use word matches only. Retry for a deeper comparison.",
      );
      getElement("retryComparisonButton").classList.remove("hidden");
    }
  } finally {
    clearTimeout(timer);
    if (insightsController === controller) insightsController = null;
  }
}
// Enrich existing graph text in the background; do not rebuild the graph layout.
async function loadExplanations(query, number) {
  if (cache.get(query)?.enriched) return;
  const controller = new AbortController();
  backgroundController = controller;
  const timer = setTimeout(() => controller.abort(), 70000);
  getElement("footerMessage").textContent =
    "Graph ready · loading AI explanations in the background";
  try {
    const response = await fetch(
      `${API_BASE}/explain?q=${encodeURIComponent(query)}`,
      { signal: controller.signal },
    );
    if (!response.ok) throw new Error("Explanation unavailable");
    const enriched = validateGraph(await response.json());
    if (number !== requestNumber) return;
    enriched.enriched = true;
    cache.set(query, enriched);
    currentData = enriched;
    enriched.nodes.forEach((n) => {
      const node = cy.getElementById(n.data.id);
      if (node.length) node.data("summary", n.data.summary);
    });
    enriched.edges.forEach((e) => {
      const edge = cy.getElementById(e.data.id);
      if (edge.length) edge.data("explanation", e.data.explanation || "");
    });
    const selected =
      cy.nodes(".focused")[0] || cy.getElementById(enriched.center);
    showNodeDetails(selected);
    getElement("footerMessage").textContent = "Graph and explanations ready";
  } catch (_) {
    if (number === requestNumber)
      getElement("footerMessage").textContent =
        "Graph ready · AI explanations unavailable";
  } finally {
    clearTimeout(timer);
    if (backgroundController === controller) backgroundController = null;
  }
}
getElement("retryComparisonButton").addEventListener("click", () => {
  if (currentData?.comparison) loadComparison(currentData, requestNumber);
});
getElement("themeLinks").addEventListener("change", applyFilters);
getElement("toggleInsightsButton").addEventListener("click", () => {
  const collapsed = getElement("insightsBody").classList.toggle("hidden");
  getElement("toggleInsightsButton").textContent = collapsed
    ? "Expand"
    : "Collapse";
  getElement("toggleInsightsButton").setAttribute(
    "aria-expanded",
    String(!collapsed),
  );
  fitGraph();
});
getElement("saveOutlineButton").addEventListener("click", () =>
  reviewSave("outline"),
);
// Start waking the backend while the visitor decides what to search.
fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(90000) }).catch(
  () => {},
);
