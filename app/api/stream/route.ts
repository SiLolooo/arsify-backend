import { NextResponse } from 'next/server';

import { PipedAudioProvider } from '@/lib/providers/piped';
import { resolveStream } from '@/lib/stream/resolver';

export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const query =
      searchParams.get('query');

    if (!query?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Query parameter is required',
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      `[API /stream] Query: ${query}`
    );

    // Provider
    const provider =
      new PipedAudioProvider();

    // Resolver
    const result =
      await resolveStream(
        provider,
        query
      );

    if (!result) {
      console.log(
        '[API /stream] Stream not found'
      );

      return NextResponse.json(
        {
          success: false,
          error:
            'Audio stream not found',
        },
        {
          status: 404,
        }
      );
    }

    const {
      track,
      audio,
    } = result;

    /*
     * Direct URL dari Piped tidak diberikan
     * langsung ke Flutter.
     *
     * Kita bungkus melalui /api/proxy.
     */
    const proxyUrl =
      new URL(
        '/api/proxy',
        request.url
      );

    proxyUrl.searchParams.set(
      'url',
      audio.url
    );

    console.log(
      '[API /stream] Resolved:',
      {
        title: track.title,
        artist: track.artist,
        mimeType: audio.mimeType,
        format: audio.format,
        bitrate: audio.bitrate,
      }
    );

    return NextResponse.json({
      success: true,

      track: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        thumbnail:
          track.thumbnail,
        durationSeconds:
          track.durationSeconds,
      },

      streamUrl:
        proxyUrl.toString(),
    });

  } catch (error: any) {

    console.error(
      '[API /stream] Error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          'Failed to resolve audio stream',
      },
      {
        status: 500,
      }
    );
  }
}