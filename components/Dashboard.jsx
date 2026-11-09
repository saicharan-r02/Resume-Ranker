'use client';

import { useMemo, useState, useCallback } from 'react';
import { JOBS } from '../lib/jobs';
import { rankMaps, compareFor, relevantYears } from '../lib/rank';
import { ClassBadge, StatusMark, SingleScoreMeter, Chips, ROLE_NAMES, years, gradeFor, initialsFor } from './ui';
import CandidateDrawer from './CandidateDrawer';
import UploadPanel from './UploadPanel';
import Method from './Method';

const DEFAULT_FILTERS = {
  query: '',
  show: 'fit',
  minScore: 0,
  minYears: 0,
  sort: 'score',
  reverse: false,
  onlyIssues: false
};

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'lca', label: 'LCA shortlist' },
  { id: 'ux', label: 'Design shortlist' },
  { id: 'audit', label: 'Review queue' },
  { id: 'method', label: 'Scoring guide' }
];

function isUnreadable(candidate) {
  return candidate?.status === 'error' || candidate?.classification?.label === 'UNREADABLE';
}

function needsReview(candidate) {
  if (isUnreadable(candidate)) return true;
  if (candidate?.review?.reviewed) return false;
  return candidate?.status !== 'ok'
    || candidate?.classification?.confidence === 'low'
    || candidate?.classification?.label === 'BOTH'
    || candidate?.classification?.label === 'NEITHER';
}

function matchesQuery(candidate, role, query) {
  if (!query.trim()) return true;
  const extraction = candidate.extraction || {};
  const skills = extraction.skills || {};
  const experience = extraction.experience || {};
  const roleScore = candidate.scores?.[role] || {};
  const values = [
    candidate.filename,
    candidate.name,
    candidate.classification?.reason,
    candidate.review?.note,
    ...(roleScore.topEvidence || []),
    ...(skills.listed || []),
    ...(skills.lcaSoftware || []).map((item) => item.name),
    ...(skills.uxTools || []).map((item) => item.name),
    ...(skills.lcaConcepts || []).map((item) => item.name),
    ...(skills.uxMethods || []).map((item) => item.name),
    extraction.education?.highest?.text || '',
    ...(experience.entries || []).map((entry) => entry.title)
  ];
  const haystack = values.join(' ').toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
}

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    lca: <><path d="M12 3v18M5 8h14M7 8l-4 7h8L7 8Zm10 0-4 7h8l-4-7Z" /></>,
    ux: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    audit: <><path d="M8 3h8l4 4v14H4V3h4Z" /><path d="M8 11h8M8 15h8M8 7h3" /></>,
    method: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.7 2.7 0 1 1 4.7 1.8c-1.2 1.1-2.2 1.5-2.2 3.2M12 17.5h.01" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    file: <><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z" /><path d="M13 3v7h7M8 14h8M8 17h6" /></>,
  };
  return <svg {...common}>{paths[name] || paths.overview}</svg>;
}

function Eyebrow({ children }) {
  return <div className="eyebrow">{children}</div>;
}

function StatCard({ label, value, detail, tone = 'default', icon }) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <div className="stat-card-top"><span>{label}</span><span className="stat-icon"><Icon name={icon || 'overview'} size={17} /></span></div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function RoleCard({ role, count, ranked, leader, onOpen }) {
  const job = JOBS[role];
  const isLca = role === 'lca';
  const score = leader?.scores?.[role]?.total ?? 0;
  return (
    <article className={`role-card role-card-${role}`}>
      <div className="role-card-top">
        <span className="role-icon"><Icon name={isLca ? 'lca' : 'ux'} size={20} /></span>
        <span className="role-code">ROLE 0{isLca ? '1' : '2'}</span>
        <span className="role-location">{isLca ? 'Chennai · Onsite' : 'Remote'}</span>
      </div>
      <div className="role-card-title-row">
        <div><h2>{job.title}</h2><p>{job.short === 'LCA Consultant' ? 'Life Cycle Assessment' : 'Digital product design'}</p></div>
        <div className="role-count"><strong>{count}</strong><span>matches</span></div>
      </div>
      <p className="role-description">{job.summary}</p>
      <div className="role-requirements">
        {job.musts.slice(0, 3).map((item) => <span key={item}><i /><span>{item}</span></span>)}
      </div>
      <div className="role-card-bottom">
        <div className="role-leader">
          {leader ? <>
            <span className="mini-avatar">{initialsFor(leader.name)}</span>
            <span className="leader-copy"><small>HIGHEST CURRENT SCORE</small><b>{leader.name}</b></span>
            <strong>{score.toFixed(1)}<small>/100</small></strong>
          </> : <span className="muted">No readable candidates</span>}
        </div>
        <button className="role-link" onClick={onOpen}>View shortlist <Icon name="arrow" size={16} /></button>
      </div>
      <div className="role-card-footnote">{ranked} readable profiles ranked independently</div>
    </article>
  );
}

function CandidateLine({ candidate, role, rank, onOpen, compact = false }) {
  const score = candidate.scores?.[role] || { total: 0, topEvidence: [] };
  const exp = relevantYears(candidate, role);
  const grade = gradeFor(score.total);
  return (
    <button className={`candidate-line ${compact ? 'candidate-line-compact' : ''}`} onClick={onOpen}>
      <span className="candidate-line-rank">{String(rank ?? '—').padStart(2, '0')}</span>
      <span className="candidate-avatar">{initialsFor(candidate.name)}</span>
      <span className="candidate-line-main">
        <span className="candidate-line-name">{candidate.name}{candidate.isNew && <em>NEW</em>}</span>
        <span className="candidate-line-meta">{candidate.filename}</span>
        {!compact && <span className="candidate-line-evidence"><Chips items={score.topEvidence} limit={3} /></span>}
      </span>
      <span className="candidate-line-exp"><strong>{years(exp)}</strong><small>{role === 'lca' ? 'Relevant LCA' : 'UX/UI'} experience</small></span>
      <span className="candidate-line-score">
        <span><strong>{score.total.toFixed(1)}</strong><small>/100</small><em className={`grade grade-${grade.replace('+', 'plus')}`}>{grade}</em></span>
        <SingleScoreMeter score={score.total} role={role} grade={false} />
      </span>
      {!compact && <span className="candidate-line-state"><ClassBadge label={candidate.classification.label} confidence={candidate.classification.confidence} forced={candidate.classification.forced} /><StatusMark status={candidate.status} issues={candidate.issues || []} /></span>}
      <span className="candidate-line-arrow"><Icon name="chevron" size={17} /></span>
    </button>
  );
}

function Overview({ all, readable, counts, ranks, onOpen, onNavigate }) {
  const lcaTop = [...readable].sort(compareFor('lca')).slice(0, 3);
  const uxTop = [...readable].sort(compareFor('ux')).slice(0, 3);
  const reviewed = all.filter((candidate) => candidate.review?.reviewed).length;
  const pending = all.filter(needsReview).length;
  const clean = all.filter((candidate) => candidate.status === 'ok').length;

  return (
    <div className="page-content">
      <div className="page-heading-row">
        <div>
          <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={13} /><b>Overview</b></div>
          <h1>Hiring overview</h1>
          <p className="page-description">A clear view of both applicant pools, the strongest evidence and the items that still need attention.</p>
        </div>
        <div className="heading-actions">
          <span className="dataset-chip"><i /> Assignment dataset · {all.length} resumes</span>
        </div>
      </div>

      <section className="stat-grid" aria-label="Application summary">
        <StatCard label="Applications received" value={all.length} detail="Original assignment set" icon="file" />
        <StatCard label="Readable & evaluated" value={readable.length} detail={`${clean} clean extractions`} tone="positive" icon="check" />
        <StatCard label="LCA shortlist" value={counts.lca} detail={`${ranks.lca.size} included in ranking`} tone="lca" icon="lca" />
        <StatCard label="Design shortlist" value={counts.ux} detail={`${ranks.ux.size} included in ranking`} tone="ux" icon="ux" />
      </section>

      {pending > 0 && (
        <button className="attention-banner" onClick={() => onNavigate('audit')}>
          <span className="attention-icon"><Icon name="clock" size={18} /></span>
          <span className="attention-copy"><strong>{pending} item{pending === 1 ? '' : 's'} {pending === 1 ? 'requires' : 'require'} review</strong><small>{reviewed} AI-assisted review notes are recorded. Human verification is still required before hiring decisions.</small></span>
          <span className="attention-action">Open review queue <Icon name="arrow" size={15} /></span>
        </button>
      )}

      <div className="section-title-row">
        <div><Eyebrow>OPEN POSITIONS</Eyebrow><h2>Explore the shortlists</h2><p>Each resume is scored independently against both job descriptions.</p></div>
        <button className="text-link" onClick={() => onNavigate('method')}>How scoring works <Icon name="arrow" size={15} /></button>
      </div>
      <section className="role-grid">
        <RoleCard role="lca" count={counts.lca} ranked={ranks.lca.size} leader={lcaTop[0]} onOpen={() => onNavigate('lca')} />
        <RoleCard role="ux" count={counts.ux} ranked={ranks.ux.size} leader={uxTop[0]} onOpen={() => onNavigate('ux')} />
      </section>

      <section className="overview-bottom-grid">
        <article className="surface-card leader-card">
          <div className="card-heading-row"><div><Eyebrow>TOP MATCHES</Eyebrow><h2>Leading candidates</h2></div><span className="muted-label">By role score</span></div>
          <div className="leader-tabs-grid">
            <div className="leader-column">
              <div className="leader-column-heading"><span className="role-dot dot-lca" /> LCA Consultant <button onClick={() => onNavigate('lca')}>View all</button></div>
              {lcaTop.map((candidate, index) => <CandidateLine key={candidate.id} candidate={candidate} role="lca" rank={index + 1} compact onOpen={() => onOpen(candidate.id, 'lca')} />)}
            </div>
            <div className="leader-column">
              <div className="leader-column-heading"><span className="role-dot dot-ux" /> UI/UX Intern <button onClick={() => onNavigate('ux')}>View all</button></div>
              {uxTop.map((candidate, index) => <CandidateLine key={candidate.id} candidate={candidate} role="ux" rank={index + 1} compact onOpen={() => onOpen(candidate.id, 'ux')} />)}
            </div>
          </div>
        </article>
        <aside className="surface-card data-health-card">
          <div className="card-heading-row"><div><Eyebrow>DATA QUALITY</Eyebrow><h2>Source health</h2></div><span className="health-indicator"><i /> Monitored</span></div>
          <div className="health-score-row"><strong>{Math.round((readable.length / Math.max(1, all.length)) * 100)}%</strong><span>of source documents<br />were readable</span></div>
          <div className="health-meter"><span style={{ width: `${(readable.length / Math.max(1, all.length)) * 100}%` }} /></div>
          <div className="health-legend"><span><i className="legend-clean" />Readable <b>{readable.length}</b></span><span><i className="legend-error" />Unreadable <b>{counts.unreadable}</b></span></div>
          {counts.unreadable > 0 && <div className="health-note"><b>One document needs a replacement source</b><span>The blank DOCX is visible in the review queue and excluded from rankings.</span><button onClick={() => onNavigate('audit')}>Inspect source <Icon name="arrow" size={14} /></button></div>}
        </aside>
      </section>
      <div className="workspace-disclaimer"><span>i</span><p><strong>Decision support, not automated hiring.</strong> Scores organise the evidence found in each resume. Verify mandatory qualifications and reviewer corrections against the original document.</p></div>
    </div>
  );
}

function RoleBrief({ role, expanded, onToggle }) {
  const job = JOBS[role];
  return (
    <section className={`role-brief role-brief-${role}`}>
      <div className="role-brief-heading">
        <div><Eyebrow>JOB DESCRIPTION 0{role === 'lca' ? '1' : '2'}</Eyebrow><h2>{job.title}</h2><p>{job.meta}</p></div>
        <button className="secondary-button" onClick={onToggle}>{expanded ? 'Hide details' : 'View requirements'} <Icon name="chevron" size={15} /></button>
      </div>
      <p className="role-brief-summary">{job.summary}</p>
      <div className="requirement-pills">{job.musts.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div>
      {expanded && <div className="role-brief-expanded">
        <div><h3>Required qualifications</h3><ul>{job.musts.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><h3>Additional advantages</h3><ul>{job.nice.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><h3>Scoring categories</h3>{job.rubric.map((item) => <div className="rubric-line" key={item.key}><span>{item.label}</span><b>{item.max} pts</b></div>)}</div>
      </div>}
    </section>
  );
}

function Leaderboard({ role, rows, total, filters, setFilters, profileOpen, setProfileOpen, onOpen, ranks }) {
  const job = JOBS[role];
  const setF = useCallback((patch) => setFilters((current) => ({ ...current, ...patch })), [setFilters]);
  const isLca = role === 'lca';
  return (
    <div className="page-content">
      <div className="page-heading-row role-page-heading">
        <div>
          <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={13} /><b>{isLca ? 'LCA shortlist' : 'Design shortlist'}</b></div>
          <div className="role-title-lockup"><span className={`role-title-icon role-title-icon-${role}`}><Icon name={role} size={22} /></span><div><h1>{job.title}</h1><p className="page-description">{isLca ? 'Life Cycle Assessment · Chennai, onsite' : 'Digital product design · Remote'} </p></div></div>
        </div>
        <div className="role-page-stats"><span><strong>{total}</strong><small>readable profiles ranked</small></span><span><strong>{rows.length}</strong><small>currently displayed</small></span></div>
      </div>

      <RoleBrief role={role} expanded={profileOpen} onToggle={() => setProfileOpen((value) => !value)} />

      <section className="surface-card candidates-card">
        <div className="candidate-card-heading"><div><Eyebrow>RANKED APPLICANTS</Eyebrow><h2>Candidate shortlist <span>{rows.length}</span></h2><p>Sorted by match score, relevant experience and distinct evidence.</p></div><span className="sort-state">Updated from current candidate set</span></div>
        <div className="filter-toolbar">
          <label className="search-control"><Icon name="search" size={17} /><input type="search" value={filters.query} onChange={(event) => setF({ query: event.target.value })} placeholder="Search candidates, skills or tools" /></label>
          <select aria-label="Candidate set" value={filters.show} onChange={(event) => setF({ show: event.target.value })}><option value="fit">Shortlist matches</option><option value="all">All readable resumes</option></select>
          <select aria-label="Minimum score" value={filters.minScore} onChange={(event) => setF({ minScore: Number(event.target.value) })}><option value={0}>Any score</option><option value={50}>50+ score</option><option value={60}>60+ score</option><option value={70}>70+ score</option><option value={80}>80+ score</option></select>
          <select aria-label="Relevant experience" value={filters.minYears} onChange={(event) => setF({ minYears: Number(event.target.value) })}><option value={0}>Any experience</option><option value={1}>1+ years</option><option value={2}>2+ years</option><option value={3}>3+ years</option><option value={4}>4+ years</option></select>
          <select aria-label="Sort candidates" value={filters.sort} onChange={(event) => setF({ sort: event.target.value, reverse: false })}><option value="score">Highest score</option><option value="years">Most experience</option><option value="evidence">Most evidence</option><option value="name">Candidate name</option></select>
          <label className="only-issues-control"><input type="checkbox" checked={filters.onlyIssues} onChange={(event) => setF({ onlyIssues: event.target.checked })} /> Issues</label>
          <button className="reset-control" onClick={() => setFilters(DEFAULT_FILTERS)}>Reset</button>
        </div>
        <div className="table-scroll">
          <div className="candidate-table-head"><span>RANK</span><span>APPLICANT</span><span>RELEVANT EXPERIENCE</span><span>MATCH SCORE</span><span>CLASSIFICATION / SOURCE</span><span /></div>
          <div className="candidate-table-body">
            {rows.map((candidate) => <CandidateLine key={candidate.id} candidate={candidate} role={role} rank={ranks[role].get(candidate.id)} onOpen={() => onOpen(candidate.id, role)} />)}
            {rows.length === 0 && <div className="table-empty"><span><Icon name="search" size={20} /></span><b>No candidates match these filters</b><p>Try changing your search or clearing one of the filters.</p><button className="secondary-button" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</button></div>}
          </div>
        </div>
        <div className="table-footer"><span>Showing <b>{rows.length}</b> of <b>{total}</b> readable candidates</span><span>Unreadable source files are kept in the review queue, not ranked.</span></div>
      </section>
      <div className="workspace-disclaimer"><span>i</span><p><strong>Check mandatory qualifications separately.</strong> A high aggregate score does not prove that every requirement is met. Open a candidate to inspect supporting evidence.</p></div>
    </div>
  );
}

function AuditPage({ all, onOpen }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const reviewedCount = all.filter((candidate) => candidate.review?.reviewed).length;
  const pendingCount = all.filter(needsReview).length;
  const unreadableCount = all.filter(isUnreadable).length;
  const issueCount = all.filter((candidate) => candidate.issues?.some((issue) => issue.level !== 'info')).length;
  const visible = all.filter((candidate) => {
    const reviewed = Boolean(candidate.review?.reviewed);
    if (filter === 'reviewed' && !reviewed) return false;
    if (filter === 'open' && !needsReview(candidate)) return false;
    if (filter === 'unreadable' && !isUnreadable(candidate)) return false;
    const text = [candidate.name, candidate.filename, candidate.review?.note, candidate.classification?.reason].join(' ').toLowerCase();
    return text.includes(query.toLowerCase());
  }).sort((a, b) => Number(needsReview(b)) - Number(needsReview(a)) || a.filename.localeCompare(b.filename));

  return (
    <div className="page-content">
      <div className="page-heading-row">
        <div><div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={13} /><b>Review queue</b></div><h1>Review & data quality</h1><p className="page-description">Inspect exceptions, recorded corrections and source files that still need attention.</p></div>
        <div className="heading-actions"><span className="dataset-chip"><i /> {pendingCount} open item{pendingCount === 1 ? '' : 's'}</span></div>
      </div>
      <div className="stat-grid audit-stats">
        <StatCard label="Review notes recorded" value={reviewedCount} detail="AI-assisted · not human-approved" icon="file" />
        <StatCard label="Needs attention" value={pendingCount} detail="Open follow-up items" tone="warning" icon="clock" />
        <StatCard label="Source issues" value={issueCount} detail="Warnings and errors" icon="filter" />
        <StatCard label="Unreadable files" value={unreadableCount} detail="Excluded from rankings" tone="warning" icon="file" />
      </div>
      <div className="audit-integrity-note"><span>!</span><p><b>Review integrity:</b> An override marked reviewed means a correction is recorded. It does not prove a human independently checked the source resume. Verify material experience and project corrections before making hiring decisions.</p></div>
      <section className="surface-card audit-card">
        <div className="candidate-card-heading"><div><Eyebrow>ALL SOURCE RECORDS</Eyebrow><h2>Candidate audit trail</h2><p>Find a candidate, inspect the reason for a flag and open the original document.</p></div><label className="search-control audit-search"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidate or review note" /></label></div>
        <div className="audit-filters" role="tablist" aria-label="Filter audit records">
          {[['all', 'All records', all.length], ['open', 'Needs attention', pendingCount], ['reviewed', 'Notes recorded', reviewedCount], ['unreadable', 'Unreadable', unreadableCount]].map(([id, label, count]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}<span>{count}</span></button>)}
        </div>
        <div className="audit-list">
          {visible.map((candidate, index) => {
            const unreadable = isUnreadable(candidate);
            const reviewed = Boolean(candidate.review?.reviewed);
            const flagged = needsReview(candidate);
            const substantiveIssues = (candidate.issues || []).filter((issue) => issue.level !== 'info');
            return (
              <button className="audit-row" key={candidate.id} onClick={() => onOpen(candidate.id)}>
                <span className="audit-row-number">{String(index + 1).padStart(2, '0')}</span>
                <span className={`audit-row-state ${unreadable ? 'is-error' : reviewed ? 'is-reviewed' : flagged ? 'is-pending' : 'is-clean'}`}>{unreadable ? '!' : reviewed ? '✓' : flagged ? '!' : '✓'}</span>
                <span className="audit-row-main"><b>{candidate.name}</b><small>{candidate.filename}</small><span>{candidate.review?.note || substantiveIssues[0]?.message || candidate.classification?.reason}</span></span>
                <span className="audit-row-labels">
                  {unreadable ? <span className="status-pill status-error"><i />Unreadable</span> : reviewed ? <span className="status-pill status-reviewed"><i />Note recorded</span> : flagged ? <span className="status-pill status-warning"><i />Needs review</span> : <span className="status-pill status-ok"><i />No open flags</span>}
                  <ClassBadge label={candidate.classification.label} confidence={candidate.classification.confidence} forced={candidate.classification.forced} />
                </span>
                <span className="candidate-line-arrow"><Icon name="chevron" size={17} /></span>
              </button>
            );
          })}
          {visible.length === 0 && <div className="table-empty"><b>No records found</b><p>Change the filter or search query.</p></div>}
        </div>
      </section>
    </div>
  );
}

export default function Dashboard({ initialCandidates, report }) {
  const [tab, setTab] = useState('overview');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [uploads, setUploads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const all = useMemo(() => [...uploads, ...initialCandidates], [uploads, initialCandidates]);
  const readable = useMemo(() => all.filter((candidate) => !isUnreadable(candidate)), [all]);
  const ranks = useMemo(() => rankMaps(all), [all]);
  const byId = useMemo(() => new Map(all.map((candidate) => [candidate.id, candidate])), [all]);
  const counts = useMemo(() => {
    const result = { lca: 0, ux: 0, both: 0, neither: 0, unreadable: 0, review: 0 };
    for (const candidate of all) {
      const label = candidate.classification?.label;
      if (label === 'LCA' || label === 'BOTH') result.lca += 1;
      if (label === 'UX' || label === 'BOTH') result.ux += 1;
      if (label === 'BOTH') result.both += 1;
      if (label === 'NEITHER') result.neither += 1;
      if (isUnreadable(candidate)) result.unreadable += 1;
      if (needsReview(candidate)) result.review += 1;
    }
    return result;
  }, [all]);

  const rows = useMemo(() => {
    if (tab !== 'lca' && tab !== 'ux') return [];
    const role = tab;
    let list = all.filter((candidate) => {
      if (isUnreadable(candidate)) return false;
      const label = candidate.classification?.label;
      if (filters.show === 'fit' && !(label === role.toUpperCase() || label === 'BOTH')) return false;
      if ((candidate.scores?.[role]?.total ?? 0) < filters.minScore) return false;
      if (relevantYears(candidate, role) < filters.minYears) return false;
      if (filters.onlyIssues && candidate.status === 'ok') return false;
      return matchesQuery(candidate, role, filters.query);
    });
    const scoreCompare = compareFor(role);
    const sorters = {
      score: scoreCompare,
      years: (a, b) => relevantYears(b, role) - relevantYears(a, role) || scoreCompare(a, b),
      evidence: (a, b) => (b.scores?.[role]?.distinctEvidence || 0) - (a.scores?.[role]?.distinctEvidence || 0) || scoreCompare(a, b),
      name: (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }),
    };
    list = [...list].sort(sorters[filters.sort] || sorters.score);
    return filters.reverse ? list.reverse() : list;
  }, [all, tab, filters]);

  const selectedCandidate = selected ? byId.get(selected.id) : null;
  const selectedRole = selected?.role || (tab === 'ux' ? 'ux' : 'lca');
  const openCandidate = (id, role) => setSelected({ id, role: role || selectedRole });
  const handleAdded = (candidate) => setUploads((current) => [candidate, ...current]);
  const removeUpload = (id) => {
    setUploads((current) => current.filter((candidate) => candidate.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand-lockup" onClick={() => setTab('overview')} aria-label="Go to overview">
          <span className="brand-symbol"><i /><i /><i /></span>
          <span className="brand-text"><b>GFI Talent</b><small>HIRING WORKSPACE</small></span>
        </button>
        <div className="topbar-divider" />
        <div className="workspace-switcher"><span className="workspace-avatar">G</span><span><b>Growth For Impact</b></span></div>
        <nav className="main-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => <button key={item.id} className={`main-nav-link ${tab === item.id ? 'active' : ''}`} onClick={() => { setTab(item.id); setFilters(DEFAULT_FILTERS); }} aria-current={tab === item.id ? 'page' : undefined}>
            <Icon name={item.id === 'lca' ? 'lca' : item.id === 'ux' ? 'ux' : item.id === 'audit' ? 'audit' : item.id === 'method' ? 'method' : 'overview'} size={16} />
            {item.label}{item.id === 'audit' && counts.review > 0 && <span className="nav-count">{counts.review}</span>}
          </button>)}
        </nav>
        <div className="topbar-actions">
          <span className="topbar-dataset"><i /> {all.length} resumes</span>
          <button className="button button-primary upload-top-button" onClick={() => setUploadOpen(true)}><Icon name="upload" size={16} /> Upload resume</button>
          <span className="user-avatar" title="Growth For Impact">G</span>
        </div>
      </header>

      {report?.sourceDir === 'samples' && <div className="demo-banner" role="note">Demo dataset active — synthetic examples are not part of the 47 assignment applicants.</div>}

      <main className="main-content">
        {tab === 'overview' && <Overview all={all} readable={readable} counts={counts} ranks={ranks} onOpen={openCandidate} onNavigate={setTab} />}
        {(tab === 'lca' || tab === 'ux') && <Leaderboard role={tab} rows={rows} total={ranks[tab].size} filters={filters} setFilters={setFilters} profileOpen={profileOpen} setProfileOpen={setProfileOpen} onOpen={openCandidate} ranks={ranks} />}
        {tab === 'audit' && <AuditPage all={all} onOpen={(id) => openCandidate(id, 'lca')} />}
        {tab === 'method' && <div className="page-content"><Method report={report} total={all.length} /></div>}
      </main>

      <footer className="app-footer"><span><b>GFI TALENT</b> · Candidate screening prototype</span><span>Evidence-led screening · Human verification required</span></footer>

      <CandidateDrawer candidate={selectedCandidate} initialRole={selected?.role} ranks={ranks} total={ranks[selectedRole]?.size || 0} onClose={() => setSelected(null)} onRemove={selectedCandidate?.isNew ? () => removeUpload(selectedCandidate.id) : null} />
      <UploadPanel open={uploadOpen} onClose={() => setUploadOpen(false)} onAdded={handleAdded} onOpenCandidate={(id, role) => { setUploadOpen(false); setTab(role); setSelected({ id, role }); }} existing={all} />
    </div>
  );
}