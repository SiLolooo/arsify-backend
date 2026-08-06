import axios from 'axios';
import type {
  AudioStream,
  TrackInfo,
} from '../types/stream';

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacydev.net',
  'https://api.piped.projectsegfau.lt',
];

interface PipedSearchResult {
  url?: string;
  videoId?: string;
  title?: string;
  uploaderName?: string;
  thumbnail?: string;
  duration?: number;
}

function extractVideoId(
  item: PipedSearchResult
): string | null {
  if (item.videoId) {
    return item.videoId;
  }

  if (item.url) {
    const match =
      item.url.match(
        /[?&]v=([a-zA-Z0-9_-]{11})/
      );

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export async function searchPiped(
  query: string
): Promise<TrackInfo | null> {

  for (const instance of PIPED_INSTANCES) {
    try {
      console.log(
        `[Piped] Searching instance: ${instance}`
      );

      const response = await axios.get(
        `${instance}/search`,
        {
          params: {
            q: `${query} official audio`,
            filter: 'music_songs',
          },
          timeout: 6000,
          validateStatus: (status) =>
            status >= 200 && status < 300,
        }
      );

      const items =
        response.data?.items;

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        console.log(
          `[Piped] No results: ${instance}`
        );

        continue;
      }

      const item =
        items[0] as PipedSearchResult;

      const videoId =
        extractVideoId(item);

      if (!videoId) {
        console.log(
          `[Piped] Result has no video ID: ${instance}`
        );

        continue;
      }

      const track: TrackInfo = {
        videoId,
        title:
          item.title ||
          query,
        artist:
          item.uploaderName ||
          'Unknown Artist',
        thumbnail:
          item.thumbnail ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        durationSeconds:
          Number(item.duration) || 0,
      };

      console.log(
        `[Piped] Search success: ${track.title}`
      );

      return track;

    } catch (error: any) {

      console.error(
        `[Piped] Search failed: ${instance}`,
        {
          status:
            error?.response?.status,
          message:
            error?.message,
        }
      );

      continue;
    }
  }

  console.error(
    '[Piped] All search instances failed'
  );

  return null;
}

export async function getPipedAudioStreams(
  videoId: string
): Promise<AudioStream[]> {

  for (const instance of PIPED_INSTANCES) {
    try {
      console.log(
        `[Piped] Getting streams from: ${instance}`
      );

      const response = await axios.get(
        `${instance}/streams/${videoId}`,
        {
          timeout: 10000,
          validateStatus: (status) =>
            status >= 200 && status < 300,
        }
      );

      const audioStreams =
        response.data?.audioStreams;

      if (
        !Array.isArray(audioStreams) ||
        audioStreams.length === 0
      ) {
        console.log(
          `[Piped] No audio streams: ${instance}`
        );

        continue;
      }

      const streams: AudioStream[] =
        audioStreams
          .map(
            (stream: any): AudioStream => ({
              url: stream.url,
              mimeType:
                stream.mimeType,
              format:
                stream.format,
              bitrate:
                Number(stream.bitrate) ||
                0,
              contentLength:
                Number(
                  stream.contentLength
                ) || undefined,
              itag:
                Number(stream.itag) ||
                undefined,
            })
          )
          .filter(
            (stream: AudioStream) =>
              Boolean(stream.url)
          );

      if (streams.length > 0) {
        console.log(
          `[Piped] Found ${streams.length} audio streams`
        );

        return streams;
      }

    } catch (error: any) {

      console.error(
        `[Piped] Stream request failed: ${instance}`,
        {
          status:
            error?.response?.status,
          message:
            error?.message,
        }
      );

      continue;
    }
  }

  console.error(
    `[Piped] All stream instances failed for ${videoId}`
  );

  return [];
}