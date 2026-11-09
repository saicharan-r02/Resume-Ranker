import { SECTION_HEADERS } from './dictionary.mjs';

export function normalizeText(raw) {
  return String(raw || '')
    .replace(/\r\n?/g, '\n')
    .replace(/ /g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/[-]/g, ' ')
    .replace(/[​-‍﻿]/g, '')
    .replace(/[•●▪■◦‣⁃○∙·]/g, '•')
    .replace(/[^\S\n]*\t[^\S\n]*/g, '   ')
    .replace(/[ ]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function headerKey(line) {
  return line
    .toLowerCase()
    .replace(/[^a-z&\s/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectHeader(line) {
  const t = line.trim();
  if (!t || t.length > 48) return null;
  const key = headerKey(t);
  if (!key || key.split(' ').length > 6) return null;
  for (const [name, re] of Object.entries(SECTION_HEADERS)) {
    if (re.test(key)) return name;
  }
  return null;
}

export function buildLines(text) {
  const raw = text.split('\n').map((l) => l.replace(/^\s+/, '').replace(/\s+$/, ''));
  let section = 'none';
  let headersFound = 0;
  const lines = raw.map((t, i) => {
    const h = detectHeader(t);
    if (h) {
      section = h;
      headersFound++;
      return { i, text: t, section: h, isHeader: true };
    }
    return { i, text: t, section, isHeader: false };
  });
  return { lines, headersFound };
}

export function sectionLines(lines, name) {
  return lines.filter((l) => l.section === name && !l.isHeader && l.text);
}

export function lineOffsets(lines) {
  const offs = [];
  let pos = 0;
  for (const l of lines) {
    offs.push(pos);
    pos += l.text.length + 1;
  }
  return offs;
}

function lineIndexAt(offs, pos) {
  let lo = 0;
  let hi = offs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offs[mid] <= pos) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function scanTerms(joined, lines, offs, defs) {
  const out = [];
  for (const def of defs) {
    let count = 0;
    const sections = new Set();
    const snippets = [];
    for (const re of def.res) {
      for (const m of joined.matchAll(re)) {
        count++;
        const idx = m.index ?? 0;
        const li = lineIndexAt(offs, idx);
        sections.add(lines[li]?.section || 'none');
        if (snippets.length < 2) {
          const from = Math.max(0, idx - 45);
          const to = Math.min(joined.length, idx + m[0].length + 65);
          let s = joined.slice(from, to).replace(/\s+/g, ' ').trim();
          if (from > 0) s = s.replace(/^\S*\s/, '');
          if (to < joined.length) s = s.replace(/\s\S*$/, '');
          snippets.push((from > 0 ? '... ' : '') + s + (to < joined.length ? ' ...' : ''));
        }
      }
    }
    if (count) out.push({ name: def.name, w: def.w, group: def.group, count, sections: [...sections], snippets });
  }
  return out;
}

export function weightOf(matches) {
  return matches.reduce((sum, m) => sum + m.w * Math.min(1.45, 1 + 0.15 * (m.count - 1)), 0);
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const MONTH_RE = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATE_TOKEN = `(?:${MONTH_RE}(?:\\.?,?\\s*['’]?\\d{2,4})?|\\d{1,2}\\s*[\\/.\\-]\\s*(?:19|20)\\d{2}|(?:19|20)\\d{2})`;
const END_TOKEN = `(?:${DATE_TOKEN}|present|current(?:ly)?|now|ongoing|till\\s+date|to\\s+date|date)`;
const RANGE_SRC = `(${DATE_TOKEN})\\s*(?:-|–|—|to|till|until|through)\\s*(${END_TOKEN})`;

export function parseDateToken(tok, now) {
  const t = tok.trim().toLowerCase();
  if (/^(present|current|currently|now|ongoing|till\s+date|to\s+date|date)$/.test(t)) {
    return { y: now.getFullYear(), m: now.getMonth(), yearOnly: false, present: true };
  }
  let m = t.match(new RegExp(`^(${MONTH_RE})\\.?,?\\s*'?(\\d{2,4})$`, 'i'));
  if (m) {
    let y = parseInt(m[2], 10);
    if (y < 100) y += y <= 50 ? 2000 : 1900;
    return { y, m: MONTHS[m[1].slice(0, 3).toLowerCase()], yearOnly: false };
  }
  m = t.match(/^(\d{1,2})\s*[/.\-]\s*((?:19|20)\d{2})$/);
  if (m) {
    const mo = parseInt(m[1], 10);
    if (mo >= 1 && mo <= 12) return { y: parseInt(m[2], 10), m: mo - 1, yearOnly: false };
  }
  m = t.match(/^((?:19|20)\d{2})$/);
  if (m) return { y: parseInt(m[1], 10), m: 5, yearOnly: true };
  m = t.match(new RegExp(`^(${MONTH_RE})$`, 'i'));
  if (m) return { y: null, m: MONTHS[m[1].slice(0, 3).toLowerCase()], yearOnly: false, monthOnly: true };
  return null;
}

export function findRange(line, now) {
  const re = new RegExp(RANGE_SRC, 'i');
  const m = line.match(re);
  if (!m) return null;
  let a = parseDateToken(m[1], now);
  let b = parseDateToken(m[2], now);
  if (a?.monthOnly && b && !b.monthOnly) {
    let year = b.y;
    if ((b.present && a.m > now.getMonth()) || (!b.present && a.m > b.m)) year -= 1;
    a = { ...a, y: year, monthOnly: false };
  }
  if (b?.monthOnly && a && !a.monthOnly) {
    const year = b.m < a.m ? a.y + 1 : a.y;
    b = { ...b, y: year, monthOnly: false };
  }
  if (!a || !b || a.monthOnly || b.monthOnly) return null;
  const start = a.y * 12 + a.m;
  const end = b.y * 12 + b.m;
  const nowIdx = now.getFullYear() * 12 + now.getMonth();
  if (end < start || end - start > 12 * 45 || a.y < 1975 || start > nowIdx + 6) return null;
  return {
    text: m[0].trim(),
    start,
    end: Math.min(end, nowIdx),
    months: Math.max(1, Math.min(end, nowIdx) - start),
    present: !!b.present,
    matchIndex: m.index ?? 0,
  };
}

export function mergeMonths(intervals) {
  const sorted = intervals.filter((x) => x.end > x.start).sort((a, b) => a.start - b.start);
  let total = 0;
  let cur = null;
  for (const iv of sorted) {
    if (!cur) cur = { ...iv };
    else if (iv.start <= cur.end) cur.end = Math.max(cur.end, iv.end);
    else {
      total += cur.end - cur.start;
      cur = { ...iv };
    }
  }
  if (cur) total += cur.end - cur.start;
  return total;
}
export const round1 = (n) => Math.round(n * 10) / 10;