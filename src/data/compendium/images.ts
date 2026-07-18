export const IMAGE_HOST = 'https://5e.tools/img/';

export function imageUrl(path: string): string {
  if (/^(data:|https?:)/.test(path)) return path;
  return IMAGE_HOST + path.split('/').map(encodeURIComponent).join('/');
}
