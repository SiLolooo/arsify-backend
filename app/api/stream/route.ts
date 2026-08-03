import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // Tembak JioSaavn Primary API (Lagu Indo / Barat Komersial Super Lengkap)
    const searchUrl = `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`;

    const response = await axios.get(searchUrl, {
      timeout: 8000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const results = response.data?.data?.results;

    if (!results || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ error: 'Lagu tidak ditemukan' }, { status: 404 });
    }

    const song = results[0];

    // Ambil Stream URL Kualitas Terbaik (320kbps MP3)
    let streamUrl = '';
    if (Array.isArray(song.downloadUrl) && song.downloadUrl.length > 0) {
      streamUrl = song.downloadUrl[song.downloadUrl.length - 1]?.url || song.downloadUrl[0]?.url;
    }

    if (!streamUrl) {
      return NextResponse.json({ error: 'Stream URL tidak tersedia' }, { status: 404 });
    }

    // Ambil Thumbnail Kualitas Tinggi
    let thumbnail = '';
    if (Array.isArray(song.image) && song.image.length > 0) {
      thumbnail = song.image[song.image.length - 1]?.url || song.image[0]?.url;
    }

    // Ambil Nama Artis
    let artistName = 'Official Artist';
    if (song.artists?.primary && Array.isArray(song.artists.primary) && song.artists.primary.length > 0) {
      artistName = song.artists.primary[0].name;
    }

    return NextResponse.json({
      success: true,
      title: song.name || query,
      artist: artistName,
      album: song.album?.name || '',
      streamUrl: streamUrl, // DIRECT 320KBPS FULL SONG MP3!
      thumbnail: thumbnail,
      durationSeconds: Number(song.duration) || 0,
    });
  } catch (error: any) {
    console.error('Saavn Engine Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Gagal mendapatkan lagu mainstream', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}