/* Pure data transformations: no browser, network, or AI calls. */
(function (root) {
  function validateGraph(graph) {
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
      throw new Error('The server returned an invalid graph. Please retry.');
    }
    const ids = new Set();
    for (const item of graph.nodes) {
      const d = item && item.data;
      if (!d || typeof d.id !== 'string' || typeof d.label !== 'string' || ids.has(d.id)) {
        throw new Error('The server returned invalid graph nodes. Please retry.');
      }
      ids.add(d.id);
    }
    if (!ids.has(graph.center)) throw new Error('The graph has no search center. Please retry.');
    const edgeIds = new Set(ids);
    for (const item of graph.edges) {
      const d = item && item.data;
      if (!d || typeof d.id !== 'string' || edgeIds.has(d.id) || !ids.has(d.source) || !ids.has(d.target)) {
        throw new Error('The server returned invalid graph connections. Please retry.');
      }
      edgeIds.add(d.id);
    }
    return graph;
  }

  function mergeGraphs(left, right) {
    validateGraph(left); validateGraph(right);
    const nodes = new Map();
    const edges = [];
    const centers = [];
    // Only identical displayed verse references merge. Topic/subtheme IDs are local
    // to each API result and must never be treated as shared evidence.
    [left, right].forEach((graph, side) => {
      const mapping = new Map();
      graph.nodes.forEach(({data}) => {
        const key = data.type === 'verse'
          ? `verse:${String(data.reference || data.label).trim().toLowerCase()}`
          : `${side}:${data.id}`;
        if (!nodes.has(key)) {
          nodes.set(key, {data: {...data, id: `n-${nodes.size}`, membership: side === 0 ? 'left' : 'right', evidence: []}});
        }
        const merged = nodes.get(key).data;
        merged.evidence.push({...data, query: graph.query, side});
        if (merged.evidence.some(e => e.side === 0) && merged.evidence.some(e => e.side === 1)) merged.membership = 'shared';
        merged.isCenter = Boolean(merged.isCenter || data.id === graph.center);
        mapping.set(data.id, merged.id);
      });
      centers.push(mapping.get(graph.center));
      graph.edges.forEach(({data}, index) => {
        edges.push({data: {...data, id: `edge-${side}-${index}`, source: mapping.get(data.source), target: mapping.get(data.target), searchSide: side, query: graph.query}});
      });
    });
    const verses = [...nodes.values()].filter(n => n.data.type === 'verse');
    return {
      query: `${left.query} / ${right.query}`, queryType: 'comparison', center: centers[0], centers,
      centerLabel: `${left.centerLabel} ↔ ${right.centerLabel}`,
      nodes: [...nodes.values()], edges,
      sources: [...new Set([...(left.sources || []), ...(right.sources || [])])],
      comparison: {
        left: left.query, right: right.query,
        shared: verses.filter(n => n.data.membership === 'shared').length,
        leftOnly: verses.filter(n => n.data.membership === 'left').length,
        rightOnly: verses.filter(n => n.data.membership === 'right').length
      }
    };
  }
  function toMarkdown(collection) {
    const lines = [`# ${collection.name}`, '', 'Saved from Scripture Graph. Notes are personal; AI explanations are not Scripture.', ''];
    for (const entry of collection.entries) {
      lines.push(`## ${entry.reference}`, '', entry.text, '', `Source: ${entry.source}`, `Saved from search: ${entry.query}`, '', '### My notes', '', entry.note || '(No notes yet)', '');
    }
    return lines.join('\n');
  }
  const api = {validateGraph, mergeGraphs, toMarkdown};
  root.ScriptureGraphUtils = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
