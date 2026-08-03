import { NextResponse } from 'next/server';
import axios from 'axios';

// Fungsi Dinamis Mengambil Client ID SoundCloud (Untuk Engine 2)
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
  // ENGINE 1: YOUTUBE OFFICIAL AUDIO via RESILIENT PIPED NODE POOL
  // (Menjamin Lagu Asli Studio & Bebas Blokir IP Railway)
  // =========================================================================
  try {
    const exactQuery = query.toLowerCase().includes('official') ? query : `${query} official audio`;
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exactQuery)}`;
    
    const searchRes = await axios.get(searchUrl, {
      timeout: 6000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const matches = [...searchRes.data.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
    const videoId = matches?.[0]?.[1];

    if (videoId) {
      // Daftar node Piped API yang stabil & siap mengekstrak direct audio tanpa Bot Guard
      const pipedNodes = [
        'https://pipedapi.kavin.rocks',
        'https://api.piped.privacydev.net',
        'https://piped-api.garudalinux.org',
        'https://api.piped.projectsegfau.lt'
      ];

      for (const node of pipedNodes) {
        try {
          const streamRes = await axios.get(`${node}/streams/${videoId}`, { timeout: 5000 });
          const audioStreams = streamRes.data?.audioStreams;

          if (Array.isArray(audioStreams) && audioStreams.length > 0) {
            // Pilih format audio dengan kualitas tertinggi
            const bestAudio = audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

            if (bestAudio?.url) {
              return NextResponse.json({
                success: true,
                engine: 'YouTube Official Audio Node',
                title: streamRes.data.title || query,
                artist: streamRes.data.uploader || 'Official Artist',
                streamUrl: bestAudio.url, // DIRECT GOOGLEVIDEO AUDIO STREAM FULL DURATION
                thumbnail: streamRes.data.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                durationSeconds: Number(streamRes.data.duration) || 240,
              });
            }
          }
        } catch (nodeErr) {
          continue; // Coba node Piped berikutnya
        }
      }
    }
  } catch (ytError: any) {
    console.warn('Engine 1 (YouTube Node) pass:', ytError?.message);
  }

  // =========================================================================
  // ENGINE 2: SOUNDCLOUD HIGHEST PLAYS FILTER (Anti Cover Abal-abal)
  // =========================================================================
  try {
    const clientId = await getSoundCloudClientId();
    const scSearchUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(
      query
    )}&client_id=${clientId}&limit=10`;

    const searchRes = await axios.get(scSearchUrl, {
      timeout: 6000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });

    const collection = searchRes.data?.collection;
    if (collection && Array.isArray(collection) && collection.length > 0) {
      // PERBAIKAN KRUSIAL: Urutkan berdasarkan jumlah putaran tertinggi (playback_count)
      // agar cover dari akun random seperti "A D I" tidak terpilih!
      const sortedTracks = collection.sort((a: any, b: any) => (b.playback_count || 0) - (a.playback_count || 0));

      for (const track of sortedTracks) {
        const transcodings = track?.media?.transcodings;
        if (!transcodings || !Array.isArray(transcodings)) continue;

        let targetFormat = transcodings.find((t: any) => t.format?.protocol === 'progressive');
        if (!targetFormat && transcodings.length > 0) targetFormat = transcodings[0];

        if (targetFormat) {
          const streamLinkRes = await axios.get(`${targetFormat.url}?client_id=${clientId}`, {
            timeout: 5000,
          });

          if (streamLinkRes.data?.url) {
            return NextResponse.json({
              success: true,
              engine: 'SoundCloud Verified/Popular Engine',
              title: track.title || query,
              artist: track.user?.username || 'Official Artist',
              streamUrl: streamLinkRes.data.url,
              thumbnail: track.artwork_url ? track.artwork_url.replace('-large', '-t500x500') : '',
              durationSeconds: Math.floor((track.duration || 0) / 1000),
            });
          }
        }
      }
    }
  } catch (scError: any) {
    console.warn('Engine 2 (SoundCloud) pass:', scError?.message);
  }

  // =========================================================================
  // ENGINE 3: SAAVN MIRROR (Tertiary Commercial Fallback)
  // =========================================================================
  try {
    const res = await axios.get(`https://saavn.me/search/songs?query=${encodeURIComponent(query)}`, { timeout: 5000 });
    const song = res.data?.data?.results?.[0];
    if (song) {
      const streamUrl = song.downloadUrl?.[song.downloadUrl.length - 1]?.url || song.downloadUrl?.[0]?.url;
      if (streamUrl) {
        return NextResponse.json({
          success: true,
          engine: 'Saavn Commercial Mirror',
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