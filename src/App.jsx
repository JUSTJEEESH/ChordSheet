import React, { useState, useMemo, useCallback } from 'react';
import MetadataForm from './components/MetadataForm.jsx';
import SpotifyLookup from './components/SpotifyLookup.jsx';
import SectionEditor from './components/SectionEditor.jsx';
import PrintView from './components/PrintView.jsx';
import UGExportModal from './components/UGExportModal.jsx';
import { SECTION_TYPES, newSection, newLine } from './lib/model.js';
import { toUltimateGuitar } from './lib/ugExport.js';

const defaultMeta = {
  title: '',
  artist: '',
  key: 'C',
  bpm: '',
  timeSignature: '4/4',
  capo: '0',
};

const defaultSections = [
  {
    ...newSection('Verse'),
    lines: [
      { id: crypto.randomUUID(), chords: 'C        G       Am       F', lyrics: 'Sample lyrics go here — edit me' },
      { ...newLine() },
    ],
  },
];

export default function App() {
  const [meta, setMeta] = useState(defaultMeta);
  const [sections, setSections] = useState(defaultSections);
  const [ugOpen, setUgOpen] = useState(false);

  const updateSection = useCallback((id, updater) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? (typeof updater === 'function' ? updater(s) : updater) : s))
    );
  }, []);

  const moveSection = useCallback((id, dir) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const deleteSection = useCallback((id) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addSection = useCallback((type = 'Verse') => {
    setSections((prev) => [...prev, newSection(type)]);
  }, []);

  const ugText = useMemo(() => toUltimateGuitar(meta, sections), [meta, sections]);

  return (
    <>
      <div className="app editor-view">
        <header className="app-header">
          <h1>
            Chord<span className="accent">Sheet</span>
          </h1>
          <div className="tagline">Chart builder for live musicians</div>
        </header>

        <div className="toolbar">
          <button className="primary" onClick={() => window.print()}>Print / PDF</button>
          <button onClick={() => setUgOpen(true)}>Ultimate Guitar Export</button>
          <div className="spacer" />
          <span className="hint">{sections.length} section{sections.length === 1 ? '' : 's'}</span>
        </div>

        <div className="card spotify">
          <div className="card-title">Spotify Lookup</div>
          <SpotifyLookup
            onResult={({ title, artist }) =>
              setMeta((m) => ({ ...m, title: title || m.title, artist: artist || m.artist }))
            }
          />
        </div>

        <div className="card meta">
          <div className="card-title">Song Metadata</div>
          <MetadataForm meta={meta} setMeta={setMeta} />
        </div>

        <div>
          {sections.map((section, idx) => (
            <SectionEditor
              key={section.id}
              section={section}
              index={idx}
              total={sections.length}
              onChange={(updater) => updateSection(section.id, updater)}
              onMove={(dir) => moveSection(section.id, dir)}
              onDelete={() => deleteSection(section.id)}
            />
          ))}
        </div>

        <div className="add-section-row">
          <AddSectionMenu onAdd={addSection} />
        </div>
      </div>

      <PrintView meta={meta} sections={sections} />

      {ugOpen && <UGExportModal text={ugText} onClose={() => setUgOpen(false)} />}
    </>
  );
}

function AddSectionMenu({ onAdd }) {
  const [type, setType] = useState('Verse');
  return (
    <div className="row">
      <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: 160 }}>
        {SECTION_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <button className="primary" onClick={() => onAdd(type)}>+ Add Section</button>
    </div>
  );
}
