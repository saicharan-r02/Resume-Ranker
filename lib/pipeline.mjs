import { extractResume } from './extract.mjs';
import { scoreLca, scoreUx } from './score.mjs';
import { classify } from './classify.mjs';

export const MAX_RAW_CHARS = 6000;

export function analyzeText({ id, filename, text = '', pages = null, fileType = '', sourceUrl = null, issues: pre = [], layout = null, override = null, now = new Date() }) {
  const ov = override || {};
  const usedText = typeof ov.text === 'string' ? ov.text : text;
  const canReplaceSourceErrors = new Set(['parse_failed', 'image_only', 'empty_document', 'no_text']);
  const issues = typeof ov.text === 'string'
    ? pre.map((issue) => canReplaceSourceErrors.has(issue.code)
      ? { ...issue, level: 'info', code: `${issue.code}_resolved`, message: `${issue.message} A reviewer supplied replacement text, so the candidate is scored from that text instead.` }
      : issue)
    : [...pre];
  if (typeof ov.text === 'string') {
    issues.push({ level: 'info', code: 'text_override', message: 'Text was replaced by a reviewer (data/overrides.json) because automatic extraction was unreliable.' });
  }

  const { extraction, issues: exIssues, stats } = extractResume(usedText, { now, override: ov });
  issues.push(...exIssues);

  const unreadable = stats.chars < 80;
  if (unreadable && pre.some((i) => ['parse_failed', 'image_only', 'empty_document'].includes(i.code))) {
  } else if (unreadable) {
    issues.push({ level: 'error', code: 'no_text', message: 'No readable text was extracted. The PDF may be scanned/image-only or the file may be blank. OCR is not enabled; provide a text-based copy or add a manually verified text override.' });
  } else if (stats.chars < 400) {
    issues.push({ level: 'warning', code: 'low_text', message: `Only ${stats.chars} characters of text were extracted - the resume is very short or partially unreadable. Scores may be understated.` });
  }
  if (layout && layout.twoColumnPages > 0) {
    issues.push({ level: 'info', code: 'two_column', message: 'A two-column layout was detected and read column by column. Quickly check that the extracted education/projects look right.' });
  } else if (layout && layout.columnShare > 0.25) {
    issues.push({ level: 'warning', code: 'multi_column', message: 'A multi-column or table layout is suspected. Text from side-by-side columns can interleave, which may scramble education/projects lists. Keyword-based scores are not affected.' });
  }
  if (pages && pages > 6) {
    issues.push({ level: 'info', code: 'long_document', message: `${pages} pages - unusually long for a resume. It may include extra material (papers, reports) that inflates keyword matches.` });
  }

  const lca = scoreLca(extraction);
  const ux = scoreUx(extraction);
  const lcaCoreNames = new Set(['Life Cycle Assessment', 'LCA', 'Life Cycle Inventory (LCI)', 'Impact assessment (LCIA)', 'EPD', 'Carbon footprint', 'System boundary / functional unit', 'Impact methods (ReCiPe/TRACI/CML/PEF)']);
  const lcaHasPracticalEvidence = extraction.experience.lcaYears > 0 || extraction.experience.lcaProjects > 0 || extraction.skills.lcaSoftware.some((m) => ['GaBi', 'SimaPro'].includes(m.name));
  const uxHasDesignTool = extraction.skills.uxTools.some((m) => !['Webflow / HTML / CSS', 'Jira / Notion / Analytics', 'InDesign / Canva'].includes(m.name));
  const auto = classify(lca.total, ux.total, { unreadable, lcaCore: extraction.skills.lcaConcepts.some((m) => lcaCoreNames.has(m.name)), lcaHasPracticalEvidence, uxHasDesignTool });
  let classification = { ...auto, auto: null, forced: false };
  if (!unreadable && ['LCA', 'UX', 'BOTH', 'NEITHER'].includes(ov.classification)) {
    const winningScore = ov.classification === 'LCA'
      ? lca.total
      : ov.classification === 'UX'
        ? ux.total
        : Math.max(lca.total, ux.total);
    const confidence = ov.classification === 'NEITHER'
      ? 'medium'
      : winningScore >= 45 ? 'medium' : 'low';
    classification = {
      label: ov.classification,
      confidence,
      reason: `Set by a reviewer override${ov.note ? `: ${ov.note}` : '.'} (automatic result was ${auto.label}; score-based confidence is ${confidence}).`,
      auto: auto.label,
      forced: true,
    };
  } else if (auto.confidence === 'low' && !unreadable && !ov.reviewed) {
    issues.push({ level: 'warning', code: 'ambiguous_class', message: 'Low-confidence classification - needs a human decision. ' + auto.reason });
  }

  const finalIssues = ov.reviewed ? issues.map((i) => i.level === 'warning' ? { ...i, level: 'info', reviewed: true, message: `${i.message} Reviewed: ${ov.note || 'A reviewer checked this item.'}` } : i) : issues;
  const status = finalIssues.some((i) => i.level === 'error') ? 'error' : finalIssues.some((i) => i.level === 'warning') ? 'warning' : 'ok';
  const rawText = usedText.slice(0, MAX_RAW_CHARS);

  return {
    id,
    filename,
    name: filename.replace(/\.[^.]+$/, ''),
    fileType,
    pages,
    chars: stats.chars,
    sourceUrl,
    status,
    issues: finalIssues,
    extraction,
    scores: { lca, ux },
    classification,
    rawText,
    rawTextTruncated: usedText.length > MAX_RAW_CHARS,
    review: ov.note || ov.reviewed ? { reviewed: Boolean(ov.reviewed), note: ov.note || '', fields: Object.keys(ov).filter((k) => !['note', 'reviewed'].includes(k)) } : null,
  };
}
