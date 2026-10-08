/*
 * Scripture Graph browser controller.
 * Read in this order: configuration/state -> search -> graph selection -> notebook
 * -> save/delete events -> comparison/background explanation requests.
 * Pure data transformations live in graph-utils.js; this file handles the UI.
 */
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
// A small DOM helper: $("folderTitle") means document.getElementById("folderTitle").
const $ = (id) => document.getElementById(id);
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
let cy = null,
  currentData = null,
  selectedPassage = null;
let pendingSave = null;
let requestNumber = 0,
  activeController = null,
  lastSearch = null;
const cache = new Map();
const insightsCache = new Map();
let currentReport = null,
  insightsController = null,
  backgroundController = null;
// Notebook data belongs to this browser, not the Flask server. Keep the v1 key
// so the redesigned folders can still open earlier saved studies.
const STORAGE_KEY = "scripture-graph-notebook-v1";
let notebook = {
  version: 1,
  trash: [],
  collections: [{ id: "default", name: "My study", entries: [] }],
};
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  if (saved) {
    const valid =
      saved.version === 1 &&
      Array.isArray(saved.collections) &&
      saved.collections.length > 0 &&
      saved.collections.every(
        (c) =>
          typeof c.id === "string" &&
          typeof c.name === "string" &&
          Array.isArray(c.entries) &&
          c.entries.every((e) =>
            ["id", "reference", "text", "source", "query", "note"].every(
              (k) => typeof e[k] === "string",
            ),
          ),
      );
    if (!valid) throw new Error("Invalid stored notebook");
    saved.trash = Array.isArray(saved.trash)
      ? saved.trash.filter(
          (c) =>
            typeof c.id === "string" &&
            typeof c.name === "string" &&
            Array.isArray(c.entries) &&
            c.entries.every((e) =>
              ["id", "reference", "text", "source", "query", "note"].every(
                (k) => typeof e[k] === "string",
              ),
            ),
        )
      : [];
    [...saved.collections, ...saved.trash].forEach((c) => {
      const o = c.outline;
      if (
        o &&
        (typeof o.overview !== "string" ||
          !Array.isArray(o.similarities) ||
          !Array.isArray(o.differences) ||
          !Array.isArray(o.study_questions) ||
          !o.study_questions.every((q) => typeof q === "string") ||
          ![...o.similarities, ...o.differences].every(
            (i) =>
              typeof i.title === "string" &&
              Array.isArray(i.left_refs) &&
              Array.isArray(i.right_refs),
          ))
      )
        delete c.outline;
    });
    notebook = saved;
  }
} catch (_) {
  $("storageMessage").textContent =
    "Saved data could not be read. Export this session before closing it.";
}

// Save a snapshot of folders, notes, and Recently deleted, then refresh counts.
function persistNotebook() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notebook));
    $("storageMessage").textContent = "Saved in this browser.";
    updateNotebookCounts();
    return true;
  } catch (_) {
    $("storageMessage").textContent =
      "Browser storage is unavailable or full. Your changes are kept for this session; export a backup.";
    return false;
  }
}
function status(message) {
  $("apiStatus").textContent = message;
  $("footerMessage").textContent = message;
}
function clearInspector() {
  selectedPassage = null;
  $("detailType").textContent = "NO SELECTION";
  $("detailLabel").textContent = "Select a passage";
  $("detailSummary").textContent =
    "Select a graph node or a supporting passage.";
  $("verseText").textContent = "";
  $("verseText").classList.add("hidden");
  $("detailMeta").replaceChildren();
  $("connectionList").replaceChildren();
  $("connectionCount").textContent = "—";
  $("detailMore").classList.add("hidden");
  $("detailMore").open = false;
  $("inspectorConnectionsTitle").textContent = "CONNECTIONS";
  $("saveControls").classList.add("hidden");
  $("saveMessage").textContent = "";
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
  left = $("searchInput").value,
  right = $("compareInput").value,
) {
  left = left.trim();
  right = right.trim();
  if (!left) {
    $("searchInput").focus();
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
  $("comparisonInsights").classList.add("hidden");
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
      $("loadingMessage").textContent =
        "Still working. The backend may be waking up; you can cancel and retry.";
  }, 12000);
  $("errorBanner").classList.add("hidden");
  clearInspector();
  $("loadingMessage").textContent = right
    ? "RETRIEVING TWO SEARCHES"
    : "RETRIEVING + ORGANIZING SCRIPTURE";
  $("loadingState").classList.remove("hidden");
  $("cy").setAttribute("aria-busy", "true");
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
    $("sourceList").innerHTML = (result.sources || [])
      .map((s) => `<div class="source-item">${escapeHtml(s)}</div>`)
      .join("");
    $("nodeCount").textContent = result.nodes.length;
    $("edgeCount").textContent = result.edges.length;
    $("queryType").textContent = result.queryType;
    $("emptyState").classList.add("hidden");
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
    $("filterList").replaceChildren();
    $("comparisonPanel").classList.add("hidden");
    $("comparisonInsights").classList.add("hidden");
    $("sourceList").textContent = "No graph loaded.";
    $("nodeCount").textContent = "0";
    $("edgeCount").textContent = "0";
    $("queryType").textContent = "—";
    clearInspector();
    $("emptyState").classList.remove("hidden");
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
      $("loadingState").classList.add("hidden");
      $("cy").setAttribute("aria-busy", "false");
      activeController = null;
    }
  }
}
function showError(message) {
  $("errorMessage").textContent = message;
  $("errorBanner").classList.remove("hidden");
}
// Cytoscape draws the network. Node/edge data determine its colors and styles.
// A yellow thematic edge has its own click handler, separate from selecting a verse.
function renderGraph(data) {
  cy?.destroy();
  cy = cytoscape({
    container: $("cy"),
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
  $("detailType").textContent =
    `${d.type.toUpperCase()}${d.membership ? " / " + d.membership.toUpperCase() : ""}`;
  $("detailLabel").textContent = d.label;
  const evidence = d.evidence || [d];
  const summary = evidence
    .map(
      (e) =>
        `${e.query ? e.query + ": " : ""}${e.summary || "Retrieved passage."}`,
    )
    .join("\n\n");
  $("detailSummary").textContent =
    summary.length > 240 ? summary.slice(0, 240) + "…" : summary;
  $("detailFullSummary").textContent = summary;
  $("detailMore").classList.toggle("hidden", summary.length <= 240);
  if (d.type === "verse" && d.text) {
    $("verseText").textContent = d.text;
    $("verseText").classList.remove("hidden");
    selectedPassage = {
      id: d.reference || d.label,
      reference: d.reference || d.label,
      text: d.text,
      source: d.sourceName || "Berean Standard Bible",
      query: currentData?.query || "",
      note: "",
    };
    $("saveControls").classList.remove("hidden");
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
  $("detailMeta").innerHTML = meta
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<div class="meta-row"><span class="meta-label">${escapeHtml(k)}</span><span class="meta-value">${escapeHtml(v)}</span></div>`,
    )
    .join("");
  const connections = node.connectedEdges().filter((e) => e.visible());
  $("connectionCount").textContent = connections.length;
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
    $("connectionList").append(button);
  });
  if (!connections.length)
    $("connectionList").textContent = "No visible connections.";
}
// Count actual thematic edges, rather than confusing them with identical verses.
function updateThematicStats() {
  if (!cy || !currentData?.comparison) return;
  const links = cy.edges('[type="theme-bridge"]');
  const visible = links.filter((e) => e.visible()).length;
  $("thematicStats").textContent =
    `${links.length} thematic ${links.length === 1 ? "connection" : "connections"}${visible !== links.length ? ` · ${visible} visible` : ""}`;
  $("thematicList").replaceChildren();
  links.forEach((link) => {
    const button = document.createElement("button");
    button.className = "thematic-choice";
    button.textContent = link.data("label");
    button.addEventListener("click", () => showThematicConnection(link));
    $("thematicList").append(button);
  });
}
// Both sidebar titles and yellow-line clicks use this same explanation view.
// Explain the relation first; full verse readings stay collapsed until requested.
function showThematicConnection(link) {
  if (!link?.length) return;
  $("themeLinks").checked = true;
  $("filterList")
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
  $("detailType").textContent = "WHY THESE PASSAGES CONNECT";
  $("detailLabel").textContent = d.label;
  $("detailSummary").textContent = d.explanation;
  $("detailMeta").textContent =
    d.interpretationMethod === "text"
      ? "Word-match preview; AI interpretation is still separate."
      : "AI interpretation of the retrieved passages.";
  $("inspectorConnectionsTitle").textContent = "SUPPORTING PASSAGES";
  $("connectionCount").textContent = "2";
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
    $("connectionList").append(section);
  });
}
function renderFilters(data) {
  const counts = {};
  data.nodes.forEach((n) => {
    counts[n.data.type] = (counts[n.data.type] || 0) + 1;
  });
  $("filterList").innerHTML = Object.entries(counts)
    .map(
      ([type, count]) =>
        `<label class="filter-row"><input type="checkbox" value="${escapeHtml(type)}" checked /><span>${escapeHtml(type)}</span><span>${count}</span></label>`,
    )
    .join("");
  $("filterList")
    .querySelectorAll("input")
    .forEach((input) => input.addEventListener("change", applyFilters));
}
function renderComparison(data) {
  $("comparisonPanel").classList.toggle("hidden", !data.comparison);
  $("themeLinksControl").classList.toggle("hidden", !data.comparison);
  if (!data.comparison) return;
  const c = data.comparison;
  $("comparisonStats").innerHTML =
    `<div class="comparison-key left-key">A: ${escapeHtml(c.left)} · ${c.leftOnly + c.shared} passages</div><div class="comparison-key right-key">B: ${escapeHtml(c.right)} · ${c.rightOnly + c.shared} passages</div>`;
}
function applyFilters() {
  if (!cy) return;
  const types = [...$("filterList").querySelectorAll("input:checked")].map(
    (i) => i.value,
  );
  cy.nodes().forEach((n) =>
    n.style("display", types.includes(n.data("type")) ? "element" : "none"),
  );
  cy.edges().forEach((e) =>
    e.style(
      "display",
      e.source().visible() &&
        e.target().visible() &&
        (e.data("type") !== "theme-bridge" || $("themeLinks").checked)
        ? "element"
        : "none",
    ),
  );
  cy.elements().removeClass("faded focused");
  clearInspector();
  fitGraph();
  updateThematicStats();
  $("footerMessage").textContent =
    `${cy.nodes(":visible").length} visible nodes`;
}
// "Collection" is the storage name for a notebook folder. This fallback ensures
// the UI always has a valid folder even after the previously selected one is deleted.
function chosenCollection() {
  return (
    notebook.collections.find((c) => c.id === notebook.activeCollectionId) ||
    notebook.collections[0]
  );
}
function renderCollectionOptions() {
  const previous = $("saveCollection").value;
  $("saveCollection").innerHTML = notebook.collections
    .map(
      (c) =>
        `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`,
    )
    .join("");
  if (notebook.collections.some((c) => c.id === previous))
    $("saveCollection").value = previous;
  updateNotebookCounts();
  updatePassageSavePreview();
}
// Rebuild folder badges and restore buttons without replacing the note editor,
// allowing notes to autosave without losing the cursor.
function updateNotebookCounts() {
  const total = notebook.collections.reduce(
    (sum, c) => sum + c.entries.length,
    0,
  );
  $("notebookHomeCount").textContent =
    `${notebook.collections.length} ${notebook.collections.length === 1 ? "folder" : "folders"} · ${total} saved ${total === 1 ? "passage" : "passages"}`;
  $("folderCount").textContent = notebook.collections.length;
  $("folderList").replaceChildren();
  notebook.collections.forEach((c) => {
    const button = document.createElement("button");
    button.className = "notebook-folder";
    button.setAttribute("aria-current", String(c.id === chosenCollection().id));
    const title = document.createElement("span");
    title.textContent = `▱ ${c.name}`;
    const count = document.createElement("small");
    count.textContent = `${c.entries.length} ${c.entries.length === 1 ? "passage" : "passages"}${c.outline ? " · study outline" : ""}`;
    button.append(title, count);
    button.addEventListener("click", () => openNotebook(c.id));
    $("folderList").append(button);
  });
  $("deletedFoldersTitle").textContent =
    `Recently deleted (${notebook.trash.length})`;
  $("deletedFolderList").replaceChildren();
  notebook.trash.forEach((folder) => {
    const row = document.createElement("div"),
      name = document.createElement("p"),
      button = document.createElement("button");
    row.className = "deleted-folder";
    name.textContent = `${folder.name} · ${folder.entries.length} passages`;
    button.textContent = `Restore ${folder.name}`;
    button.addEventListener("click", () => restoreFolder(folder.id));
    row.append(name, button);
    $("deletedFolderList").append(row);
  });
  if (!notebook.trash.length)
    $("deletedFolderList").textContent =
      "Deleted folders can be restored here.";
  const c = chosenCollection(),
    notes = c.entries.filter((e) => e.note.trim()).length;
  $("folderSummary").textContent =
    `${c.entries.length} saved ${c.entries.length === 1 ? "passage" : "passages"} · ${notes} ${notes === 1 ? "note" : "notes"}${c.outline ? " · 1 study outline" : ""}`;
}
function openNotebook(id) {
  if (id && notebook.collections.some((c) => c.id === id)) {
    notebook.activeCollectionId = id;
    persistNotebook();
  }
  $("saveCollection").value = chosenCollection().id;
  $("notebookSearch").value = "";
  $("renameFolderForm").classList.add("hidden");
  $("deleteFolderConfirm").classList.add("hidden");
  renderNotebook();
  if (!$("notebookDialog").open) $("notebookDialog").showModal();
}
// Display only the selected folder. Search filters the visible entries; it does
// not remove data from the folder or change what Export folder downloads.
function renderNotebook() {
  const collection = chosenCollection();
  updateNotebookCounts();
  $("folderTitle").textContent = collection.name;
  $("folderBreadcrumb").textContent = collection.name;
  $("notebookEntries").replaceChildren();
  $("exportButton").disabled =
    !collection.entries.length && !collection.outline;
  const search = $("notebookSearch").value.trim().toLowerCase();
  if (collection.outline && !search) {
    const outline = document.createElement("details");
    outline.className = "notebook-outline";
    const heading = document.createElement("summary");
    heading.textContent = "Saved comparison outline";
    outline.append(heading);
    const p = document.createElement("p");
    p.textContent = collection.outline.overview;
    outline.append(p);
    const provenance = document.createElement("p");
    provenance.className = "help-text";
    provenance.textContent =
      collection.outline.method === "ai"
        ? "AI interpretation with supporting passages."
        : "Text-based study preview.";
    outline.append(provenance);
    [
      ...collection.outline.similarities,
      ...collection.outline.differences,
    ].forEach((item) => {
      const finding = document.createElement("details"),
        title = document.createElement("summary"),
        body = document.createElement("p");
      title.textContent = item.title;
      body.textContent =
        item.explanation || `A: ${item.left_focus} B: ${item.right_focus}`;
      const evidence = document.createElement("p");
      evidence.className = "help-text";
      evidence.textContent = `A: ${item.left_refs.join(", ")} · B: ${item.right_refs.join(", ")}`;
      finding.append(title, body, evidence);
      outline.append(finding);
    });
    const questions = document.createElement("h4");
    questions.textContent = "Study questions";
    outline.append(questions);
    const list = document.createElement("ol");
    collection.outline.study_questions.forEach((q) => {
      const li = document.createElement("li");
      li.textContent = q;
      list.append(li);
    });
    outline.append(list);
    $("notebookEntries").append(outline);
  }
  const entries = collection.entries.filter((e) =>
    `${e.reference} ${e.text} ${e.note}`.toLowerCase().includes(search),
  );
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "notebook-empty";
    const title = document.createElement("h4");
    title.textContent = search
      ? "No matching passages"
      : "This folder is ready for your study";
    const text = document.createElement("p");
    text.textContent = search
      ? "Try a verse reference or a word from your notes."
      : "Select a verse in the graph and choose Review & save passage. Check the destination folder and confirm. To save a comparison with its supporting verses and questions, choose Review & save study.";
    empty.append(title, text);
    $("notebookEntries").append(empty);
    return;
  }
  entries.forEach((entry) => {
    const article = document.createElement("details");
    article.className = "saved-entry";
    const heading = document.createElement("summary"),
      reference = document.createElement("span"),
      badge = document.createElement("small");
    reference.textContent = entry.reference;
    badge.textContent = entry.note.trim() ? "Has a note" : "Add a note";
    heading.append(reference, badge);
    const quote = document.createElement("blockquote");
    quote.textContent = entry.text;
    const meta = document.createElement("details"),
      metaTitle = document.createElement("summary"),
      metaBody = document.createElement("p");
    meta.className = "saved-source";
    metaTitle.textContent = "Source & original search";
    metaBody.textContent = `${entry.source} · ${entry.query}`;
    meta.append(metaTitle, metaBody);
    const label = document.createElement("label");
    label.textContent = "Your notes";
    const textarea = document.createElement("textarea");
    textarea.value = entry.note;
    textarea.maxLength = 10000;
    textarea.rows = 3;
    textarea.placeholder = "What stands out to you in this passage?";
    label.append(textarea);
    textarea.addEventListener("input", () => {
      entry.note = textarea.value;
      badge.textContent = entry.note.trim() ? "Has a note" : "Add a note";
      persistNotebook();
    });
    const remove = document.createElement("button");
    remove.className = "remove-passage";
    remove.textContent = "Remove from folder";
    remove.addEventListener("click", () => {
      collection.entries = collection.entries.filter((e) => e !== entry);
      persistNotebook();
      renderNotebook();
    });
    article.append(heading, quote, meta, label, remove);
    $("notebookEntries").append(article);
  });
}
$("searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch();
});
$("cancelButton").addEventListener("click", () => activeController?.abort());
$("retryButton").addEventListener("click", () => {
  if (lastSearch) runSearch(...lastSearch);
});
$("fitButton").addEventListener("click", fitGraph);
$("resetButton").addEventListener("click", () => {
  if (!cy) return;
  $("filterList")
    .querySelectorAll("input")
    .forEach((i) => (i.checked = true));
  applyFilters();
  showNodeDetails(cy.getElementById(currentData.center));
});
document.querySelectorAll("[data-query]").forEach((button) =>
  button.addEventListener("click", () => {
    $("searchInput").value = button.dataset.query;
    $("compareInput").value = button.dataset.compare || "";
    runSearch();
  }),
);
$("notebookButton").addEventListener("click", () => openNotebook());
$("notebookHomeButton").addEventListener("click", () => openNotebook());
$("notebookSearch").addEventListener("input", renderNotebook);
$("closeNotebook").addEventListener("click", () => $("notebookDialog").close());
$("collectionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("collectionName").value.trim();
  if (!name) return;
  const existing = notebook.collections.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) {
    openNotebook(existing.id);
    $("storageMessage").textContent =
      "Opened the existing folder with that name.";
    return;
  }
  const collection = { id: crypto.randomUUID(), name, entries: [] };
  notebook.collections.push(collection);
  persistNotebook();
  renderCollectionOptions();
  $("saveCollection").value = collection.id;
  $("collectionName").value = "";
  openNotebook(collection.id);
});
$("renameFolderButton").addEventListener("click", () => {
  $("renameFolderName").value = chosenCollection().name;
  $("renameFolderForm").classList.remove("hidden");
  $("renameFolderName").focus();
});
$("cancelRenameButton").addEventListener("click", () =>
  $("renameFolderForm").classList.add("hidden"),
);
$("renameFolderForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("renameFolderName").value.trim(),
    collection = chosenCollection();
  if (!name) return;
  if (
    notebook.collections.some(
      (c) =>
        c.id !== collection.id && c.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    $("storageMessage").textContent = "Another folder already has that name.";
    return;
  }
  collection.name = name;
  persistNotebook();
  renderCollectionOptions();
  renderNotebook();
  $("renameFolderForm").classList.add("hidden");
});
function updatePassageSavePreview() {
  if (!selectedPassage) return;
  const folder =
    notebook.collections.find((c) => c.id === $("saveCollection").value) ||
    chosenCollection();
  $("savePassageTitle").textContent = `Saving: ${selectedPassage.reference}`;
  $("saveDestination").textContent = `My notebook / ${folder.name}`;
}
function updateSaveReview() {
  const creating = $("saveReviewFolder").value === "__new__";
  $("saveNewFolderFields").classList.toggle("hidden", !creating);
  $("saveNewFolderName").required = creating;
  const folder = notebook.collections.find(
    (c) => c.id === $("saveReviewFolder").value,
  );
  const name = creating
    ? $("saveNewFolderName").value.trim() || "New folder"
    : folder?.name;
  $("saveReviewDestination").textContent = `Destination: My notebook / ${name}`;
  $("confirmSaveReview").textContent = creating
    ? "Create folder & save"
    : `Save to ${name}`;
  $("saveReviewNotice").textContent =
    pendingSave?.kind === "outline" && folder?.outline
      ? "This updates this folder’s saved comparison outline. Existing passage notes are kept."
      : pendingSave?.kind === "passage" &&
          folder?.entries.some((e) => e.id === pendingSave.passage.id)
        ? "This passage is already in this folder; its notes will be kept."
        : "";
  $("saveReviewError").textContent = "";
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
  $("saveReviewFolder").innerHTML =
    notebook.collections
      .map(
        (c) =>
          `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`,
      )
      .join("") + '<option value="__new__">+ Create a new folder</option>';
  $("saveReviewFolder").value =
    kind === "outline" ? "__new__" : $("saveCollection").value;
  $("saveNewFolderName").value =
    kind === "outline" ? pendingSave.study.name : "";
  $("saveReviewTitle").textContent =
    kind === "passage" ? "Save this passage" : "Save this study";
  $("saveReviewItem").textContent =
    kind === "passage" ? pendingSave.passage.reference : pendingSave.study.name;
  $("saveReviewContents").textContent =
    kind === "passage"
      ? "Includes this verse’s text and the search it came from. Add personal notes in your notebook."
      : `${pendingSave.study.entries.length} supporting passages, similarities and differences, and study questions. ${pendingSave.study.outline.method === "ai" ? "Includes AI interpretation." : "This is a text-based preview."}`;
  $("saveReviewPreview").textContent =
    kind === "passage"
      ? pendingSave.passage.text
      : pendingSave.study.outline.overview;
  updateSaveReview();
  $("saveReviewDialog").showModal();
}
$("saveCollection").addEventListener("change", () => {
  updatePassageSavePreview();
  $("saveMessage").textContent = "";
});
$("saveVerseButton").addEventListener("click", () => reviewSave("passage"));
$("saveReviewFolder").addEventListener("change", updateSaveReview);
$("saveNewFolderName").addEventListener("input", updateSaveReview);
$("cancelSaveReview").addEventListener("click", () =>
  $("saveReviewDialog").close(),
);
$("saveReviewForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!pendingSave) return;
  let folder = notebook.collections.find(
    (c) => c.id === $("saveReviewFolder").value,
  );
  if ($("saveReviewFolder").value === "__new__") {
    const name = $("saveNewFolderName").value.trim();
    if (!name) return;
    if (
      notebook.collections.some(
        (c) => c.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      $("saveReviewError").textContent =
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
  $("saveCollection").value = folder.id;
  updatePassageSavePreview();
  $("saveReviewDialog").close();
  pendingSave = null;
  openNotebook(folder.id);
  $("storageMessage").textContent = saved
    ? `${item} saved to My notebook / ${folder.name}.`
    : "Saved for this session. Export this folder to keep a backup.";
  $("saveMessage").textContent = `${item} → My notebook / ${folder.name}`;
});
$("deleteFolderButton").addEventListener("click", () => {
  const folder = chosenCollection();
  $("deleteFolderSummary").textContent =
    `“${folder.name}” contains ${folder.entries.length} saved passages${folder.outline ? " and a study outline" : ""}. It will move to Recently deleted, where you can restore it.`;
  $("deleteFolderConfirm").classList.remove("hidden");
});
$("cancelDeleteFolder").addEventListener("click", () =>
  $("deleteFolderConfirm").classList.add("hidden"),
);
$("confirmDeleteFolder").addEventListener("click", () => {
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
  $("storageMessage").textContent =
    `${folder.name} moved to Recently deleted. You can restore it from the folder sidebar.`;
});
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
  $("storageMessage").textContent =
    `Restored ${folder.name}, including its passages and notes.`;
}
// Export uses the complete folder object, even when its UI search hides some entries.
$("exportButton").addEventListener("click", () => {
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
});
renderCollectionOptions();

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
  $("filterList")
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
  $("comparisonInsights").setAttribute("aria-busy", String(loading));
  $("retryComparisonButton").classList.add("hidden");
  $("comparisonInsights").classList.remove("hidden");
  $("comparisonOverview").textContent = report.overview;
  $("insightsStatus").textContent = message;
  $("similarityCards").replaceChildren();
  $("differenceCards").replaceChildren();
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
      $(id).append(card);
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
      $(id).append(placeholder);
    }
  }
  $("studyQuestions").replaceChildren();
  report.study_questions.forEach((q) => {
    const li = document.createElement("li");
    li.textContent = q;
    $("studyQuestions").append(li);
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
    $("themeLinks").checked ? "element" : "none",
  );
  $("edgeCount").textContent = cy.edges().length;
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
      $("retryComparisonButton").classList.remove("hidden");
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
  $("footerMessage").textContent =
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
    $("footerMessage").textContent = "Graph and explanations ready";
  } catch (_) {
    if (number === requestNumber)
      $("footerMessage").textContent =
        "Graph ready · AI explanations unavailable";
  } finally {
    clearTimeout(timer);
    if (backgroundController === controller) backgroundController = null;
  }
}
$("retryComparisonButton").addEventListener("click", () => {
  if (currentData?.comparison) loadComparison(currentData, requestNumber);
});
$("themeLinks").addEventListener("change", applyFilters);
$("toggleInsightsButton").addEventListener("click", () => {
  const collapsed = $("insightsBody").classList.toggle("hidden");
  $("toggleInsightsButton").textContent = collapsed ? "Expand" : "Collapse";
  $("toggleInsightsButton").setAttribute("aria-expanded", String(!collapsed));
  fitGraph();
});
$("saveOutlineButton").addEventListener("click", () => reviewSave("outline"));
// Start waking the backend while the visitor decides what to search.
fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(90000) }).catch(
  () => {},
);
