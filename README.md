# Resume Ranker — Growth For Impact assessment

A Next.js prototype that reads the 47 supplied anonymized resumes, extracts job-related evidence, scores every readable resume against the two supplied job descriptions, classifies the strongest role match, and ranks the pile separately for the LCA Consultant and UI/UX Design Intern roles. Reviewers can inspect the source file, extracted text, evidence, score breakdown, and reviewer corrections. They can also upload a new resume and see where it would rank in the current pile.

The application uses a deterministic, explainable rule-based pipeline. It does not send resumes to an external LLM or require an API key.

## Current data result

The latest local `npm run process` and `npm run review -- --log` run produced:

| Measure | Result |
|---|---:|
| Supplied resumes | 47 |
| Readable and scored | 46 |
| Blank / unreadable | 1 |
| Extraction warnings on readable files | 0 |
| AI-assisted review overrides applied from `data/overrides.json` | 46 |
| LCA Consultant classification | 14 |
| UI/UX Intern classification | 24 |
| Both roles | 0 |
| Neither / uncertain | 8 |
| Candidates in each role ranking | 46 |
| Still open in Needs Review | 1 |

The one open item is `anonymized_resume_1793685080327.docx`. The DOCX package is valid but its Word document contains no text, image, table, header, footer, or embedded object. It is a blank source file, not a scanned resume that this parser failed to OCR. It remains visible in Needs Review and is excluded from both rankings until the original non-empty resume or verified replacement text is supplied.

The 46 reviewer notes in `data/overrides.json` were drafted with AI assistance and then checked against original resume documents by the applicant (Sai Charan) on 9 November 2026. Corrections and remaining uncertainty are listed in METHODOLOGY.md §6 and CLEANING_LOG.md.

## Requirements

- Node.js 20.9 or newer (Node 22 LTS recommended).
- npm (bundled with Node.js).
- Windows, macOS, or Linux.
- No API key or database is required.

## Run locally

Open PowerShell or a terminal in the project directory (`resume-ranker`). On a fresh checkout or ZIP extraction, install platform-correct dependencies first:

```powershell
npm ci
```

Then run the checks and regenerate the applicant data in this order:

```powershell
npm test
npm run process
npm run review -- --log
npm run dev
```

Open `http://localhost:3000` in your browser.

- `npm test` runs the synthetic regression set plus targeted checks for date parsing, project extraction, false-positive UX matching, blank, image-only and corrupt DOCX handling, unreadable ranking exclusion, and reviewer-supplied replacement text.
- `npm run process` reads `resumes/`, applies `data/overrides.json`, regenerates `data/candidates.json` and `data/processing-report.json`, and copies original resumes to `public/resumes/` for source links.
- `npm run review -- --log` prints unresolved items and regenerates `CLEANING_LOG.md`. Reviewed records are not re-flagged; genuinely unreadable files remain open.
- `npm run dev` starts the local web app.

For a production build locally:

```powershell
npm run build
npm start
```

`npm run dev` and `npm run build` require Next.js' native binary for the operating system where dependencies are installed. Do not copy a `node_modules` folder from Windows to Linux or vice versa. Run `npm ci` on the machine where you will run or build the app.

## Upload and ranking behaviour

Use **Upload a resume** in the dashboard. Accepted formats are PDF, DOCX, TXT and MD, up to 4 MB per file. The API extracts and scores the file with the same rules as the existing 47 resumes; the new candidate is inserted into the in-memory pile and assigned an LCA rank and a UI/UX rank. Uploads are not persisted on the server and disappear when the browser session is refreshed.

Unreadable uploads are shown with an extraction error, but they are not assigned a zero-score rank. The original applicant file is linked from the dashboard under `/resumes/`.

## Deploy to Vercel

1. Run the local commands above, including `npm run process` and `npm run review -- --log`.
2. Confirm `CLEANING_LOG.md`, `data/overrides.json` and `data/candidates.json` contain the reviewed result you intend to submit.
3. Create a GitHub repository and push the project files. Do not commit `node_modules/`, `.next/` or `.vercel/`; `.gitignore` excludes them.
4. Import the repository into Vercel as a Next.js project. No environment variables are required.
5. After deployment, open the Vercel URL and test both role tabs, the Needs Review panel, the source-resume links, candidate detail drawer, filters and one upload.

**Privacy check:** the 47 supplied resumes are copied to `public/resumes/` so reviewers can open source documents. Anyone who can access the deployed site may also be able to access those public files. Confirm that the assignment-provided anonymized resumes are permitted to be hosted before deploying.

## Project structure

```text
app/                      Next.js routes, layout and upload API
components/               Dashboard, candidate drawer, upload panel and methodology view
lib/dictionary.mjs        Role vocabulary and relevance rules
lib/text.mjs              Text cleanup, section detection and date parsing
lib/parse-file.mjs        PDF, DOCX, TXT and MD extraction
lib/extract.mjs           Skills, experience, education, projects and links
lib/score.mjs             Two transparent 100-point score rubrics
lib/classify.mjs          LCA / UX / Both / Neither / Unreadable decisions
lib/rank.mjs              Role-specific sorting and rank assignment
lib/pipeline.mjs          Shared extraction → score → classify pipeline
lib/jobs.mjs              The two job descriptions and UI rubric text
scripts/build-data.mjs    npm run process
scripts/audit.mjs         npm run review
scripts/selftest.mjs      npm test
resumes/                  Original assignment resumes
public/resumes/           Source files served to the reviewer
samples/                  13 synthetic regression fixtures
data/overrides.json       AI-assisted corrections and review notes
data/candidates.json      Generated candidate evidence and scores
data/processing-report.json Latest processing summary
CLEANING_LOG.md            AI-assisted review notes and open items
METHODOLOGY.md             Assessment approach, scoring and limitations
```

## Important limitations

- No OCR is run. Scanned PDFs or image-only DOCX files are marked unreadable; a blank DOCX is separately identified as `empty_document`.
- Keyword matching is not semantic understanding. It can miss paraphrases or match a term in an irrelevant context; every candidate therefore exposes the extracted text, evidence and score details.
- A role score is not proof that a candidate meets every mandatory qualification. For JD1, check GaBi/SimaPro hands-on use, 2–3 years of independent LCA work, at least three completed projects and ISO 14040/14044 explicitly. For JD2, check Figma/prototyping, user research/psychology and portfolio quality.
- The supplied anonymized resumes had every number of 5+ digits removed, so "ISO 14040/14044" appear only as a bare "ISO". The 6-point standards part of the LCA rubric therefore cannot be earned by any resume in this pile (it affects everyone equally); the score card flags bare "ISO" mentions for manual verification. See METHODOLOGY.md section 7.
- The LCA listing is inconsistent: its header says 4–6 years while the body asks for 2–3 years. The rubric gives partial credit from year 1 and full experience points at year 4; the detailed score shows the actual years counted.
- The supplied resumes are local files. The application does not crawl the Webscraping FYI or Reddit resources; those were provided as learning references, not as resume sources.
- Uploaded test resumes are session-only. Persistent uploads, exports, OCR and a database are future improvements.
