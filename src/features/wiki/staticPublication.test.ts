import { describe, expect, it } from 'vitest';
import { renderWikiArticle } from '../../../scripts/wiki/render';

describe('static wiki articles', () => {
  it('renders the complete sanitized article with localized links, anchors, and tables', () => {
    const html = `<h2>Start</h2><p>${'Treść '.repeat(800)}</p><h2>Świt</h2><h3>Finał</h3><a data-wiki-link="glod-smoka/home" href="%BASE%wiki/glod-smoka/home">Kampania</a><table><tr><th>Kolumna</th><td>Wartość</td></tr></table><script>localStorage.clear()</script><img src="%BASE%wiki-assets/portrait.png" onerror="localStorage.clear()" alt="Portret"><p>Ostatni akapit.</p>`;
    const output = renderWikiArticle(html, 'pl', '/fumble/');
    const root = document.createElement('div');
    root.innerHTML = output;
    expect(root.textContent).toContain('Ostatni akapit.');
    expect(root.textContent!.length).toBeGreaterThan(4000);
    expect(root.querySelector('a[data-wiki-link]')).toHaveAttribute(
      'href',
      '/fumble/pl/wiki/glod-smoka/home/',
    );
    expect(root.querySelector('#wiki-section-swit')).not.toBeNull();
    expect(root.querySelector('details')).not.toBeNull();
    expect(root.querySelector('[role="region"]')).toHaveAttribute('tabindex', '0');
    expect(root.querySelector('img')).toHaveAttribute(
      'src',
      '/fumble/wiki-assets/portrait.png',
    );
    expect(output).not.toContain('localStorage.clear');
    expect(output).not.toContain('onerror');
    expect(root.querySelector('[lang]')).toHaveAttribute('lang', 'pl');
  });
  it('explains the source language without requiring contents for short articles', () => {
    const output = renderWikiArticle('<p>Krótka treść</p>', 'en');
    expect(output).toContain('Campaign content is available in Polish.');
    expect(output).not.toContain('<details');
  });
});
