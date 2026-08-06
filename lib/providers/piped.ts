import axios from 'axios';

import type {
  AudioProvider,
} from './audio-provider';

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

interface PipedAudioResult {
  url?: string;
  mimeType?: string;
  format?: string;
  bitrate?: number;
  contentLength?: number;
  itag?: number;
}

function extractVideoId(
  item: PipedSearchResult
): string | null {
  if (item.videoId) {
    return item.videoId;
  }

  if (item.url) {
    const match = item.url.match(
      /[?&]v=([a-zA-Z0-9_-]{11})/
    );

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export class PipedAudioProvider
  implements AudioProvider {

  /**
   * Search track menggunakan Piped.
   */
  async search(
    query: string
  ): Promise<TrackInfo | null> {

    for (const instance of PIPED_INSTANCES) {
      try {
        console.log(
          `[Piped] Searching: ${instance}`
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
              status >= 200 &&
              status < 300,
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
            `[Piped] No video ID: ${instance}`
          );

          continue;
        }

        const track: TrackInfo = {
          id: videoId,

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
          `[Piped] Search success:`,
          {
            id: track.id,
            title: track.title,
            artist: track.artist,
          }
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

  /**
   * Mendapatkan audio stream berdasarkan TrackInfo.
   */
  async getAudioStream(
    track: TrackInfo
  ): Promise<AudioStream | null> {

    for (const instance of PIPED_INSTANCES) {
      try {
        console.log(
          `[Piped] Getting streams: ${instance}`
        );

        const response = await axios.get(
          `${instance}/streams/${track.id}`,
          {
            timeout: 10000,

            validateStatus: (status) =>
              status >= 200 &&
              status < 300,
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
              (
                stream: PipedAudioResult
              ): AudioStream => ({
                url: stream.url || '',

                mimeType:
                  stream.mimeType ||
                  'audio/mp4',

                format:
                  stream.format,

                bitrate:
                  Number(
                    stream.bitrate
                  ) || 0,

                contentLength:
                  Number(
                    stream.contentLength
                  ) || undefined,

                itag:
                  Number(
                    stream.itag
                  ) || undefined,
              })
            )
            .filter(
              (stream) =>
                Boolean(stream.url)
            );

        if (streams.length === 0) {
          continue;
        }

        /**
         * Prioritaskan M4A / MP4 audio.
         */
        const preferredStream =
          streams
            .filter(
              (stream) =>
                stream.mimeType
                  ?.includes('mp4') ||
                stream.format === 'M4A'
            )
            .sort(
              (a, b) =>
                (b.bitrate || 0) -
                (a.bitrate || 0)
            )[0];

        if (preferredStream) {
          console.log(
            `[Piped] Selected audio stream`,
            {
              mimeType:
                preferredStream.mimeType,

              format:
                preferredStream.format,

              bitrate:
                preferredStream.bitrate,

              itag:
                preferredStream.itag,
            }
          );

          return preferredStream;
        }

        /**
         * Fallback:
         * gunakan stream dengan bitrate
         * paling tinggi.
         */
        streams.sort(
          (a, b) =>
            (b.bitrate || 0) -
            (a.bitrate || 0)
        );

        console.log(
          `[Piped] Selected fallback audio stream`
        );

        return streams[0];

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
      `[Piped] All stream instances failed for ${track.id}`
    );

    return null;
  }
}