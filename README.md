# ChordSheet

A chord and lyric chart builder for live musicians — React + Vite frontend with a small Express server that proxies Spotify metadata lookups.

## Quick start

```bash
npm install
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:5174 (Vite proxies `/api/*` to it)

## Features

- **Song metadata**: Title, Artist, Key (all 12 major + minor), BPM, Time Signature (4/4, 3/4, 6/8, 2/4, 12/8), Capo
- **Spotify lookup**: Paste a track URL; the server fetches `open.spotify.com/oembed` for the title and scrapes `og:description` from the track page for the artist
- **Section-based chart editor** with Intro, Verse, Pre-Chorus, Chorus, Bridge, Outro, Solo, Break — each with chord row above lyric row, add/remove/reorder
- **Print / PDF export** — clean black-on-white view with gold section borders
- **Ultimate Guitar export** — plain text wrapped in `[tab]…[/tab]` with `[Section]` headers, copy-to-clipboard button

## Test the Spotify lookup

```
https://open.spotify.com/track/29vagyDheleYDiRwYzlsFR
```

Expected: Title = "Clown in a Barrel", Artist = "Barrett Baber".

## Project layout

```
server/index.js      Express proxy (/api/spotify)
src/App.jsx          Root component
src/components/      Editor, metadata form, Spotify lookup, print view, UG export modal
src/lib/             Data model + UG export formatter
src/styles.css       Dark theme + print styles
```
