const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mergeGraphs, validateGraph, toMarkdown } = require("../graph-utils.js");
function graph(query, refs) {
  const nodes = [
    { data: { id: "topic-center", label: query, type: "topic" } },
    { data: { id: "subtheme-0", label: "Theme", type: "subtheme" } },
  ];
  refs.forEach((reference, i) =>
    nodes.push({
      data: {
        id: `verse-${i}`,
        label: reference,
        reference,
        type: "verse",
        text: "Real passage",
        sourceName: "BSB",
      },
    }),
  );
  const edges = nodes
    .slice(1)
    .map((n, i) => ({
      data: {
        id: `e-${i}`,
        source: "topic-center",
        target: n.data.id,
        type: "topic",
      },
    }));
  return {
    query,
    center: "topic-center",
    centerLabel: query,
    nodes,
    edges,
    sources: ["BSB"],
  };
}
test("merge shares exact references and scopes non-verse IDs", () => {
  const merged = mergeGraphs(
    graph("fear", ["John 3:16", "James 1:12"]),
    graph("hope", ["John 3:16", "Romans 8:28"]),
  );
  assert.equal(merged.nodes.length, 7);
  assert.deepEqual(merged.comparison, {
    left: "fear",
    right: "hope",
    shared: 1,
    leftOnly: 1,
    rightOnly: 1,
  });
  assert.equal(
    new Set(merged.nodes.map((n) => n.data.id)).size,
    merged.nodes.length,
  );
  const shared = merged.nodes.find((n) => n.data.membership === "shared").data;
  assert.equal(shared.evidence.length, 2);
  validateGraph(merged);
});
test("ranges with different displayed references do not imply false overlap", () => {
  assert.equal(
    mergeGraphs(graph("a", ["Romans 5:3"]), graph("b", ["Romans 5:3-5"]))
      .comparison.shared,
    0,
  );
});
test("same search compares every retrieved reference as shared", () => {
  const a = graph("a", ["John 3:16", "Romans 8:28"]);
  assert.equal(mergeGraphs(a, a).comparison.shared, 2);
});
test("malformed graph endpoints and duplicate element IDs are rejected", () => {
  const a = graph("a", ["John 3:16"]);
  a.edges[0].data.target = "absent";
  assert.throws(() => validateGraph(a));
  const b = graph("a", []);
  b.edges[0].data.id = "topic-center";
  assert.throws(() => validateGraph(b));
});
test("export preserves notes, quotation, reference and source", () => {
  const text = toMarkdown({
    name: "My study",
    entries: [
      {
        reference: "John 3:16",
        text: "Verse text",
        source: "BSB",
        query: "love",
        note: "My own observation",
      },
    ],
  });
  for (const expected of [
    "# My study",
    "John 3:16",
    "Verse text",
    "Source: BSB",
    "My own observation",
  ])
    assert.ok(text.includes(expected));
});
const {
  textComparison,
  validateComparison,
  buildStudyOutline,
} = require("../graph-utils.js");
test("different references still produce a thematic similarity", () => {
  const a = graph("trust", ["John 3:16"]),
    b = graph("faith", ["Romans 8:28"]);
  a.nodes[2].data.text = "Trust in the Lord.";
  b.nodes[2].data.text = "Live by faith.";
  const merged = mergeGraphs(a, b),
    report = textComparison(merged);
  assert.equal(merged.comparison.shared, 0);
  assert.equal(report.similarities[0].title, "Trust & faith");
  validateComparison(report, merged);
  const outline = buildStudyOutline(merged, report);
  assert.equal(outline.entries.length, 2);
  assert.ok(toMarkdown(outline).includes("## Comparison overview"));
  assert.ok(toMarkdown(outline).includes("## Study questions"));
});
test("same selection has no manufactured differences", () => {
  const a = graph("trust", ["John 3:16"]);
  a.nodes[2].data.text = "Trust in God.";
  assert.equal(textComparison(mergeGraphs(a, a)).differences.length, 0);
});
test("unsupported citations cannot enter the comparison", () => {
  const a = graph("trust", ["John 3:16"]),
    b = graph("faith", ["Romans 8:28"]);
  a.nodes[2].data.text = "Trust";
  b.nodes[2].data.text = "Faith";
  const merged = mergeGraphs(a, b),
    report = textComparison(merged);
  report.similarities[0].left_refs = ["Invented 1:1"];
  assert.throws(() => validateComparison(report, merged));
});
