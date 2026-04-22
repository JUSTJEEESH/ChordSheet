const KEY = 'chordsheet:library:v1';
const DRAFT_KEY = 'chordsheet:draft:v1';

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readLibrary() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { songs: {}, order: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { songs: {}, order: [] };
    return { songs: parsed.songs || {}, order: parsed.order || [] };
  } catch {
    return { songs: {}, order: [] };
  }
}

function writeLibrary(lib) {
  localStorage.setItem(KEY, JSON.stringify(lib));
}

export function listSongs() {
  const lib = readLibrary();
  return lib.order.map((id) => lib.songs[id]).filter(Boolean);
}

export function saveSong(song) {
  const lib = readLibrary();
  const id = song.id || uid();
  const now = Date.now();
  const existing = lib.songs[id];
  const next = {
    ...song,
    id,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  lib.songs[id] = next;
  if (!lib.order.includes(id)) lib.order.unshift(id);
  writeLibrary(lib);
  return next;
}

export function loadSong(id) {
  const lib = readLibrary();
  return lib.songs[id] || null;
}

export function deleteSong(id) {
  const lib = readLibrary();
  delete lib.songs[id];
  lib.order = lib.order.filter((x) => x !== id);
  writeLibrary(lib);
}

export function saveDraft(state) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded or private mode — swallow
  }
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function exportAllSongs() {
  const lib = readLibrary();
  return lib.order.map((id) => lib.songs[id]).filter(Boolean);
}

export function importSongs(songs) {
  if (!Array.isArray(songs)) return 0;
  const lib = readLibrary();
  let added = 0;
  for (const s of songs) {
    if (!s || !s.id) continue;
    lib.songs[s.id] = s;
    if (!lib.order.includes(s.id)) {
      lib.order.unshift(s.id);
      added++;
    }
  }
  writeLibrary(lib);
  return added;
}
