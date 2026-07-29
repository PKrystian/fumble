const ID_PATTERN = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/;
const BARE_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (BARE_ID.test(trimmed)) return trimmed;
  const match = ID_PATTERN.exec(trimmed);
  return match ? match[1]! : null;
}

export function embedUrl(videoId: string, playlistId?: string): string {
  if (playlistId) {
    return `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1`;
  }
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`;
}

export function thumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}
