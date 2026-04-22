import React, { useState } from 'react';

export default function SpotifyLookup({ onResult }) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState({ kind: 'idle', msg: '' });

  const lookup = async () => {
    if (!url.trim()) return;
    setStatus({ kind: 'loading', msg: 'Fetching…' });
    try {
      const res = await fetch(`/api/spotify?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onResult({ title: data.title || '', artist: data.artist || '' });
      const parts = [];
      if (data.title) parts.push(`Title: "${data.title}"`);
      if (data.artist) parts.push(`Artist: "${data.artist}"`);
      setStatus({
        kind: 'ok',
        msg: parts.length ? `Loaded — ${parts.join(', ')}` : 'Loaded (no metadata found)',
      });
    } catch (err) {
      setStatus({ kind: 'err', msg: `Error: ${err.message}` });
    }
  };

  return (
    <>
      <div className="spotify-row">
        <input
          placeholder="https://open.spotify.com/track/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') lookup();
          }}
        />
        <button className="primary" onClick={lookup} disabled={status.kind === 'loading'}>
          Lookup
        </button>
      </div>
      <div className={`spotify-status ${status.kind}`}>{status.msg}</div>
    </>
  );
}
