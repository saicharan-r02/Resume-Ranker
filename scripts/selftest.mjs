import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeFile } from '../lib/parse-file.mjs';
import { JOBS } from '../lib/jobs.mjs';
import { extractResume } from '../lib/extract.mjs';
import { findRange } from '../lib/text.mjs';
import { rankMaps } from '../lib/rank.mjs';
import { analyzeText } from '../lib/pipeline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(ROOT, 'samples');
const expected = {
  '01_lca_senior.pdf': 'LCA', '02_lca_mid.pdf': 'LCA', '03_lca_fresher.docx': 'LCA',
  '04_ux_fresher_twocol.pdf': 'UX', '05_ux_senior.pdf': 'UX', '06_ux_intern_cs.docx': 'UX',
  '07_software_dev.pdf': 'NEITHER', '08_both_hybrid.pdf': 'BOTH', '09_scanned_image_only.pdf': 'UNREADABLE',
  '10_plain_noheadings.txt': 'LCA', '11_marketing.pdf': 'NEITHER',
};
let failed = 0;
const check = (ok, msg) => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); };

for (const role of ['lca', 'ux']) {
  const sum = JOBS[role].rubric.reduce((a, r) => a + r.max, 0);
  check(sum === 100, `${role} rubric maxima add up to 100 (got ${sum})`);
}
for (const [file, want] of Object.entries(expected)) {
  const buffer = await fs.readFile(path.join(dir, file)).catch(() => null);
  if (!buffer) { check(false, `${file} missing`); continue; }
  const c = await analyzeFile({ id: file, filename: file, buffer });
  check(c.classification.label === want, `${file} -> ${c.classification.label} (want ${want}) LCA ${c.scores.lca.total} / UX ${c.scores.ux.total}`);
  for (const role of ['lca', 'ux']) {
    const maxes = c.scores[role].components.map((k) => k.max).join(',');
    const want = JOBS[role].rubric.map((r) => r.max).join(',');
    if (maxes !== want) check(false, `${file}: ${role} component maxima ${maxes} differ from rubric ${want}`);
  }
}

const now = new Date('2026-11-09T12:00:00');
const crossYear = findRange('Dec–Jan 2025', now);
check(Boolean(crossYear) && crossYear.months === 1, 'Dec–Jan 2025 is read as Dec 2024 to Jan 2025');
const sameYear = findRange('May–July 2025', now);
check(Boolean(sameYear) && sameYear.months === 2, 'May–July 2025 is read as a two-month interval');

const projectTest = extractResume([
  'Candidate',
  'Projects / Deliverables',
  'Modelling and Optimization of an Intensified Water Electrolysis Process',
  'Developed and optimized a methanol production model using Aspen Plus and Python.',
  'Development of a Decision Support System for Watershed Morphology',
  'Developed an interactive calculator using Python and Qt Designer.',
  'Education',
  'B.Tech Environmental Engineering',
].join('\n'), { now }).extraction;
check(projectTest.projects.length === 2, `Projects / Deliverables extracts two named project entries (got ${projectTest.projects.length})`);
check(projectTest.projects[1]?.title.includes('Decision Support System'), 'multiword project titles with connector words are retained');

const lcaCountTest = extractResume([
  'Candidate', 'Experience', 'LCA Analyst — Example Ltd. Jan 2023 – Present',
  '• Collected data for product LCA studies.',
  '• Built the LCI model and checked environmental impacts.',
  '• Documented assumptions and presented results.',
  'Education', 'MSc Environmental Engineering',
].join('\n'), { now }).extraction.experience;
check(lcaCountTest.lcaProjects === 0, 'experience bullets are not counted as separate completed LCA projects');

const namedLcaCountTest = extractResume([
  'Candidate', 'Projects / Deliverables',
  'Product A Life Cycle Assessment', 'Conducted a cradle-to-gate LCA using SimaPro.',
  'Product B Life Cycle Assessment', 'Completed an LCA with ReCiPe and ecoinvent.',
  'Education', 'MSc Environmental Engineering',
].join('\n'), { now }).extraction.experience;
check(namedLcaCountTest.lcaProjects === 2, `named LCA project entries are counted distinctly (got ${namedLcaCountTest.lcaProjects})`);

const physicalDesignTest = extractResume([
  'Candidate', 'Projects / Deliverables', 'Fabrication of Dual Mode Scooty',
  'Designed and developed a dual-mode scooty, improving usability in driving conditions.',
  'Education', 'B.Tech Mechanical Engineering',
].join('\n'), { now }).extraction;
check(physicalDesignTest.projects.length === 1 && !physicalDesignTest.projects[0].design, 'mechanical product usability is not mislabelled as UI/UX design');

const roleRelevanceTest = extractResume([
  'Candidate', 'Experience',
  'Graphic Designer — Example Agency Jan 2024 – Dec 2024',
  'Created social media creatives, banners, posters, logos and brand assets.',
  'UI/UX Design Intern — Product Studio Jan 2025 – Jun 2025',
  'Designed user flows, Figma wireframes, prototypes and interface screens.',
  'Full Stack Developer — Contract Jan 2023 – Dec 2023',
  'Built React frontend UI components and backend APIs for a web application that delivers a smooth user experience.',
  'UI Designer — Example Co Jan 2022 – Dec 2022',
  'Designed mobile app UI screens and responsive website interfaces.',
  'Education', 'B.Des Communication Design',
].join('\n'), { now }).extraction.experience;
check(roleRelevanceTest.entries[0]?.designRelevant === false, 'pure graphic-design employment is not counted as UX/UI experience');
check(roleRelevanceTest.entries[1]?.designRelevant === true, 'explicit UI/UX internship is counted as UX/UI experience');
check(roleRelevanceTest.entries[2]?.designRelevant === false, 'frontend implementation alone is not counted as UX/UI design experience');
check(roleRelevanceTest.entries[3]?.designRelevant === true, 'explicit UI Designer work with interface screens is counted');

const explicit = extractResume('Professional Summary\nOver 4 years of LCA experience.\nExperience\nProject Coordinator — Example Ltd. Jan 2020 – Dec 2021', { now }).extraction.experience;
check(explicit.stated.lca === 4 && explicit.stated.total === 0, 'LCA-specific stated years are not also counted as total employment years');

const emptyPath = path.join(ROOT, 'resumes', 'anonymized_resume_1793685080327.docx');
const emptyBuffer = await fs.readFile(emptyPath).catch(() => null);
if (emptyBuffer) {
  const empty = await analyzeFile({ id: 'empty-real-docx', filename: 'anonymized_resume_1793685080327.docx', buffer: emptyBuffer });
  check(empty.classification.label === 'UNREADABLE' && empty.issues.some((i) => i.code === 'empty_document'), 'empty source DOCX is diagnosed as empty_document');
  const maps = rankMaps([empty, { ...empty, id: 'readable-test', status: 'ok', classification: { label: 'LCA' }, filename: 'readable.docx' }]);
  check(!maps.lca.has(empty.id) && maps.lca.has('readable-test'), 'unreadable candidate is excluded from ranked lists');
  const restored = analyzeText({
    id: 'restored-empty', filename: 'reviewed-resume.docx', text: '',
    issues: [{ level: 'error', code: 'empty_document', message: 'Original file had no content.' }],
    override: { reviewed: true, text: 'Alex Example\nLife Cycle Assessment\nExperience\nLCA Consultant — Example Ltd. Jan 2023 – Present\nPerformed product LCA using SimaPro and ISO 14040 methods.\nEducation\nMSc Environmental Engineering' },
    now,
  });
  check(restored.status === 'ok' && restored.classification.label !== 'UNREADABLE' && restored.issues.some((i) => i.code === 'empty_document_resolved'), 'reviewer text override resolves a blank-source extraction error and restores ranking eligibility');
  const corrected = analyzeText({
    id: 'reviewed-years', filename: 'reviewed-years.txt',
    text: 'Candidate\nExperience\nLCA Analyst — Example Ltd. Jan 2024 – Present\nPerformed product life cycle assessment using openLCA.\nEducation\nMSc Environmental Engineering',
    override: { reviewed: true, lcaYears: 2, lcaProjects: 3, note: 'Verified from source resume.' }, now,
  });
  check(corrected.extraction.experience.lcaProjectsBasis.includes('reviewer correction') && corrected.scores.lca.components.find((x) => x.key === 'experience').detail.includes('review-corrected'), 'manual year/project corrections stay visible in score explanations and project basis');
} else {
  check(false, 'the supplied empty DOCX fixture exists in resumes/');
}

for (const [file, issueCode] of [['12_image_only.docx', 'image_only'], ['13_corrupt.docx', 'parse_failed']]) {
  const buffer = await fs.readFile(path.join(dir, file)).catch(() => null);
  if (!buffer) {
    check(false, `${file} fixture missing`);
    continue;
  }
  const c = await analyzeFile({ id: file, filename: file, buffer });
  check(c.classification.label === 'UNREADABLE' && c.issues.some((i) => i.code === issueCode), `${file} is distinguished as ${issueCode}`);
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
