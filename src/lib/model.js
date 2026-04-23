export const SECTION_TYPES = [
  'Intro',
  'Verse',
  'Pre-Chorus',
  'Chorus',
  'Bridge',
  'Interlude',
  'Outro',
  'Solo',
  'Break',
];

export const KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm',
];

export const TIME_SIGNATURES = ['4/4', '3/4', '6/8', '2/4', '12/8'];

export const CAPO_OPTIONS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

export function newLine() {
  return {
    id: (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()),
    chords: '',
    lyrics: '',
  };
}

export function newSection(type = 'Verse') {
  return {
    id: (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()),
    type,
    customLabel: '',
    lines: [newLine()],
  };
}

export function sectionDisplayLabel(section) {
  if (section.customLabel && section.customLabel.trim()) {
    return `${section.type} — ${section.customLabel.trim()}`;
  }
  return section.type;
}
