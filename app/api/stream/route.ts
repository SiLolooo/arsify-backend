import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  // Tambahkan kata kunci "official" agar hasil pencarian mengutamakan lagu asli, bukan remix
  const searchQuery = `${query} official audio`;

  // Daftar Invidious API instances yang stabil
  const invidiousInstances = [
    'https://inv.tux.pizza',
    'https://invidious.nerdvpn.de',
    'https://inv.hostux.net',
    'https://invidious.drgns.space',
  ];

  for (const instance of invidiousInstances) {
    try {
      // 1. Cari video official di YouTube via Invidious
      const searchRes = await axios.get(
        `${instance}/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=video`,
        { timeout: 4000 }
      );

      if (searchRes.data && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
        // Ambil video pertama (hasil pencarian paling relevan)
        const video = searchRes.data[0];
        const videoId = video.videoId;

        if (videoId) {
          // 2. Ambil detail stream audio
          const detailRes = await axios.get(`${instance}/api/v1/videos/${videoId}`, {
            timeout: 4000,
          });

          const adaptiveFormats = detailRes.data?.adaptiveFormats;
          if (Array.isArray(adaptiveFormats)) {
            // Filter hanya format audio saja
            const audioFormats = adaptiveFormats.filter((f: any) =>
              f.type?.includes('audio')
            );

            if (audioFormats.length > 0) {
              // Ambil bitrate terbaik untuk kualitas suara jernih
              const bestAudio = audioFormats[audioFormats.length - 1];

              return NextResponse.json({
                success: true,
                title: video.title || query,
                artist: video.author || 'Official Track',
                streamUrl: bestAudio.url, // Direct Stream FULL SONG Official!
                thumbnail: video.videoThumbnails?.[0]?.url || '',
                durationSeconds: video.lengthSeconds || 0,
              });
            }
          }
        }
      }
    } catch (e: any) {
      console.warn(`Instance ${instance} skipped:`, e?.message || e);
      continue; // Coba instance berikutnya jika yang ini sibuk
    }
  }

  return NextResponse.json(
    { error: 'Gagal mengekstrak lagu official' },
    { status: 502 }
  );
}