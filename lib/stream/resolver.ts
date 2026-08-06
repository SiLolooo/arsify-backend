import {
  getPipedAudioStreams,
  searchPiped,
} from '../providers/piped';

import type {
  AudioStream,
  ResolvedStream,
} from '../types/stream';

export async function resolveStream(
  query: string
): Promise<ResolvedStream | null> {
  console.log(
    `[Resolver] Searching: ${query}`
  );

  const track = await searchPiped(query);

  if (!track) {
    console.error(
      '[Resolver] Track not found'
    );

    return null;
  }

  console.log(
    `[Resolver] Found: ${track.title}`
  );

  const streams =
    await getPipedAudioStreams(
      track.videoId
    );

  if (streams.length === 0) {
    console.error(
      '[Resolver] No audio streams found'
    );

    return null;
  }

  const audioStream =
    selectBestAudioStream(streams);

  if (!audioStream) {
    console.error(
      '[Resolver] No compatible audio stream'
    );

    return null;
  }

  console.log(
    `[Resolver] Selected stream:`,
    {
      mimeType: audioStream.mimeType,
      format: audioStream.format,
      bitrate: audioStream.bitrate,
      itag: audioStream.itag,
    }
  );

  return {
    track,
    stream: audioStream,
  };
}

function selectBestAudioStream(
  streams: AudioStream[]
): AudioStream | null {
  const compatibleStreams =
    streams.filter((stream) => {
      if (!stream.mimeType) {
        return false;
      }

      return (
        stream.mimeType.includes(
          'audio/mp4'
        ) ||
        stream.mimeType.includes(
          'audio/webm'
        )
      );
    });

  if (compatibleStreams.length === 0) {
    return null;
  }

  return compatibleStreams.sort(
    (a, b) =>
      (b.bitrate || 0) -
      (a.bitrate || 0)
  )[0];
}