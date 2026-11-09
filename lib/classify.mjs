export const THRESHOLDS = {
  strong: 45,
  min: 25,
  bothMargin: 15,
  clearMargin: 12,
};

export const LABELS = {
  LCA: 'LCA Consultant',
  UX: 'UI/UX Intern',
  BOTH: 'Both roles',
  NEITHER: 'Neither / uncertain',
  UNREADABLE: 'Unreadable / not classified'
};

export function classify(lca, ux, { unreadable = false, lcaCore = false, lcaHasPracticalEvidence = false, uxHasDesignTool = false } = {}) {
  const T = THRESHOLDS;
  const max = Math.max(lca, ux);
  const min = Math.min(lca, ux);
  const diff = max - min;
  const scores = `LCA ${lca.toFixed(0)} vs UI/UX ${ux.toFixed(0)}`;

  if (unreadable) {
    return { label: 'UNREADABLE', confidence: 'low', reason: 'The resume text could not be read, so no reliable classification is possible. It is excluded from role rankings until a readable source or verified text is supplied.' };
  }
  if (lca >= T.strong && ux >= T.strong && diff <= T.bothMargin) {
    return { label: 'BOTH', confidence: 'medium', reason: `${scores}: both roles score at least ${T.strong} and are within ${T.bothMargin} points of each other.` };
  }
  if (max < T.min) {
    return { label: 'NEITHER', confidence: max < 15 ? 'high' : 'medium', reason: `${scores}: neither role reaches the minimum of ${T.min}, so the resume does not show enough role-specific evidence.` };
  }
  if (diff < T.clearMargin) {
    return { label: 'NEITHER', confidence: 'low', reason: `${scores}: the scores are within ${T.clearMargin} points and not both strong - the resume is ambiguous, so a human should decide.` };
  }
  const label = lca > ux ? 'LCA' : 'UX';
  let confidence = max >= T.strong && diff >= 25 ? 'high' : max >= T.strong || diff >= 20 ? 'medium' : 'low';
  const roleName = label === 'LCA' ? 'LCA Consultant' : 'UI/UX Intern';
  const caveats = [];
  if (label === 'LCA') {
    if (!lcaCore) confidence = 'low';
    if (!lcaHasPracticalEvidence) {
      confidence = 'low';
      caveats.push('No dated LCA work, completed LCA project, or GaBi/SimaPro evidence was found; this is a keyword-level match, not proof of the JD experience requirements');
    }
  } else if (!uxHasDesignTool) {
    confidence = 'low';
    caveats.push('No Figma or other dedicated design/prototyping tool was found, so a mandatory JD2 requirement is unverified');
  }
  return { label, confidence, reason: `${scores}: stronger match for ${roleName}, leading by ${diff.toFixed(0)} points${max < T.strong ? ` (but the winning score is below ${T.strong}, so the match is weak)` : ''}${caveats.length ? `. ${caveats.join('; ')}.` : '.'}` };
}
