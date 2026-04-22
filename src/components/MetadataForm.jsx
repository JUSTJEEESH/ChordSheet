import React from 'react';
import { KEYS, TIME_SIGNATURES, CAPO_OPTIONS } from '../lib/model.js';

export default function MetadataForm({ meta, setMeta }) {
  const update = (k) => (e) => setMeta((m) => ({ ...m, [k]: e.target.value }));
  return (
    <div className="meta-grid">
      <div className="field field-wide">
        <label>Title</label>
        <input value={meta.title} onChange={update('title')} placeholder="Song title" />
      </div>
      <div className="field field-wide">
        <label>Artist</label>
        <input value={meta.artist} onChange={update('artist')} placeholder="Artist name" />
      </div>
      <div className="field">
        <label>Key</label>
        <select value={meta.key} onChange={update('key')}>
          {KEYS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>BPM</label>
        <input
          className="mono"
          value={meta.bpm}
          onChange={update('bpm')}
          placeholder="120"
          inputMode="numeric"
        />
      </div>
      <div className="field">
        <label>Time Sig</label>
        <select value={meta.timeSignature} onChange={update('timeSignature')}>
          {TIME_SIGNATURES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Capo</label>
        <select value={meta.capo} onChange={update('capo')}>
          {CAPO_OPTIONS.map((c) => (
            <option key={c} value={c}>{c === '0' ? 'None' : `Fret ${c}`}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
