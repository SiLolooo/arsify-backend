import { NextResponse } from 'next/server';
import axios from 'axios';
import crypto from 'crypto';
import ytdl from '@distube/ytdl-core';

// ============================================================================
// HELPER: Native DES-ECB Decryption untuk Official CDN JioSaavn (Zero Mirror)
// ============================================================================
function decryptJioSaavnUrl(encryptedMediaUrl: string): string | null {
  try {
    const key = Buffer.from('38346591', 'ascii');
    const decipher = crypto.createDecipheriv('des-ecb', key, null);
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(encryptedMediaUrl, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    // Upgrade ke kualitas audio tertinggi (320kbps MP3/AAC CDN resmi)
    return decrypted
      .replace('_96.mp4', '_320.mp3')
      .replace('_96.mp3', '_320.mp3')
      .replace('_160.mp4', '_320.mp3')
      .replace('_160.mp3', '_320.mp3');
  } catch (error) {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  // =========================================================================
  // ENGINE 1: NATIVE JIOSAAVN DIRECT OFFICIAL API + LOCAL CRYPTO DECRYPTION
  // (100% Lagu Asli Studio, Tanpa Domain Mirror Pihak Ketiga)
  // =========================================================================
  try {
    const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&q=${encodeURIComponent(
      query
    )}`;

    const searchRes = await axios.get(searchUrl, {
      timeout: 6000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });

    const results = searchRes.data?.results;
    if (Array.isArray(results) && results.length > 0) {
      const song = results[0];

      // Ambil encrypted media URL langsung atau dari detail lagu
      let encryptedUrl = song.more_info?.encrypted_media_url;

      if (!encryptedUrl && song.id) {
        const detailRes = await axios.get(
          `https://www.jiosaavn.com/api.php?__call=song.getDetails&pids=${song.id}&_format=json`,
          { timeout: 4000 }
        );
        const detailData = detailRes.data?.[song.id];
        encryptedUrl = detailData?.more_info?.encrypted_media_url;
      }

      if (encryptedUrl) {
        const streamUrl = decryptJioSaavnUrl(encryptedUrl);
        if (streamUrl) {
          // Ambil nama artis resmi
          const artistName =
            song.more_info?.artistMap?.primary_artists?.[0]?.name ||
            song.more_info?.singers ||
            'Official Artist';

          // Upgrade resolusi thumbnail ke High-Res (500x500)
          const thumbnail = (song.image || '').replace('150x150', '500x500');

          return NextResponse.json({
            success: true,
            engine: 'JioSaavn Official Native Decrypted',
            title: song.title || song.song || query,
            artist: artistName,
            streamUrl: streamUrl, // DIRECT CDN OFFICIAL AUDIO 320KBPS!
            thumbnail: thumbnail,
            durationSeconds: Number(song.more_info?.duration) || 240,
          });
        }
      }
    }
  } catch (saavnError: any) {
    console.warn('Engine 1 (JioSaavn Native) pass:', saavnError?.message);
  }

  // =========================================================================
  // ENGINE 2: YOUTUBE NATIVE IOS CLIENT BYPASS
  // (Cadangan untuk lagu indie/J-Pop yang tidak ada di label Saavn)
  // =========================================================================
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' official audio')}`;
    const searchRes = await axios.get(searchUrl, {
      timeout: 6000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });

    const matches = [...searchRes.data.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
    const videoId = matches?.[0]?.[1];

    if (videoId) {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const info = await ytdl.getInfo(videoUrl, {
        playerClients: ['IOS'], // Client iOS terbukti paling tahan terhadap Bot Guard
      } as any);

      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      if (audioFormats && audioFormats.length > 0) {
        return NextResponse.json({
          success: true,
          engine: 'YouTube iOS Native Client',
          title: info.videoDetails.title || query,
          artist: info.videoDetails.author?.name || 'Official Artist',
          streamUrl: audioFormats[0].url,
          thumbnail: info.videoDetails.thumbnails?.pop()?.url || '',
          durationSeconds: Number(info.videoDetails.lengthSeconds) || 0,
        });
      }
    }
  } catch (ytError: any) {
    console.warn('Engine 2 (YouTube iOS) pass:', ytError?.message);
  }

  return NextResponse.json(
    { error: 'Lagu tidak ditemukan di katalog resmi' },
    { status: 404 }
  );
}