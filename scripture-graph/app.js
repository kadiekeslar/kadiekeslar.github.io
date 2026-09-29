const API_BASE = "https://scripture-graph-backend.onrender.com";

let cy = null;
let currentData = null;

const els = {
  apiStatus: document.getElementById("apiStatus"),
  footerMessage: document.getElementById("footerMessage"),
  searchInput: document.getElementById("searchInput"),
  searchButton: document.getElementById("searchButton"),
  emptyState: document.getElementById("emptyState"),
  loadingState: document.getElementById("loadingState"),
  detailType: document.getElementById("detailType"),
  detailLabel: document.getElementById("detailLabel"),
  detailSummary: document.getElementById("detailSummary"),
  verseText: document.getElementById("verseText"),
  detailMeta: document.getElementById("detailMeta"),
  connectionList: document.getElementById("connectionList"),
  connectionCount: document.getElementById("connectionCount"),
  nodeCount: document.getElementById("nodeCount"),
  edgeCount: document.getElementById("edgeCount"),
  queryType: document.getElementById("queryType"),
  filterList: document.getElementById("filterList"),
  sourceList: document.getElementById("sourceList")
};

async function explore(query) {
  query = query.trim();
  if (!query) return;

  setLoading(true);
  setStatus(`SEARCHING / ${query.toUpperCase()}`);

  try {
    const response = await fetch(
      `${API_BASE}/explore?q=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || data.error || `API returned ${response.status}`
      );
    }

    currentData = data;

    renderGraph(data);
    renderFilters(data.nodes);
    renderStats(data);
    renderSources(data.sources || []);

    els.emptyState.classList.add("hidden");
    setStatus(`LOADED / ${data.centerLabel || query}`);

    const selectedCenterNode = cy.getElementById(data.center);

    if (selectedCenterNode.length) {
      selectedCenterNode.addClass("center-node");
      showNodeDetails(selectedCenterNode);

      setTimeout(() => {
        cy.animate(
          {
            center: { eles: selectedCenterNode },
            zoom: 0.92
          },
          {
            duration: 420
          }
        );
      }, 200);
    }
  } catch (error) {
    console.error(error);

    setStatus("SEARCH FAILED");

    els.detailType.textContent = "ERROR";
    els.detailLabel.textContent = query;
    els.detailSummary.textContent = error.message;
    els.verseText.classList.add("hidden");
  } finally {
    setLoading(false);
  }
}

function renderGraph(data) {
  if (cy) {
    cy.destroy();
  }

  cy = cytoscape({
    container: document.getElementById("cy"),

    elements: [...data.nodes, ...data.edges],

    style: [
      {
        selector: "node",
        style: {
          "background-color": "#dce6ed",
          label: "data(label)",
          color: "#d4dde2",
          "font-size": "10px",
          "font-family": "ui-monospace, monospace",
          "text-valign": "bottom",
          "text-margin-y": "9px",
          width: 23,
          height: 23,
          "border-width": 1,
          "border-color": "#75828b",
          "transition-property":
            "opacity, width, height, border-width",
          "transition-duration": "170ms"
        }
      },

      {
        selector: 'node[type = "person"]',
        style: {
          shape: "round-rectangle",
          "background-color": "#9eb6c7",
          width: 31,
          height: 31
        }
      },

      {
        selector: 'node[type = "place"]',
        style: {
          shape: "triangle",
          "background-color": "#9db8a8",
          width: 31,
          height: 31
        }
      },

      {
        selector: 'node[type = "event"]',
        style: {
          shape: "hexagon",
          "background-color": "#bba58e",
          width: 32,
          height: 32
        }
      },

      {
        selector: 'node[type = "topic"]',
        style: {
          shape: "diamond",
          "background-color": "#c3b2d7",
          width: 46,
          height: 46,
          "font-size": "12px"
        }
      },

      {
        selector: 'node[type = "subtheme"]',
        style: {
          shape: "hexagon",
          "background-color": "#798894",
          width: 35,
          height: 35,
          "font-size": "10px"
        }
      },

      {
        selector: 'node[type = "group"]',
        style: {
          shape: "rectangle",
          "background-color": "#a5adb1",
          width: 28,
          height: 28
        }
      },

      {
        selector: "edge",
        style: {
          width: 1,
          "line-color": "#52606a",
          opacity: 0.68,
          "curve-style": "bezier"
        }
      },

      {
        selector: 'edge[type = "cross-reference"]',
        style: {
          "line-color": "#72818b"
        }
      },

      {
        selector:
          'edge[type = "context"], edge[type = "reference"]',
        style: {
          "line-style": "dashed",
          "line-color": "#687680"
        }
      },

      {
        selector:
          'edge[type = "topic"], edge[type = "topic-match"], edge[type = "relationship"]',
        style: {
          "line-style": "dotted",
          "line-color": "#80748c"
        }
      },

      {
        selector: 'edge[type = "direct-match"]',
        style: {
          width: 1.5,
          "line-color": "#8e9ba4"
        }
      },

      {
        selector: ".faded",
        style: {
          opacity: 0.1
        }
      },

      {
        selector: ".focused",
        style: {
          "border-width": 3,
          width: 35,
          height: 35
        }
      },

      {
        selector: ".center-node",
        style: {
          "border-width": 4,
          "border-color": "#ffffff",
          width: 50,
          height: 50
        }
      }
    ],

    layout: {
      name: "cose",
      animate: true,
      padding: 65,
      nodeRepulsion: 210000,
      idealEdgeLength: 145,
      edgeElasticity: 75,
      gravity: 0.48,
      numIter: 1400
    },

    minZoom: 0.18,
    maxZoom: 2.8
  });


  const centerNode = cy.getElementById(data.center);

if (centerNode.length) {
  const centerX = cy.width() / 2;
  const centerY = cy.height() / 2;

  centerNode.position({
    x: centerX,
    y: centerY
  });

  centerNode.lock();
}

  cy.on("tap", "node", event => {
    const node = event.target;

    focusNode(node);
    showNodeDetails(node);
  });

  cy.on("tap", event => {
    if (event.target === cy) {
      resetFocus();
    }
  });
}

function focusNode(node) {
  cy.elements().removeClass("faded focused");

  const neighborhood = node.closedNeighborhood();

  cy.elements()
    .not(neighborhood)
    .addClass("faded");

  node.addClass("focused");

  cy.animate(
    {
      center: { eles: node },
      zoom: Math.max(cy.zoom(), 0.95)
    },
    {
      duration: 300
    }
  );
}

function resetFocus() {
  if (!cy) return;

  cy.elements().removeClass("faded focused");
}

function showNodeDetails(node) {
  const data = node.data();

  els.detailType.textContent =
    String(data.type || "node").toUpperCase();

  els.detailLabel.textContent =
    data.label || data.id;

  els.detailSummary.textContent =
    data.summary || "No description available.";

  if (data.text) {
    els.verseText.textContent = data.text;
    els.verseText.classList.remove("hidden");
  } else {
    els.verseText.textContent = "";
    els.verseText.classList.add("hidden");
  }

  const meta = [
    ["ID", data.id],
    ["TYPE", data.type],
    ["REFERENCE", data.reference],
    ["RELEVANCE", data.relevance],
    ["SCORE", data.score],
    ["SOURCE", data.sourceName]
  ].filter(
    ([, value]) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );

  els.detailMeta.innerHTML = meta
    .map(
      ([label, value]) => `
        <div class="meta-row">
          <span class="meta-label">
            ${escapeHtml(label)}
          </span>

          <span class="meta-value">
            ${escapeHtml(String(value))}
          </span>
        </div>
      `
    )
    .join("");

  const connectedEdges = node.connectedEdges();

  els.connectionCount.textContent =
    connectedEdges.length;

  const items = [];

  connectedEdges.forEach(edge => {
    const d = edge.data();

    const source =
      cy.getElementById(d.source);

    const target =
      cy.getElementById(d.target);

    const other =
      source.id() === node.id()
        ? target
        : source;

    items.push(`
      <div
        class="connection-item"
        data-node-id="${escapeHtml(other.id())}"
      >
        <div class="connection-target">
          ${escapeHtml(
            other.data("label") || other.id()
          )}
        </div>

        <div class="connection-label">
          ${escapeHtml(
            String(
              d.type || "connection"
            ).toUpperCase()
          )}
          /
          ${escapeHtml(d.label || "")}
        </div>

        ${
          d.explanation
            ? `
              <div class="connection-explanation">
                ${escapeHtml(d.explanation)}
              </div>
            `
            : ""
        }
      </div>
    `);
  });

  els.connectionList.innerHTML =
    items.length
      ? items.join("")
      : `
        <div class="empty-state">
          No connections found.
        </div>
      `;

  document
    .querySelectorAll(".connection-item")
    .forEach(item => {
      item.addEventListener("click", () => {
        const target =
          cy.getElementById(
            item.dataset.nodeId
          );

        if (target.length) {
          focusNode(target);
          showNodeDetails(target);
        }
      });
    });
}

function renderFilters(nodes) {
  const counts = {};

  for (const item of nodes) {
    const type =
      item.data.type || "node";

    counts[type] =
      (counts[type] || 0) + 1;
  }

  els.filterList.innerHTML =
    Object.entries(counts)
      .sort(([a], [b]) =>
        a.localeCompare(b)
      )
      .map(
        ([type, count]) => `
          <label class="filter-row">
            <input
              type="checkbox"
              value="${escapeHtml(type)}"
              checked
            />

            <span>
              ${escapeHtml(type)}
            </span>

            <span class="filter-count">
              ${count}
            </span>
          </label>
        `
      )
      .join("");

  els.filterList
    .querySelectorAll("input")
    .forEach(input => {
      input.addEventListener(
        "change",
        applyFilters
      );
    });
}

function applyFilters() {
  if (!cy) return;

  const selected =
    Array.from(
      els.filterList.querySelectorAll(
        "input:checked"
      )
    ).map(input => input.value);

  cy.nodes().forEach(node => {
    node.style(
      "display",
      selected.includes(
        node.data("type")
      )
        ? "element"
        : "none"
    );
  });

  cy.edges().forEach(edge => {
    const visible =
      edge.source().style("display") !==
        "none" &&
      edge.target().style("display") !==
        "none";

    edge.style(
      "display",
      visible ? "element" : "none"
    );
  });
}

function renderStats(data) {
  els.nodeCount.textContent =
    data.nodes.length;

  els.edgeCount.textContent =
    data.edges.length;

  els.queryType.textContent =
    data.queryType || "—";
}

function renderSources(sources) {
  els.sourceList.innerHTML =
    sources.length
      ? sources
          .map(
            source => `
              <div class="source-item">
                ${escapeHtml(source)}
              </div>
            `
          )
          .join("")
      : "No source information returned.";
}

function setLoading(isLoading) {
  els.loadingState.classList.toggle(
    "hidden",
    !isLoading
  );

  els.searchButton.disabled =
    isLoading;
}

function setStatus(message) {
  els.apiStatus.textContent =
    message;

  els.footerMessage.textContent =
    message;
}

function runSearch() {
  explore(
    els.searchInput.value
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.searchButton.addEventListener(
  "click",
  runSearch
);

els.searchInput.addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
      runSearch();
    }
  }
);

document
  .querySelectorAll("[data-query]")
  .forEach(button => {
    button.addEventListener(
      "click",
      () => {
        els.searchInput.value =
          button.dataset.query;

        explore(
          button.dataset.query
        );
      }
    );
  });
