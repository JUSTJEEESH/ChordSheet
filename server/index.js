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
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeHtmlEntities(m[1]);
  }
  return '';
}

function parseTitleTag(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decodeHtmlEntities(m[1]).trim() : '';
}

function parseJsonLdArtists(html) {
  const results = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1].trim();
    try {
      const data = JSON.parse(raw);
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const by = node.byArtist;
        if (by) {
          if (Array.isArray(by)) {
            by.forEach((a) => a && a.name && results.push(String(a.name)));
          } else if (by.name) {
            results.push(String(by.name));
          }
        }
        if (node.artist) {
          const a = node.artist;
          if (Array.isArray(a)) a.forEach((x) => x && x.name && results.push(String(x.name)));
          else if (a.name) results.push(String(a.name));
        }
      }
    } catch (e) {
      // skip unparsable block
    }
  }
  return results;
}

function parseNextDataArtists(html) {
  // Spotify's embed page ships a `__NEXT_DATA__` JSON blob containing the full
  // track info. Structure varies by Spotify build, so we parse the JSON and
  // deep-search for any `artists` array with `{ name }` objects. We also
  // capture a few interesting scalar fields for debugging.
  const m = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!m) return { artists: [], subtitle: '', trackName: '' };
  let data;
  try {
    data = JSON.parse(m[1]);
  } catch (e) {
    return { artists: [], subtitle: '', trackName: '', parseError: String(e && e.message) };
  }

  const artists = [];
  let subtitle = '';
  let trackName = '';

  const visit = (node, depth) => {
    if (!node || depth > 12) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    if (typeof node !== 'object') return;

    // Spotify embed data commonly has a `subtitle` field == "Artist Name".
    if (!subtitle && typeof node.subtitle === 'string' && node.subtitle.trim()) {
      subtitle = node.subtitle.trim();
    }
    if (!trackName && typeof node.title === 'string' && node.title.trim() && node.type === 'track') {
      trackName = node.title.trim();
    }
    if (Array.isArray(node.artists)) {
      for (const a of node.artists) {
        if (a && typeof a === 'object' && typeof a.name === 'string' && a.name.trim()) {
          if (!artists.includes(a.name.trim())) artists.push(a.name.trim());
        }
      }
    }
    for (const key of Object.keys(node)) {
      visit(node[key], depth + 1);
    }
  };

  visit(data, 0);
  return { artists, subtitle, trackName };
}

function looksLikeYear(s) {
  return /^\d{4}$/.test(s.trim());
}

function extractArtistFromDescription(desc) {
  if (!desc) return '';
  // Strip the common "Listen to <Title> on Spotify." lead-in so the rest parses cleanly.
  let clean = desc.trim().replace(/^Listen to .*? on Spotify\.?\s*/i, '').trim();

  // Pattern: "Song · YYYY · Artist" / "Artist · Song · YYYY" / "Artist · Song"
  if (clean.includes('·')) {
    const parts = clean.split('·').map((s) => s.trim()).filter(Boolean);
    const filtered = parts.filter(
      (p) =>
        !/^song$/i.test(p) &&
        !/^single$/i.test(p) &&
        !/^album$/i.test(p) &&
        !/^ep$/i.test(p) &&
        !looksLikeYear(p) &&
        !/^spotify$/i.test(p)
    );
    if (filtered.length === 1) return filtered[0];
    if (filtered.length > 1) return filtered[filtered.length - 1];
  }

  // Pattern: "... by Artist Name" / "song by Artist Name"
  const byMatch = clean.match(/\bby\s+([^.·|•\-–—]+?)(?:\.|·|\||$)/i);
  if (byMatch) return byMatch[1].trim();

  return '';
}

function extractArtistFromTitleTag(titleTag) {
  if (!titleTag) return '';
  // e.g. "Clown in a Barrel - song and lyrics by Barrett Baber | Spotify"
  //      "Song Name - Artist Name | Spotify"
  const byMatch = titleTag.match(/\bby\s+([^.·|•]+?)(?:\||$)/i);
  if (byMatch) return byMatch[1].trim();

  const dashMatch = titleTag.match(/^\s*[^-–—]+?\s*[-–—]\s*([^|]+?)\s*\|/);
  if (dashMatch) {
    const mid = dashMatch[1].trim();
    // Strip leading "song and lyrics by" etc.
    const cleaned = mid.replace(/^song and lyrics by\s+/i, '').replace(/^by\s+/i, '').trim();
    return cleaned;
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

  const debug = {};

  try {
    const browserUA =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const oembedRes = await fetch(oembedUrl, {
      headers: { 'User-Agent': browserUA, Accept: 'application/json' },
    });
    if (!oembedRes.ok) {
      return res.status(502).json({ error: `Spotify oEmbed failed: ${oembedRes.status}` });
    }
    const oembed = await oembedRes.json();
    const title = oembed.title || '';

    let artist = '';

    // Primary source: the /embed/track/<id> page. Unlike the SPA /track/<id>
    // page, the embed page is server-rendered and contains a __NEXT_DATA__
    // JSON blob with artist info.
    try {
      const embedUrl = `https://open.spotify.com/embed/track/${trackId}`;
      const embedRes = await fetch(embedUrl, {
        headers: {
          'User-Agent': browserUA,
          'Accept-Language': 'en-US,en;q=0.9',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      debug.embedStatus = embedRes.status;
      if (embedRes.ok) {
        const html = await embedRes.text();
        const nd = parseNextDataArtists(html);
        debug.embedNextDataArtists = nd.artists;
        debug.embedSubtitle = nd.subtitle;
        debug.embedTrackName = nd.trackName;
        if (nd.parseError) debug.embedParseError = nd.parseError;

        if (nd.artists.length > 0) artist = nd.artists.join(', ');
        // subtitle on the embed page is commonly "Artist Name" as a scalar;
        // use it only as a fallback when no structured artists array was found.
        if (!artist && nd.subtitle) artist = nd.subtitle;
      }
    } catch (err) {
      debug.embedError = String(err && err.message ? err.message : err);
    }

    // Fallback: scrape the SPA page in case Spotify starts server-rendering
    // meta tags there again. (Currently it doesn't, but this is cheap.)
    if (!artist) {
      try {
        const pageUrl = `https://open.spotify.com/track/${trackId}`;
        const pageRes = await fetch(pageUrl, {
          headers: {
            'User-Agent': browserUA,
            'Accept-Language': 'en-US,en;q=0.9',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        debug.pageStatus = pageRes.status;
        if (pageRes.ok) {
          const html = await pageRes.text();
          const ogDescription = parseMeta(html, 'og:description');
          const twitterDescription = parseMeta(html, 'twitter:description');
          const titleTag = parseTitleTag(html);
          const ogAudioArtist = parseMeta(html, 'og:audio:artist');
          const musicMusician = parseMeta(html, 'music:musician_description');
          const jsonLdArtists = parseJsonLdArtists(html);

          debug.ogDescription = ogDescription;
          debug.twitterDescription = twitterDescription;
          debug.titleTag = titleTag;
          debug.ogAudioArtist = ogAudioArtist;
          debug.musicMusician = musicMusician;
          debug.jsonLdArtists = jsonLdArtists;

          if (!artist && jsonLdArtists.length > 0) artist = jsonLdArtists.join(', ');
          if (!artist && ogAudioArtist) artist = ogAudioArtist;
          if (!artist && musicMusician) artist = musicMusician;
          if (!artist && ogDescription) artist = extractArtistFromDescription(ogDescription);
          if (!artist && twitterDescription) artist = extractArtistFromDescription(twitterDescription);
          if (!artist && titleTag) artist = extractArtistFromTitleTag(titleTag);
        }
      } catch (err) {
        debug.pageError = String(err && err.message ? err.message : err);
      }
    }

    // Log server-side for easy debugging if parsing ever regresses.
    console.log('[spotify]', { trackId, title, artist, debug });

    res.json({ title, artist, trackId, debug });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
});

app.listen(PORT, () => {
  console.log(`[chordsheet] server listening on http://localhost:${PORT}`);
});
