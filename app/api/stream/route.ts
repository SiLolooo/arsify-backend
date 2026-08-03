import { NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  try {
    let videoId = '';
    let title = query;
    let artist = 'Official Artist';
    let thumbnail = '';

    // 1. Cari Video ID via YouTube Data API v3 Resmi (Jika API Key ada)
    if (YOUTUBE_API_KEY) {
      try {
        const ytRes = await axios.get(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
            query + ' official audio'
          )}&type=video&key=${YOUTUBE_API_KEY}&maxResults=1`,
          { timeout: 5000 }
        );
        const item = ytRes.data?.items?.[0];
        if (item) {
          videoId = item.id?.videoId;
          title = item.snippet?.title || query;
          artist = item.snippet?.channelTitle || 'Official Artist';
          thumbnail = item.snippet?.thumbnails?.high?.url || '';
        }
      } catch (e) {
        console.warn('YT API Search fallback triggered');
      }
    }

    // 2. Fallback Direct Scrape YouTube Search (100% Tanpa Piped / Domain Pihak Ketiga)
    if (!videoId) {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' official audio')}`;
      const searchRes = await axios.get(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 5000,
      });

      // Extract Video ID dari HTML YouTube secara native
      const matches = searchRes.data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (matches && matches[1]) {
        videoId = matches[1];
      }
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Lagu tidak ditemukan' }, { status: 404 });
    }

    // 3. Extractor Native ytdl-core Langsung Dari Container Railway
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getInfo(videoUrl);

    // Filter audio formats
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    
    if (!audioFormats || audioFormats.length === 0) {
      return NextResponse.json({ error: 'Format audio tidak ditemukan' }, { status: 502 });
    }

    const bestAudio = audioFormats[0];

    return NextResponse.json({
      success: true,
      title: title || info.videoDetails.title,
      artist: artist || info.videoDetails.author.name,
      streamUrl: bestAudio.url, // DIRECT GOOGLEVIDEO MP3 FULL DURATION!
      thumbnail: thumbnail || info.videoDetails.thumbnails.pop()?.url || '',
      durationSeconds: Number(info.videoDetails.lengthSeconds) || 0,
    });
  } catch (error: any) {
    console.error('Native Stream Extraction Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Gagal mengekstrak stream audio native', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}