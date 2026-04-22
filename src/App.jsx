import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import MetadataForm from './components/MetadataForm.jsx';
import SpotifyLookup from './components/SpotifyLookup.jsx';
import SectionEditor from './components/SectionEditor.jsx';
import PrintView from './components/PrintView.jsx';
import UGExportModal from './components/UGExportModal.jsx';
import LibraryModal from './components/LibraryModal.jsx';
import LyricsImport from './components/LyricsImport.jsx';
import { SECTION_TYPES, newSection, newLine } from './lib/model.js';
import { toUltimateGuitar } from './lib/ugExport.js';
import {
  saveSong,
  loadSong,
  saveDraft,
  loadDraft,
  clearDraft,
} from './lib/library.js';

const defaultMeta = {
  title: '',
  artist: '',
  key: 'C',
  bpm: '',
  timeSignature: '4/4',
  capo: '0',
};

function blankDoc() {
  return {
    id: null,
    meta: { ...defaultMeta },
    sections: [
      {
        ...newSection('Verse'),
        lines: [{ ...newLine() }],
      },
    ],
  };
}

function normalizeSection(s) {
  return {
    ...newSection(s.type || 'Verse'),
    type: s.type || 'Verse',
    customLabel: s.customLabel || '',
    lines:
      Array.isArray(s.lines) && s.lines.length
        ? s.lines.map((l) => ({ ...newLine(), chords: l.chords || '', lyrics: l.lyrics || '' }))
        : [newLine()],
  };
}

export default function App() {
  const initial = useMemo(() => {
    const draft = loadDraft();
    if (draft && draft.meta && Array.isArray(draft.sections)) {
      return {
        id: draft.id || null,
        meta: { ...defaultMeta, ...draft.meta },
        sections: draft.sections.length
          ? draft.sections.map(normalizeSection)
          : blankDoc().sections,
      };
    }
    return blankDoc();
  }, []);

  const [songId, setSongId] = useState(initial.id);
  const [meta, setMeta] = useState(initial.meta);
  const [sections, setSections] = useState(initial.sections);
  const [ugOpen, setUgOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const firstRender = useRef(true);

  // Autosave draft (current in-progress state) whenever it changes.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setDirty(true);
    const t = setTimeout(() => {
      saveDraft({ id: songId, meta, sections });
    }, 400);
    return () => clearTimeout(t);
  }, [meta, sections, songId]);

  // Keep the browser tab title in sync with the song title.
  useEffect(() => {
    document.title = meta.title ? `${meta.title} · ChordSheet` : 'ChordSheet';
  }, [meta.title]);

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

  const handleSave = () => {
    const doc = saveSong({ id: songId || undefined, meta, sections });
    setSongId(doc.id);
    setSavedAt(doc.updatedAt);
    setDirty(false);
  };

  const handleNew = () => {
    if (dirty && !confirm('You have unsaved changes. Start a new song anyway?')) return;
    const b = blankDoc();
    setSongId(null);
    setMeta(b.meta);
    setSections(b.sections);
    setSavedAt(null);
    setDirty(false);
    clearDraft();
  };

  const handleLoad = (id) => {
    const doc = loadSong(id);
    if (!doc) return;
    setSongId(doc.id);
    setMeta({ ...defaultMeta, ...doc.meta });
    setSections(doc.sections.map(normalizeSection));
    setSavedAt(doc.updatedAt);
    setDirty(false);
    setLibraryOpen(false);
  };

  const handleLyricsImport = (importedSections) => {
    // Replace current sections only if they're effectively empty (default scaffold).
    const hasRealContent = sections.some((s) =>
      s.lines.some((l) => (l.chords && l.chords.trim()) || (l.lyrics && l.lyrics.trim()))
    );
    const prepared = importedSections.map((s) => normalizeSection(s));
    if (hasRealContent) {
      setSections((prev) => [...prev, ...prepared]);
    } else {
      setSections(prepared.length ? prepared : blankDoc().sections);
    }
  };

  // Ctrl/Cmd-S to save.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const ugText = useMemo(() => toUltimateGuitar(meta, sections), [meta, sections]);

  return (
    <>
      <div className="app editor-view">
        <header className="app-header">
          <div>
            <h1>
              Chord<span className="accent">Sheet</span>
            </h1>
            <div className="tagline">Chart builder for live musicians</div>
          </div>
          <div className="song-status">
            <div className="song-status-title">
              {meta.title || <span className="muted">Untitled</span>}
              {meta.artist && <span className="muted"> — {meta.artist}</span>}
            </div>
            <div className="song-status-sub">
              {songId ? (dirty ? 'Unsaved changes' : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saved') : dirty ? 'Draft (unsaved)' : 'New song'}
            </div>
          </div>
        </header>

        <div className="toolbar">
          <button onClick={handleNew}>New</button>
          <button className="primary" onClick={handleSave}>
            {songId ? 'Save' : 'Save Song'}
          </button>
          <button onClick={() => setLibraryOpen(true)}>My Songs</button>
          <span className="toolbar-sep" />
          <button onClick={() => window.print()}>Print / PDF</button>
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

        <div className="card">
          <div className="card-title">Lyrics Import</div>
          <LyricsImport title={meta.title} artist={meta.artist} onImport={handleLyricsImport} />
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
      {libraryOpen && (
        <LibraryModal
          onClose={() => setLibraryOpen(false)}
          onLoad={handleLoad}
          currentSongId={songId}
        />
      )}
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
