import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeFile } from '../lib/parse-file.mjs';
import { rankMaps } from '../lib/rank.mjs';
import { LABELS } from '../lib/classify.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const dirArg = argv.includes('--dir') ? argv[argv.indexOf('--dir') + 1] : 'resumes';
const SRC = path.resolve(ROOT, dirArg);
const PUBLIC = path.join(ROOT, 'public', 'resumes');
const OVERRIDES = path.join(ROOT, 'data', 'overrides.json');

const slug = (s) => s.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'resume';

async function loadOverrides() {
  try {
    const raw = JSON.parse(await fs.readFile(OVERRIDES, 'utf8'));
    return Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith('_')));
  } catch {
    return {};
  }
}

async function main() {
  let names;
  try {
    names = (await fs.readdir(SRC)).filter((n) => !n.startsWith('.') && !/^readme/i.test(n));
  } catch {
    console.error(`Folder not found: ${SRC}\nCreate it and put the resumes inside.`);
    process.exit(1);
  }
  names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!names.length) {
    console.error(`No resumes found in ${SRC}. Copy the PDF/DOCX files there first.`);
    process.exit(1);
  }

  const overrides = await loadOverrides();
  const unusedOverrides = new Set(Object.keys(overrides));

  await fs.mkdir(PUBLIC, { recursive: true });
  for (const f of await fs.readdir(PUBLIC)) if (f !== '.gitkeep') await fs.rm(path.join(PUBLIC, f), { force: true, recursive: true });

  const candidates = [];
  const used = new Set();
  for (const [i, filename] of names.entries()) {
    const full = path.join(SRC, filename);
    if ((await fs.stat(full)).isDirectory()) continue;
    const buffer = await fs.readFile(full);
    let id = slug(filename);
    if (used.has(id)) id = `${id}-${i}`;
    used.add(id);
    unusedOverrides.delete(filename);
    await fs.copyFile(full, path.join(PUBLIC, filename));
    const c = await analyzeFile({ id, filename, buffer, sourceUrl: `/resumes/${encodeURIComponent(filename)}`, override: overrides[filename] || null });
    candidates.push(c);
    const s = c.scores;
    console.log(`${c.status.padEnd(7)} ${filename.padEnd(40).slice(0, 40)} LCA ${String(s.lca.total).padStart(5)}  UX ${String(s.ux.total).padStart(5)}  -> ${LABELS[c.classification.label]}`);
  }

  const ranks = rankMaps(candidates);
  const counts = { total: candidates.length, ok: 0, warning: 0, error: 0, LCA: 0, UX: 0, BOTH: 0, NEITHER: 0, UNREADABLE: 0 };
  for (const c of candidates) {
    counts[c.status]++;
    counts[c.classification.label]++;
  }

  await fs.mkdir(path.join(ROOT, 'data'), { recursive: true });
  await fs.writeFile(path.join(ROOT, 'data', 'candidates.json'), JSON.stringify(candidates));
  await fs.writeFile(path.join(ROOT, 'data', 'processing-report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), sourceDir: dirArg, counts }, null, 2));

  console.log('\nSummary:', counts);
  console.log(`Ranked candidates: LCA ${ranks.lca.size}, UI/UX ${ranks.ux.size}; unreadable files are excluded.`);
  console.log(`Top LCA: ${[...ranks.lca.entries()].filter(([, r]) => r <= 3).map(([id]) => id).join(', ')}`);
  if (unusedOverrides.size) console.log(`\nNote: overrides for files not found in ${dirArg}: ${[...unusedOverrides].join(', ')}`);
  console.log('\nWrote data/candidates.json and copied source files to public/resumes/. Next: npm run review, then npm run dev');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
