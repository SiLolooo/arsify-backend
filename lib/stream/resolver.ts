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

  console.log(
    `[Resolver] Searching: ${query}`
  );

  const track =
    await provider.search(query);

  if (!track) {
    console.log(
      '[Resolver] Track not found'
    );

    return null;
  }

  console.log(
    `[Resolver] Track found: ${track.title}`
  );

  const audio =
    await provider.getAudioStream(track);

  if (!audio) {
    console.log(
      '[Resolver] Audio stream not found'
    );

    return null;
  }

  console.log(
    '[Resolver] Audio stream resolved'
  );

  return {
    track,
    audio,
  };
}