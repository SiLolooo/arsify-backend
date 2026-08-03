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
    let artist = 'Official Artist';
    let thumbnail = '';

    // 1. Dapatkan Video ID dari YouTube API Resmi (Pasti Akurat & Bebas Block)
    if (YOUTUBE_API_KEY) {
      try {
        const ytRes = await axios.get(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
            query + ' official audio'
          )}&type=video&key=${YOUTUBE_API_KEY}&maxResults=1`,
          { timeout: 4000 }
        );
        const item = ytRes.data?.items?.[0];
        if (item) {
          videoId = item.id?.videoId;
          title = item.snippet?.title || query;
          artist = item.snippet?.channelTitle || 'Official Artist';
          thumbnail = item.snippet?.thumbnails?.high?.url || '';
        }
      } catch (err) {
        console.warn('YouTube API Search Fallback');
      }
    }

    // Daftar Instance Invidious Active/Online
    const invidiousNodes = [
      'https://inv.tux.pizza',
      'https://invidious.drgns.space',
      'https://invidious.nerdvpn.de',
      'https://invidious.projectsegfau.lt'
    ];

    // Fallback jika API Key YouTube tidak mengembalikan videoId
    if (!videoId) {
      for (const node of invidiousNodes) {
        try {
          const searchRes = await axios.get(
            `${node}/api/v1/search?q=${encodeURIComponent(query + ' official audio')}&type=video`,
            { timeout: 3000 }
          );
          if (searchRes.data && searchRes.data.length > 0) {
            videoId = searchRes.data[0].videoId;
            title = searchRes.data[0].title;
            artist = searchRes.data[0].author;
            thumbnail = searchRes.data[0].videoThumbnails?.[0]?.url || '';
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    if (!videoId) {
      return NextResponse.json({ error: 'Lagu tidak ditemukan' }, { status: 404 });
    }

    // 2. Extractor Direct Stream MP3 Audio Durasi Penuh (Estafet Search)
    for (const node of invidiousNodes) {
      try {
        const detailRes = await axios.get(`${node}/api/v1/videos/${videoId}`, {
          timeout: 4000,
        });

        const adaptiveFormats = detailRes.data?.adaptiveFormats;
        if (Array.isArray(adaptiveFormats)) {
          const audioFormats = adaptiveFormats.filter((f: any) =>
            f.type?.includes('audio')
          );

          if (audioFormats.length > 0) {
            const bestAudio = audioFormats[audioFormats.length - 1];

            return NextResponse.json({
              success: true,
              title: title,
              artist: artist,
              streamUrl: bestAudio.url, // DIRECT FULL SONG MP3 STREAM!
              thumbnail: thumbnail,
              durationSeconds: detailRes.data?.lengthSeconds || 0,
            });
          }
        }
      } catch (err) {
        continue; // Lanjut ke node berikutnya jika yang ini rtp/busy
      }
    }

    return NextResponse.json(
      { error: 'Gagal mengekstrak audio stream' },
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