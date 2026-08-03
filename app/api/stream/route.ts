import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  // 1. Coba Search via High-Quality Audio Engine Proxy (Full Track 320kbps)
  const proxyEndpoints = [
    `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`,
    `https://saavn.me/search/songs?query=${encodeURIComponent(query)}`,
  ];

  for (const endpoint of proxyEndpoints) {
    try {
      const res = await axios.get(endpoint, {
        timeout: 5000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const results = res.data?.data?.results || res.data?.results;

      if (results && Array.isArray(results) && results.length > 0) {
        const song = results[0];
        const downloadUrls = song?.downloadUrl;

        if (Array.isArray(downloadUrls) && downloadUrls.length > 0) {
          // Ambil stream MP3 bitrate tertinggi (biasanya 320kbps) -> FULL LAGU
          const fullAudioUrl = downloadUrls[downloadUrls.length - 1]?.url;

          let coverUrl = '';
          if (Array.isArray(song?.image) && song.image.length > 0) {
            coverUrl = song.image[song.image.length - 1]?.url || song.image[0]?.url;
          }

          if (fullAudioUrl) {
            return NextResponse.json({
              success: true,
              title: song?.name || query,
              artist: song?.primaryArtists || song?.singers || 'Unknown Artist',
              streamUrl: fullAudioUrl, // Direct Link Audio Durasi Penuh!
              thumbnail: coverUrl,
              durationSeconds: song?.duration || 0,
            });
          }
        }
      }
    } catch (err: any) {
      console.warn(`Proxy ${endpoint} failed:`, err?.message);
      continue;
    }
  }

  // 2. Fallback: SoundCloud Public API Search
  try {
    const scSearch = await axios.get(
      `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=iZ864q28A9S2m5583802380238023&limit=1`,
      { timeout: 5000 }
    );

    const track = scSearch.data?.collection?.[0];
    if (track && track.media?.transcodings) {
      const progressiveFormat = track.media.transcodings.find(
        (t: any) => t.format?.protocol === 'progressive'
      );

      if (progressiveFormat) {
        const streamRes = await axios.get(
          `${progressiveFormat.url}?client_id=iZ864q28A9S2m5583802380238023`
        );
        if (streamRes.data?.url) {
          return NextResponse.json({
            success: true,
            title: track.title,
            artist: track.user?.username || 'Unknown',
            streamUrl: streamRes.data.url,
            thumbnail: track.artwork_url || '',
            durationSeconds: Math.floor(track.duration / 1000),
          });
        }
      }
    }
  } catch (err: any) {
    console.error('SoundCloud Fallback Error:', err?.message);
  }

  return NextResponse.json(
    { error: 'Gagal mengekstrak full audio stream' },
    { status: 502 }
  );
}