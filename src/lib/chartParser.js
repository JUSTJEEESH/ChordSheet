// Parse a pasted chord chart (UG-style) into our section model.
//
// Input format (one of the common chord-chart conventions):
//
//   Capo 4th fret
//
//   [Intro]
//   D   G D   A D
//
//   [Verse 1]
//   D                                     G                 D
//   I'm a clown in a barrel and baby you the bull
//   ...
//
// Returns: { meta: Partial<Meta>, sections: Array<{type, customLabel, lines:[{chords,lyrics}]}> }

import { SECTION_TYPES } from './model.js';

const CHORD_TOKEN =
  /^[A-G][#b♯♭]?(m|maj|min|M|aug|dim|sus|add)?[0-9]{0,2}(sus[0-9]*)?(add[0-9]*)?(\([^)]*\))?(\/[A-G][#b♯♭]?)?$/;
const NO_CHORD_TOKEN = /^(N\.?C\.?|x[0-9]?|\||%)$/i;

export function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Bracketed text or parenthesized comments are not chord lines
  if (/^\[.*\]$/.test(trimmed)) return false;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  let chordCount = 0;
  for (const t of tokens) {
    if (CHORD_TOKEN.test(t) || NO_CHORD_TOKEN.test(t)) chordCount++;
  }
  return chordCount / tokens.length >= 0.75;
}

function pairChordAndLyricLines(bodyLines) {
  const out = [];
  let i = 0;
  while (i < bodyLines.length) {
    const line = bodyLines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (isChordLine(line)) {
      const next = bodyLines[i + 1];
      const nextTrimmed = (next || '').trim();
      if (nextTrimmed && !isChordLine(next)) {
        out.push({ chords: stripTrailing(line), lyrics: stripTrailing(next) });
        i += 2;
      } else {
        out.push({ chords: stripTrailing(line), lyrics: '' });
        i += 1;
      }
    } else {
      out.push({ chords: '', lyrics: stripTrailing(line) });
      i += 1;
    }
  }
  return out;
}

function stripTrailing(s) {
  return s.replace(/\s+$/g, '');
}

function classifySection(rawLabel) {
  const label = rawLabel.trim();
  const lower = label.toLowerCase();

  // Exact match
  for (const t of SECTION_TYPES) {
    if (lower === t.toLowerCase()) return { type: t, customLabel: '' };
  }
  // Prefix match e.g. "Verse 1", "Chorus 2", "Pre-Chorus A"
  for (const t of SECTION_TYPES) {
    const tl = t.toLowerCase();
    if (lower.startsWith(tl + ' ') || lower.startsWith(tl + '-')) {
      return { type: t, customLabel: label.slice(t.length).replace(/^[\s\-]+/, '').trim() };
    }
  }
  // "Refrain" / "Hook" etc. → treat as Chorus with custom label
  if (/^(refrain|hook)\b/i.test(label)) {
    return { type: 'Chorus', customLabel: label };
  }
  if (/^(instrumental|riff|tag|vamp)\b/i.test(label)) {
    return { type: 'Break', customLabel: label };
  }
  // Unknown → stash whole thing in customLabel on a Break section
  return { type: 'Break', customLabel: label };
}

function parseMetaFromPreamble(text) {
  const meta = {};
  const capo = text.match(/capo\s*(?:on\s+)?(?:the\s+)?(\d+)(?:st|nd|rd|th)?\s*(?:fret)?/i);
  if (capo) meta.capo = String(parseInt(capo[1], 10));
  const key = text.match(/\bkey\s*[:\-]\s*([A-G][#b]?m?)\b/i);
  if (key) meta.key = key[1];
  const bpm = text.match(/(?:bpm|tempo)\s*[:\-]?\s*(\d{2,3})\s*(?:bpm)?/i);
  if (bpm) meta.bpm = String(parseInt(bpm[1], 10));
  const time = text.match(/time(?:\s+signature)?\s*[:\-]?\s*(\d{1,2}\/\d{1,2})/i);
  if (time) meta.timeSignature = time[1];
  return meta;
}

export function parseChordChart(text) {
  const result = { meta: {}, sections: [] };
  if (!text || !text.trim()) return result;

  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const headerRe = /^\s*\[(.+?)\]\s*$/;

  // Preamble — everything before the first [Section] header.
  let i = 0;
  const preamble = [];
  while (i < lines.length && !headerRe.test(lines[i])) {
    preamble.push(lines[i]);
    i++;
  }
  result.meta = parseMetaFromPreamble(preamble.join('\n'));

  // If no headers at all, treat the whole thing as a single Verse.
  if (i === lines.length) {
    const { sections } = buildSingleSectionFallback(lines);
    result.sections = sections;
    return result;
  }

  while (i < lines.length) {
    const m = lines[i].match(headerRe);
    if (!m) {
      i++;
      continue;
    }
    const rawLabel = m[1];
    i++;

    const body = [];
    while (i < lines.length && !headerRe.test(lines[i])) {
      body.push(lines[i]);
      i++;
    }

    const { type, customLabel } = classifySection(rawLabel);
    const paired = pairChordAndLyricLines(body);
    if (paired.length === 0) {
      // Keep empty sections so the outline is preserved; user can fill them in.
      result.sections.push({ type, customLabel, lines: [{ chords: '', lyrics: '' }] });
    } else {
      result.sections.push({ type, customLabel, lines: paired });
    }
  }

  return result;
}

function buildSingleSectionFallback(lines) {
  const paired = pairChordAndLyricLines(lines);
  if (paired.length === 0) return { sections: [] };
  return {
    sections: [{ type: 'Verse', customLabel: '', lines: paired }],
  };
}
