import { describe, expect, it } from 'vitest';
import { sanitizeWikiHtml } from './html';

describe('sanitizeWikiHtml', () => {
  it('removes executable markup and unsafe URLs', () => {
    const html = sanitizeWikiHtml(
      '<img src=x onerror="localStorage.clear()"><script>alert(1)</script><a href="javascript:alert(1)">Bad</a>',
    );

    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('<img src="x">');
  });

  it('preserves wiki navigation attributes and map positioning', () => {
    const html = sanitizeWikiHtml(
      '<a data-wiki-link="silverhaven" href="%BASE%wiki/silverhaven">Silverhaven</a><span class="wiki-pin" style="left:28%;top:38%">Pin</span>',
    );

    expect(html).toContain('data-wiki-link="silverhaven"');
    expect(html).toContain('href="%BASE%wiki/silverhaven"');
    expect(html).toContain('style="left:28%;top:38%"');
  });
});
