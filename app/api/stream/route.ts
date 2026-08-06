import { NextResponse } from 'next/server';
import { resolveStream } from '@/lib/stream/resolver';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('query');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query parameter is required',
        },
        { status: 400 }
      );
    }

    console.log(
      `[API /stream] Resolving: ${query}`
    );

    const result = await resolveStream(
      query.trim()
    );

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: 'Audio stream not found',
        },
        { status: 404 }
      );
    }

    console.log(
      `[API /stream] Resolved: ${result.track.title}`
    );

    return NextResponse.json({
      success: true,

      track: {
        videoId: result.track.videoId,
        title: result.track.title,
        artist: result.track.artist,
        thumbnail: result.track.thumbnail,
        durationSeconds:
          result.track.durationSeconds,
      },

      stream: {
        url: result.stream.url,
        mimeType: result.stream.mimeType,
        format: result.stream.format,
        bitrate: result.stream.bitrate,
        itag: result.stream.itag,
      },
    });

  } catch (error) {
    console.error(
      '[API /stream] Unexpected error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}