import { describe, expect, it } from 'vitest';
import { embedUrl, parseYouTubeId, thumbnailUrl } from './youtube';

describe('parseYouTubeId', () => {
  it('parses a standard watch URL', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=jNQXAC9IVRw')).toBe(
      'jNQXAC9IVRw',
    );
  });

  it('parses short, embed, and shorts URLs', () => {
    expect(parseYouTubeId('https://youtu.be/jNQXAC9IVRw')).toBe('jNQXAC9IVRw');
    expect(parseYouTubeId('https://www.youtube.com/embed/jNQXAC9IVRw')).toBe(
      'jNQXAC9IVRw',
    );
    expect(parseYouTubeId('https://youtube.com/shorts/jNQXAC9IVRw')).toBe('jNQXAC9IVRw');
  });

  it('accepts a bare id and ignores extra query params', () => {
    expect(parseYouTubeId('jNQXAC9IVRw')).toBe('jNQXAC9IVRw');
    expect(parseYouTubeId('https://www.youtube.com/watch?v=jNQXAC9IVRw&t=42s')).toBe(
      'jNQXAC9IVRw',
    );
  });

  it('returns null for non-YouTube input', () => {
    expect(parseYouTubeId('https://example.com')).toBeNull();
    expect(parseYouTubeId('not a link')).toBeNull();
  });
});

describe('url builders', () => {
  it('builds a looping embed url', () => {
    expect(embedUrl('abc12345678')).toContain('/embed/abc12345678');
    expect(embedUrl('abc12345678')).toContain('loop=1');
  });

  it('builds a thumbnail url', () => {
    expect(thumbnailUrl('abc12345678')).toBe(
      'https://img.youtube.com/vi/abc12345678/mqdefault.jpg',
    );
  });
});
