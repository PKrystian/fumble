export const isVideoId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value);

export const isPlaylistId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{10,100}$/.test(value);

export interface YouTubeSource {
  videoId: string;
  playlistId?: string;
}

export function parseYouTubeSource(input: string): YouTubeSource | null {
  const value = input.trim();
  if (isVideoId(value)) return { videoId: value };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
    return null;
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  const youtube = [
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com',
  ].includes(host);
  const short = host === 'youtu.be' || host === 'www.youtu.be';
  if (!youtube && !short) return null;
  const playlistId = url.searchParams.get('list');
  if (playlistId !== null && !isPlaylistId(playlistId)) return null;
  if (youtube && playlistId && ['/playlist', '/embed/videoseries'].includes(url.pathname))
    return { videoId: '', playlistId };
  const videoId = short
    ? parts.length === 1
      ? parts[0]
      : null
    : ['embed', 'shorts', 'live'].includes(parts[0] ?? '') && parts.length === 2
      ? parts[1]
      : url.pathname === '/watch'
        ? url.searchParams.get('v')
        : null;
  if (isVideoId(videoId)) return { videoId, ...(playlistId ? { playlistId } : {}) };
  return null;
}

export function parseYouTubeId(input: string): string | null {
  return parseYouTubeSource(input)?.videoId || null;
}

export function embedUrl(videoId: string, playlistId?: string): string {
  if (playlistId) {
    return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(playlistId)}&autoplay=1`;
  }
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&loop=1&playlist=${encodeURIComponent(videoId)}`;
}

export function sourceUrl(source: YouTubeSource): string {
  return source.playlistId
    ? `https://www.youtube.com/playlist?list=${encodeURIComponent(source.playlistId)}`
    : `https://www.youtube.com/watch?v=${encodeURIComponent(source.videoId)}`;
}

export function thumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`;
}
