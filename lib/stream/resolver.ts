import type {
  AudioProvider,
} from '../providers/audio-provider';

import type {
  ResolvedStream,
} from '../types/stream';

export async function resolveStream(
  provider: AudioProvider,
  query: string
): Promise<ResolvedStream | null> {

  const normalizedQuery =
    query.trim();

  if (!normalizedQuery) {
    console.warn(
      '[Resolver] Empty query'
    );

    return null;
  }

  console.log(
    `[Resolver] Searching: ${normalizedQuery}`
  );

  // 1. Cari track
  const track =
    await provider.search(
      normalizedQuery
    );

  if (!track) {
    console.warn(
      `[Resolver] Track not found: ${normalizedQuery}`
    );

    return null;
  }

  console.log(
    `[Resolver] Track found`,
    {
      id: track.id,
      title: track.title,
      artist: track.artist,
    }
  );

  // 2. Cari audio stream
  const audio =
    await provider.getAudioStream(
      track
    );

  if (!audio) {
    console.warn(
      `[Resolver] Audio stream not found: ${track.id}`
    );

    return null;
  }

  console.log(
    `[Resolver] Audio stream resolved`,
    {
      mimeType: audio.mimeType,
      format: audio.format,
      bitrate: audio.bitrate,
      itag: audio.itag,
    }
  );

  // 3. Gabungkan track + audio
  return {
    track,
    audio,
  };
}