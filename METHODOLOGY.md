# Methodology — Growth For Impact resume assessment

## 1. Objective and job-description interpretation

The prototype processes 47 supplied anonymized resumes and compares each one to two distinct roles:

**JD1 — LCA Consultant (Chennai, onsite).** The work centres on collecting and validating Life Cycle Inventory data, modelling LCA studies in GaBi or SimaPro, documenting assumptions, benchmarking public data, and working with client teams. The role description asks for 2–3 years of independent LCA work, at least three completed LCA projects, ISO 14040 and ISO 14044, and relevant software. Its listing header separately says 4–6 years; that inconsistency is called out rather than silently reconciled.

**JD2 — UI/UX Design Intern (remote).** The role is intended for 0–1 years of design experience and expects Figma and prototyping, user research and psychology, human-centred design, strong visual craft, attention to detail, and work on a sustainability website/job board.

The supplied Web Scraping FYI and r/webscraping links are learning references. The input data for this assignment is the provided local resume set, so the prototype does not crawl those sites or any external job portal.

## 2. Design choice

The scoring engine is deterministic and rule-based, not an LLM or embedding black box. A fixed 100-point score makes it possible to compare a newly uploaded resume to the existing pile without changing every other candidate's score. Each component shows matched evidence and a snippet so a reviewer can see why points were awarded.

The trade-off is that dictionaries and date rules cannot fully understand context. The application therefore exposes extracted text and retains a reviewer override file rather than pretending the parser is infallible.

## 3. Processing pipeline

1. **Ingestion.** PDF text is extracted with `unpdf`; DOCX is converted through Mammoth; TXT and MD are read as UTF-8. Two-column PDF layouts are detected and read column by column where possible. Original source files are linked from the interface.
2. **Text normalisation.** Unicode punctuation, bullets, whitespace, ligatures and icon-font glyphs are normalised before matching.
3. **Section detection.** Common headings are identified, including `Projects / Deliverables`. If headings are absent, role vocabulary can still be matched against the full text, but section-specific extraction is less reliable.
4. **Skills and standards.** Weighted dictionaries extract LCA methods, LCA software, ISO standards, data/benchmarking duties, UX tools, UX methods and craft/domain terms. Every match retains its source section and snippet.
5. **Experience.** Month/year, year-only, partial-month ranges (for example `Dec–Jan 2025`) and `Present`/`Current` dates are converted into month intervals. Overlapping intervals are merged to avoid double-counting. Experience relevance is assessed per dated role, not by applying a keyword found anywhere in the resume to every job. Explicit years are separated into total, LCA and design values.
6. **Projects.** Project-section titles and their descriptions are grouped into entries. Supporting bullets are not each counted as separate completed LCA projects. The LCA project count uses explicit numeric claims or distinct project-section entries; ambiguous counts are manually corrected or left unverified.
7. **Education and supporting evidence.** Degree level, field, certificates, links and locations are extracted where present.
8. **Scoring, classification and ranking.** Both role scores are calculated on fixed rubrics, the stronger role is assigned, and all readable resumes are ranked separately for each role. Ties are broken by role-relevant experience, then distinct evidence, then filename.
9. **Review.** Extraction errors, low-confidence results and uncertain classifications are surfaced in Needs Review. Corrections in `data/overrides.json` are applied before scores and ranks are recalculated.

## 4. Scoring rubric

### LCA Consultant — 100 points

| Component | Maximum | Calculation |
|---|---:|---|
| LCA knowledge and terminology | 30 | Core LCA methods (LCA, LCI/LCIA, EPD, product carbon footprint, system boundary, functional unit and impact methods) contribute up to 24. Adjacent sustainability vocabulary (GHG, ESG, circular economy) contributes up to 6. This prevents generic ESG terms from substituting for LCA methodology. |
| LCA software | 20 | GaBi or SimaPro earns full credit; skills-list-only mentions are discounted until hands-on use is confirmed. openLCA, Umberto and One Click LCA earn partial credit because the JD explicitly names GaBi or SimaPro. |
| Relevant LCA experience | 20 | Role-specific years: 0 years = 0; 1 year = 30%; 2 years = 70%; 3 years = 85%; 4+ years = 100%. The output shows dated and stated years. |
| Standards and project history | 10 | Up to 6 for standards, with ISO 14040 and ISO 14044 weighted most; up to 4 for distinct completed LCA projects, with 3+ reaching the component maximum. |
| Education | 10 | Environmental domain is preferred; engineering/science receives substantial credit; other fields receive less. Master's/PhD and Bachelor's bonuses are applied within the 10-point cap. |
| Data, benchmarking and stakeholder work | 10 | Evidence for collection, validation/QC, benchmarking, client/stakeholder work, cross-functional collaboration, logistics/supply chain, resource data and documentation. |

The two conflicting experience statements in JD1 are both disclosed. The experience component gives partial credit below four years and full points at four years; the score is not a guarantee that the candidate satisfies the employer's independent-work requirement.

### UI/UX Design Intern — 100 points

| Component | Maximum | Calculation |
|---|---:|---|
| Design and prototyping tools | 25 | Figma is weighted highest; other prototyping/design tools receive lower weights. |
| UX methods, research and psychology | 25 | User research, usability testing, personas, wireframes, prototyping, user flows, information architecture, human-centred design, design systems, accessibility and user psychology/HCI. |
| Portfolio and design projects | 20 | Portfolio link = 8; portfolio mention without link = 4; up to 4 points each for three design case studies/projects. |
| Experience fit | 10 | 0–1 years is the target and receives full credit; higher experience receives declining credit because the brief is an internship. A fresher needs dedicated design-tool and UX-method evidence to receive experience credit. |
| Education and courses | 10 | Design/HCI fields receive the strongest base; computing and engineering/science receive partial credit. Degree level and UX courses/certificates add capped bonus points. |
| Aesthetic craft and domain fit | 10 | Typography, colour, branding, illustration, motion/layout (up to 5), sustainability interest (3), and web/app/job-board context (2). |

## 5. Classification and ranking

Classification is derived from the two role scores:

- **Both:** both scores are at least 45 and are within 15 points.
- **Neither / uncertain:** the highest score is below 25, or the scores are within 12 points without both being strong.
- **LCA or UX:** otherwise the higher score determines the closer role match.
- **Unreadable:** the source has no usable text; no classification or rank is assigned.

Low confidence is retained where core LCA evidence, practical evidence, or dedicated UX tools are missing. A reviewer can set a label or numeric correction in `data/overrides.json`; a forced label does not automatically imply high confidence or prove the mandatory criteria have been met.

Each role has a separate ranking across all readable candidates, not just those classified as a fit. The dashboard defaults to showing candidates classified for that role, but the reviewer can select **All resumes**. The unreadable file is excluded from both role rankings.

## 6. Data cleaning and findings

The generated `CLEANING_LOG.md` is the detailed record. The current processing run reports:

- 47 source files.
- 46 readable and scored; 1 valid but empty DOCX.
- 46 AI-assisted correction/decision records in `data/overrides.json`.
- 0 remaining extraction warnings among the readable files.
- 16 classified LCA, 24 classified UI/UX, 0 Both, 6 Neither/uncertain, and 1 Unreadable.
- 46 readable candidates ranked in each role list.
- 1 open review item: `anonymized_resume_1793685080327.docx`.

Important corrections made in the code and data include:

- Treat `Projects / Deliverables` as a recognised section and extract named project entries.
- Do not count every bullet in a single work assignment as a separate completed LCA project. Distinct project headings or an explicit numeric resume claim are required; ambiguous cases have conservative reviewer counts/notes.
- Parse partial month ranges such as `Dec–Jan 2025` and `May–July 2025`.
- Keep LCA experience separate from general ESG, GHG, EIA and sustainability duties; determine relevance for each job entry.
- Avoid treating generic physical-product usability or generic design-thinking language as UI/UX experience without dedicated design-tool/method evidence.
- Distinguish an image-only document from a completely blank DOCX. The supplied unreadable file is structurally valid but contains no text or images, so it cannot be reconstructed.
- Allow verified replacement text in `overrides.json` to resolve an original parser error and make the candidate eligible for scoring; the original extraction error is retained as an informational audit note.

The 46 AI-assisted review notes were assembled through a source-text review of the supplied candidate export and resume evidence. This is not a claim that every original file has been independently verified by a human in Microsoft Word. Before final submission, the applicant must compare the notes and counts against the original resume documents—especially any claimed number of completed independent LCA studies—and correct anything not supported.

## 7. Error handling and limitations

- OCR is not implemented. Image-only resumes require a readable copy or verified replacement text.
- A genuinely blank DOCX has no content to recover. It stays open in Needs Review and is not ranked.
- **Anonymization removed ISO standard numbers.** The supplied resumes had every number of 5+ digits stripped, so "ISO 14040" and "ISO 14044" survive only as a bare "ISO" (for example "in accordance with EN +A2, ISO , and ISO ."). Only 1 of the 47 resumes still shows any ISO number, so the 6-point "standards" part of the LCA rubric cannot be earned by anyone in this pile; every LCA candidate is affected equally, so relative order is largely unaffected, but absolute LCA scores are up to 6 points lower than they would be on the original resumes. The score card flags bare "ISO" mentions instead of silently showing 0; verify them against the originals. Resumes uploaded later keep their numbers and are scored normally.
- The score is evidence-based but keyword-driven; it can miss synonyms or misunderstand context. Human inspection is necessary for borderline candidates.
- A numerical match score does not itself establish that mandatory qualifications are satisfied. For JD1, explicitly verify GaBi/SimaPro, independent LCA duration, three completed studies and ISO 14040/14044. For JD2, verify Figma/prototyping, user psychology/research and portfolio quality.
- The original 47 files are served under `public/resumes/`; confirm permission to host the anonymized source set publicly.
- Uploaded test resumes are processed in the API and added to the current browser session. They are not persisted in a database or retained after refresh.

## 8. Tests

`npm test` currently runs 31 checks: the two 100-point rubric totals, 11 synthetic resume classification cases, partial-month date parsing, project section extraction, conservative LCA project counting, false-positive UX prevention, explicit experience-year handling, the supplied blank DOCX diagnosis, image-only and corrupt DOCX handling, unreadable ranking exclusion, and recovery through reviewer-supplied text.

The following project commands were run successfully in the working copy:

```text
npm test
npm run process
npm run review -- --log
```

`npm run dev` and `npm run build` require a platform-specific Next.js SWC binary. The working container had Windows `node_modules` without a Linux SWC binary and could not fetch a Linux binary because its package-registry network was unavailable. Reinstall dependencies on the target operating system with `npm ci`, then run the dev server and production build there before deployment.

## 9. Future improvements

1. OCR for scanned PDFs and image-only documents.
2. More robust layout understanding for unusual columns/tables and malformed DOCX structures.
3. A reviewer UI for editing years, project counts and classifications without editing JSON manually.
4. CSV export, persistent uploads and a database if HR needs long-lived applicant data.
5. A second semantic/LLM opinion as a clearly separate aid, while retaining the deterministic evidence-based score as the baseline.
6. Calibration with hiring-team feedback to test whether the weights predict interview decisions.
