import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  // 1. Opsi Utama: Audius API (Full Song Stream, Free & Public API)
  try {
    // Dapatkan host Audius API yang aktif
    const hostRes = await axios.get('https://api.audius.co', { timeout: 4000 });
    const hosts = hostRes.data?.data;
    const audiusHost = Array.isArray(hosts) && hosts.length > 0 ? hosts[0] : 'https://discoveryprovider.audius.co';

    // Search track di Audius
    const searchRes = await axios.get(
      `${audiusHost}/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=ARS_MUSIC_APP`,
      { timeout: 5000 }
    );

    const tracks = searchRes.data?.data;
    if (Array.isArray(tracks) && tracks.length > 0) {
      const track = tracks[0];
      const streamUrl = `${audiusHost}/v1/tracks/${track.id}/stream?app_name=ARS_MUSIC_APP`;

      return NextResponse.json({
        success: true,
        title: track.title || query,
        artist: track.user?.name || 'Unknown Artist',
        streamUrl: streamUrl, // Direct Stream Full Track!
        thumbnail: track.artwork?.['1000x1000'] || track.artwork?.['480x480'] || '',
        durationSeconds: track.duration || 0,
      });
    }
  } catch (err: any) {
    console.warn('Audius Stream Warning:', err?.message || err);
  }

  // 2. Fallback: Jamendo Music Public API (Free Full Song Stream)
  try {
    const jamendoRes = await axios.get(
      `https://api.jamendo.com/v3.0/tracks/?client_id=56d306e0&format=json&limit=1&search=${encodeURIComponent(query)}`,
      { timeout: 5000 }
    );

    const track = jamendoRes.data?.results?.[0];
    if (track && track.audio) {
      return NextResponse.json({
        success: true,
        title: track.name || query,
        artist: track.artist_name || 'Unknown Artist',
        streamUrl: track.audio, // Direct MP3 Full Duration Stream
        thumbnail: track.image || '',
        durationSeconds: track.duration || 0,
      });
    }
  } catch (err: any) {
    console.warn('Jamendo Stream Warning:', err?.message || err);
  }

  return NextResponse.json(
    { error: 'Gagal menemukan full audio stream' },
    { status: 404 }
  );
}