import { NextResponse } from 'next/server';
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
    let artist = 'Official Track';
    let thumbnail = '';

    // 1. Cari Official Video via YouTube Data API v3 Resmi
    if (YOUTUBE_API_KEY) {
      try {
        const ytSearchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          query + ' official audio'
        )}&type=video&key=${YOUTUBE_API_KEY}&maxResults=1`;

        const ytRes = await axios.get(ytSearchUrl, { timeout: 5000 });
        const item = ytRes.data?.items?.[0];

        if (item) {
          videoId = item.id?.videoId;
          title = item.snippet?.title || query;
          artist = item.snippet?.channelTitle || 'Official Track';
          thumbnail = item.snippet?.thumbnails?.high?.url || '';
        }
      } catch (err: any) {
        console.warn('YouTube API Search failed:', err?.message);
      }
    }

    // Fallback search jika API Key error / belum di-set
    if (!videoId) {
      const searchRes = await axios.get(
        `https://pub-api.piped.video/search?q=${encodeURIComponent(query + ' official audio')}&filter=music_songs`,
        { timeout: 5000 }
      );
      const item = searchRes.data?.items?.[0];
      if (item) {
        videoId = item.url?.replace('/watch?v=', '');
        title = item.title;
        artist = item.uploaderName;
        thumbnail = item.thumbnail;
      }
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Lagu tidak ditemukan di YouTube' }, { status: 404 });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // 2. Extractor Stream Audio Durasi Penuh via Multi-Engine (Cobalt API + Piped Official)
    const streamEngines = [
      // Engine 1: Cobalt Main Instance (Sangat cepat untuk audio mp3)
      async () => {
        const res = await axios.post(
          'https://api.cobalt.tools/',
          { url: videoUrl, downloadMode: 'audio', audioFormat: 'mp3' },
          {
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            timeout: 6000,
          }
        );
        return res.data?.url;
      },
      // Engine 2: Piped Official API
      async () => {
        const res = await axios.get(`https://pub-api.piped.video/streams/${videoId}`, {
          timeout: 6000,
        });
        const audioStreams = res.data?.audioStreams;
        return audioStreams && audioStreams.length > 0
          ? audioStreams[audioStreams.length - 1].url
          : null;
      },
      // Engine 3: Piped Secondary API
      async () => {
        const res = await axios.get(`https://pipedapi.kavin.rocks/streams/${videoId}`, {
          timeout: 6000,
        });
        const audioStreams = res.data?.audioStreams;
        return audioStreams && audioStreams.length > 0
          ? audioStreams[audioStreams.length - 1].url
          : null;
      },
    ];

    // Coba engine satu per satu sampai ketemu yang bernyawa
    for (const fetchStream of streamEngines) {
      try {
        const streamUrl = await fetchStream();
        if (streamUrl) {
          return NextResponse.json({
            success: true,
            title: title,
            artist: artist,
            streamUrl: streamUrl, // DIRECT STREAM MP3 FULL SONG!
            thumbnail: thumbnail,
          });
        }
      } catch (err: any) {
        console.warn('Stream Engine Attempt Failed:', err?.message);
        continue; // Lanjut ke engine berikutnya
      }
    }

    return NextResponse.json(
      { error: 'Gagal mengekstrak stream dari seluruh engine' },
      { status: 502 }
    );
  } catch (error: any) {
    console.error('Stream Route Error:', error?.message);
    return NextResponse.json(
      { error: 'Internal Stream Error', details: error?.message },
      { status: 500 }
    );
  }
}
