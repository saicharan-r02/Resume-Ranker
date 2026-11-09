'use client';

import { useEffect, useRef, useState } from 'react';
import { ClassBadge, StatusMark, ROLE_NAMES, years, SingleScoreMeter, gradeFor, initialsFor } from './ui';
import { JOBS } from '../lib/jobs';

function previewHref(c) {
  const url = c.sourceUrl;
  if (url && url.startsWith('/resumes/') && /\.docx$/i.test(c.filename || '')) {
    return `/previews/${encodeURIComponent(c.filename.replace(/\.docx$/i, ''))}.html`;
  }
  return url;
}

function ExperienceSource({ experience, role }) {
  const dated = role === 'lca' ? experience.dated.lca : experience.dated.design;
  const stated = role === 'lca' ? experience.stated.lca : experience.stated.design;
  const field = role === 'lca' ? 'lcaYears' : 'designYears';
  const current = role === 'lca' ? experience.lcaYears : experience.designYears;
  if (experience.overridden?.includes(field)) {
    return `Reviewer correction: ${years(current)}. Automatic dated estimate: ${dated} yrs; stated in resume: ${stated || 'not found'}.`;
  }
  return `Calculated from dated roles: ${dated} yrs; stated in resume: ${stated || 'not found'}.`;
}

function SkillGroup({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="detail-skill-group">
      <h4>{title}</h4>
      <div className="detail-chip-list">
        {items.map((item) => (
          <span className="detail-chip" key={item.name} title={item.snippet ? `Resume context: ${item.snippet}` : undefined}>
            {item.name}{item.count > 1 && <small>×{item.count}</small>}
          </span>
        ))}
      </div>
    </div>
  );
}

function MetricTile({ label, value, note, tone = 'neutral' }) {
  return <div className={`drawer-metric drawer-metric-${tone}`}><small>{label}</small><b>{value}</b>{note && <span>{note}</span>}</div>;
}

export default function CandidateDrawer({ candidate, initialRole, ranks, total, onClose, onRemove }) {
  const [role, setRole] = useState('lca');
  const [view, setView] = useState('score');
  const closeRef = useRef(null);

  useEffect(() => {
    if (candidate) {
      setRole(initialRole || 'lca');
      setView('score');
      closeRef.current?.focus();
    }
  }, [candidate?.id, initialRole]);

  useEffect(() => {
    if (!candidate) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [candidate, onClose]);

  if (!candidate) return null;

  const c = candidate;
  const extraction = c.extraction || {};
  const experience = extraction.experience || {};
  const skills = extraction.skills || {};
  const unreadable = c.classification.label === 'UNREADABLE' || c.status === 'error';
  const score = c.scores?.[role] || { total: 0, components: [], topEvidence: [] };
  const job = JOBS[role];
  const problems = (c.issues || []).filter((issue) => issue.level !== 'info');
  const notes = (c.issues || []).filter((issue) => issue.level === 'info');
  const rank = ranks?.[role]?.get(c.id);

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className={`candidate-drawer drawer-role-${role}`} role="dialog" aria-modal="true" aria-label={`Candidate details for ${c.name}`}>
        <header className="candidate-drawer-header">
          <div className="drawer-person">
            <span className="avatar avatar-large">{initialsFor(c.name)}</span>
            <div>
              <p className="eyebrow">CANDIDATE PROFILE</p>
              <h2>{c.name}</h2>
              <p className="drawer-filename">{c.filename}{c.pages ? ` · ${c.pages} pages` : ''}{c.chars ? ` · ${c.chars.toLocaleString()} characters extracted` : ''}</p>
            </div>
          </div>
          <button ref={closeRef} className="icon-button" onClick={onClose} aria-label="Close candidate details">×</button>
        </header>

        <div className="drawer-content">
          <section className="drawer-verdict-card">
            <div className="drawer-verdict-top"><ClassBadge label={c.classification.label} confidence={c.classification.confidence} forced={c.classification.forced} /><StatusMark status={c.status} issues={c.issues || []} /></div>
            <p>{c.classification.reason}</p>
            <div className="drawer-source-actions">
              {c.sourceUrl ? <a href={previewHref(c)} target="_blank" rel="noreferrer">↗ Open original resume</a> : <span className="muted small">Original source file is available in the resume collection.</span>}
              {onRemove && <button className="text-button danger-text" onClick={onRemove}>Remove uploaded file</button>}
            </div>
          </section>

          {problems.length > 0 && <section className="drawer-alert drawer-alert-warning"><b>Extraction needs attention</b>{problems.map((issue, index) => <p key={`${issue.code}-${index}`}>{issue.message}</p>)}</section>}
          {c.review && <section className="drawer-alert drawer-alert-review"><b>AI-assisted review note · checked against source</b><p>{c.review.note || 'No detailed note supplied.'}</p>{c.review.fields?.length > 0 && <small>Fields corrected: {c.review.fields.join(', ')}</small>}</section>}

          <section className="drawer-score-grid">
            {['lca', 'ux'].map((itemRole) => {
              const itemScore = c.scores[itemRole]?.total ?? 0;
              const itemRank = ranks?.[itemRole]?.get(c.id);
              return (
                <button key={itemRole} className={`drawer-score-card ${role === itemRole ? 'active' : ''}`} data-role={itemRole} onClick={() => { setRole(itemRole); setView('score'); }}>
                  <span>{ROLE_NAMES[itemRole]}</span>
                  <strong>{unreadable ? '—' : itemScore.toFixed(1)}<small>{unreadable ? '' : '/100'}</small></strong>
                  <span className="drawer-score-foot">{unreadable ? 'Not evaluated' : itemRank ? `Rank ${itemRank} of ${ranks[itemRole].size}` : 'Not ranked in this role'}</span>
                </button>
              );
            })}
          </section>

          <nav className="drawer-tabs" role="tablist" aria-label="Candidate detail sections">
            <button role="tab" aria-selected={view === 'score'} className={view === 'score' ? 'active' : ''} onClick={() => setView('score')}>Score breakdown</button>
            <button role="tab" aria-selected={view === 'data'} className={view === 'data' ? 'active' : ''} onClick={() => setView('data')}>Extracted profile</button>
            <button role="tab" aria-selected={view === 'text'} className={view === 'text' ? 'active' : ''} onClick={() => setView('text')}>Resume text</button>
          </nav>

          {view === 'score' && (
            unreadable ? (
              <section className="drawer-empty-source">
                <div className="empty-source-icon">×</div>
                <h3>No score assigned</h3>
                <p>This source did not contain readable resume text. The candidate is excluded from both role rankings. Obtain a non-empty original resume or add manually verified replacement text before evaluating this person.</p>
                {c.issues?.map((issue, index) => <small key={index}>{issue.message}</small>)}
              </section>
            ) : (
              <section className="drawer-score-detail">
                <div className="drawer-score-summary" data-role={role}>
                  <div><span className="eyebrow">{job.short} MATCH SCORE</span><strong>{score.total.toFixed(1)}<small>/100</small></strong><p>{rank ? `Currently ranked #${rank} of ${total} readable candidates` : 'Score calculated; candidate is outside the selected role-fit filter.'}</p></div>
                  <span className={`grade grade-${gradeFor(score.total).replace('+', 'plus')}`}>{gradeFor(score.total)}</span>
                </div>

                <div className="drawer-section-heading"><div><p className="eyebrow">TRANSPARENT SCORING</p><h3>Score by requirement area</h3></div><span>100 points total</span></div>
                <div className="component-list">
                  {score.components.map((component, index) => {
                    const rule = job.rubric.find((item) => item.key === component.key);
                    const percent = component.max ? (component.score / component.max) * 100 : 0;
                    return (
                      <article className="component-card" key={component.key}>
                        <div className="component-card-top"><b>{component.label}</b><strong>{component.score}<small> / {component.max}</small></strong></div>
                        <div className="component-progress" data-role={role}><span style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /></div>
                        <p>{component.detail}</p>
                        {component.evidence?.length > 0 ? (
                          <ul className="evidence-list">
                            {component.evidence.map((item, evidenceIndex) => (
                              <li key={`${item.label}-${evidenceIndex}`}><b>{item.label}</b>{item.where && <small> · {item.where}</small>}{item.snippet && <q>{item.snippet}</q>}</li>
                            ))}
                          </ul>
                        ) : <span className="no-evidence">No matching evidence found for this category.</span>}
                        {rule && <details className="scoring-rule"><summary>How these points are awarded</summary><p>{rule.how}</p></details>}
                      </article>
                    );
                  })}
                </div>
                <p className="drawer-disclaimer">A score is a screening signal, not confirmation that every mandatory job requirement has been met. Verify the original resume before shortlisting.</p>
              </section>
            )
          )}

          {view === 'data' && (
            unreadable ? <section className="drawer-empty-source"><h3>No extracted profile</h3><p>Skills, projects, education and experience are unavailable because the source file could not be read.</p></section> : (
              <section className="extracted-profile">
                <div className="drawer-section-heading"><div><p className="eyebrow">STRUCTURED EXTRACTION</p><h3>Experience summary</h3></div></div>
                <div className="drawer-metrics-grid">
                  <MetricTile label="LCA experience" value={years(experience.lcaYears)} note={<ExperienceSource experience={experience} role="lca" />} tone="lca" />
                  <MetricTile label="Design experience" value={years(experience.designYears)} note={<ExperienceSource experience={experience} role="ux" />} tone="ux" />
                  <MetricTile label="Total experience" value={years(experience.totalYears)} note="All dated work periods" />
                  <MetricTile label="LCA projects" value={experience.lcaProjects ?? 0} note={experience.lcaProjectsBasis || 'No project basis recorded'} tone="lca" />
                  <MetricTile label="Design projects" value={experience.designProjects ?? 0} note="Named design projects / case studies" tone="ux" />
                </div>

                <div className="drawer-section-heading"><div><p className="eyebrow">CAREER HISTORY</p><h3>Employment entries</h3></div><span>{experience.entries?.length || 0} entries</span></div>
                {experience.entries?.length ? <ul className="timeline-list">{experience.entries.map((entry, index) => <li key={`${entry.title}-${index}`}><span className="timeline-dot" /><div><b>{entry.title || '(role title not detected)'}</b><small>{entry.range || 'Dates not detected'}{entry.months ? ` · ${(entry.months / 12).toFixed(1)} years` : ''}</small><div className="timeline-tags">{entry.lcaRelevant && <span className="mini-tag mini-tag-lca">LCA-related</span>}{entry.designRelevant && <span className="mini-tag mini-tag-ux">UX/design-related</span>}</div></div></li>)}</ul> : <p className="no-evidence">No dated work entries were detected.</p>}

                <div className="drawer-section-heading"><div><p className="eyebrow">EDUCATION</p><h3>Qualifications</h3></div></div>
                {extraction.education?.degrees?.length ? <div className="detail-list">{extraction.education.degrees.map((degree, index) => <div key={index}><b>{degree.levelLabel}</b><span>{degree.category?.replace('_', ' / ')}</span><p>{degree.text}</p></div>)}</div> : <p className="no-evidence">No degree detected.</p>}

                <div className="drawer-section-heading"><div><p className="eyebrow">SKILLS & METHODS</p><h3>Evidence extracted from resume</h3></div></div>
                <SkillGroup title="LCA software" items={skills.lcaSoftware} />
                <SkillGroup title="Standards" items={skills.standards} />
                <SkillGroup title="LCA concepts" items={skills.lcaConcepts} />
                <SkillGroup title="Data, benchmarking and stakeholders" items={skills.lcaSupport} />
                <SkillGroup title="Design tools" items={skills.uxTools} />
                <SkillGroup title="UX methods" items={skills.uxMethods} />
                <SkillGroup title="Visual craft and domain" items={skills.uxExtras} />
                {extraction.projects?.length > 0 && <><div className="drawer-section-heading"><div><p className="eyebrow">PORTFOLIO</p><h3>Named projects</h3></div></div><div className="project-list">{extraction.projects.map((project, index) => <article key={`${project.title}-${index}`}><b>{project.title}</b><div className="timeline-tags">{project.lca && <span className="mini-tag mini-tag-lca">LCA</span>}{project.design && <span className="mini-tag mini-tag-ux">Design</span>}</div><p>{project.text}</p></article>)}</div></>}
                {extraction.certifications?.length > 0 && <div className="detail-list"><b>Certifications and courses</b>{extraction.certifications.map((item, index) => <p key={index}>{item}</p>)}</div>}
                {skills.listed?.length > 0 && <SkillGroup title="Other skills listed in the resume" items={skills.listed.map((name) => ({ name }))} />}
                {notes.length > 0 && <div className="drawer-alert drawer-alert-review">{notes.map((note, index) => <p key={index}>{note.message}</p>)}</div>}
              </section>
            )
          )}

          {view === 'text' && (
            <section className="resume-text-view">
              <div className="drawer-section-heading"><div><p className="eyebrow">SOURCE VERIFICATION</p><h3>Text extracted from this resume</h3></div></div>
              <p className="text-view-note">This is the text used by the extraction and scoring pipeline. Check for missing columns, scrambled sections or incorrect dates before trusting the scores.</p>
              <pre>{c.rawText || '(No resume text could be extracted.)'}{c.rawTextTruncated ? '\n\n[Text shortened for display.]' : ''}</pre>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}