'use client';

import { JOBS } from '../lib/jobs';
import { THRESHOLDS } from '../lib/classify';

function RubricCard({ role }) {
  const job = JOBS[role];
  return (
    <section className={`method-role-card method-${role}`}>
      <div className="method-role-heading"><div><p className="eyebrow">{role === 'lca' ? 'JOB DESCRIPTION 01' : 'JOB DESCRIPTION 02'}</p><h3>{job.title}</h3><p>{job.meta}</p></div><span className="method-total">100<small>points</small></span></div>
      <p className="method-role-summary">{job.summary}</p>
      <div className="method-rubric-list">
        {job.rubric.map((item, index) => (
          <details className="method-rubric-item" key={item.key}>
            <summary><span className="method-rubric-index">{String(index + 1).padStart(2, '0')}</span><span className="method-rubric-name">{item.label}</span><b>{item.max} pts</b><span className="method-summary-plus">+</span></summary>
            <p>{item.how}</p>
          </details>
        ))}
      </div>
      <div className="method-qualification-block"><h4>Required qualifications</h4><ul>{job.musts.map((item) => <li key={item}>{item}</li>)}</ul></div>
    </section>
  );
}

export default function Method({ report, total }) {
  const processedDate = report?.generatedAt
    ? new Date(report.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Not available';

  return (
    <div className="page-stack method-page">
      <section className="page-heading">
        <div><p className="eyebrow">TRANSPARENCY & GOVERNANCE</p><h1>Methodology & scoring</h1><p className="page-subtitle">How documents become structured evidence, how each role is scored and where human judgement is still required.</p></div>
        <div className="method-version"><span>RULE-BASED ENGINE</span><b>100-point rubrics</b><small>Last processed · {processedDate}</small></div>
      </section>

      <section className="method-principles-grid">
        <article><span className="principle-icon">01</span><b>Evidence first</b><p>Points are awarded from extracted resume evidence, not from a model-generated suitability impression.</p></article>
        <article><span className="principle-icon">02</span><b>Two separate rubrics</b><p>Each readable resume receives an independent LCA score and UI/UX score out of 100.</p></article>
        <article><span className="principle-icon">03</span><b>Explainable results</b><p>Candidate profiles show component scores, matching evidence and the rule used for each category.</p></article>
        <article><span className="principle-icon">04</span><b>Human oversight</b><p>Uncertain or unreadable records stay visible for review. A score does not replace an interview or qualification check.</p></article>
      </section>

      <section className="surface-card method-process-card">
        <div className="card-heading"><div><p className="eyebrow">PROCESS FLOW</p><h2>From resume to ranked shortlist</h2></div><span className="subtle-tag">Deterministic pipeline</span></div>
        <div className="process-flow">
          {[
            ['01', 'Ingest', 'PDF · DOCX · TXT · MD'],
            ['02', 'Extract', 'Skills · roles · education · projects'],
            ['03', 'Correct', 'Documented reviewer overrides'],
            ['04', 'Score', 'Two independent 100-point rubrics'],
            ['05', 'Classify', 'LCA · UX · Both · Neither'],
            ['06', 'Rank', 'Score, experience and evidence'],
          ].map(([number, title, detail], index) => <div className="process-step" key={number}><span>{number}</span><b>{title}</b><small>{detail}</small>{index < 5 && <i>→</i>}</div>)}
        </div>
      </section>

      <section className="method-threshold-card">
        <div><p className="eyebrow">CLASSIFICATION RULES</p><h2>How the role label is assigned</h2><p>Classification compares the two rubric scores and checks whether role-specific evidence exists. Unreadable files are never assigned a candidate label.</p></div>
        <div className="threshold-list">
          <div><b>{THRESHOLDS.strong}+ points</b><span>Strong score threshold for an individual role</span></div>
          <div><b>{THRESHOLDS.min} points</b><span>Minimum evidence floor; below this on both roles means neither</span></div>
          <div><b>{THRESHOLDS.bothMargin} points</b><span>Maximum difference when both roles qualify as strong</span></div>
          <div><b>{THRESHOLDS.clearMargin} points</b><span>Difference required to distinguish a leading role when both are not strong</span></div>
        </div>
      </section>

      <section className="section-heading"><div><p className="eyebrow">ROLE-SPECIFIC WEIGHTS</p><h2>Scoring rubrics</h2></div><span className="section-hint">Select a category to read its scoring rule</span></section>
      <section className="method-rubric-grid"><RubricCard role="lca" /><RubricCard role="ux" /></section>

      <section className="method-limits-card">
        <div><p className="eyebrow">KNOWN LIMITATIONS</p><h2>What the system cannot decide</h2></div>
        <div className="method-limit-list">
          <article><b>Scanned or blank files</b><p>OCR is not enabled. Image-only or empty files are identified and excluded from both rankings until a readable source or verified replacement text is supplied.</p></article>
          <article><b>Keyword context</b><p>Dictionary matching can miss unusual phrasing or match a term used in a different context. Open the extracted text and evidence snippets to verify the interpretation.</p></article>
          <article><b>Mandatory qualifications</b><p>A high aggregate score does not prove GaBi/SimaPro experience, three completed LCA projects, ISO 14040/14044 use, Figma proficiency or user-psychology knowledge. Check each requirement separately.</p></article>
          <article><b>Experience estimates</b><p>Experience is calculated from detected date ranges and relevant role descriptions. Overlaps are merged; reviewer corrections remain visible. Ambiguous dates require source verification.</p></article>
          <article><b>Human review notes</b><p>AI-assisted notes and overrides are traceability aids, not proof of personal verification. A human reviewer must compare each material correction with the original resume.</p></article>
          <article><b>Conflicting LCA experience wording</b><p>The supplied LCA job listing says 4–6 years in its heading but 2–3 years of independent LCA project experience in the detailed requirements. The rubric awards full experience points from four years while preserving the conflict for HR review.</p></article>
        </div>
      </section>
      <p className="screening-disclaimer"><b>Fair-use reminder:</b> Use this prototype to organise evidence and prioritise human review. Do not make an employment decision solely from an automated score or inferred personal characteristic.</p>
      <p className="method-footnote">Current dataset: {total} candidate records · Last processing report: {processedDate}</p>
    </div>
  );
}
