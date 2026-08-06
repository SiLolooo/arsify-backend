import type {
  AudioStream,
  TrackInfo,
} from '../types/stream';

export interface AudioProvider {
  search(
    query: string
  ): Promise<TrackInfo | null>;

  getAudioStream(
    track: TrackInfo
  ): Promise<AudioStream | null>;
}