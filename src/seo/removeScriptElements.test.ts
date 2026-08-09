import { describe, expect, it } from 'vitest';
import { removeScriptElements } from './removeScriptElements';

describe('removeScriptElements', () => {
  it('removes normal and self-closing script elements', () => {
    const html =
      '<main>Keep</main><SCRIPT data-value=">">remove</SCRIPT\t\n bar><script src="x" />';

    expect(removeScriptElements(html)).toBe('<main>Keep</main>');
  });

  it('handles script content and unusual closing whitespace', () => {
    const html =
      '<p>Before</p><script>const value = "<script>";</script\t\n bar><p>After</p>';

    expect(removeScriptElements(html)).toBe('<p>Before</p><p>After</p>');
  });

  it('removes an unclosed script element through the end of the document', () => {
    expect(removeScriptElements('<p>Before</p><script>unsafe')).toBe('<p>Before</p>');
  });

  it('preserves non-script elements and text', () => {
    const html = '<scripture>Keep</scripture><p>Text</p>';

    expect(removeScriptElements(html)).toBe(html);
  });
});
