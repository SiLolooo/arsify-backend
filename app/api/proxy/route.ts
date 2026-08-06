import { NextResponse } from 'next/server';

export async function GET(
  request: Request
) {
  const { searchParams } =
    new URL(request.url);

  const targetUrl =
    searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse(
      'Missing url parameter',
      {
        status: 400,
      }
    );
  }

  try {
    const range =
      request.headers.get('range');

    const headers =
      new Headers();

    headers.set(
      'User-Agent',
      'Arsify-Audio-Proxy/1.0'
    );

    headers.set(
      'Accept',
      'audio/*,*/*;q=0.8'
    );

    if (range) {
      headers.set(
        'Range',
        range
      );
    }

    console.log(
      '[Proxy] Request:',
      {
        url: targetUrl,
        range,
      }
    );

    const upstream =
      await fetch(targetUrl, {
        method: 'GET',
        headers,
        redirect: 'follow',
        cache: 'no-store',
      });

    console.log(
      '[Proxy] Upstream:',
      {
        status:
          upstream.status,

        contentType:
          upstream.headers.get(
            'content-type'
          ),

        contentLength:
          upstream.headers.get(
            'content-length'
          ),

        contentRange:
          upstream.headers.get(
            'content-range'
          ),
      }
    );

    if (
      !upstream.ok &&
      upstream.status !== 206
    ) {
      return new NextResponse(
        'Upstream audio request failed',
        {
          status: 502,
        }
      );
    }

    const contentType =
      upstream.headers.get(
        'content-type'
      ) ||
      'application/octet-stream';

    const responseHeaders =
      new Headers();

    responseHeaders.set(
      'Content-Type',
      contentType
    );

    responseHeaders.set(
      'Accept-Ranges',
      'bytes'
    );

    const contentLength =
      upstream.headers.get(
        'content-length'
      );

    if (contentLength) {
      responseHeaders.set(
        'Content-Length',
        contentLength
      );
    }

    const contentRange =
      upstream.headers.get(
        'content-range'
      );

    if (contentRange) {
      responseHeaders.set(
        'Content-Range',
        contentRange
      );
    }

    responseHeaders.set(
      'Cache-Control',
      'no-cache'
    );

    return new NextResponse(
      upstream.body,
      {
        status:
          upstream.status === 206
            ? 206
            : 200,

        headers:
          responseHeaders,
      }
    );

  } catch (error) {
    console.error(
      '[Proxy] Error:',
      error
    );

    return new NextResponse(
      'Proxy request failed',
      {
        status: 502,
      }
    );
  }
}