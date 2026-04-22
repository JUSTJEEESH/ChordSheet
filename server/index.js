import express from 'express';

const app = express();
const PORT = process.env.PORT || 5174;

app.use(express.json());

function extractTrackId(url) {
  const m = String(url || '').match(/track\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function parseMeta(html, property) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeHtmlEntities(m[1]);
  }
  return '';
}

function extractArtistFromDescription(desc) {
  if (!desc) return '';
  // og:description patterns seen on Spotify:
  //   "Listen to <Track> on Spotify. <Artist> · Song · YYYY"
  //   "<Artist> · Song · <Track> · YYYY"
  // We'll try a few patterns.
  const byMatch = desc.match(/ by ([^.·|]+?)(?:\.|·|$)/i);
  if (byMatch) return byMatch[1].trim();

  // Spotify commonly uses " · Song · " so the artist is the token before " · Song"
  const songIdx = desc.indexOf('· Song');
  if (songIdx > 0) {
    const before = desc.slice(0, songIdx).trim();
    // Take the last chunk separated by " · " or period — often it's just the artist
    const parts = before.split(/·|\. /).map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }

  return '';
}

app.get('/api/spotify', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: 'Missing url query param' });
  }

  const trackId = extractTrackId(url);
  if (!trackId) {
    return res.status(400).json({ error: 'Invalid Spotify track URL' });
  }

  try {
    const browserUA =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const oembedRes = await fetch(oembedUrl, {
      headers: {
        'User-Agent': browserUA,
        Accept: 'application/json',
      },
    });
    if (!oembedRes.ok) {
      return res.status(502).json({ error: `Spotify oEmbed failed: ${oembedRes.status}` });
    }
    const oembed = await oembedRes.json();
    const title = oembed.title || '';

    // Secondary fetch for artist from track page HTML meta tags
    let artist = '';
    try {
      const pageUrl = `https://open.spotify.com/track/${trackId}`;
      const pageRes = await fetch(pageUrl, {
        headers: {
          'User-Agent': browserUA,
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const description = parseMeta(html, 'og:description');
        artist = extractArtistFromDescription(description);

        // Fallback: look for music:musician or similar
        if (!artist) {
          const musician = parseMeta(html, 'music:musician_description');
          if (musician) artist = musician;
        }
        if (!artist) {
          const twitter = parseMeta(html, 'twitter:description');
          artist = extractArtistFromDescription(twitter);
        }
      }
    } catch (err) {
      // swallow — artist is best-effort
    }

    res.json({ title, artist, trackId });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.listen(PORT, () => {
  console.log(`[chordsheet] server listening on http://localhost:${PORT}`);
});
