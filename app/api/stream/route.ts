import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // 1. Cari video ID di YouTube via Invidious/Search publik
    const searchRes = await axios.get(
      `https://vid.puffyan.us/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
      { timeout: 5000 }
    );

    const videoId = searchRes.data?.[0]?.videoId;
    if (!videoId) {
      return NextResponse.json({ error: 'Lagu tidak ditemukan' }, { status: 404 });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // 2. Tembak ke Cobalt API Instance (API Khusus Extractor Media Bebas Bot)
    const cobaltRes = await axios.post(
      'https://cobalt-api.kwiatek.xyz/', // Public Cobalt Instance
      {
        url: videoUrl,
        downloadMode: 'audio',
        audioFormat: 'mp3',
      },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      }
    );

    if (cobaltRes.data?.url) {
      return NextResponse.json({
        success: true,
        title: searchRes.data[0].title || query,
        artist: searchRes.data[0].author || 'Unknown',
        streamUrl: cobaltRes.data.url, // Full Audio MP3 Link!
        thumbnail: searchRes.data[0].videoThumbnails?.[0]?.url || '',
      });
    }

    return NextResponse.json({ error: 'Gagal mendapatkan audio dari Cobalt' }, { status: 500 });
  } catch (error: any) {
    console.error('Cobalt Extractor Error:', error?.response?.data || error?.message);
    return NextResponse.json(
      { error: 'Internal Extractor Error', details: error?.message },
      { status: 500 }
    );
  }
}