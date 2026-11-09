import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mammoth from 'mammoth';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'public', 'resumes');
const OUT = path.join(ROOT, 'public', 'previews');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function page(name, body) {
  const docxPath = `/resumes/${encodeURIComponent(name)}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(name)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #eef0f6; color: #171923; font: 17px/1.65 Calibri, Inter, 'Segoe UI', system-ui, sans-serif; }
  .bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 12px 24px; background: #fff; border-bottom: 1px solid #dfe3ec; }
  .bar b { font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .actions a { padding: 9px 16px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; border: 1px solid #635bdb; }
  .primary { background: #635bdb; color: #fff; }
  .primary:hover { background: #5148c7; }
  .ghost { background: #fff; color: #4a41c4; }
  .ghost:hover { background: #f0efff; }
  .sheet { max-width: 880px; margin: 28px auto 56px; padding: 56px 64px; background: #fff; border-radius: 6px; box-shadow: 0 6px 30px rgba(20,27,45,.12); overflow-wrap: anywhere; }
  .sheet h1, .sheet h2, .sheet h3 { line-height: 1.25; margin: 1.2em 0 .4em; }
  .sheet h1 { font-size: 30px; margin-top: 0; }
  .sheet h2 { font-size: 22px; border-bottom: 1px solid #e3e6ee; padding-bottom: 4px; }
  .sheet h3 { font-size: 18px; }
  .sheet p { margin: .45em 0; }
  .sheet ul, .sheet ol { padding-left: 1.4em; margin: .4em 0; }
  .sheet table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  .sheet td, .sheet th { border: 1px solid #d5d9e4; padding: 6px 10px; vertical-align: top; }
  .sheet img { max-width: 100%; height: auto; }
  @media (max-width: 700px) { .sheet { margin: 0; padding: 28px 20px; border-radius: 0; } }
</style>
</head>
<body>
<div class="bar">
  <b>${esc(name)}</b>
  <div class="actions">
    <a id="exact" class="ghost" hidden target="_blank" rel="noreferrer">Exact layout in Word Online</a>
    <a class="primary" href="${docxPath}" download>Download original .docx</a>
  </div>
</div>
<main class="sheet">${body}</main>
<script>
  (function () {
    var h = location.hostname;
    if (/^(localhost|127\\.|10\\.|192\\.168\\.)/.test(h)) return;
    var a = document.getElementById('exact');
    a.href = 'https://view.officeapps.live.com/op/view.aspx?src=' + encodeURIComponent(location.origin + '${docxPath}');
    a.hidden = false;
  })();
</script>
</body>
</html>`;
}

let files = [];
try {
  files = (await fs.readdir(SRC)).filter((f) => /\.docx$/i.test(f));
} catch {
  console.error(`Folder not found: ${SRC}. Run the resume processing step first.`);
  process.exit(1);
}

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });

let ok = 0;
for (const name of files) {
  let body;
  try {
    const { value } = await mammoth.convertToHtml({ path: path.join(SRC, name) });
    body = value && value.trim() ? value : '<p>This document contains no readable text.</p>';
    ok++;
  } catch {
    body = '<p>This document could not be converted for preview. Use the download button to open it in Word.</p>';
  }
  await fs.writeFile(path.join(OUT, name.replace(/\.docx$/i, '.html')), page(name, body));
}
console.log(`Previews: wrote ${files.length} pages to public/previews (${ok} converted, ${files.length - ok} fallback).`);
