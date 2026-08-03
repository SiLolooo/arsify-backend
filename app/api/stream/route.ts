import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  // Client ID publik Jamendo untuk demo/developer (gratis & resmi)
  const JAMENDO_CLIENT_ID = '56d30c41';

  try {
    // 1. Cari lagu di Jamendo via API Resmi
    const response = await axios.get('https://api.jamendo.com/v3.0/tracks/', {
      params: {
        client_id: JAMENDO_CLIENT_ID,
        format: 'json',
        limit: 1,
        search: query,
        include: 'musicinfo',
      },
      timeout: 5000,
    });

    const results = response.data?.results;

    if (!results || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: 'Lagu tidak ditemukan di direktori Jamendo' },
        { status: 404 }
      );
    }

    const track = results[0];

    return NextResponse.json({
      success: true,
      title: track.name || query,
      artist: track.artist_name || 'Official Artist',
      album: track.album_name || '',
      streamUrl: track.audio, // DIRECT MP3 STREAM LEGAL & STABIL DARI JAMENDO CDN!
      thumbnail: track.image || track.album_image || '',
      durationSeconds: Number(track.duration) || 0,
    });
  } catch (error: any) {
    console.error('Jamendo API Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Gagal memproses stream dari Jamendo API', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}