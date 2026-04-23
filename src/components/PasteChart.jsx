import React, { useState } from 'react';
import { parseChordChart } from '../lib/chartParser.js';

export default function PasteChart({ onImport }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState({ kind: 'idle', msg: '' });

  const preview = React.useMemo(() => {
    if (!text.trim()) return null;
    try {
      return parseChordChart(text);
    } catch {
      return null;
    }
  }, [text]);

  const doImport = () => {
    if (!text.trim()) {
      setStatus({ kind: 'err', msg: 'Paste a chord chart first.' });
      return;
    }
    const parsed = parseChordChart(text);
    if (parsed.sections.length === 0) {
      setStatus({ kind: 'err', msg: "Couldn't find any sections. Make sure your chart has [Section] headers." });
      return;
    }
    onImport(parsed);
    const totalLines = parsed.sections.reduce((n, s) => n + s.lines.length, 0);
    const metaBits = Object.keys(parsed.meta);
    setStatus({
      kind: 'ok',
      msg: `Imported ${parsed.sections.length} section${
        parsed.sections.length === 1 ? '' : 's'
      } · ${totalLines} line${totalLines === 1 ? '' : 's'}${
        metaBits.length ? ` · detected: ${metaBits.join(', ')}` : ''
      }`,
    });
    setText('');
  };

  return (
    <>
      <div className="hint" style={{ marginBottom: 8 }}>
        Paste a chord chart from anywhere — Ultimate Guitar, Chordie, a PDF, your own notes.
        Format: <code>[Section]</code> headers with chord lines above lyric lines. I'll pick up
        capo, key, BPM, and time signature from the header if you include them.
      </div>
      <textarea
        className="mono"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Capo 4th fret

[Intro]
D   G D   A D

[Verse 1]
D                                     G                 D
I'm a clown in a barrel and baby you the bull
...`}
        style={{ fontSize: 12, lineHeight: 1.5, minHeight: 140 }}
      />
      {preview && preview.sections.length > 0 && (
        <div className="chart-preview">
          <div className="chart-preview-title">
            Preview — {preview.sections.length} section{preview.sections.length === 1 ? '' : 's'}
            {Object.keys(preview.meta).length > 0 && (
              <>
                {' · '}
                {Object.entries(preview.meta)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(', ')}
              </>
            )}
          </div>
          <div className="chart-preview-list">
            {preview.sections.map((s, i) => (
              <span key={i} className="chart-preview-chip">
                {s.customLabel ? `${s.type} ${s.customLabel}` : s.type}
                <span className="muted"> ({s.lines.length})</span>
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="row" style={{ marginTop: 10 }}>
        <button className="primary" onClick={doImport}>Parse & Import</button>
        <button onClick={() => { setText(''); setStatus({ kind: 'idle', msg: '' }); }}>
          Clear
        </button>
        <div className="spacer" />
      </div>
      <div className={`spotify-status ${status.kind}`}>{status.msg}</div>
    </>
  );
}
