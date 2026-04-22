import React from 'react';
import { SECTION_TYPES, newLine } from '../lib/model.js';

export default function SectionEditor({ section, index, total, onChange, onMove, onDelete }) {
  const setField = (k) => (e) => onChange((s) => ({ ...s, [k]: e.target.value }));

  const updateLine = (lineId, patch) =>
    onChange((s) => ({
      ...s,
      lines: s.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
    }));

  const addLine = () =>
    onChange((s) => ({ ...s, lines: [...s.lines, newLine()] }));

  const removeLine = (lineId) =>
    onChange((s) => ({
      ...s,
      lines: s.lines.length > 1 ? s.lines.filter((l) => l.id !== lineId) : s.lines,
    }));

  return (
    <div className="section">
      <div className="section-header">
        <span className="section-label">{section.type}</span>
        <select
          className="section-type"
          value={section.type}
          onChange={setField('type')}
          aria-label="Section type"
        >
          {SECTION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          className="section-custom"
          placeholder="Custom label (optional)"
          value={section.customLabel}
          onChange={setField('customLabel')}
        />
        <div className="section-actions">
          <button onClick={() => onMove(-1)} disabled={index === 0} title="Move up">↑</button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} title="Move down">↓</button>
          <button className="danger" onClick={onDelete} title="Delete section">✕</button>
        </div>
      </div>

      {section.lines.map((line) => (
        <div className="line" key={line.id}>
          <div className="line-chords">
            <input
              placeholder="C       G       Am      F"
              value={line.chords}
              onChange={(e) => updateLine(line.id, { chords: e.target.value })}
            />
          </div>
          <div className="line-lyrics">
            <input
              placeholder="Lyrics (leave blank for instrumental lines)"
              value={line.lyrics}
              onChange={(e) => updateLine(line.id, { lyrics: e.target.value })}
            />
          </div>
          <button
            className="line-remove danger ghost"
            onClick={() => removeLine(line.id)}
            disabled={section.lines.length <= 1}
            title="Remove line"
          >
            −
          </button>
        </div>
      ))}

      <div className="add-line">
        <button onClick={addLine}>+ Add Line</button>
      </div>
    </div>
  );
}
