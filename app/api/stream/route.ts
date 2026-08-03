import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // 1. Cari lagu menggunakan Deezer Official Public API (Resmi & Tanpa Auth/Key)
    const deezerSearchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;
    
    const searchRes = await axios.get(deezerSearchUrl, {
      timeout: 6000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const track = searchRes.data?.data?.[0];

    if (!track) {
      return NextResponse.json({ error: 'Lagu tidak ditemukan' }, { status: 404 });
    }

    // 2. Deezer menyediakan Direct MP3 Audio Stream yang sangat cepat dan ramah Vercel
    if (track.preview) {
      return NextResponse.json({
        success: true,
        title: track.title || query,
        artist: track.artist?.name || 'Unknown Artist',
        album: track.album?.title || '',
        streamUrl: track.preview, // Direct MP3 Stream URL resmi dari Deezer CDN!
        thumbnail: track.album?.cover_xl || track.album?.cover_medium || '',
        durationSeconds: track.duration || 30,
      });
    }

    return NextResponse.json({ error: 'Stream URL tidak tersedia untuk lagu ini' }, { status: 404 });
  } catch (error: any) {
    console.error('Deezer Stream Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Gagal memproses audio stream', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}