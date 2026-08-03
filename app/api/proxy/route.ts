import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
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

    // KRUSIAL: Cek 25 byte pertama file! Kalau isinya teks HTML/DOCTYPE/JSON error, TOLAK!
    const headText = buffer.subarray(0, 25).toString('utf8').toLowerCase();
    if (headText.includes('<html') || headText.includes('<!doc') || headText.includes('error')) {
      return new NextResponse('Proxy error: Server sumber mengirim halaman HTML/CAPTCHA, bukan audio.', {
        status: 502,
      });
    }

    // Terbukti biner audio M4A murni, kirim ke ExoPlayer!
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