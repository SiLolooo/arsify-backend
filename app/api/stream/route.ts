import { NextResponse } from 'next/server';
import axios from 'axios';
import ytdl from '@distube/ytdl-core';

// 1. Fungsi Dinamis Mengambil Client ID SoundCloud Aktif (Anti 401 Unauthorized)
async function getSoundCloudClientId(): Promise<string> {
  const fallbackKey = 'iZ864q28A9S2m5583802380238023';
  try {
    const htmlRes = await axios.get('https://soundcloud.com/', {
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    
    const scriptUrls = htmlRes.data.match(/<script crossorigin src="([^"]+)"><\/script>/g) || [];
    for (const tag of scriptUrls.slice(-3)) {
      const urlMatch = tag.match(/src="([^"]+)"/);
      if (urlMatch) {
        const jsRes = await axios.get(urlMatch[1], { timeout: 4000 });
        const idMatch = jsRes.data.match(/client_id:"([a-zA-Z0-9]{32})"/);
        if (idMatch && idMatch[1]) return idMatch[1];
      }
    }
  } catch (e) {
    console.warn('Scraping SC ClientID fallback to default');
  }
  return fallbackKey;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  // =========================================================================
  // ENGINE 1: SOUNDCLOUD DYNAMIC ENGINE (Primary - 100% Full Song & Anti-Bot)
  // =========================================================================
  try {
    const clientId = await getSoundCloudClientId();
    const scSearchUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(
      query
    )}&client_id=${clientId}&limit=3`;

    const searchRes = await axios.get(scSearchUrl, {
      timeout: 6000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });

    const collection = searchRes.data?.collection;
    if (collection && Array.isArray(collection) && collection.length > 0) {
      for (const track of collection) {
        const transcodings = track?.media?.transcodings;
        if (!transcodings || !Array.isArray(transcodings)) continue;

        // Cari stream progressive (MP3 utuh langsung)
        let targetFormat = transcodings.find((t: any) => t.format?.protocol === 'progressive');
        if (!targetFormat && transcodings.length > 0) targetFormat = transcodings[0];

        if (targetFormat) {
          const streamLinkRes = await axios.get(`${targetFormat.url}?client_id=${clientId}`, {
            timeout: 5000,
          });

          if (streamLinkRes.data?.url) {
            return NextResponse.json({
              success: true,
              engine: 'SoundCloud Direct Engine',
              title: track.title || query,
              artist: track.user?.username || 'Official Artist',
              streamUrl: streamLinkRes.data.url, // DIRECT MP3 FULL SONG STREAM!
              thumbnail: track.artwork_url ? track.artwork_url.replace('-large', '-t500x500') : '',
              durationSeconds: Math.floor((track.duration || 0) / 1000),
            });
          }
        }
      }
    }
  } catch (scError: any) {
    console.warn('Engine 1 (SoundCloud) pass:', scError?.message);
  }

  // =========================================================================
  // ENGINE 2: YOUTUBE MOBILE BYPASS ENGINE (Secondary - Anti Bot Check)
  // =========================================================================
  try {
    // Search Video ID langsung dari YouTube Resmi (Tanpa Piped/Cobalt)
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' official audio')}`;
    const searchRes = await axios.get(searchUrl, {
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });

    const matches = [...searchRes.data.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
    const videoId = matches?.[0]?.[1];

    if (videoId) {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      // PERBAIKAN KRUSIAL: Gunakan playerClients ANDROID & IOS agar TIDAK kena "Sign in to confirm you're not a bot"
      const info = await ytdl.getInfo(videoUrl, {
        playerClients: ['ANDROID', 'IOS', 'TV'],
      } as any);

      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      if (audioFormats && audioFormats.length > 0) {
        const bestAudio = audioFormats[0];
        return NextResponse.json({
          success: true,
          engine: 'YouTube Mobile Bypass Engine',
          title: info.videoDetails.title || query,
          artist: info.videoDetails.author?.name || 'Official Artist',
          streamUrl: bestAudio.url, // DIRECT GOOGLEVIDEO AUDIO STREAM FULL DURATION!
          thumbnail: info.videoDetails.thumbnails?.pop()?.url || '',
          durationSeconds: Number(info.videoDetails.lengthSeconds) || 0,
        });
      }
    }
  } catch (ytError: any) {
    console.error('Engine 2 (YouTube Mobile) pass:', ytError?.message);
  }

  // =========================================================================
  // ENGINE 3: CANONICAL SAAVN MIRROR (Tertiary Stable Fallback)
  // =========================================================================
  try {
    // Menggunakan mirror saavn.me yang memiliki uptime terbukti stabil (bukan saavn.dev)
    const res = await axios.get(`https://saavn.me/search/songs?query=${encodeURIComponent(query)}`, { timeout: 5000 });
    const song = res.data?.data?.results?.[0];
    if (song) {
      const streamUrl = song.downloadUrl?.[song.downloadUrl.length - 1]?.url || song.downloadUrl?.[0]?.url;
      if (streamUrl) {
        return NextResponse.json({
          success: true,
          engine: 'Saavn Stable Mirror',
          title: song.name || query,
          artist: song.primaryArtists || 'Official Artist',
          streamUrl: streamUrl,
          thumbnail: song.image?.[song.image.length - 1]?.url || '',
          durationSeconds: Number(song.duration) || 240,
        });
      }
    }
  } catch (e) {
    console.warn('Engine 3 pass');
  }

  return NextResponse.json(
    { error: 'Gagal mengekstrak stream audio dari semua native engine' },
    { status: 502 }
  );
}