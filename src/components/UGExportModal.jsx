import React, { useRef, useState } from 'react';

export default function UGExportModal({ text, onClose }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (ref.current) {
        ref.current.select();
        document.execCommand('copy');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Ultimate Guitar Export</h2>
        <div className="hint" style={{ marginBottom: 8 }}>
          Paste this into the UG tab editor. Chord lines and lyric lines are wrapped in [tab]…[/tab] to preserve alignment.
        </div>
        <textarea ref={ref} readOnly value={text} />
        <div className="modal-actions">
          <button onClick={onClose}>Close</button>
          <button className="primary" onClick={copy}>
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
