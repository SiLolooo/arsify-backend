import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  // Daftar Piped / Invidious API instances yang aktif & stabil
  const pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.private.coffee',
    'https://pipedapi.mha.fi',
  ];

  for (const instance of pipedInstances) {
    try {
      // 1. Cari video di YouTube via Piped Instance
      const searchRes = await axios.get(
        `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`,
        { timeout: 5000 }
      );

      const items = searchRes.data?.items;
      if (items && items.length > 0) {
        const firstSong = items[0];
        const videoId = firstSong.url?.replace('/watch?v=', '');

        if (videoId) {
          // 2. Ambil detail stream audio
          const streamsRes = await axios.get(`${instance}/streams/${videoId}`, {
            timeout: 5000,
          });

          const audioStreams = streamsRes.data?.audioStreams;
          if (audioStreams && audioStreams.length > 0) {
            // Ambil stream audio dengan m4a / webm kualitas terbaik
            const bestAudio = audioStreams[audioStreams.length - 1];

            return NextResponse.json({
              success: true,
              title: firstSong.title || query,
              artist: firstSong.uploaderName || 'Unknown Artist',
              streamUrl: bestAudio.url,
              thumbnail: firstSong.thumbnail,
            });
          }
        }
      }
    } catch (error: any) {
      console.warn(`Piped instance ${instance} failed:`, error?.message);
      continue; // Coba instance berikutnya jika yang ini gagal
    }
  }

  return NextResponse.json(
    { error: 'Gagal mengekstrak audio stream dari semua instance' },
    { status: 502 }
  );
}