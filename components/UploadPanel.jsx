'use client';

import { useEffect, useRef, useState } from 'react';
import { rankMaps } from '../lib/rank';
import { ClassBadge, ROLE_NAMES, SingleScoreMeter, gradeFor } from './ui';

const DEMO_PRESETS = [
  { id: 'lca', title: 'Strong LCA profile', description: 'Senior LCA practitioner with industry tools and standards.', file: '01_lca_senior.pdf', tone: 'lca', icon: '◈' },
  { id: 'ux', title: 'UI/UX design fresher', description: 'Figma, user research, wireframes and portfolio work.', file: '04_ux_fresher_twocol.pdf', tone: 'ux', icon: '✳' },
  { id: 'both', title: 'Hybrid profile', description: 'A synthetic resume with evidence relevant to both roles.', file: '08_both_hybrid.pdf', tone: 'both', icon: '◇' },
  { id: 'neither', title: 'Unrelated profile', description: 'A synthetic profile that should not match either role strongly.', file: '11_marketing.pdf', tone: 'neutral', icon: '—' }
];

export default function UploadPanel({ open, onClose, onAdded, onOpenCandidate, existing }) {
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [drag, setDrag] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => event.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, busy]);

  if (!open) return null;

  async function processFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    setError('');
    setBusy(true);
    let pile = [...existing];

    for (const file of files) {
      setBusyLabel(`Reading ${file.name}`);
      try {
        const body = new FormData();
        body.append('file', file);
        const response = await fetch('/api/parse', { method: 'POST', body });
        let payload = null;
        try { payload = await response.json(); } catch {}

        if (!response.ok || !payload?.candidate) {
          setError(payload?.error || `The server could not process ${file.name} (HTTP ${response.status}). Try a PDF or DOCX under 4 MB.`);
          continue;
        }

        const sourceUrl = URL.createObjectURL(file);
        const candidate = { ...payload.candidate, isNew: true, sourceUrl };
        pile = [candidate, ...pile];
        const rankMap = rankMaps(pile);
        setResults((current) => [{
          candidate,
          ranks: { lca: rankMap.lca.get(candidate.id), ux: rankMap.ux.get(candidate.id) },
          totals: { lca: rankMap.lca.size, ux: rankMap.ux.size },
        }, ...current]);
        onAdded(candidate);
      } catch (exception) {
        setError(`Upload failed for ${file.name}: ${exception?.message || 'network error'}. Check the connection and try again.`);
      }
    }

    setBusy(false);
    setBusyLabel('');
    if (input.current) input.current.value = '';
  }

  async function loadPreset(preset) {
    setError('');
    setBusy(true);
    setBusyLabel(`Loading ${preset.title}`);
    try {
      const response = await fetch(`/samples/${preset.file}`);
      if (!response.ok) throw new Error(`Sample file could not be loaded (HTTP ${response.status}).`);
      const blob = await response.blob();
      const file = new File([blob], preset.file, { type: blob.type || 'application/pdf' });
      setBusy(false);
      setBusyLabel('');
      await processFiles([file]);
    } catch (exception) {
      setBusy(false);
      setBusyLabel('');
      setError(`${exception?.message || 'Could not load this sample.'} You can still choose a resume from your computer.`);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title">
        <header className="upload-modal-header">
          <div><p className="eyebrow">ADD TO THE CANDIDATE POOL</p><h2 id="upload-title">Upload & rank a resume</h2><p>The file is analysed with the same extraction and scoring pipeline as the existing candidate set.</p></div>
          <button className="icon-button" onClick={onClose} disabled={busy} aria-label="Close upload dialog">×</button>
        </header>

        <div className={`upload-dropzone ${drag ? 'drag-active' : ''} ${busy ? 'upload-busy' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(event) => { event.preventDefault(); setDrag(false); if (!busy) processFiles(event.dataTransfer.files); }}>
          <div className="upload-cloud-icon">↑</div>
          <b>{busy ? (busyLabel || 'Analysing resume…') : 'Drop a resume here'}</b>
          <span>or browse files from your computer</span>
          <input ref={input} type="file" accept=".pdf,.docx,.txt,.md" multiple hidden onChange={(event) => processFiles(event.target.files)} />
          <button className="button button-primary" disabled={busy} onClick={() => input.current?.click()}>Choose files</button>
          <small>PDF, DOCX, TXT or MD · Maximum 4 MB per file</small>
        </div>

        {error && <div className="upload-error" role="alert"><b>We couldn't process that file</b><p>{error}</p></div>}

        <section className="preset-section">
          <div className="preset-heading"><div><p className="eyebrow">QUICK EVALUATOR DEMO</p><h3>Try a sample profile</h3></div><span>Synthetic test resumes</span></div>
          <div className="preset-grid">
            {DEMO_PRESETS.map((preset) => (
              <button className={`preset-card preset-${preset.tone}`} key={preset.id} disabled={busy} onClick={() => loadPreset(preset)}>
                <span className="preset-icon">{preset.icon}</span><b>{preset.title}</b><small>{preset.description}</small><span className="preset-action">Run sample <span>→</span></span>
              </button>
            ))}
          </div>
          <p className="preset-disclaimer">These examples are synthetic test fixtures. They are not part of the 47 real assignment applicants and do not change the saved source dataset.</p>
        </section>

        {results.length > 0 && (
          <section className="upload-results">
            <div className="preset-heading"><div><p className="eyebrow">SESSION RESULTS</p><h3>Recently evaluated</h3></div><button className="text-button" onClick={() => setResults([])}>Clear results</button></div>
            {results.map(({ candidate, ranks, totals }) => (
              <article className="upload-result-card" key={candidate.id}>
                <div className="upload-result-heading"><div><b>{candidate.name}</b><small>{candidate.filename}</small></div><ClassBadge label={candidate.classification.label} confidence={candidate.classification.confidence} forced={candidate.classification.forced} /></div>
                <p className="upload-result-reason">{candidate.classification.reason}</p>
                <div className="upload-result-scores">
                  {['lca', 'ux'].map((role) => {
                    const score = candidate.scores[role].total;
                    const unreadable = candidate.classification.label === 'UNREADABLE';
                    return (
                      <button key={role} className={`upload-role-result upload-role-${role}`} onClick={() => onOpenCandidate(candidate.id, role)}>
                        <span>{ROLE_NAMES[role]}</span>
                        <strong>{unreadable ? 'Not scored' : <>{score.toFixed(1)}<small>/100</small></>}</strong>
                        {!unreadable && <div className="upload-mini-meter"><span style={{ width: `${score}%` }} /></div>}
                        <small>{ranks[role] ? `Would rank ${ranks[role]} of ${totals[role]}` : 'Not ranked — unreadable source'}</small>
                      </button>
                    );
                  })}
                </div>
                {candidate.issues.filter((issue) => issue.level !== 'info').map((issue, index) => <p className={`issue-line ${issue.level}`} key={`${issue.code}-${index}`}>{issue.message}</p>)}
              </article>
            ))}
          </section>
        )}
        <footer className="upload-modal-footer"><span>Uploaded files are held in this browser session only.</span><button className="button button-light" onClick={onClose} disabled={busy}>Done</button></footer>
      </section>
    </div>
  );
}