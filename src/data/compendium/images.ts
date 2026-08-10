export const IMAGE_HOST = 'https://5e.tools/img/';
export const PRIMARY_IMAGE_WIDTH = 440;
export const PRIMARY_IMAGE_HEIGHT = 558;

export function imageUrl(path: string): string {
  if (/^(data:|https?:)/.test(path)) return path;
  return IMAGE_HOST + path.split('/').map(encodeURIComponent).join('/');
}
