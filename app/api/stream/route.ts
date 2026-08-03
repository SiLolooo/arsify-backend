import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // 1. Cari track di SoundCloud via Public Search Engine
    const scSearchUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(
      query
    )}&client_id=iZ864q28A9S2m5583802380238023&limit=3`;

    const searchRes = await axios.get(scSearchUrl, {
      timeout: 6000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const collection = searchRes.data?.collection;

    if (!collection || collection.length === 0) {
      return NextResponse.json({ error: 'Lagu tidak ditemukan' }, { status: 404 });
    }

    // Ambil hasil pencarian pertama
    const track = collection[0];
    const transcodings = track?.media?.transcodings;

    if (!transcodings || !Array.isArray(transcodings)) {
      return NextResponse.json({ error: 'Format audio tidak tersedia' }, { status: 404 });
    }

    // 2. Cari stream format progressive (Direct MP3 Stream)
    let targetFormat = transcodings.find(
      (t: any) => t.format?.protocol === 'progressive'
    );

    // Fallback jika progressive tidak ada
    if (!targetFormat && transcodings.length > 0) {
      targetFormat = transcodings[0];
    }

    if (targetFormat) {
      // 3. Dapatkan Direct Stream URL dari SoundCloud
      const streamLinkRes = await axios.get(
        `${targetFormat.url}?client_id=iZ864q28A9S2m5583802380238023`,
        { timeout: 6000 }
      );

      if (streamLinkRes.data?.url) {
        return NextResponse.json({
          success: true,
          title: track.title || query,
          artist: track.user?.username || 'Unknown Artist',
          streamUrl: streamLinkRes.data.url, // DIRECT FULL SONG MP3!
          thumbnail: track.artwork_url ? track.artwork_url.replace('-large', '-t500x500') : '',
          durationSeconds: Math.floor((track.duration || 0) / 1000),
        });
      }
    }

    return NextResponse.json({ error: 'Gagal mengekstrak stream URL' }, { status: 500 });
  } catch (error: any) {
    console.error('SoundCloud Search Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Internal Stream Error', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}