import { getDocumentProxy } from 'unpdf';

export const SUPPORTED = ['.pdf', '.docx', '.txt', '.md'];

const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

function groupRows(items) {
  const rows = [];
  for (const it of items) {
    if (typeof it.str !== 'string' || !it.transform) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    const h = Math.abs(it.transform[3]) || it.height || 10;
    let row = rows.find((r) => Math.abs(r.y - y) < Math.max(2.5, h * 0.45));
    if (!row) {
      row = { y, h, items: [] };
      rows.push(row);
    }
    row.items.push({ x, w: it.width || 0, h, y, str: it.str, transform: it.transform });
  }
  rows.sort((a, b) => b.y - a.y);
  for (const r of rows) r.items.sort((a, b) => a.x - b.x);
  return rows;
}

function rowSegments(row) {
  const segs = [];
  let cur = null;
  let prevEnd = null;
  for (const it of row.items) {
    if (!it.str.trim()) {
      if (it.str) prevEnd = it.x + it.w;
      continue;
    }
    if (cur === null || it.x - prevEnd > row.h * 3.2) {
      cur = { x: it.x, text: '' };
      segs.push(cur);
    }
    cur.text += it.str;
    prevEnd = it.x + it.w;
  }
  return segs;
}

function detectGutter(rows) {
  if (rows.length < 8) return null;
  const cands = [];
  rows.forEach((row, ri) => {
    rowSegments(row).forEach((seg, k) => {
      if (k > 0) cands.push({ x: seg.x, ri, text: seg.text });
    });
  });
  if (cands.length < 5) return null;
  let best = null;
  for (const c of cands) {
    const group = cands.filter((d) => Math.abs(d.x - c.x) <= 3);
    if (!best || group.length > best.length) best = group;
  }
  const rowsHit = new Set(best.map((b) => b.ri)).size;
  if (rowsHit < 5 || rowsHit / rows.length < 0.25) return null;
  const dateLike = best.filter((b) => /\b(?:19|20)\d{2}\b|present/i.test(b.text)).length / best.length;
  if (dateLike > 0.5) return null;
  return best.reduce((a, b) => a + b.x, 0) / best.length;
}

function rowsToLines(rows) {
  const gaps = [];
  for (let i = 1; i < rows.length; i++) gaps.push(rows[i - 1].y - rows[i].y);
  const typical = median(gaps) || 12;
  const out = [];
  let wide = 0;
  rows.forEach((row, i) => {
    let line = '';
    let prevEnd = null;
    let hasColumnGap = false;
    for (const it of row.items) {
      if (prevEnd !== null && it.str) {
        const gap = it.x - prevEnd;
        if (gap > row.h * 3.2) {
          line += '   ';
          hasColumnGap = true;
        } else if (gap > row.h * 0.12 && !line.endsWith(' ') && !it.str.startsWith(' ')) line += ' ';
      }
      line += it.str;
      if (it.str) prevEnd = it.x + it.w;
    }
    line = line.replace(/[ \t]+$/, '');
    if (!line.trim()) return;
    if (hasColumnGap) wide++;
    if (i > 0 && rows[i - 1].y - row.y > typical * 1.7) out.push('');
    out.push(line);
  });
  return { lines: out, wide };
}

function pageToLines(items) {
  const rows = groupRows(items);
  const gutter = detectGutter(rows);
  if (gutter !== null) {
    const left = rowsToLines(groupRows(items.filter((it) => it.transform && it.transform[4] < gutter - 3)));
    const right = rowsToLines(groupRows(items.filter((it) => it.transform && it.transform[4] >= gutter - 3)));
    return { lines: [...left.lines, '', ...right.lines], wide: left.wide + right.wide, twoColumn: true };
  }
  return { ...rowsToLines(rows), twoColumn: false };
}

async function readPdf(buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const pages = [];
  let wideLines = 0;
  let totalLines = 0;
  let twoColumnPages = 0;
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const { lines, wide, twoColumn } = pageToLines(content.items);
    if (twoColumn) twoColumnPages++;
    pages.push(lines.join('\n'));
    wideLines += wide;
    totalLines += lines.filter(Boolean).length;
  }
  return { text: pages.join('\n\n'), pages: pdf.numPages, layout: { columnShare: totalLines ? wideLines / totalLines : 0, twoColumnPages } };
}

const decodeEntities = (t) =>
  t
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&amp;/g, '&');

export function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
        const label = inner.replace(/<[^>]+>/g, '');
        const url = decodeEntities(href).trim();
        const bare = url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
        if (!url || url.startsWith('#') || /^mailto:/i.test(url) || label.includes(bare)) return label;
        return `${label} (${url})`;
      })
      .replace(/<\/p>\s*<\/(li|td|th)>/gi, '</$1>')
      .replace(/<li[^>]*>/gi, '\u2022 ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|h[1-6]|li|tr|td|th|ul|ol|table|div)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function readDocx(buffer) {
  const mammoth = (await import('mammoth')).default;
  let imageCount = 0;
  let text = '';
  let htmlError = null;

  try {
    const res = await mammoth.convertToHtml(
      { buffer },
      {
        ignoreEmptyParagraphs: false,
        convertImage: mammoth.images.imgElement(async () => {
          imageCount++;
          return { src: '' };
        }),
      }
    );
    text = htmlToText(res.value || '');
  } catch (error) {
    htmlError = error;
  }

  if (!text) {
    try {
      const raw = await mammoth.extractRawText({ buffer });
      text = (raw.value || '').split('\n\n').join('\n').trim();
    } catch (error) {
      const detail = error?.message || htmlError?.message || 'Invalid DOCX package';
      throw new Error(`The DOCX package could not be read: ${detail}`);
    }
  }

  let contentIssue = null;
  if (text.trim().length < 80) {
    if (imageCount > 0) {
      contentIssue = {
        level: 'error',
        code: 'image_only',
        message: 'This DOCX contains embedded image(s), but no readable Word text. OCR is not enabled. Provide a text-based copy or manually transcribe the resume.',
      };
    } else {
      contentIssue = {
        level: 'error',
        code: 'empty_document',
        message: 'The DOCX is structurally readable but contains no resume text or embedded images. The file appears to be blank; obtain the original non-empty resume.',
      };
    }
  }

  return { text, pages: null, layout: null, contentIssue, imageCount };
}

export function extOf(filename) {
  const m = /\.[^.]+$/.exec(filename.toLowerCase());
  return m ? m[0] : '';
}

export async function readFileToText(filename, buffer) {
  const ext = extOf(filename);
  if (ext === '.pdf') return { ...(await readPdf(buffer)), fileType: 'pdf' };
  if (ext === '.docx') return { ...(await readDocx(buffer)), fileType: 'docx' };
  if (ext === '.txt' || ext === '.md') return { text: Buffer.from(buffer).toString('utf8'), pages: null, layout: null, fileType: ext.slice(1) };
  if (ext === '.doc') throw new Error('Legacy .doc files are not supported. Save the resume as .docx or PDF and try again.');
  throw new Error(`Unsupported file type "${ext || 'unknown'}". Use PDF, DOCX, TXT or MD.`);
}

import { analyzeText } from './pipeline.mjs';

export async function analyzeFile({ id, filename, buffer, sourceUrl = null, override = null }) {
  let text = '';
  let pages = null;
  let layout = null;
  let fileType = '';
  let contentIssue = null;
  const issues = [];
  try {
    const r = await readFileToText(filename, buffer);
    ({ text, pages, layout, fileType, contentIssue } = r);
    if (contentIssue) issues.push(contentIssue);
  } catch (e) {
    issues.push({ level: 'error', code: 'parse_failed', message: `Could not read the file: ${e?.message || e}` });
  }
  return analyzeText({ id, filename, text, pages, fileType, sourceUrl, issues, layout, override });
}
