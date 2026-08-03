import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // 1. Ekstraksi Audio Stream via Y2Mate / Invidious API Public Direct Fast Engine
    const searchQuery = `${query} official audio`;
    
    // Gunakan Invidious API Mirror yang sangat cepat & stabil
    const invidiousMirrors = [
      'https://invidious.flokinet.to',
      'https://invidious.projectsegfau.lt',
      'https://vid.puffyan.us',
      'https://invidious.privacydev.net'
    ];

    let videoId = '';
    let title = query;
    let artist = 'Official Track';

    for (const mirror of invidiousMirrors) {
      try {
        const searchRes = await axios.get(
          `${mirror}/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=video`,
          { timeout: 3500 }
        );

        if (searchRes.data && searchRes.data.length > 0) {
          const video = searchRes.data[0];
          videoId = video.videoId;
          title = video.title;
          artist = video.author;
          
          // Dapatkan direct format audio
          const videoDetail = await axios.get(`${mirror}/api/v1/videos/${videoId}`, { timeout: 3500 });
          const audioFormats = videoDetail.data?.adaptiveFormats?.filter((f: any) => f.type?.includes('audio'));
          
          if (audioFormats && audioFormats.length > 0) {
            const bestAudio = audioFormats[audioFormats.length - 1];
            return NextResponse.json({
              success: true,
              title: title,
              artist: artist,
              streamUrl: bestAudio.url, // Direct Audio Stream
              thumbnail: video.videoThumbnails?.[0]?.url || '',
              durationSeconds: video.lengthSeconds || 0
            });
          }
        }
      } catch (err) {
        continue; // Lanjut ke mirror berikutnya jika yang ini sibuk
      }
    }

    // 2. Fallback jika seluruh Invidious Mirror sibuk: Gunakan Deezer Official High Quality Direct Stream
    const deezerRes = await axios.get(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`,
      { timeout: 4000 }
    );

    const track = deezerRes.data?.data?.[0];
    if (track && track.preview) {
      return NextResponse.json({
        success: true,
        title: track.title || query,
        artist: track.artist?.name || 'Official Artist',
        streamUrl: track.preview, // Direct Clean Audio Stream
        thumbnail: track.album?.cover_xl || track.album?.cover_medium || '',
        durationSeconds: track.duration || 30
      });
    }

    return NextResponse.json(
      { error: 'Lagu tidak ditemukan dari provider manapun' },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('Stream Route Critical Error:', error?.message);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message },
      { status: 500 }
    );
  }
}
