import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  // List Saavn API instances yang aktif & stabil
  const saavnInstances = [
    'https://saavn.dev/api/search/songs',
    'https://jiosaavn-api-v2.vercel.app/api/search/songs',
    'https://saavn-api.vercel.app/search/songs'
  ];

  for (const endpoint of saavnInstances) {
    try {
      const response = await axios.get(`${endpoint}?query=${encodeURIComponent(query)}`, {
        timeout: 5000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const results = response.data?.data?.results || response.data?.results || response.data;

      if (Array.isArray(results) && results.length > 0) {
        const song = results[0];

        // Cari URL Audio MP3 terbaik (prioritas 320kbps -> 160kbps)
        let streamUrl = '';
        if (Array.isArray(song.downloadUrl) && song.downloadUrl.length > 0) {
          // Ambil kualitas tertinggi (elemen terakhir biasanya 320kbps)
          streamUrl = song.downloadUrl[song.downloadUrl.length - 1]?.url || song.downloadUrl[0]?.url;
        } else if (typeof song.downloadUrl === 'string') {
          streamUrl = song.downloadUrl;
        }

        if (streamUrl) {
          // Normalisasi thumbnail
          let thumbnail = '';
          if (Array.isArray(song.image) && song.image.length > 0) {
            thumbnail = song.image[song.image.length - 1]?.url || song.image[0]?.url;
          } else if (typeof song.image === 'string') {
            thumbnail = song.image;
          }

          // Ambil nama artis
          let artistName = 'Official Artist';
          if (song.artists?.primary && Array.isArray(song.artists.primary) && song.artists.primary.length > 0) {
            artistName = song.artists.primary[0].name;
          } else if (song.primaryArtists) {
            artistName = song.primaryArtists;
          }

          return NextResponse.json({
            success: true,
            title: song.name || song.title || query,
            artist: artistName,
            album: song.album?.name || song.album || '',
            streamUrl: streamUrl, // DIRECT FULL SONG MP3 320KBPS!
            thumbnail: thumbnail,
            durationSeconds: Number(song.duration) || 240,
          });
        }
      }
    } catch (err: any) {
      console.warn(`Endpoint ${endpoint} failed:`, err?.message || err);
      continue; // Coba instance cadangan
    }
  }

  return NextResponse.json(
    { error: 'Gagal mendapatkan lagu full duration' },
    { status: 502 }
  );
}