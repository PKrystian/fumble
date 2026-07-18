import { readFileSync } from 'node:fs';

export interface ImageSize {
  width: number;
  height: number;
}

const FALLBACK: ImageSize = { width: 1000, height: 1000 };

export function imageSize(path: string): ImageSize {
  let buffer: Buffer;
  try {
    buffer = readFileSync(path);
  } catch {
    return FALLBACK;
  }

  if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (buffer.length >= 10 && buffer.toString('ascii', 0, 3) === 'GIF') {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }

  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1]!;
      const isSof =
        marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isSof) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + buffer.readUInt16BE(offset + 2);
    }
  }

  const text = buffer.toString('utf8', 0, Math.min(buffer.length, 2048));
  if (text.includes('<svg')) {
    const width = /\bwidth="([\d.]+)/.exec(text);
    const height = /\bheight="([\d.]+)/.exec(text);
    if (width && height) return { width: Number(width[1]), height: Number(height[1]) };
    const viewBox = /viewBox="[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)"/.exec(text);
    if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
  }

  return FALLBACK;
}
