import React, { useEffect, useState } from 'react';
import { listSongs, deleteSong, exportAllSongs, importSongs } from '../lib/library.js';

function fmt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function LibraryModal({ onClose, onLoad, currentSongId }) {
  const [songs, setSongs] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setSongs(listSongs());
  }, [tick]);

  const handleDelete = (id, title) => {
    if (!confirm(`Delete "${title || 'Untitled'}"? This can't be undone.`)) return;
    deleteSong(id);
    setTick((t) => t + 1);
  };

  const handleExport = () => {
    const data = exportAllSongs();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chordsheet-library-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const n = importSongs(Array.isArray(parsed) ? parsed : parsed.songs || []);
      alert(`Imported ${n} new song${n === 1 ? '' : 's'}.`);
      setTick((t) => t + 1);
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    } finally {
      ev.target.value = '';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>My Songs</h2>
        <div className="hint" style={{ marginBottom: 10 }}>
          Songs are saved in this browser. Use Export to back them up.
        </div>
        {songs.length === 0 ? (
          <div className="hint" style={{ padding: '24px 0', textAlign: 'center' }}>
            No saved songs yet. Click <b>Save</b> in the toolbar to save the current chart.
          </div>
        ) : (
          <div className="song-list">
            {songs.map((s) => (
              <div
                key={s.id}
                className={`song-item ${s.id === currentSongId ? 'current' : ''}`}
              >
                <div className="song-item-main" onClick={() => onLoad(s.id)}>
                  <div className="song-item-title">{s.meta?.title || 'Untitled'}</div>
                  <div className="song-item-sub">
                    {(s.meta?.artist || 'Unknown artist')}
                    {s.meta?.key ? ` · Key ${s.meta.key}` : ''}
                    {s.meta?.bpm ? ` · ${s.meta.bpm} BPM` : ''}
                    <span className="song-item-date"> · {fmt(s.updatedAt)}</span>
                  </div>
                </div>
                <div className="song-item-actions">
                  <button onClick={() => onLoad(s.id)}>Load</button>
                  <button className="danger" onClick={() => handleDelete(s.id, s.meta?.title)}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <label className="button-like">
            Import JSON…
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
          <button onClick={handleExport} disabled={songs.length === 0}>
            Export All
          </button>
          <div className="spacer" />
          <button className="primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
