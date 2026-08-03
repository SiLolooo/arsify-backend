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

    // 1. Cari Video ID via YouTube Data API v3 Resmi
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
        console.warn('YT Search API warning:', e);
      }
    }

    // Fallback search jika API Key belum dipasang / error
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
      return NextResponse.json({ error: 'Lagu tidak ditemukan' }, { status: 404 });
    }

    // 2. Ekstraksi Direct MP3 Audio Stream Secara Native Menggunakan @distube/ytdl-core
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getInfo(videoUrl);

    // Filter format audio saja dengan bitrate tertinggi
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    
    if (!audioFormats || audioFormats.length === 0) {
      return NextResponse.json({ error: 'Format audio tidak ditemukan' }, { status: 502 });
    }

    // Ambil format audio dengan kualitas terbaik
    const bestAudio = audioFormats[0];

    return NextResponse.json({
      success: true,
      title: title || info.videoDetails.title,
      artist: artist || info.videoDetails.author.name,
      streamUrl: bestAudio.url, // DIRECT GOOGLEVIDEO AUDIO MP3 FULL DURATION!
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