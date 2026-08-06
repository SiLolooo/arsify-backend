export interface TrackInfo {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  durationSeconds: number;
}

export interface AudioStream {
  url: string;
  mimeType?: string;
  format?: string;
  bitrate?: number;
  contentLength?: number;
  itag?: number;
}

export interface ResolvedStream {
  track: TrackInfo;
  stream: AudioStream;
}