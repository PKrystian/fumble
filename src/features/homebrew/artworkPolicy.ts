import { createContext } from 'react';

export const PrivateArtwork = createContext(false);

const raster = /^data:image\/(?:jpeg|png|gif|webp|avif|bmp|x-icon);base64,/i;
export function isLocalHomebrewImage(source: string) {
  if (raster.test(source)) return true;
  const path = source.replace(/[\t\r\n]/g, '');
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\');
}
