import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // 1. Cari video via YouTube API Search Scraper ringan
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const html = await searchRes.text();
    const videoIdMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);

    if (!videoIdMatch || !videoIdMatch[1]) {
      return NextResponse.json({ error: 'Video YouTube tidak ditemukan' }, { status: 404 });
    }

    const videoId = videoIdMatch[1];
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // 2. Extract Direct Stream URL Durasi Penuh memakai ytdl-core
    const info = await ytdl.getInfo(videoUrl);
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

    if (!audioFormats || audioFormats.length === 0) {
      return NextResponse.json({ error: 'Audio stream tidak ditemukan' }, { status: 404 });
    }

    // Ambil format audio dengan audioBitrate tertinggi
    const bestAudio = audioFormats.reduce((prev, curr) =>
      (curr.audioBitrate || 0) > (prev.audioBitrate || 0) ? curr : prev
    );

    return NextResponse.json({
      success: true,
      title: info.videoDetails.title,
      artist: info.videoDetails.author.name,
      streamUrl: bestAudio.url, // Direct Stream Full Song!
      thumbnail: info.videoDetails.thumbnails[0]?.url || '',
      durationSeconds: info.videoDetails.lengthSeconds,
    });
  } catch (error: any) {
    console.error('YTDL Error:', error);
    return NextResponse.json(
      { error: 'Gagal memproses full audio stream', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}