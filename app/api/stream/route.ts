import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  const searchQuery = `${query} official audio`;

  try {
    let videoId = '';
    let title = query;
    let artist = 'Official Artist';

    // 1. Cari Video ID dari YouTube Search Scraper
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    const searchRes = await axios.get(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 5000,
    });

    const matches = searchRes.data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (matches && matches[1]) {
      videoId = matches[1];
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Lagu tidak ditemukan' }, { status: 404 });
    }

    // List Public Cobalt API Instances (Proxy Extractor yang mengurusi Bypass Captcha & Bot Guard)
    const cobaltInstances = [
      'https://api.cobalt.tools/',
      'https://cobalt-api.kwi.im/',
      'https://co.wuk.sh/api/json'
    ];

    const targetYoutubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // 2. Tembak ke Cobalt Engine untuk mengambil Direct Audio Link (Bebas Captcha/Bot Check)
    for (const cobaltUrl of cobaltInstances) {
      try {
        const cobaltRes = await axios.post(
          cobaltUrl,
          {
            url: targetYoutubeUrl,
            downloadMode: 'audio',
            audioFormat: 'mp3',
            audioBitrate: '320',
          },
          {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            timeout: 7000,
          }
        );

        if (cobaltRes.data?.url) {
          return NextResponse.json({
            success: true,
            title: title,
            artist: artist,
            streamUrl: cobaltRes.data.url, // DIRECT AUDIO MP3 STREAM DARI COBALT ENGINE!
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            durationSeconds: 240,
          });
        }
      } catch (err: any) {
        console.warn(`Cobalt instance ${cobaltUrl} failed, trying next...`);
        continue;
      }
    }

    return NextResponse.json(
      { error: 'Gagal mengekstrak audio dari Cobalt Proxy Engine' },
      { status: 502 }
    );
  } catch (error: any) {
    console.error('Proxy Stream Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Internal Stream Error', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}