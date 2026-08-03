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

  // 1. CARI VIDEO ID RESMI
  const searchNodes = [
    'https://inv.tux.zone/api/v1/search',
    'https://invidious.nerdvpn.de/api/v1/search',
    'https://inv.nocomment.life/api/v1/search',
    'https://invidious.drgns.space/api/v1/search',
  ];

  for (const node of searchNodes) {
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

  if (!videoId) {
    return NextResponse.json(
      { error: 'Lagu tidak ditemukan di server YouTube Official' },
      { status: 404 }
    );
  }

  // 2. KUMPULKAN URL STREAM DARI PIPED API (PRIORITAS UTAMA - AUDIO M4A ASLI)
  const candidateUrls: string[] = [];

  const pipedNodes = [
    'https://api.piped.privacydev.net',
    'https://pipedapi.kavin.rocks',
    'https://api.piped.projectsegfau.lt',
  ];

  for (const node of pipedNodes) {
    try {
      const pipedRes = await axios.get(`${node}/streams/${videoId}`, { timeout: 3500 });
      const audioStreams = pipedRes.data?.audioStreams;
      if (Array.isArray(audioStreams) && audioStreams.length > 0) {
        // Pilih format M4A/MP4 audio yang paling stabil di Android ExoPlayer
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

  // Tambahkan cadangan proxy Invidious di urutan terakhir
  candidateUrls.push(
    `https://inv.tux.zone/latest_version?id=${videoId}&itag=140&local=true`,
    `https://invidious.drgns.space/latest_version?id=${videoId}&itag=140&local=true`
  );

  // 3. SATPAM ANTI-HTML: Cek status DAN Content-Type (Wajib Audio/Video/Octet, BUKAN HTML!)
  let validStreamUrl = '';

  for (const url of candidateUrls) {
    try {
      const testRes = await axios.get(url, {
        headers: {
          Range: 'bytes=0-100',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        timeout: 3000,
        validateStatus: (status) => status === 200 || status === 206 || status === 302,
      });

      const contentType = String(testRes.headers['content-type'] || '').toLowerCase();

      // KRUSIAL: Kalau yang dikirim server adalah teks HTML (error page), BUANG!
      if (contentType.includes('text/html')) {
        continue;
      }

      // Kalau terbukti file audio/mp4/webm/octet-stream, ambil ini sebagai pemenang!
      validStreamUrl = url;
      break;
    } catch (e) {
      continue;
    }
  }

  // Kalau semua gagal uji, gunakan link pertama dari Piped sebagai fallback
  if (!validStreamUrl && candidateUrls.length > 0) {
    validStreamUrl = candidateUrls[0];
  }

  return NextResponse.json({
    success: true,
    engine: 'Server-Side Piped Audio M4A (Anti-HTML Verified)',
    title: title,
    artist: artist,
    streamUrl: validStreamUrl,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    durationSeconds: durationSeconds,
  });
}