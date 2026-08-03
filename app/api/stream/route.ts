import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // 1. Cari lagu di Saavn Open API Engine (Bebas Bot Check & 100% Full Duration MP3)
    const searchUrl = `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`;

    const response = await axios.get(searchUrl, {
      timeout: 6000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const results = response.data?.data?.results;

    if (!results || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ error: 'Lagu tidak ditemukan' }, { status: 404 });
    }

    // Ambil hasil pencarian paling relevan (pertama)
    const song = results[0];

    // Pick stream URL kualitas terbaik (320kbps -> 160kbps -> fallback)
    const downloadUrlObj = song.downloadUrl;
    let finalStreamUrl = '';

    if (Array.isArray(downloadUrlObj) && downloadUrlObj.length > 0) {
      // Ambil bitrate tertinggi yang tersedia (biasanya elemen terakhir)
      finalStreamUrl = downloadUrlObj[downloadUrlObj.length - 1]?.url || downloadUrlObj[0]?.url;
    }

    if (!finalStreamUrl) {
      return NextResponse.json({ error: 'Stream URL tidak tersedia' }, { status: 404 });
    }

    // Direct Response dengan Metadata Lengkap & Full Duration Direct Stream!
    return NextResponse.json({
      success: true,
      title: song.name || query,
      artist: song.artists?.primary?.[0]?.name || 'Official Artist',
      album: song.album?.name || '',
      streamUrl: finalStreamUrl, // DIRECT HIGH QUALITY FULL MP3!
      thumbnail: song.image?.[song.image.length - 1]?.url || '',
      durationSeconds: Number(song.duration) || 0,
    });
  } catch (error: any) {
    console.error('Saavn Stream Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Gagal memproses stream audio', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}