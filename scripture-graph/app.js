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

  if (!query) {
    return;
  }

  setLoading(true);
  setStatus(`SEARCHING / ${query.toUpperCase()}`);

  try {
    const response = await fetch(
      `${API_BASE}/explore?q=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail ||
        data.error ||
        `API returned ${response.status}`
      );
    }

    currentData = data;

    renderGraph(data);
    renderFilters(data.nodes);
    renderStats(data);
    renderSources(data.sources || []);

    els.emptyState.classList.add("hidden");

    setStatus(
      `LOADED / ${data.centerLabel || query}`
    );

    const centerNode =
      cy.getElementById(data.center);

    if (centerNode.length) {
      centerNode.addClass("center-node");
      showNodeDetails(centerNode);
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


/*
---------------------------------------------------------
CUSTOM HIERARCHICAL GRAPH LAYOUT

CENTER
  ↓
SUBTHEMES
  ↓
VERSES BELONGING TO THAT SUBTHEME

Direct verse matches that do not belong to a subtheme
are placed on an outer ring.
---------------------------------------------------------
*/

function buildPositions(data) {
  const positions = {};

  const centerId = data.center;

  positions[centerId] = {
    x: 0,
    y: 0
  };

  const nodesById = {};

  data.nodes.forEach(node => {
    nodesById[node.data.id] = node.data;
  });


  /*
  Find subthemes directly connected to the center.
  */

  const subthemeIds = [];

  data.edges.forEach(edge => {
    const e = edge.data;

    if (e.source === centerId) {
      const target =
        nodesById[e.target];

      if (
        target &&
        target.type === "subtheme"
      ) {
        subthemeIds.push(e.target);
      }
    }

    if (e.target === centerId) {
      const source =
        nodesById[e.source];

      if (
        source &&
        source.type === "subtheme"
      ) {
        subthemeIds.push(e.source);
      }
    }
  });


  /*
  Remove duplicates.
  */

  const uniqueSubthemes =
    [...new Set(subthemeIds)];


  /*
  Radius of the first ring.
  */

  const SUBTHEME_RADIUS = 245;


  /*
  Put subthemes around the center.
  */

  uniqueSubthemes.forEach(
    (subthemeId, index) => {

      const count =
        uniqueSubthemes.length;

      const angle =
        -Math.PI / 2 +
        (Math.PI * 2 * index) / count;

      positions[subthemeId] = {
        x:
          Math.cos(angle) *
          SUBTHEME_RADIUS,

        y:
          Math.sin(angle) *
          SUBTHEME_RADIUS
      };
    }
  );


  /*
  Find verses connected to each subtheme.
  */

  const usedVerseIds =
    new Set();


  uniqueSubthemes.forEach(
    subthemeId => {

      const subthemePosition =
        positions[subthemeId];

      const baseAngle =
        Math.atan2(
          subthemePosition.y,
          subthemePosition.x
        );


      const connectedVerses = [];


      data.edges.forEach(edge => {
        const e = edge.data;

        let otherId = null;


        if (e.source === subthemeId) {
          otherId = e.target;
        }

        else if (e.target === subthemeId) {
          otherId = e.source;
        }


        if (!otherId) {
          return;
        }


        const otherNode =
          nodesById[otherId];


        if (
          otherNode &&
          otherNode.type === "verse"
        ) {
          connectedVerses.push(
            otherId
          );
        }
      });


      const uniqueVerses =
        [...new Set(connectedVerses)];


      /*
      Arrange verses in a fan outside
      their parent subtheme.
      */

      const VERSE_DISTANCE = 130;

      const spread =
        Math.min(
          1.45,
          0.32 *
          Math.max(
            1,
            uniqueVerses.length
          )
        );


      uniqueVerses.forEach(
        (verseId, index) => {

          usedVerseIds.add(
            verseId
          );


          let offset = 0;


          if (
            uniqueVerses.length > 1
          ) {

            offset =
              -spread / 2 +

              (
                spread *
                index
              ) /

              (
                uniqueVerses.length -
                1
              );
          }


          const verseAngle =
            baseAngle + offset;


          positions[verseId] = {

            x:
              subthemePosition.x +

              Math.cos(
                verseAngle
              ) *

              VERSE_DISTANCE,


            y:
              subthemePosition.y +

              Math.sin(
                verseAngle
              ) *

              VERSE_DISTANCE
          };
        }
      );
    }
  );


  /*
  Find verse nodes that are directly
  connected to the center and were not
  already assigned to a subtheme.
  */

  const directVerses = [];


  data.edges.forEach(edge => {
    const e = edge.data;

    let otherId = null;


    if (e.source === centerId) {
      otherId = e.target;
    }

    else if (e.target === centerId) {
      otherId = e.source;
    }


    if (!otherId) {
      return;
    }


    const otherNode =
      nodesById[otherId];


    if (
      otherNode &&
      otherNode.type === "verse" &&
      !usedVerseIds.has(otherId)
    ) {
      directVerses.push(
        otherId
      );
    }
  });


  const uniqueDirectVerses =
    [...new Set(directVerses)];


  /*
  Direct matches go on another ring.
  */

  const DIRECT_RADIUS = 380;


  uniqueDirectVerses.forEach(
    (verseId, index) => {

      usedVerseIds.add(
        verseId
      );


      const count =
        uniqueDirectVerses.length;


      const angle =
        Math.PI / 4 +

        (
          Math.PI *
          2 *
          index
        ) /

        Math.max(
          count,
          1
        );


      positions[verseId] = {

        x:
          Math.cos(angle) *
          DIRECT_RADIUS,

        y:
          Math.sin(angle) *
          DIRECT_RADIUS
      };
    }
  );


  /*
  Any remaining nodes that were not
  handled yet go on an outer ring.
  */

  const leftovers =
    data.nodes.filter(
      node =>
        !positions[
          node.data.id
        ]
    );


  const OUTER_RADIUS = 475;


  leftovers.forEach(
    (node, index) => {

      const count =
        leftovers.length;


      const angle =
        (
          Math.PI *
          2 *
          index
        ) /

        Math.max(
          count,
          1
        );


      positions[
        node.data.id
      ] = {

        x:
          Math.cos(angle) *
          OUTER_RADIUS,

        y:
          Math.sin(angle) *
          OUTER_RADIUS
      };
    }
  );


  return positions;
}


function renderGraph(data) {
  if (cy) {
    cy.destroy();
  }


  /*
  Calculate meaningful positions BEFORE
  Cytoscape renders.
  */

  const positions =
    buildPositions(data);


  const positionedNodes =
    data.nodes.map(
      node => ({
        ...node,

        position:
          positions[
            node.data.id
          ] || {
            x: 0,
            y: 0
          }
      })
    );


  cy = cytoscape({

    container:
      document.getElementById(
        "cy"
      ),


    elements: [
      ...positionedNodes,
      ...data.edges
    ],


    style: [

      /*
      DEFAULT NODE
      */

      {
        selector: "node",

        style: {

          "background-color":
            "#dce6ed",

          "label":
            "data(label)",

          "color":
            "#d4dde2",

          "font-size":
            "10px",

          "font-family":
            "ui-monospace, monospace",

          "text-valign":
            "bottom",

          "text-margin-y":
            "9px",

          "width":
            23,

          "height":
            23,

          "border-width":
            1,

          "border-color":
            "#75828b",

          "transition-property":
            "opacity, width, height, border-width",

          "transition-duration":
            "170ms"
        }
      },


      /*
      VERSE
      */

      {
        selector:
          'node[type = "verse"]',

        style: {

          "shape":
            "ellipse",

          "background-color":
            "#dce6ed",

          "width":
            24,

          "height":
            24,

          "font-size":
            "9px"
        }
      },


      /*
      PERSON
      */

      {
        selector:
          'node[type = "person"]',

        style: {

          "shape":
            "round-rectangle",

          "background-color":
            "#9eb6c7",

          "width":
            34,

          "height":
            34
        }
      },


      /*
      PLACE
      */

      {
        selector:
          'node[type = "place"]',

        style: {

          "shape":
            "triangle",

          "background-color":
            "#9db8a8",

          "width":
            34,

          "height":
            34
        }
      },


      /*
      EVENT
      */

      {
        selector:
          'node[type = "event"]',

        style: {

          "shape":
            "hexagon",

          "background-color":
            "#bba58e",

          "width":
            36,

          "height":
            36
        }
      },


      /*
      MAIN SEARCH TOPIC
      */

      {
        selector:
          'node[type = "topic"]',

        style: {

          "shape":
            "diamond",

          "background-color":
            "#c3b2d7",

          "width":
            52,

          "height":
            52,

          "font-size":
            "12px",

          "font-weight":
            "bold"
        }
      },


      /*
      SUBTHEMES
      */

      {
        selector:
          'node[type = "subtheme"]',

        style: {

          "shape":
            "hexagon",

          "background-color":
            "#798894",

          "width":
            42,

          "height":
            42,

          "font-size":
            "10px"
        }
      },


      /*
      GENERIC GROUP
      */

      {
        selector:
          'node[type = "group"]',

        style: {

          "shape":
            "rectangle",

          "background-color":
            "#a5adb1",

          "width":
            30,

          "height":
            30
        }
      },


      /*
      EDGES
      */

      {
        selector:
          "edge",

        style: {

          "width":
            1,

          "line-color":
            "#52606a",

          "opacity":
            0.72,

          "curve-style":
            "bezier"
        }
      },


      {
        selector:
          'edge[type = "cross-reference"]',

        style: {

          "line-color":
            "#72818b"
        }
      },


      {
        selector:
          'edge[type = "context"], edge[type = "reference"]',

        style: {

          "line-style":
            "dashed",

          "line-color":
            "#687680"
        }
      },


      {
        selector:
          'edge[type = "topic"]',

        style: {

          "width":
            1.4,

          "line-color":
            "#89949d"
        }
      },


      {
        selector:
          'edge[type = "topic-match"]',

        style: {

          "line-style":
            "dotted",

          "line-color":
            "#707b84"
        }
      },


      {
        selector:
          'edge[type = "relationship"]',

        style: {

          "line-style":
            "dotted",

          "line-color":
            "#80748c"
        }
      },


      {
        selector:
          'edge[type = "direct-match"]',

        style: {

          "width":
            1.5,

          "line-color":
            "#8e9ba4"
        }
      },


      /*
      FOCUS EFFECTS
      */

      {
        selector:
          ".faded",

        style: {

          "opacity":
            0.08
        }
      },


      {
        selector:
          ".focused",

        style: {

          "border-width":
            3,

          "border-color":
            "#ffffff"
        }
      },


      /*
      CENTER NODE
      */

      {
        selector:
          ".center-node",

        style: {

          "border-width":
            4,

          "border-color":
            "#ffffff",

          "width":
            56,

          "height":
            56
        }
      }
    ],


    /*
    IMPORTANT:

    Cytoscape does NOT rearrange
    our positions.

    We control the structure.
    */

    layout: {
      name: "preset",

      fit: false,

      animate: false
    },


    minZoom:
      0.18,

    maxZoom:
      3.5
  });


  const centerNode =
    cy.getElementById(
      data.center
    );


  if (
    centerNode.length
  ) {

    centerNode.addClass(
      "center-node"
    );

    centerNode.lock();


    /*
    Keep the searched concept
    exactly in the viewport center.
    */

    setTimeout(
      () => {

        cy.center(
          centerNode
        );

        /*
        Automatically pick a zoom
        that works well for the graph.
        */

        const nodeCount =
          data.nodes.length;


        let zoom = 0.9;


        if (
          nodeCount > 25
        ) {
          zoom = 0.72;
        }


        if (
          nodeCount > 50
        ) {
          zoom = 0.58;
        }


        if (
          nodeCount > 100
        ) {
          zoom = 0.42;
        }


        cy.zoom({
          level: zoom,

          position:
            centerNode.position()
        });

      },

      60
    );
  }


  /*
  Clicking a node highlights its
  immediate relationships.
  */

  cy.on(
    "tap",
    "node",

    event => {

      const node =
        event.target;

      focusNode(
        node
      );

      showNodeDetails(
        node
      );
    }
  );


  /*
  Clicking empty space resets
  the network.
  */

  cy.on(
    "tap",

    event => {

      if (
        event.target === cy
      ) {

        resetFocus();
      }
    }
  );
}


function focusNode(node) {

  cy.elements()
    .removeClass(
      "faded focused"
    );


  const neighborhood =
    node.closedNeighborhood();


  cy.elements()
    .not(
      neighborhood
    )
    .addClass(
      "faded"
    );


  node.addClass(
    "focused"
  );


  cy.animate(

    {
      center: {
        eles:
          node
      },

      zoom:
        Math.max(
          cy.zoom(),
          1.05
        )
    },

    {
      duration:
        280
    }
  );
}


function resetFocus() {

  if (!cy) {
    return;
  }


  cy.elements()
    .removeClass(
      "faded focused"
    );


  if (
    !currentData
  ) {
    return;
  }


  const centerNode =
    cy.getElementById(
      currentData.center
    );


  if (
    centerNode.length
  ) {

    cy.animate(

      {
        center: {
          eles:
            centerNode
        },

        zoom:
          getDefaultZoom()
      },

      {
        duration:
          280
      }
    );
  }
}


function getDefaultZoom() {

  if (
    !currentData
  ) {

    return 0.9;
  }


  const count =
    currentData.nodes.length;


  if (
    count > 100
  ) {
    return 0.42;
  }


  if (
    count > 50
  ) {
    return 0.58;
  }


  if (
    count > 25
  ) {
    return 0.72;
  }


  return 0.9;
}


function showNodeDetails(node) {

  const data =
    node.data();


  els.detailType.textContent =
    String(
      data.type ||
      "node"
    ).toUpperCase();


  els.detailLabel.textContent =
    data.label ||
    data.id;


  els.detailSummary.textContent =
    data.summary ||
    "No description available.";


  /*
  VERSE TEXT
  */

  if (
    data.text
  ) {

    els.verseText.textContent =
      data.text;

    els.verseText.classList.remove(
      "hidden"
    );

  } else {

    els.verseText.textContent =
      "";

    els.verseText.classList.add(
      "hidden"
    );
  }


  /*
  METADATA
  */

  const meta = [

    [
      "ID",
      data.id
    ],

    [
      "TYPE",
      data.type
    ],

    [
      "REFERENCE",
      data.reference
    ],

    [
      "RELEVANCE",
      data.relevance
    ],

    [
      "SCORE",
      data.score
    ],

    [
      "SOURCE",
      data.sourceName
    ]

  ].filter(

    ([, value]) =>

      value !== undefined &&

      value !== null &&

      value !== ""
  );


  els.detailMeta.innerHTML =

    meta

      .map(

        ([label, value]) => `

          <div
            class="meta-row"
          >

            <span
              class="meta-label"
            >
              ${escapeHtml(
                label
              )}
            </span>

            <span
              class="meta-value"
            >
              ${escapeHtml(
                String(value)
              )}
            </span>

          </div>
        `
      )

      .join("");


  /*
  CONNECTIONS
  */

  const connectedEdges =
    node.connectedEdges();


  els.connectionCount.textContent =
    connectedEdges.length;


  const items =
    [];


  connectedEdges.forEach(

    edge => {

      const d =
        edge.data();


      const source =
        cy.getElementById(
          d.source
        );


      const target =
        cy.getElementById(
          d.target
        );


      const other =

        source.id() ===
        node.id()

          ? target

          : source;


      items.push(`

        <div
          class="connection-item"

          data-node-id="${escapeHtml(
            other.id()
          )}"
        >

          <div
            class="connection-target"
          >

            ${escapeHtml(

              other.data(
                "label"
              ) ||

              other.id()
            )}

          </div>


          <div
            class="connection-label"
          >

            ${escapeHtml(

              String(
                d.type ||
                "connection"
              ).toUpperCase()
            )}

            /

            ${escapeHtml(
              d.label ||
              ""
            )}

          </div>


          ${
            d.explanation

              ? `

                <div
                  class="connection-explanation"
                >

                  ${escapeHtml(
                    d.explanation
                  )}

                </div>
              `

              : ""
          }

        </div>
      `);
    }
  );


  els.connectionList.innerHTML =

    items.length

      ? items.join("")

      : `

        <div
          class="empty-state"
        >

          No connections found.

        </div>
      `;


  document
    .querySelectorAll(
      ".connection-item"
    )
    .forEach(

      item => {

        item.addEventListener(

          "click",

          () => {

            const target =
              cy.getElementById(
                item.dataset.nodeId
              );


            if (
              target.length
            ) {

              focusNode(
                target
              );

              showNodeDetails(
                target
              );
            }
          }
        );
      }
    );
}


function renderFilters(nodes) {

  const counts =
    {};


  for (
    const item
    of nodes
  ) {

    const type =
      item.data.type ||
      "node";


    counts[type] =
      (
        counts[type] ||
        0
      ) + 1;
  }


  els.filterList.innerHTML =

    Object.entries(
      counts
    )

      .sort(
        ([a], [b]) =>
          a.localeCompare(
            b
          )
      )

      .map(

        ([type, count]) => `

          <label
            class="filter-row"
          >

            <input
              type="checkbox"

              value="${escapeHtml(
                type
              )}"

              checked
            />

            <span>

              ${escapeHtml(
                type
              )}

            </span>

            <span
              class="filter-count"
            >

              ${count}

            </span>

          </label>
        `
      )

      .join("");


  els.filterList

    .querySelectorAll(
      "input"
    )

    .forEach(

      input => {

        input.addEventListener(

          "change",

          applyFilters
        );
      }
    );
}


function applyFilters() {

  if (!cy) {
    return;
  }


  const selected =

    Array.from(

      els.filterList

        .querySelectorAll(
          "input:checked"
        )
    )

    .map(
      input =>
        input.value
    );


  cy.nodes()

    .forEach(

      node => {

        node.style(

          "display",

          selected.includes(
            node.data(
              "type"
            )
          )

            ? "element"

            : "none"
        );
      }
    );


  cy.edges()

    .forEach(

      edge => {

        const visible =

          edge.source()
            .style(
              "display"
            ) !==
            "none"

          &&

          edge.target()
            .style(
              "display"
            ) !==
            "none";


        edge.style(

          "display",

          visible

            ? "element"

            : "none"
        );
      }
    );
}


function renderStats(data) {

  els.nodeCount.textContent =
    data.nodes.length;


  els.edgeCount.textContent =
    data.edges.length;


  els.queryType.textContent =
    data.queryType ||
    "—";
}


function renderSources(sources) {

  els.sourceList.innerHTML =

    sources.length

      ? sources

          .map(

            source => `

              <div
                class="source-item"
              >

                ${escapeHtml(
                  source
                )}

              </div>
            `
          )

          .join("")

      : "No source information returned.";
}


function setLoading(
  isLoading
) {

  els.loadingState

    .classList

    .toggle(
      "hidden",
      !isLoading
    );


  els.searchButton.disabled =
    isLoading;
}


function setStatus(
  message
) {

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


function escapeHtml(
  value
) {

  return String(
    value
  )

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );
}


els.searchButton

  .addEventListener(

    "click",

    runSearch
  );


els.searchInput

  .addEventListener(

    "keydown",

    event => {

      if (
        event.key ===
        "Enter"
      ) {

        runSearch();
      }
    }
  );


document

  .querySelectorAll(
    "[data-query]"
  )

  .forEach(

    button => {

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
    }
  );
