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
  const THEMES = [
    ['Trust & faith', /\b(faith\w*|trust\w*|believ\w*)\b/i],
    ['Hope & promise', /\b(hope\w*|promis\w*)\b/i],
    ['Trials & perseverance', /\b(suffer\w*|trial\w*|persever\w*|endur\w*)\b/i],
    ['Love & compassion', /\b(lov\w*|compassion\w*|kindness)\b/i],
    ['Fear & courage', /\b(fear\w*|afraid|courage\w*)\b/i],
    ['Peace & comfort', /\b(peace\w*|comfort\w*|rest)\b/i],
    ['Prayer & worship', /\b(pray\w*|worship\w*|prais\w*)\b/i],
    ['Grace & forgiveness', /\b(grace|forgiv\w*|mercy|merciful)\b/i],
    ['Wisdom & guidance', /\b(wisdom|wise|guid\w*|teach\w*)\b/i],
    ['Life & salvation', /\b(life|salvation|saved|eternal)\b/i],
    ['Justice & righteousness', /\b(justice|righteous\w*|judgment)\b/i]
  ];
  function verseSets(data) {
    const sets = [[], []];
    data.nodes.filter(n => n.data.type === 'verse' && n.data.text).forEach(({data:d}) => {
      const sides = d.evidence ? [...new Set(d.evidence.map(e => e.side))] : [0];
      sides.forEach(side => sets[side].push({reference:d.reference || d.label, text:d.text, id:d.id}));
    });
    return sets;
  }
  function textComparison(data) {
    const [left, right] = verseSets(data);
    const similarities = [], differences = [];
    const identical = left.length === right.length && left.every(a => right.some(b => b.reference === a.reference && b.text === a.text));
    for (const [title, pattern] of THEMES) {
      const a = left.filter(p => pattern.test(p.text)), b = right.filter(p => pattern.test(p.text));
      if (a.length && b.length) {
        similarities.push({title, explanation:`Both selections contain language about ${title.toLowerCase()}: ${a.length} of ${left.length} passages in A and ${b.length} of ${right.length} in B match this theme's word family. This word match is a starting point; the contexts may differ.`, left_refs:a.slice(0,2).map(p=>p.reference), right_refs:b.slice(0,2).map(p=>p.reference)});
        if (!identical && Math.abs(a.length / left.length - b.length / right.length) >= .12) differences.push({title, left_focus:`${a.length} of ${left.length} retrieved passages contain this theme's word family.`, right_focus:`${b.length} of ${right.length} retrieved passages contain this theme's word family.`, left_refs:a.slice(0,2).map(p=>p.reference), right_refs:b.slice(0,2).map(p=>p.reference)});
      }
    }
    if (!identical && !differences.length && left.length && right.length) {
      const a = left.find(p=>!right.some(q=>q.reference===p.reference)) || left[0];
      const b = right.find(p=>!left.some(q=>q.reference===p.reference)) || right[0];
      differences.push({title:'Different passages to begin with',left_focus:`“${a.text.slice(0,210)}${a.text.length>210?'…':''}”`,right_focus:`“${b.text.slice(0,210)}${b.text.length>210?'…':''}”`,left_refs:[a.reference],right_refs:[b.reference]});
    }
    return {method:'text', overview:identical ? 'These searches returned the same passage selection. There is no evidence-based difference to invent.' : `Compare ${left.length} passages from A with ${right.length} from B. The preview below highlights shared language and differences in these retrieved selections; the AI explanation can also connect ideas expressed with different words.`, similarities:similarities.slice(0,3),differences:differences.slice(0,3),study_questions:['What idea do the passages from both searches share, and how does each express it?','How does the surrounding context change your understanding of these passages?','What question would you investigate next?']};
  }
  function validateComparison(report, data) {
    if (!report || typeof report.overview !== 'string' || !Array.isArray(report.similarities) || !Array.isArray(report.differences) || !Array.isArray(report.study_questions) || report.similarities.length > 3 || report.differences.length > 3 || report.study_questions.length > 3 || !report.study_questions.every(q=>typeof q==='string')) throw new Error('Invalid comparison explanation.');
    const sets = verseSets(data).map(items=>new Set(items.map(p=>p.reference)));
    for (const [kind, items] of [['similarity',report.similarities],['difference',report.differences]]) {
      for (const item of items) {
        if (typeof item.title !== 'string' || (kind === 'similarity' ? typeof item.explanation !== 'string' : typeof item.left_focus !== 'string' || typeof item.right_focus !== 'string')) throw new Error('Invalid comparison finding.');
        for (const [index, field] of ['left_refs','right_refs'].entries()) {
          if (!Array.isArray(item[field]) || !item[field].length || item[field].length>3 || !item[field].every(ref=>sets[index].has(ref))) throw new Error('Comparison cited an unrelated passage.');
        }
      }
    }
    return report;
  }
  function buildStudyOutline(data, report) {
    validateComparison(report, data);
    const references = new Set([...report.similarities,...report.differences].flatMap(item=>[...item.left_refs,...item.right_refs]));
    const entries = data.nodes.filter(n=>n.data.type==='verse' && references.has(n.data.reference || n.data.label)).map(({data:d})=>({id:d.reference || d.label,reference:d.reference || d.label,text:d.text || '',source:d.sourceName || 'Berean Standard Bible',query:data.query,note:''}));
    return {name:`${data.comparison.left} ↔ ${data.comparison.right}`.slice(0,80), entries, outline:structuredClone(report)};
  }
  function toMarkdown(collection) {
    const lines = [`# ${collection.name}`, '', 'Saved from Scripture Graph. Notes are personal; AI explanations are not Scripture.', ''];
    if (collection.outline) {
      const report = collection.outline;
      lines.push('## Comparison overview', '', `${report.method === 'ai' ? 'AI-assisted interpretation' : 'Text-based preview'}; based only on retrieved passages.`, '', report.overview, '', '## Similarities', '');
      report.similarities.forEach(item=>lines.push(`### ${item.title}`, '', item.explanation, '', `A: ${item.left_refs.join(', ')} · B: ${item.right_refs.join(', ')}`, ''));
      lines.push('## Differences in emphasis', '');
      report.differences.forEach(item=>lines.push(`### ${item.title}`, '', `A: ${item.left_focus}`, `B: ${item.right_focus}`, '', `A references: ${item.left_refs.join(', ')} · B references: ${item.right_refs.join(', ')}`, ''));
      lines.push('## Study questions', '', ...report.study_questions.map(q=>`- ${q}`), '');
    }
    for (const entry of collection.entries) {
      lines.push(`## ${entry.reference}`, '', entry.text, '', `Source: ${entry.source}`, `Saved from search: ${entry.query}`, '', '### My notes', '', entry.note || '(No notes yet)', '');
    }
    return lines.join('\n');
  }
  const api = {validateGraph, mergeGraphs, toMarkdown, textComparison, validateComparison, buildStudyOutline, verseSets};
  root.ScriptureGraphUtils = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
