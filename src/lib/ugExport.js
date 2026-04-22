import { sectionDisplayLabel } from './model.js';

export function toUltimateGuitar(meta, sections) {
  const lines = [];

  // Header
  if (meta.title) lines.push(meta.title);
  if (meta.artist) lines.push(meta.artist);
  const metaBits = [];
  metaBits.push(`Key: ${meta.key}`);
  if (meta.bpm) metaBits.push(`BPM: ${meta.bpm}`);
  metaBits.push(`Time: ${meta.timeSignature}`);
  metaBits.push(`Capo: ${meta.capo === '0' ? 'None' : `Fret ${meta.capo}`}`);
  lines.push(metaBits.join(' | '));
  lines.push('');

  sections.forEach((s) => {
    lines.push(`[${sectionDisplayLabel(s)}]`);
    lines.push('[tab]');
    s.lines.forEach((l) => {
      // Ultimate Guitar uses [ch]Chord[/ch] inline for the chord row, but the
      // simpler two-line tab format is: chord row above lyric row. Within
      // [tab]...[/tab] the alignment is preserved.
      lines.push(l.chords || '');
      lines.push(l.lyrics || '');
    });
    lines.push('[/tab]');
    lines.push('');
  });

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
