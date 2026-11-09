'use client';

import { LABELS } from '../lib/classify';

export const ROLE_NAMES = {
  lca: 'LCA Consultant',
  ux: 'UI/UX Design Intern',
};

export function gradeFor(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function ClassBadge({ label, confidence, forced }) {
  const cls = {
    LCA: 'badge-lca',
    UX: 'badge-ux',
    BOTH: 'badge-both',
    NEITHER: 'badge-neutral',
    UNREADABLE: 'badge-unreadable',
  }[label] || 'badge-neutral';

  return (
    <span
      className={`class-badge ${cls}`}
      title={confidence ? `Confidence: ${confidence}${forced ? ' (reviewer decision)' : ''}` : undefined}
    >
      <span className="badge-dot" />
      {LABELS[label] || label || 'Unclassified'}
      {confidence === 'low' && <span className="badge-caption">Low confidence</span>}
      {forced && <span className="badge-caption">Reviewer decision</span>}
    </span>
  );
}

export function StatusMark({ status, issues = [] }) {
  if (status === 'ok') {
    return <span className="status-pill status-ok"><span />Extraction clean</span>;
  }

  const count = issues.filter((issue) => issue.level !== 'info').length;
  if (status === 'error') {
    return <span className="status-pill status-error"><span />Unreadable source</span>;
  }

  return (
    <span
      className="status-pill status-warning"
      title={issues.filter((issue) => issue.level !== 'info').map((issue) => issue.message).join('\n')}
    >
      <span />{count || 1} {count === 1 ? 'warning' : 'warnings'}
    </span>
  );
}

export function ScoreBar({ role, components = [], total = 0, compact = false }) {
  const grade = gradeFor(total);
  const title = components.map((item) => `${item.label}: ${item.score}/${item.max}`).join('\n');

  return (
    <div className={`scorebar ${compact ? 'scorebar-compact' : ''}`} data-role={role} title={title}>
      <div className="scorebar-track" role="img" aria-label={`Score ${Number(total).toFixed(1)} out of 100`}>
        {components.map((component, index) => (
          <span
            key={component.key}
            className={`scorebar-segment segment-${index}`}
            style={{ width: `${Math.max(0, Math.min(100, component.score))}%` }}
          />
        ))}
      </div>
      <span className="scorebar-value">{Number(total).toFixed(1)}</span>
      <span className={`grade grade-${grade.replace('+', 'plus')}`}>{grade}</span>
    </div>
  );
}

export function SingleScoreMeter({ score, role = 'lca', grade = true }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const letter = gradeFor(value);
  return (
    <div className="single-score">
      <div className="single-score-track" data-role={role}>
        <span style={{ width: `${value}%` }} />
      </div>
      {grade && <span className={`grade grade-${letter.replace('+', 'plus')}`}>{letter}</span>}
    </div>
  );
}

export function Chips({ items = [], limit = 4 }) {
  if (!items?.length) return <span className="empty-evidence">No role-specific evidence extracted</span>;
  return (
    <span className="chips">
      {items.slice(0, limit).map((item) => (
        <span className="chip" key={item}>{item}</span>
      ))}
      {items.length > limit && <span className="chip chip-more">+{items.length - limit}</span>}
    </span>
  );
}

export const years = (value) => {
  const number = Number(value) || 0;
  if (number === 0) return '0 yrs';
  const display = Number.isInteger(number) ? String(number) : number.toFixed(1);
  return `${display} yr${number === 1 ? '' : 's'}`;
};

export function initialsFor(value = '') {
  const parts = String(value).replace(/[_-]+/g, ' ').split(/\s+/).filter(Boolean);
  if (!parts.length) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
