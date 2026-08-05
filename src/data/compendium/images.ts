export const IMAGE_HOST = 'https://5e.tools/img/';

export function imageUrl(path: string): string {
  if (/^(data:|https?:)/.test(path)) return path;
  return IMAGE_HOST + path.split('/').map(encodeURIComponent).join('/');
}

export function optimizedImageUrl(
  path: string,
  transformOrigin?: string,
  width = 480,
): string {
  const source = imageUrl(path);
  const origin = transformOrigin?.replace(/\/+$/, '');
  if (!origin || !source.startsWith(IMAGE_HOST)) return source;
  return `${origin}/cdn-cgi/image/width=${width},quality=75,format=auto/${source}`;
}
