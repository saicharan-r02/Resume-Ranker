import {
  LCA_CONCEPTS, LCA_SOFTWARE, LCA_STANDARDS, LCA_SUPPORT,
  UX_TOOLS, UX_METHODS, UX_EXTRAS,
  LCA_REL, UX_REL, CITIES, UX_CERT_RE, LCA_CERT_RE,
} from './dictionary.mjs';
import {
  normalizeText, buildLines, sectionLines, lineOffsets, scanTerms,
  findRange, mergeMonths, round1,
} from './text.mjs';

const slim = (m) => ({ name: m.name, w: m.w, group: m.group, count: m.count, sections: m.sections, snippet: m.snippets[0] || '' });

const EDU_WORDS = /\b(?:universit\w*|college|institute|school|b\.?\s?tech|m\.?\s?tech|bachelor\w*|master\w*|diploma|cgpa|gpa|percentage|sslc|hsc|cbse|degree|b\.?\s?sc|m\.?\s?sc|b\.?\s?des|m\.?\s?des)\b/i;
const EDU_CASE = /\b(?:B\.E|M\.E|BE|ME|BS|MS|BA|MA|PhD|B\.Des|M\.Des)\b/;
const NON_EXPERIENCE_SECTIONS = new Set(['education', 'certifications', 'projects', 'publications', 'awards', 'skills', 'other']);

function cleanTitle(s) {
  return s
    .replace(/[|•,;:]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-–—]+|[\s\-–—]+$/g, '')
    .slice(0, 120);
}

function parseExperience(lines, now, headersFound) {
  const rangeLines = [];
  lines.forEach((l, idx) => {
    if (!l.text || l.isHeader) return;
    const r = findRange(l.text, now);
    if (r) rangeLines.push({ idx, r });
  });

  const hasExpHeader = lines.some((l) => l.isHeader && l.section === 'experience');
  const looksLikeEducation = (idx) =>
    [idx - 1, idx, idx + 1].some((j) => lines[j] && !lines[j].isHeader && (EDU_WORDS.test(lines[j].text) || EDU_CASE.test(lines[j].text)));

  let candidates = rangeLines.filter((x) => {
    const sec = lines[x.idx].section;
    if (sec === 'experience') return true;
    if (sec === 'none' || sec === 'summary') return !looksLikeEducation(x.idx);
    return false;
  });

  let fallback = false;
  if (!candidates.length && rangeLines.length && !hasExpHeader) {
    candidates = rangeLines.filter((x) => !NON_EXPERIENCE_SECTIONS.has(lines[x.idx].section) && !looksLikeEducation(x.idx));
    fallback = candidates.length > 0;
  }

  const entries = candidates.map((c) => {
    const { idx, r } = c;
    const nextRange = rangeLines.find((x) => x.idx > idx)?.idx ?? Infinity;
    let end = Math.min(idx + 12, nextRange - 1, lines.length - 1);
    for (let j = idx + 1; j <= end; j++) {
      if (lines[j].isHeader) {
        end = j - 1;
        break;
      }
    }
    let start = idx;
    const prev = lines[idx - 1];
    if (prev && prev.text && !prev.isHeader && prev.text.length < 90 && !/^[•\-]/.test(prev.text) && !/[.;]$/.test(prev.text) && !findRange(prev.text, now)) {
      start = idx - 1;
    }
    const block = lines.slice(start, end + 1).map((l) => l.text).join('\n');
    const own = cleanTitle(lines[idx].text.replace(r.text, ' '));
    const title = own || cleanTitle(prev?.text || '') || cleanTitle(lines[idx + 1]?.text || '');
    return {
      title,
      range: r.text,
      start: r.start,
      end: r.end,
      months: r.months,
      present: r.present,
      lcaRelevant: LCA_REL.test(block),
      designRelevant: UX_REL.test(block),
    };
  });

  const total = mergeMonths(entries);
  const lca = mergeMonths(entries.filter((e) => e.lcaRelevant));
  const design = mergeMonths(entries.filter((e) => e.designRelevant));

  return {
    entries: entries.slice(0, 12).map(({ start, end, ...rest }) => rest),
    entryCount: entries.length,
    datedTotalYears: round1(total / 12),
    datedLcaYears: round1(lca / 12),
    datedDesignYears: round1(design / 12),
    fallback,
    hasExpHeader,
  };
}

function explicitYears(joined) {
  const out = { total: 0, lca: 0, design: 0, notes: [] };
  const apply = (val, ctxNear, ctxWide, label) => {
    if (!(val > 0) || val > 40) return;
    if (!/experience|worked|working|expertise|exposure|background|track record|intern/i.test(ctxWide)) return;
    if (/\b(?:years?\s+old|age)\b/i.test(ctxNear)) return;
    let tag = 'total';
    if (/\b(?:LCAs?|life[\s-]?cycle|EPD|carbon\s+footprint)/i.test(ctxNear) || /\blife[\s-]?cycle/i.test(ctxNear)) {
      out.lca = Math.max(out.lca, val);
      tag = 'LCA';
    }
    if (/\b(?:ux|ui|design|figma)\b/i.test(ctxNear)) {
      out.design = Math.max(out.design, val);
      tag = tag === 'LCA' ? 'LCA+design' : 'design';
    }
    if (tag === 'total') out.total = Math.max(out.total, val);
    out.notes.push(`${label} (${tag})`);
  };

  for (const m of joined.matchAll(/(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)\b(?:\s*(?:and\s*)?(\d{1,2})\s*months?)?/gi)) {
    const val = parseFloat(m[1]) + (m[2] ? parseInt(m[2], 10) / 12 : 0);
    const i = m.index ?? 0;
    apply(
      val,
      joined.slice(Math.max(0, i - 40), i + m[0].length + 70),
      joined.slice(Math.max(0, i - 80), i + m[0].length + 110),
      m[0].trim()
    );
  }
  for (const m of joined.matchAll(/(\d{1,2})\s*\+?\s*months?\b/gi)) {
    const i = m.index ?? 0;
    const wide = joined.slice(Math.max(0, i - 60), i + m[0].length + 80);
    if (/experience|intern/i.test(wide)) {
      apply(parseInt(m[1], 10) / 12, joined.slice(Math.max(0, i - 40), i + m[0].length + 70), wide, m[0].trim());
    }
  }
  out.total = round1(out.total);
  out.lca = round1(out.lca);
  out.design = round1(out.design);
  return out;
}

function lcaProjectCount(joined, lines, projects) {
  const stated =
    joined.match(/\b(\d{1,2})\s*\+?\s*(?:LCA|life[\s-]?cycle(?:\s+assessment)?)[\w\s-]{0,25}?(?:projects?|studies|assessments)\b/i) ||
    joined.match(/\b(?:completed|executed|conducted|delivered|led|handled|worked\s+on|performed)\s+(?:over\s+|more\s+than\s+)?(\d{1,2})\s*\+?\s*(?:LCA|life[\s-]?cycle)[\w\s-]{0,25}?(?:projects?|studies|assessments)\b/i);
  if (stated) {
    const n = parseInt(stated[1], 10);
    if (n > 0 && n < 100) return { count: n, basis: 'stated in resume' };
  }
  const namedProjects = projects.filter((project) => project.lca).length;
  return namedProjects
    ? { count: namedProjects, basis: 'distinct project-section entries mentioning LCA' }
    : { count: 0, basis: 'no distinct named LCA project entries found' };
}


const DEGREE_LEVELS = [
  { level: 4, label: 'PhD', res: [/\b(?:ph\.?\s?d\.?|doctorate|doctor\s+of\s+philosophy)\b/i] },
  {
    level: 3,
    label: "Master's",
    res: [/\b(?:m\.?\s?tech|m\.?\s?sc|m\.?\s?des|m\.?\s?arch|mba|pgdm|pgp|mca|m\.?\s?com|post[\s-]?graduat\w*|master(?:'?s)?(?:\s+of|\s+in)?)\b/i, /\bM\.A\b\.?/, /\bM\.E\b\.?/],
    ambiguous: [/\bMS\b(?=\s*[(\-–,:]|\s+in\b)/, /\bME\b(?=\s*[(\-–,:]|\s+in\b)/, /\bMA\b(?=\s*[(\-–,:]|\s+in\b)/],
  },
  { level: 2.5, label: 'PG Diploma', res: [/\bpg\s+diploma\b/i, /\bpost[\s-]graduate\s+diploma\b/i] },
  {
    level: 2,
    label: "Bachelor's",
    res: [/\b(?:b\.?\s?tech|b\.?\s?sc|b\.?\s?des|b\.?\s?arch|bca|bba|b\.?\s?com|bfa|bachelor(?:'?s)?(?:\s+of|\s+in)?)\b/i, /\bB\.E\b\.?/, /\bB\.A\b\.?/],
    ambiguous: [/\bBE\b(?=\s*[(\-–,:]|\s+in\b)/, /\bBS\b(?=\s*[(\-–,:]|\s+in\b)/, /\bBA\b(?=\s*[(\-–,:]|\s+in\b)/],
  },
  { level: 1, label: 'Diploma', res: [/\bdiploma\b/i] },
];

export function eduCategory(t) {
  if (/\b(?:environment\w*|sustainab\w*|climate|ecolog\w*|renewable|energy\s+(?:engineering|systems|management)|life\s+cycle|earth\s+science\w*|forestry)\b/i.test(t)) return 'environmental';
  if (/\b(?:b\.?\s?des|m\.?\s?des|hci|human[\s-]computer|interaction\s+design|visual\s+communication|communication\s+design|multimedia|animation|graphic|ux|fine\s+arts?|product\s+design|industrial\s+design|new\s+media|digital\s+design|(?:master|bachelor)s?\s+of\s+design)\b/i.test(t)) return 'design';
  if (/\bdesign\b/i.test(t) && !/engineering|technology|b\.?\s?tech|m\.?\s?tech/i.test(t)) return 'design';
  if (/\b(?:computer|information\s+technology|software|informatics|bca|mca|data\s+science)\b/i.test(t) || /\bIT\b/.test(t)) return 'computing';
  if (/\b(?:engineering|technology|chemical|civil|mechanical|materials|production|biotech\w*|electrical|electronics|petroleum|process|architecture|science|chemistry|physics|biology|mathematics|statistics)\b/i.test(t)) return 'engineering_science';
  if (/\b(?:business|management|commerce|finance|economics|mba|bba)\b/i.test(t)) return 'business';
  return 'other';
}

function parseEducation(lines) {
  const eduLines = lines.filter((l) => l.section === 'education' && !l.isHeader && l.text);
  const strict = eduLines.length > 0;
  const pool = strict ? eduLines : lines.filter((l) => l.text && !l.isHeader);
  const out = [];
  const seen = new Set();
  pool.forEach((l, k) => {
    let best = null;
    for (const d of DEGREE_LEVELS) {
      const pats = [...d.res, ...(strict ? d.ambiguous || [] : [])];
      if (pats.some((re) => re.test(l.text)) && (!best || d.level > best.level)) best = d;
    }
    if (!best) return;
    const next = pool[k + 1];
    let text = l.text;
    if (next && next.text.length < 100 && !DEGREE_LEVELS.some((d) => d.res.some((re) => re.test(next.text)))) text += ' ' + next.text;
    text = text.replace(/\s+/g, ' ').slice(0, 180);
    if (seen.has(text)) return;
    seen.add(text);
    out.push({ level: best.level, levelLabel: best.label, category: eduCategory(text), text });
  });
  const degrees = out.slice(0, 5);
  const highest = [...degrees].sort((a, b) => b.level - a.level)[0] || null;
  return { degrees, highest, strict };
}

function parseListedSkills(lines) {
  const items = [];
  const seen = new Set();
  for (const l of sectionLines(lines, 'skills')) {
    let t = l.text.replace(/^•\s*/, '');
    const colon = t.indexOf(':');
    if (colon > -1 && colon < 32) t = t.slice(colon + 1);
    for (const part of t.split(/[,;|•·]|\s{3,}/)) {
      const s = part.replace(/^[\s\-–]+|[\s.]+$/g, '').trim();
      if (s.length < 2 || s.length > 40 || /^\d+%?$/.test(s)) continue;
      const k = s.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        items.push(s);
      }
    }
  }
  return items.slice(0, 40);
}

const PROJECT_DESCRIPTION_START = /^(?:designed|developed|built|created|implemented|conducted|performed|executed|delivered|led|managed|integrated|improved|enhanced|focused|explored|enabling|creating|identified|conceptualized|conceptualised|contributed|worked|used|using|this project|the project|a |an |end[ -]to[ -]end )\b/i;

function looksLikeProjectTitle(value) {
  const t = value.replace(/^[•\-–*]\s*/, '').trim();
  if (!t || t.length > 130 || /^[•\-–*]/.test(value)) return false;
  if (/[.!?;:]$/.test(t) || PROJECT_DESCRIPTION_START.test(t)) return false;
  if (/^(?:project(?:s)?|deliverables?|case studies|portfolio)$/i.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length === 1) return /^[A-Z0-9][\p{L}\p{N}&'’._-]*$/u.test(t);
  const titleWords = words.filter((w) => /^[A-Z0-9]/.test(w)).length;
  const connectors = words.filter((w) => /^(?:of|and|for|the|from|with|vs|to|in|on|by|a|an)$/i.test(w)).length;
  return /^[A-Z0-9]/.test(t) && titleWords / words.length >= 0.45 && connectors / words.length <= 0.4;
}

function parseProjects(lines) {
  const sec = lines.filter((l) => l.section === 'projects' && !l.isHeader);
  const content = sec.filter((l) => l.text);
  if (!content.length) return [];

  const headingIndexes = [];
  content.forEach((l, i) => { if (looksLikeProjectTitle(l.text)) headingIndexes.push(i); });

  let groups = [];
  if (headingIndexes.length) {
    groups = headingIndexes.map((start, i) => content.slice(start, headingIndexes[i + 1] ?? content.length).map((l) => l.text));
  } else {
    let cur = [];
    for (const l of sec) {
      if (!l.text) {
        if (cur.length) groups.push(cur);
        cur = [];
      } else cur.push(l.text);
    }
    if (cur.length) groups.push(cur);
  }

  return groups.filter((g) => g.length).slice(0, 12).map((g) => {
    const title = g[0].replace(/^[•\-–*]\s*/, '').trim();
    const text = g.join(' ').replace(/•/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      title: title.slice(0, 90),
      text: text.slice(0, 500),
      lca: LCA_REL.test(text),
      design: UX_REL.test(text),
    };
  });
}

function parseCertifications(lines) {
  return sectionLines(lines, 'certifications')
    .map((l) => l.text.replace(/^[•\-–*]\s*/, '').slice(0, 120))
    .filter((t) => t.length > 3)
    .slice(0, 10);
}

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>()"']+|\b(?:behance\.net|dribbble\.com|linkedin\.com\/in|github\.com|figma\.com|medium\.com|notion\.site)[^\s<>()"']*|\b[a-z0-9-]+\.(?:framer\.website|webflow\.io|wixsite\.com|carrd\.co|myportfolio\.com)[^\s<>()"']*/gi;

function parseLinks(joined) {
  const out = [];
  const seen = new Set();
  for (const m of joined.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;:]+$/, '');
    const k = url.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    let type = 'other';
    if (/behance|dribbble|figma\.com|notion\.site|framer|webflow\.io|wixsite|carrd|myportfolio|squarespace|canva\.com|adobe\.com|portfolio/i.test(url)) type = 'portfolio';
    else if (/linkedin/i.test(url)) type = 'linkedin';
    else if (/github/i.test(url)) type = 'github';
    out.push({ type, url: url.slice(0, 140) });
  }
  return out.slice(0, 8);
}

function parseLocations(joined) {
  const found = [];
  for (const c of CITIES) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(joined) && !found.includes(c)) found.push(c);
  }
  return found.slice(0, 4);
}


export function extractResume(text, { now = new Date(), override = {} } = {}) {
  const norm = normalizeText(text);
  const { lines, headersFound } = buildLines(norm);
  const joined = lines.map((l) => l.text).join('\n');
  const offs = lineOffsets(lines);

  const scan = {
    lcaConcepts: scanTerms(joined, lines, offs, LCA_CONCEPTS),
    lcaSoftware: scanTerms(joined, lines, offs, LCA_SOFTWARE),
    standards: scanTerms(joined, lines, offs, LCA_STANDARDS),
    lcaSupport: scanTerms(joined, lines, offs, LCA_SUPPORT),
    uxTools: scanTerms(joined, lines, offs, UX_TOOLS),
    uxMethods: scanTerms(joined, lines, offs, UX_METHODS),
    uxExtras: scanTerms(joined, lines, offs, UX_EXTRAS),
  };

  const exp = parseExperience(lines, now, headersFound);
  const stated = explicitYears(joined);
  const edu = parseEducation(lines);
  const projects = parseProjects(lines);
  const certifications = parseCertifications(lines);
  const links = parseLinks(joined);
  const lcaProj = lcaProjectCount(joined, lines, projects);

  const caseStudyMentions = [...joined.matchAll(/\bcase\s+stud(?:y|ies)\b/gi)].length;
  const designProjects = Math.max(projects.filter((p) => p.design).length, Math.min(caseStudyMentions, 6));

  const experience = {
    totalYears: Math.max(exp.datedTotalYears, stated.total),
    lcaYears: Math.max(exp.datedLcaYears, stated.lca),
    designYears: Math.max(exp.datedDesignYears, stated.design),
    dated: { total: exp.datedTotalYears, lca: exp.datedLcaYears, design: exp.datedDesignYears },
    stated: { total: stated.total, lca: stated.lca, design: stated.design, notes: stated.notes.slice(0, 4) },
    entries: exp.entries,
    entryCount: exp.entryCount,
    lcaProjects: lcaProj.count,
    lcaProjectsBasis: lcaProj.basis,
    designProjects,
    internshipMentioned: /\bintern(?:ship|ed)?\b/i.test(joined),
    overridden: [],
  };

  for (const [k, field] of [['lcaYears', 'lcaYears'], ['designYears', 'designYears'], ['totalYears', 'totalYears'], ['lcaProjects', 'lcaProjects'], ['designProjects', 'designProjects']]) {
    if (typeof override[k] === 'number') {
      experience[field] = override[k];
      experience.overridden.push(k);
      if (k === 'lcaProjects') {
        experience.lcaProjectsBasis = `reviewer correction from source-text evidence (${override[k]} recorded)`;
      }
    }
  }

  const listedSkills = parseListedSkills(lines);
  const certTexts = certifications.join(' ');

  const extraction = {
    skills: {
      lcaConcepts: scan.lcaConcepts.map(slim),
      lcaSoftware: scan.lcaSoftware.map(slim),
      standards: scan.standards.map(slim),
      lcaSupport: scan.lcaSupport.map(slim),
      uxTools: scan.uxTools.map(slim),
      uxMethods: scan.uxMethods.map(slim),
      uxExtras: scan.uxExtras.map(slim),
      listed: listedSkills,
    },
    experience,
    education: { degrees: edu.degrees, highest: edu.highest },
    projects,
    certifications,
    certSignals: {
      ux: UX_CERT_RE.test(certTexts) || /google\s+ux|interaction\s+design\s+foundation|\bIxDF\b|nielsen\s+norman|designlab|careerfoundry/i.test(joined),
      lca: LCA_CERT_RE.test(certTexts),
    },
    links,
    hasPortfolioLink: links.some((l) => l.type === 'portfolio'),
    mentionsPortfolio: /\bportfolio\b/i.test(joined),
    isoBareMentions: (joined.match(/\bISO\b(?![\s-]*\d)/g) || []).length,
    locations: parseLocations(joined),
    structure: { headersFound, sectionsFound: [...new Set(lines.filter((l) => l.isHeader).map((l) => l.section))] },
  };

  const issues = [];
  const chars = joined.length;
  if (headersFound === 0 && chars > 300) {
    issues.push({ level: 'warning', code: 'no_sections', message: 'No standard section headings (Education, Experience, Skills...) were detected, so education/projects/experience dates may be incomplete. Keyword scoring still works because it reads the whole text.' });
  }
  if (!edu.degrees.length && chars > 300) {
    issues.push({ level: 'warning', code: 'no_education', message: 'No degree was detected. The education part of the score is 0 until a reviewer confirms it.' });
  }
  if (!exp.entryCount && chars > 600) {
    issues.push({ level: 'warning', code: 'no_dated_experience', message: 'No dated work entries (e.g. "Jan 2021 - Present") were found. Experience years rely only on statements like "3 years of experience", if any.' });
  }
  if (exp.fallback) {
    issues.push({ level: 'info', code: 'experience_fallback', message: 'No "Experience" heading was found, so dated entries from other parts of the resume were used. Check the experience list.' });
  }
  if (stated.total && exp.datedTotalYears && Math.abs(stated.total - exp.datedTotalYears) > 2.5) {
    issues.push({ level: 'warning', code: 'experience_mismatch', message: `Resume states ${stated.total} yrs of experience but dated roles add up to ${exp.datedTotalYears} yrs. The higher number was used - please verify.` });
  }
  if (experience.totalYears > 40) {
    issues.push({ level: 'warning', code: 'suspicious_years', message: `Total experience computed as ${experience.totalYears} years - probably a date-parsing error.` });
  }

  return { extraction, scan, issues, stats: { chars, lines: lines.filter((l) => l.text).length, headersFound } };
}