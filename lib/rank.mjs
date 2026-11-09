export const relevantYears = (c, role) => (role === 'lca' ? c.extraction.experience.lcaYears : c.extraction.experience.designYears);

export function compareFor(role) {
  return (a, b) =>
    b.scores[role].total - a.scores[role].total ||
    relevantYears(b, role) - relevantYears(a, role) ||
    b.scores[role].distinctEvidence - a.scores[role].distinctEvidence ||
    a.filename.localeCompare(b.filename);
}

export function rankMaps(candidates) {
  const out = {};
  const readable = candidates.filter((c) => c.status !== 'error' && c.classification.label !== 'UNREADABLE');
  for (const role of ['lca', 'ux']) {
    out[role] = new Map([...readable].sort(compareFor(role)).map((c, i) => [c.id, i + 1]));
  }
  return out;
}
