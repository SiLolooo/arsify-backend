import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  // Daftar mirror endpoint CDN publik
  const mirrorApis = [
    `https://saavn.me/search/songs?query=${encodeURIComponent(query)}`,
    `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`,
  ];

  for (const apiUrl of mirrorApis) {
    try {
      console.log(`Mencoba fetch via Axios ke: ${apiUrl}`);

      const response = await axios.get(apiUrl, {
        timeout: 7000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      });

      const data = response.data;
      const results = data?.data?.results || data?.results;

      if (results && Array.isArray(results) && results.length > 0) {
        const song = results[0];
        const downloadUrls = song?.downloadUrl;

        if (Array.isArray(downloadUrls) && downloadUrls.length > 0) {
          // Ambil URL direct MP3 dengan bitrate tertinggi
          const directAudioUrl = downloadUrls[downloadUrls.length - 1]?.url;

          let thumbnailUrl = '';
          if (Array.isArray(song?.image) && song.image.length > 0) {
            thumbnailUrl = song.image[song.image.length - 1]?.url || song.image[0]?.url;
          }

          if (directAudioUrl) {
            return NextResponse.json({
              success: true,
              title: song?.name || query,
              artist: song?.primaryArtists || song?.singers || 'Unknown Artist',
              streamUrl: directAudioUrl,
              thumbnail: thumbnailUrl,
            });
          }
        }
      }
    } catch (error: any) {
      console.warn(`Gagal terhubung ke ${apiUrl}:`, error?.message || error);
      continue; // Coba endpoint mirror berikutnya
    }
  }

  return NextResponse.json(
    { error: 'Semua API Mirror gagal dijangkau oleh jaringan lokal' },
    { status: 502 }
  );
}