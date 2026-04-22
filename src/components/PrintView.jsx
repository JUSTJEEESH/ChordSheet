import React from 'react';
import { sectionDisplayLabel } from '../lib/model.js';

export default function PrintView({ meta, sections }) {
  return (
    <div className="print-view">
      <div className="print-header">
        <h1 className="print-title">{meta.title || 'Untitled'}</h1>
        {meta.artist && <p className="print-artist">{meta.artist}</p>}
        <div className="print-meta">
          <span>Key: {meta.key}</span>
          {meta.bpm && <span>BPM: {meta.bpm}</span>}
          <span>Time: {meta.timeSignature}</span>
          <span>Capo: {meta.capo === '0' ? 'None' : `Fret ${meta.capo}`}</span>
        </div>
      </div>
      {sections.map((s) => (
        <div key={s.id} className="print-section">
          <div className="print-section-label">{sectionDisplayLabel(s)}</div>
          {s.lines.map((line) => (
            <div key={line.id} className="print-line">
              <div className="print-chords">{line.chords || ' '}</div>
              <div className="print-lyrics">{line.lyrics || ' '}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
