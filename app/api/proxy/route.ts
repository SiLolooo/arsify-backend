import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    // Railway mengunduh audio menggunakan header Chrome Desktop (100% Lolos Cloudflare)
    const response = await axios.get(targetUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com',
      },
      timeout: 15000,
    });

    const buffer = Buffer.from(response.data);

    // Kirim biner audio murni (audio/mp4) langsung ke ExoPlayer Android
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mp4',
        'Content-Length': buffer.length.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    return new NextResponse('Proxy Tunnel Error: ' + (error.message || 'Failed to fetch audio'), {
      status: 502,
    });
  }
}