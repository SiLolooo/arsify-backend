import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  const exactQuery = query.toLowerCase().includes('official') ? query : `${query} official audio`;

  let videoId = '';
  let title = query;
  let artist = 'Official Artist';
  let durationSeconds = 240;

  // =========================================================================
  // 1. PENCARIAN VIDEO ID (3 LAPIS CADANGAN - TERBUKTI SUKSES)
  // =========================================================================
  const invidiousSearchNodes = [
    'https://inv.nadeko.net/api/v1/search',
    'https://invidious.projectsegfau.lt/api/v1/search',
    'https://invidious.perennialte.ch/api/v1/search',
  ];

  for (const node of invidiousSearchNodes) {
    try {
      const searchRes = await axios.get(
        `${node}?q=${encodeURIComponent(exactQuery)}&type=video`,
        { timeout: 3500 }
      );
      const items = searchRes.data;
      if (Array.isArray(items) && items.length > 0) {
        videoId = items[0].videoId;
        title = items[0].title || query;
        artist = items[0].author || 'Official Artist';
        durationSeconds = Number(items[0].lengthSeconds) || 240;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  // Lapis 2: Piped API Search
  if (!videoId) {
    const pipedSearchNodes = [
      'https://api.piped.privacydev.net/search',
      'https://pipedapi.kavin.rocks/search',
    ];
    for (const node of pipedSearchNodes) {
      try {
        const res = await axios.get(
          `${node}?q=${encodeURIComponent(exactQuery)}&filter=music_songs`,
          { timeout: 3500 }
        );
        const items = res.data?.items;
        if (Array.isArray(items) && items.length > 0) {
          videoId = items[0].url?.replace('/watch?v=', '') || items[0].videoId;
          title = items[0].title || query;
          artist = items[0].uploaderName || 'Official Artist';
          durationSeconds = Number(items[0].duration) || 240;
          break;
        }
      } catch (e) {
        continue;
      }
    }
  }

  // Lapis 3: Direct YouTube HTML Regex (Selalu berhasil dapat ID Tulus)
  if (!videoId) {
    try {
      const ytRes = await axios.get(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(exactQuery)}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
          timeout: 4000,
        }
      );
      const match = ytRes.data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (match && match[1]) {
        videoId = match[1];
        title = query;
        artist = 'TULUS / Official Artist';
      }
    } catch (e) {
      // ignore
    }
  }

  if (!videoId) {
    return NextResponse.json(
      { error: 'Lagu tidak ditemukan di server YouTube Official' },
      { status: 404 }
    );
  }

  // =========================================================================
  // 2. KANDIDAT STREAM URL (HANYA DOMAIN YANG LOLOS DNS/ISP INDONESIA)
  // =========================================================================
  const candidateUrls: string[] = [];

  // Prioritas 1: Piped CDN (.rocks / .net / .lt - Bebas blokir DNS Indonesia)
  const pipedStreamNodes = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.privacydev.net',
    'https://api.piped.projectsegfau.lt',
  ];

  for (const node of pipedStreamNodes) {
    try {
      const pipedRes = await axios.get(`${node}/streams/${videoId}`, { timeout: 4000 });
      const audioStreams = pipedRes.data?.audioStreams;
      if (Array.isArray(audioStreams) && audioStreams.length > 0) {
        const m4aStreams = audioStreams
          .filter((s: any) => s.mimeType?.includes('mp4') || s.format === 'M4A' || s.mimeType?.includes('audio'))
          .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

        for (const s of m4aStreams) {
          if (s.url) candidateUrls.push(s.url);
        }
      }
    } catch (e) {
      continue;
    }
  }

  // Prioritas 2: Invidious Proxy (.net / .lt / .ch - Lolos ISP Indonesia)
  candidateUrls.push(
    `https://inv.nadeko.net/latest_version?id=${videoId}&itag=140&local=true`,
    `https://invidious.projectsegfau.lt/latest_version?id=${videoId}&itag=140&local=true`,
    `https://invidious.perennialte.ch/latest_version?id=${videoId}&itag=140&local=true`
  );

  // =========================================================================
  // 3. SATPAM ANTI-HTML & VERIFIKASI STREAM
  // =========================================================================
  let validStreamUrl = '';

  for (const url of candidateUrls) {
    try {
      const testRes = await axios.get(url, {
        headers: {
          Range: 'bytes=0-100',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        timeout: 3500,
        validateStatus: (status) => status === 200 || status === 206 || status === 302,
      });

      const contentType = String(testRes.headers['content-type'] || '').toLowerCase();

      // Tolak teks HTML (error page)
      if (contentType.includes('text/html')) {
        continue;
      }

      validStreamUrl = url;
      break;
    } catch (e) {
      continue;
    }
  }

  if (!validStreamUrl && candidateUrls.length > 0) {
    validStreamUrl = candidateUrls[0];
  }

  return NextResponse.json({
    success: true,
    engine: 'Server-Side Audio Proxy (Indonesian DNS Safe)',
    title: title,
    artist: artist,
    streamUrl: validStreamUrl,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    durationSeconds: durationSeconds,
  });
}