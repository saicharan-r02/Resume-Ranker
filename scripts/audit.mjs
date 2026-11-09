import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LABELS, THRESHOLDS } from '../lib/classify.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cands = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'candidates.json'), 'utf8'));
if (!cands.length) {
  console.error('data/candidates.json is empty. Run `npm run process` first.');
  process.exit(1);
}

const isReviewed = (c) => c.review?.reviewed === true;
const flags = new Map();
const add = (c, why) => flags.set(c.filename, [...(flags.get(c.filename) || []), why]);

for (const c of cands) {
  const x = c.extraction;
  const e = x.experience;
  const s = c.scores;
  const reviewed = isReviewed(c);

  if (c.classification.label === 'UNREADABLE' || c.status === 'error') {
    for (const issue of c.issues.filter((i) => i.level !== 'info')) add(c, `${issue.code}: ${issue.message}`);
    if (!c.issues.length) add(c, 'unreadable: no readable resume content; obtain the original file');
    continue;
  }

  if (!reviewed) {
    for (const issue of c.issues) if (issue.level !== 'info') add(c, `${issue.code}: ${issue.message}`);
    if (c.classification.label === 'NEITHER') add(c, `classified Neither/uncertain (LCA ${s.lca.total}, UX ${s.ux.total}) - confirm by reading the resume`);
    if (c.classification.label === 'BOTH') add(c, `classified Both (LCA ${s.lca.total}, UX ${s.ux.total}) - confirm`);
    if (c.classification.label === 'LCA' && e.lcaYears === 0) add(c, 'classified LCA but 0 LCA years found - check dates/experience extraction');
    if (c.classification.label === 'UX' && !x.skills.uxTools.some((m) => m.name === 'Figma')) add(c, 'classified UI/UX but Figma was not found; confirm another prototyping tool or manual decision');
    if (e.lcaYears > 12 || e.designYears > 12) add(c, `unusually high experience (LCA ${e.lcaYears}, design ${e.designYears} yrs) - probably a date-parsing error`);
    if (e.totalYears > 0 && e.lcaYears + e.designYears === 0 && x.education.degrees.length === 0) add(c, 'no relevant experience and no degree detected');
    for (const role of ['lca', 'ux']) {
      const t = s[role].total;
      if (Math.abs(t - THRESHOLDS.strong) <= 3 || Math.abs(t - THRESHOLDS.min) <= 3) add(c, `${role.toUpperCase()} score ${t} is within 3 points of a classification threshold - borderline`);
    }
  }
}

const byStatus = { ok: 0, warning: 0, error: 0 };
const byLabel = { LCA: 0, UX: 0, BOTH: 0, NEITHER: 0, UNREADABLE: 0 };
for (const c of cands) {
  byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  byLabel[c.classification.label] = (byLabel[c.classification.label] || 0) + 1;
}
const reviewed = cands.filter(isReviewed);
const unreadable = cands.filter((c) => c.classification.label === 'UNREADABLE');
const rankedCount = cands.length - unreadable.length;

console.log(`\nResumes processed: ${cands.length}`);
console.log(`Extraction status: ${byStatus.ok} ok, ${byStatus.warning} with warnings, ${byStatus.error} errors`);
console.log(`Classification:    ${Object.entries(byLabel).map(([k, v]) => `${LABELS[k] || k}: ${v}`).join(' | ')}`);
console.log(`Ranked candidates: LCA ${rankedCount}, UI/UX ${rankedCount} (unreadable excluded)`);
console.log(`Applied review overrides: ${reviewed.length}`);
console.log(`Still flagged for review: ${flags.size} of ${cands.length}\n`);

for (const [file, reasons] of flags) {
  console.log(`- ${file}`);
  reasons.forEach((r) => console.log(`    * ${r.length > 190 ? r.slice(0, 187) + '...' : r}`));
}

const unreviewedClean = cands.filter((c) => !flags.has(c.filename) && !isReviewed(c));
const sample = unreviewedClean.slice(0, 5);
if (sample.length) {
  console.log(`\nSuggested spot-checks (${sample.length}) - automated checks cannot prove every extracted field is correct:`);
  sample.forEach((c) => console.log(`  - ${c.filename}: ${c.extraction.experience.totalYears} yrs total; LCA ${c.extraction.experience.lcaYears}; design ${c.extraction.experience.designYears}; ${c.extraction.education.highest ? c.extraction.education.highest.levelLabel + ' (' + c.extraction.education.highest.category + ')' : 'no degree'}`));
}

if (process.argv.includes('--log')) {
  const reviewedRows = reviewed.map((c) => {
    const fields = c.review.fields?.length ? c.review.fields.join(', ') : 'reviewed / classification decision';
    return `| ${c.filename} | ${c.review.note || 'AI-assisted review note recorded.'} | ${fields} | RECORDED |`;
  });
  const unresolvedRows = [...flags.entries()].map(([file, reasons]) => {
    const c = cands.find((candidate) => candidate.filename === file);
    const note = reasons.join(' ');
    const action = c?.classification.label === 'UNREADABLE'
      ? 'Excluded from rankings; request original non-empty resume or verified text.'
      : 'Open original resume, verify extraction, then update data/overrides.json.';
    return `| ${file} | ${note.replace(/\|/g, '\\|')} | ${action} | OPEN |`;
  });
  const spotRows = sample.map((c) => `| ${c.filename} | Automated checks found no blocking issue; spot-check source text before final submission. | Not changed | SPOT-CHECK |`);
  const md = `# Data cleaning and reviewer log

Generated ${new Date().toISOString().slice(0, 10)} from ${cands.length} source resumes. This report is rebuilt from \`data/candidates.json\` and reviewer records in \`data/overrides.json\`.

## AI-assisted review overrides

The records below have \`reviewed: true\` in the overrides file. These are AI-assisted preliminary notes and corrections based on the supplied extracted resume text. The processing pipeline applies them before scoring and ranking. **RECORDED** means a preliminary correction is present; it does not mean the applicant has independently confirmed every claim.

| Resume | AI-assisted review note (verify against source) | Fields / decision recorded | Status |
|---|---|---|---|
${reviewedRows.join('\n') || '| None | No reviewed overrides recorded | — | — |'}

## Outstanding items

| Resume | Reason | Next action | Status |
|---|---|---|---|
${unresolvedRows.join('\n') || '| None | No blocking flags from the current automated audit | — | CLEAR |'}

## Additional spot-checks

These are not errors. They are a suggested final sample because automated extraction cannot guarantee correctness for every file.

| Resume | Why selected | Action | Status |
|---|---|---|---|
${spotRows.join('\n') || '| None | No extra unreviewed spot-checks selected | — | — |'}

## Batch summary

- Source resumes processed: ${cands.length}
- Readable and scored: ${rankedCount}
- Unreadable and excluded from role rankings: ${unreadable.length}
- AI-assisted review overrides applied: ${reviewed.length}
- Outstanding review items: ${flags.size}
- Final classification counts: LCA ${byLabel.LCA}, UI/UX ${byLabel.UX}, Both ${byLabel.BOTH}, Neither/uncertain ${byLabel.NEITHER}, Unreadable ${byLabel.UNREADABLE}.

**Important:** The unreadable DOCX is structurally valid but contains no resume text or embedded image. It cannot be reconstructed from this file. The record remains excluded until the original resume or verified text is supplied.
`;
  fs.writeFileSync(path.join(ROOT, 'CLEANING_LOG.md'), md);
  console.log('\nWrote CLEANING_LOG.md from the applied reviewer records and remaining flags.');
}
