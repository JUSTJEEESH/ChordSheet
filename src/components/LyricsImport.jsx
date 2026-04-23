import React, { useState } from 'react';

export default function LyricsImport({ title, artist, onImport }) {
  const [status, setStatus] = useState({ kind: 'idle', msg: '' });

  const fetchLyrics = async () => {
    if (!title.trim()) {
      setStatus({ kind: 'err', msg: 'Enter a title first (or use Spotify lookup).' });
      return;
    }
    setStatus({ kind: 'loading', msg: 'Searching LRCLib…' });
    try {
      const params = new URLSearchParams({ title: title.trim() });
      if (artist.trim()) params.set('artist', artist.trim());
      const res = await fetch(`/api/lyrics?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const plain = data.plainLyrics || '';
      if (!plain.trim()) throw new Error('Lyrics came back empty');

      const sections = splitLyricsIntoSections(plain);
      onImport(sections);
      const totalLines = sections.reduce((n, s) => n + s.lines.length, 0);
      setStatus({
        kind: 'ok',
        msg: `Imported ${sections.length} section${sections.length === 1 ? '' : 's'} · ${totalLines} line${totalLines === 1 ? '' : 's'}. Now add chords above the lyrics.`,
      });
    } catch (err) {
      const msg = /no lyrics found|404/i.test(err.message)
        ? 'LRCLib doesn\'t have this song. Try the "Paste Chord Chart" card above if you have the chart from another site, or type the lyrics in manually.'
        : `Error: ${err.message}`;
      setStatus({ kind: 'err', msg });
    }
  };

  return (
    <>
      <div className="row" style={{ marginTop: 2 }}>
        <button className="primary" onClick={fetchLyrics} disabled={status.kind === 'loading'}>
          Import Lyrics
        </button>
        <span className="hint">
          LRCLib (free, community-maintained). Coverage is hit-or-miss — major-label tracks are often missing.
        </span>
      </div>
      <div className={`spotify-status ${status.kind}`}>{status.msg}</div>
    </>
  );
}

// LRCLib plainLyrics text → array of section-shaped objects (without ids; App
// will assign ids and default section type).
function splitLyricsIntoSections(plain) {
  // Split on one-or-more blank lines. Each chunk becomes its own section.
  const chunks = plain
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n+/)
    .map((c) => c.trim())
    .filter(Boolean);

  return chunks.map((chunk) => ({
    type: 'Verse',
    customLabel: '',
    lines: chunk.split('\n').map((line) => ({ chords: '', lyrics: line.trim() })),
  }));
}
