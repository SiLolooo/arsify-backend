import { NextResponse } from 'next/server';
import { createReadStream, statSync } from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const filePath = path.join(
      process.cwd(),
      'public',
      'audio',
      'Aramsa.mp3'
    );

    const stats = statSync(filePath);
    const fileSize = stats.size;

    const range = request.headers.get('range');

    // Tidak ada Range → kirim seluruh file
    if (!range) {
      const stream = createReadStream(filePath);

      return new NextResponse(stream as any, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': fileSize.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Contoh:
    // Range: bytes=0-999999

    const match = range.match(
      /bytes=(\d+)-(\d*)/
    );

    if (!match) {
      return new NextResponse(
        'Invalid Range header',
        {
          status: 416,
        }
      );
    }

    const start = Number(match[1]);

    let end = match[2]
      ? Number(match[2])
      : fileSize - 1;

    // Jangan melewati ukuran file
    end = Math.min(
      end,
      fileSize - 1
    );

    // Range tidak valid
    if (
      start >= fileSize ||
      start > end
    ) {
      return new NextResponse(
        'Range Not Satisfiable',
        {
          status: 416,
          headers: {
            'Content-Range':
              `bytes */${fileSize}`,
          },
        }
      );
    }

    const chunkSize =
      end - start + 1;

    const stream = createReadStream(
      filePath,
      {
        start,
        end,
      }
    );

    return new NextResponse(
      stream as any,
      {
        status: 206,
        headers: {
          'Content-Type': 'audio/mpeg',

          'Content-Length':
            chunkSize.toString(),

          'Content-Range':
            `bytes ${start}-${end}/${fileSize}`,

          'Accept-Ranges': 'bytes',

          'Cache-Control':
            'no-cache',
        },
      }
    );

  } catch (error) {
    console.error(
      '[Test Audio] Error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          'Audio file not found',
      },
      {
        status: 404,
      }
    );
  }
}