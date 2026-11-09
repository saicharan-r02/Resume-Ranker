import { SOFTWARE_LEVEL } from './dictionary.mjs';
import { weightOf, round1 } from './text.mjs';

const SECTION_NAMES = { none: 'the top of the resume', summary: 'summary', experience: 'experience', education: 'education', skills: 'skills', projects: 'projects', certifications: 'certifications', publications: 'publications', awards: 'awards', other: 'other sections' };

const clamp01 = (x) => Math.max(0, Math.min(1, x));

function curve(points, x) {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x0, y0] = points[i - 1];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return points[points.length - 1][1];
}

const evidence = (matches, n = 6) =>
  [...matches]
    .sort((a, b) => b.w * b.count - a.w * a.count)
    .slice(0, n)
    .map((m) => ({ label: m.count > 1 ? `${m.name} x${m.count}` : m.name, where: m.sections.map((x) => SECTION_NAMES[x] || x).join(', '), snippet: m.snippet }));

function experienceBasis(e, field) {
  const datedField = field === 'lcaYears' ? 'lca' : field === 'designYears' ? 'design' : 'total';
  const statedField = datedField;
  if (e.overridden?.includes(field)) {
    return `${e[field]} yrs (review-corrected; automatic dated estimate ${e.dated[datedField]} yrs, stated in text ${e.stated[statedField] || 'n/a'})`;
  }
  return `${e[field]} yrs (dated roles: ${e.dated[datedField]}, stated: ${e.stated[statedField] || 'n/a'})`;
}

const comp = (key, label, max, share, detail, ev = []) => ({
  key,
  label,
  max,
  score: round1(max * clamp01(share)),
  detail,
  evidence: ev,
});
function educationShare(x, catScores, { masterBonus = 2, bachelorBonus = 1 } = {}) {
  const degs = x.education.degrees;
  if (!degs.length) return { pts: 0, detail: 'No degree detected in the resume.', best: null };
  const ranked = [...degs].sort((a, b) => (catScores[b.category] ?? 3) - (catScores[a.category] ?? 3) || b.level - a.level);
  const best = ranked[0];
  const base = catScores[best.category] ?? 3;
  let bonus = best.level >= 3 ? masterBonus : best.level >= 2 ? bachelorBonus : -2;
  const pts = Math.max(0, Math.min(10, base + bonus));
  return { pts, best, detail: `${best.levelLabel} in a ${best.category.replace('_', '/')} field: "${best.text.slice(0, 90)}"` };
}

export function scoreLca(x) {
  const s = x.skills;
  const comps = [];

  const coreNames = new Set([
    'Life Cycle Assessment', 'LCA', 'Life Cycle Inventory (LCI)', 'Impact assessment (LCIA)',
    'EPD', 'Carbon footprint', 'System boundary / functional unit', 'Impact methods (ReCiPe/TRACI/CML/PEF)',
  ]);
  const core = s.lcaConcepts.filter((m) => coreNames.has(m.name));
  const adjacent = s.lcaConcepts.filter((m) => !coreNames.has(m.name));
  const coreWeight = weightOf(core);
  const adjacentWeight = weightOf(adjacent);
  const conceptPoints = 24 * clamp01(coreWeight / 10) + 6 * clamp01(adjacentWeight / 6);
  comps.push({
    key: 'concepts',
    label: 'LCA knowledge & terminology',
    max: 30,
    score: round1(conceptPoints),
    detail: `${core.length} core LCA concepts (weight ${coreWeight.toFixed(1)}; 10 earns 24 points) and ${adjacent.length} adjacent sustainability concepts (weight ${adjacentWeight.toFixed(1)}; 6 earns 6 points). General ESG terminology cannot substitute for LCA methods.`,
    evidence: evidence(s.lcaConcepts),
  });

  let best = 0;
  let bestM = null;
  for (const m of s.lcaSoftware) {
    const lv = SOFTWARE_LEVEL[m.name] ?? 0.3;
    if (lv > best) {
      best = lv;
      bestM = m;
    }
  }
  let swShare = best;
  let swDetail = 'No LCA software (GaBi / SimaPro / openLCA ...) mentioned.';
  if (bestM) {
    const handsOn = bestM.sections.some((sec) => ['experience', 'projects', 'none'].includes(sec));
    if (best === 1) {
      swShare = handsOn ? 1 : 0.8;
      swDetail = handsOn ? `${bestM.name} appears in work/project context - counts as hands-on (JD requires GaBi or SimaPro).` : `${bestM.name} appears only in a skills list - 80% credit until hands-on use is confirmed.`;
    } else {
      swDetail = `${bestM.name} found, but the JD specifically requires GaBi or SimaPro - partial credit.`;
    }
  }
  comps.push(comp('software', 'LCA software (GaBi / SimaPro)', 20, swShare, swDetail, evidence(s.lcaSoftware)));

  const e = x.experience;
  const expShare = curve([[0, 0], [1, 0.3], [2, 0.7], [3, 0.85], [4, 1]], e.lcaYears);
  comps.push(
    comp('experience', 'Relevant LCA experience', 20, expShare,
      `${experienceBasis(e, 'lcaYears')} of LCA-related work. JD body asks 2-3 yrs of independent LCA work; the listing header says 4-6 yrs. Full marks at 4+.`,
      e.entries.filter((en) => en.lcaRelevant).slice(0, 4).map((en) => ({ label: en.title || '(untitled role)', where: en.range, snippet: '' })))
  );

  const wStd = weightOf(s.standards);
  const stdPts = 6 * clamp01(wStd / 8);
  const projPts = 4 * clamp01(e.lcaProjects / 3);
  comps.push({
    key: 'standards',
    label: 'ISO standards & project history',
    max: 10,
    score: round1(stdPts + projPts),
    detail: `Standards ${stdPts.toFixed(1)}/6 (ISO 14040/14044 weigh most); LCA projects ${projPts.toFixed(1)}/4 (${e.lcaProjects} found - ${e.lcaProjectsBasis}; JD wants 3+).` +
      (stdPts < 6 && x.isoBareMentions > 0
        ? ` Note: ${x.isoBareMentions} bare "ISO" mention${x.isoBareMentions === 1 ? '' : 's'} found with no standard number. The supplied anonymized resumes had 5+ digit numbers removed (14040/14044 included), so these cannot be credited automatically - verify against the original.`
        : ''),
    evidence: evidence(s.standards),
  });

  const edu = educationShare(x, { environmental: 8, engineering_science: 6, computing: 4, business: 4, design: 3, other: 3 });
  comps.push(comp('education', 'Education (environmental preferred)', 10, edu.pts / 10, edu.detail, edu.best ? [{ label: edu.best.text.slice(0, 80), where: 'education', snippet: '' }] : []));

  const w6 = weightOf(s.lcaSupport);
  comps.push(
    comp('support', 'Data, benchmarking & stakeholder work', 10, w6 / 6,
      `${s.lcaSupport.length} JD responsibilities echoed (data collection, QC, benchmarking, stakeholders, logistics, relocation...).`,
      evidence(s.lcaSupport, 5))
  );

  const total = round1(comps.reduce((a, c) => a + c.score, 0));
  const distinct = s.lcaConcepts.length + s.lcaSoftware.length + s.standards.length;
  return { total, max: 100, components: comps, distinctEvidence: distinct, topEvidence: topNames([...s.lcaSoftware, ...s.standards, ...s.lcaConcepts]) };
}

export function scoreUx(x) {
  const s = x.skills;
  const e = x.experience;
  const comps = [];
  const w1 = weightOf(s.uxTools);
  const hasFigma = s.uxTools.some((m) => m.name === 'Figma');
  comps.push(
    comp('tools', 'Design & prototyping tools (Figma first)', 25, w1 / 16,
      hasFigma ? `Figma found. ${s.uxTools.length} tools in total (evidence weight ${w1.toFixed(1)}; 16 earns full marks).` : `Figma NOT found - the JD names it explicitly. ${s.uxTools.length} other tools matched.`,
      evidence(s.uxTools))
  );

  const w2 = weightOf(s.uxMethods);
  comps.push(
    comp('methods', 'UX methods, research & psychology', 25, w2 / 14,
      `${s.uxMethods.length} UX concepts found (evidence weight ${w2.toFixed(1)}; 14 earns full marks).`,
      evidence(s.uxMethods))
  );

  const linkPts = x.hasPortfolioLink ? 8 : x.mentionsPortfolio ? 4 : 0;
  const projPts = 4 * Math.min(3, e.designProjects);
  comps.push({
    key: 'portfolio',
    label: 'Portfolio & design projects',
    max: 20,
    score: round1(linkPts + projPts),
    detail: `${x.hasPortfolioLink ? 'Portfolio link found' : x.mentionsPortfolio ? 'Portfolio mentioned but no link found' : 'No portfolio link or mention'} (${linkPts}/8); ${e.designProjects} design project/case study entries (${projPts}/12, 3 earn full marks).`,
    evidence: [
      ...x.links.filter((l) => l.type === 'portfolio').slice(0, 2).map((l) => ({ label: l.url, where: 'link', snippet: '' })),
      ...x.projects.filter((p) => p.design).slice(0, 3).map((p) => ({ label: p.title, where: 'projects', snippet: '' })),
    ],
  });

  const signal = w1 + w2;
  const designToolNames = new Set(['Figma', 'FigJam', 'Adobe XD', 'Sketch', 'InVision', 'Framer', 'ProtoPie', 'Axure', 'Balsamiq', 'Zeplin / Penpot / UXPin']);
  const hasDesignTool = s.uxTools.some((m) => designToolNames.has(m.name));
  let share;
  let detail;
  if (e.designYears === 0) {
    const credible = hasDesignTool && s.uxMethods.length >= 2;
    share = credible ? (signal >= 6 ? 1 : 0.6) : 0;
    detail = share ? 'No dated design roles: tool and UX-method evidence supports treating this as a fresher, consistent with the 0-1 yr brief.' : 'No dated design role plus insufficient dedicated design-tool evidence to award fresher experience credit.';
  } else {
    share = curve([[0.01, 1], [1, 1], [2, 0.7], [3, 0.45], [5, 0.25], [8, 0.2]], e.designYears);
    detail = `${experienceBasis(e, 'designYears')} of UX/UI-related work. Brief is 0-1 yr${e.designYears > 2 ? ' - likely over-qualified for a 10-15k stipend internship' : ''}.`;
  }
  comps.push(comp('experience', 'Experience fit (0-1 yr internship)', 10, share, detail,
    e.entries.filter((en) => en.designRelevant).slice(0, 3).map((en) => ({ label: en.title || '(untitled role)', where: en.range, snippet: '' }))));
  const edu = educationShare(x, { design: 8, computing: 6, engineering_science: 4, business: 4, environmental: 3, other: 4 }, { masterBonus: 2, bachelorBonus: 1 });
  const certBonus = x.certSignals.ux ? 2 : 0;
  comps.push(
    comp('education', 'Education & design courses', 10, (edu.pts + certBonus) / 10,
      `${edu.detail}${certBonus ? ' +2 for a UX course/certificate.' : ''}`,
      edu.best ? [{ label: edu.best.text.slice(0, 80), where: 'education', snippet: '' }] : [])
  );

  const craft = s.uxExtras.filter((m) => m.group === 'craft');
  const sustain = s.uxExtras.some((m) => m.group === 'sustain');
  const domain = s.uxExtras.some((m) => m.group === 'domain');
  const craftPts = 5 * clamp01(weightOf(craft) / 4);
  const extrasPts = craftPts + (sustain ? 3 : 0) + (domain ? 2 : 0);
  comps.push({
    key: 'extras',
    label: 'Aesthetic craft & domain fit',
    max: 10,
    score: round1(extrasPts),
    detail: `Visual craft ${craftPts.toFixed(1)}/5 (${craft.length} skills); sustainability interest ${sustain ? '3' : '0'}/3; web/product design context ${domain ? '2' : '0'}/2.`,
    evidence: evidence(s.uxExtras, 5),
  });

  const total = round1(comps.reduce((a, c) => a + c.score, 0));
  const distinct = s.uxTools.length + s.uxMethods.length + craft.length;
  return { total, max: 100, components: comps, distinctEvidence: distinct, topEvidence: topNames([...s.uxTools, ...s.uxMethods]) };
}

function topNames(matches, n = 5) {
  return [...matches].sort((a, b) => b.w * Math.min(b.count, 3) - a.w * Math.min(a.count, 3)).slice(0, n).map((m) => m.name);
}
