import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  const exactQuery = query.toLowerCase().includes('official') ? query : `${query} official audio`;

  // ============================================================================
  // DAFTAR NODE CLUSTER INVIDIOUS & PIPED (Bypass Bot Guard YouTube Otomatis)
  // Server-server ini menggunakan residential IP bersih yang tidak diblokir YouTube
  // ============================================================================
  const invidiousNodes = [
    'https://inv.tux.zone',
    'https://invidious.nerdvpn.de',
    'https://invidious.drgns.space',
    'https://inv.nocomment.life',
    'https://invidious.perennialte.ch',
    'https://invidious.privacydev.net',
  ];

  const pipedNodes = [
    'https://api.piped.privacydev.net',
    'https://pipedapi.kavin.rocks',
    'https://api.piped.projectsegfau.lt',
  ];

  let videoId = '';
  let title = query;
  let artist = 'Official Artist';
  let durationSeconds = 240;

  // 1. CARI VIDEO ID RESMI (TULUS OFFICIAL AUDIO)
  for (const node of invidiousNodes) {
    try {
      const searchRes = await axios.get(
        `${node}/api/v1/search?q=${encodeURIComponent(exactQuery)}&type=video`,
        { timeout: 4000 }
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
      continue; // Jika 1 node sibuk/down, langsung loncat ke node berikutnya dalam hitungan milidetik
    }
  }

  // Fallback pencarian ID via Piped jika semua Invidious sibuk
  if (!videoId) {
    for (const node of pipedNodes) {
      try {
        const searchRes = await axios.get(
          `${node}/search?q=${encodeURIComponent(exactQuery)}&filter=music_songs`,
          { timeout: 4000 }
        );
        const items = searchRes.data?.items;
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

  if (!videoId) {
    return NextResponse.json(
      { error: 'Lagu tidak ditemukan di server YouTube Official' },
      { status: 404 }
    );
  }

  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  // 2. EKSTRAKSI DIRECT STREAM AUDIO MP3/OPUS (100% FULL SONG TANPA BOT CHECK)
  // Coba ekstraksi dari cluster Invidious terlebih dahulu
  for (const node of invidiousNodes) {
    try {
      const videoRes = await axios.get(`${node}/api/v1/videos/${videoId}`, { timeout: 4500 });
      const formats = videoRes.data?.adaptiveFormats;

      if (Array.isArray(formats) && formats.length > 0) {
        // Filter khusus audio dengan bitrate tertinggi (Studio Quality)
        const audioFormats = formats
          .filter((f: any) => f.type && f.type.startsWith('audio'))
          .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

        if (audioFormats.length > 0 && audioFormats[0].url) {
          return NextResponse.json({
            success: true,
            engine: 'YouTube Official Studio (Invidious Cluster)',
            title: title,
            artist: artist,
            streamUrl: audioFormats[0].url, // DIRECT GOOGLEVIDEO AUDIO STREAM FULL DURATION!
            thumbnail: thumbnail,
            durationSeconds: durationSeconds,
          });
        }
      }
    } catch (e) {
      continue;
    }
  }

  // Coba ekstraksi dari cluster Piped jika Invidious limit
  for (const node of pipedNodes) {
    try {
      const streamRes = await axios.get(`${node}/streams/${videoId}`, { timeout: 4500 });
      const audioStreams = streamRes.data?.audioStreams;

      if (Array.isArray(audioStreams) && audioStreams.length > 0) {
        const bestAudio = audioStreams.sort(
          (a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0)
        )[0];

        if (bestAudio?.url) {
          return NextResponse.json({
            success: true,
            engine: 'YouTube Official Studio (Piped Cluster)',
            title: streamRes.data.title || title,
            artist: streamRes.data.uploader || artist,
            streamUrl: bestAudio.url, // DIRECT GOOGLEVIDEO AUDIO STREAM FULL DURATION!
            thumbnail: thumbnail,
            durationSeconds: Number(streamRes.data.duration) || durationSeconds,
          });
        }
      }
    } catch (e) {
      continue;
    }
  }

  return NextResponse.json(
    { error: 'Gagal mengekstrak stream audio dari cluster YouTube' },
    { status: 502 }
  );
}