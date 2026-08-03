import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  // 1. Coba via Invidious Instances API (Scraper Youtube High-Reliability)
  const invidiousInstances = [
    'https://inv.hostux.net',
    'https://invidious.nerdvpn.de',
    'https://invidious.drgns.space',
    'https://vid.puffyan.us',
  ];

  for (const instance of invidiousInstances) {
    try {
      const searchRes = await axios.get(
        `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
        { timeout: 4000 }
      );

      if (searchRes.data && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
        const video = searchRes.data[0];
        const videoId = video.videoId;

        if (videoId) {
          const detailRes = await axios.get(`${instance}/api/v1/videos/${videoId}`, {
            timeout: 4000,
          });

          const adaptiveFormats = detailRes.data?.adaptiveFormats;
          if (Array.isArray(adaptiveFormats)) {
            // Cari format audio (mimeType audio/webm atau audio/mp4)
            const audioFormats = adaptiveFormats.filter((f: any) =>
              f.type?.includes('audio')
            );

            if (audioFormats.length > 0) {
              const bestAudio = audioFormats[audioFormats.length - 1];
              return NextResponse.json({
                success: true,
                title: video.title || query,
                artist: video.author || 'Unknown Artist',
                streamUrl: bestAudio.url,
                thumbnail: video.videoThumbnails?.[0]?.url || '',
              });
            }
          }
        }
      }
    } catch (e: any) {
      console.warn(`Invidious ${instance} error:`, e?.message);
      continue;
    }
  }

  // 2. Fallback Paling Aman: iTunes Search API (Official Preview Audio Stream)
  try {
    const itunesRes = await axios.get(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`,
      { timeout: 5000 }
    );

    if (itunesRes.data?.results?.length > 0) {
      const track = itunesRes.data.results[0];
      if (track.previewUrl) {
        return NextResponse.json({
          success: true,
          title: track.trackName,
          artist: track.artistName,
          streamUrl: track.previewUrl,
          thumbnail: track.artworkUrl100?.replace('100x100bb', '600x600bb') || '',
        });
      }
    }
  } catch (e: any) {
    console.error('iTunes Fallback error:', e?.message);
  }

  return NextResponse.json(
    { error: 'Gagal mengekstrak audio dari seluruh provider' },
    { status: 502 }
  );
}