import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  const searchQuery = `${query} official audio`;

  // Daftar provider estafet (semua menyajikan FULL SONG)
  const providers = [
    // 1. Invidious Node 1
    async () => {
      const search = await axios.get(`https://invidious.privacydev.net/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=video`, { timeout: 2500 });
      const videoId = search.data?.[0]?.videoId;
      if (!videoId) return null;
      const detail = await axios.get(`https://invidious.privacydev.net/api/v1/videos/${videoId}`, { timeout: 2500 });
      const audio = detail.data?.adaptiveFormats?.filter((f: any) => f.type?.includes('audio')).pop();
      return audio ? { url: audio.url, title: detail.data.title, artist: detail.data.author, duration: detail.data.lengthSeconds } : null;
    },
    // 2. Invidious Node 2
    async () => {
      const search = await axios.get(`https://inv.tux.pizza/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=video`, { timeout: 2500 });
      const videoId = search.data?.[0]?.videoId;
      if (!videoId) return null;
      const detail = await axios.get(`https://inv.tux.pizza/api/v1/videos/${videoId}`, { timeout: 2500 });
      const audio = detail.data?.adaptiveFormats?.filter((f: any) => f.type?.includes('audio')).pop();
      return audio ? { url: audio.url, title: detail.data.title, artist: detail.data.author, duration: detail.data.lengthSeconds } : null;
    },
    // 3. Piped Engine
    async () => {
      const search = await axios.get(`https://api.piped.private.coffee/search?q=${encodeURIComponent(searchQuery)}&filter=music_songs`, { timeout: 2500 });
      const item = search.data?.items?.[0];
      const videoId = item?.url?.replace('/watch?v=', '');
      if (!videoId) return null;
      const stream = await axios.get(`https://api.piped.private.coffee/streams/${videoId}`, { timeout: 2500 });
      const audio = stream.data?.audioStreams?.pop();
      return audio ? { url: audio.url, title: item.title, artist: item.uploaderName, duration: stream.data.duration } : null;
    },
    // 4. Cobalt Fast MP3 Extractor
    async () => {
      const search = await axios.get(`https://pub-api.piped.video/search?q=${encodeURIComponent(searchQuery)}&filter=music_songs`, { timeout: 2500 });
      const item = search.data?.items?.[0];
      const videoId = item?.url?.replace('/watch?v=', '');
      if (!videoId) return null;
      
      const cobalt = await axios.post('https://api.cobalt.tools/', {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        downloadMode: 'audio',
        audioFormat: 'mp3'
      }, { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, timeout: 3500 });
      
      return cobalt.data?.url ? { url: cobalt.data.url, title: item.title, artist: item.uploaderName, duration: 240 } : null;
    }
  ];

  // Eksekusi estafet (fallback otomatis)
  for (const fetchStream of providers) {
    try {
      const result = await fetchStream();
      if (result && result.url) {
        return NextResponse.json({
          success: true,
          title: result.title || query,
          artist: result.artist || 'Official Track',
          streamUrl: result.url, // DIRECT FULL SONG STREAM!
          durationSeconds: result.duration || 0,
        });
      }
    } catch (e) {
      // Jika provider ini gagal/timeout, diam-diam lanjut ke provider berikutnya
      continue;
    }
  }

  return NextResponse.json(
    { error: 'Gagal mengekstrak audio dari semua provider backend' },
    { status: 502 }
  );
}