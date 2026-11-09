import { analyzeFile, SUPPORTED, extOf } from '../../../lib/parse-file.mjs';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req) {
  let form;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'Send the resume as multipart form data in a field called "file".' }, { status: 400 });
  }
  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return Response.json({ error: 'No file received. Choose a PDF, DOCX, TXT or MD resume and try again.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: `That file is ${(file.size / 1048576).toFixed(1)} MB. The upload limit is 4 MB - compress the file or use a shorter resume.` }, { status: 413 });
  }
  const ext = extOf(file.name || '');
  if (!SUPPORTED.includes(ext)) {
    return Response.json({ error: `"${ext || 'this'}" files are not supported. Upload a PDF, DOCX, TXT or MD resume.` }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const id = `upload-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const candidate = await analyzeFile({ id, filename: file.name, buffer, sourceUrl: null });
  return Response.json({ candidate });
}
