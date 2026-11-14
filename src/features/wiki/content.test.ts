import { describe, expect, it } from 'vitest';
import { prepareWikiRoot, wikiText } from './content';

const labels = { image: 'Obraz', table: 'Tabela', locked: 'Zablokowane', empty: 'Pusto' };

describe('wiki article preparation', () => {
  it('keeps localized real links and names images and table scroll areas', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<a data-wiki-link="glod-smoka/home">Home</a><a data-wiki-link=""></a><a data-wiki-link="../bad"></a><a target="_blank" href="https://example.test">Site</a><div class="wiki-locked">Secret</div><p>Nothing here</p><p>Normal</p><table><tr><th>Header</th><td>Data</td></tr></table><table></table><img src="a" alt=""><img src="b" alt="Portret"><a href="c"><img src="c" alt="Linked"></a>';
    expect(prepareWikiRoot(root, 'pl', labels, '/fumble/', '?q=Elf')).toEqual([]);
    expect(root.querySelector('a')?.getAttribute('href')).toBe(
      '/fumble/pl/wiki/glod-smoka/home/?q=Elf',
    );
    expect(root.querySelector('a[target]')?.getAttribute('rel')).toBe(
      'noopener noreferrer',
    );
    expect(root.querySelector('.wiki-locked')).toHaveTextContent('Zablokowane');
    expect(root.querySelector('p')).toHaveTextContent('Pusto');
    expect(root.querySelectorAll('table')).toHaveLength(1);
    expect(root.querySelector('[role="region"]')).toHaveAttribute('tabindex', '0');
    expect(root.querySelector('[role="region"]')).toHaveAttribute('aria-label', 'Tabela');
    expect(root.querySelector('th')).toHaveAttribute('scope', 'col');
    expect(root.querySelectorAll('[data-image-viewer]')).toHaveLength(2);
    expect(root.querySelector('[aria-label="Obraz"]')).not.toBeNull();
    expect(root.querySelector('[aria-label="Portret"]')).not.toBeNull();
  });
  it('omits empty facts and builds stable unique headings outside metadata', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<aside class="wiki-infobox"><h3>NPC</h3><table><tr><th>Blank</th><td> </td></tr><tr><th>Home</th><td>Town</td></tr></table></aside><h2>Świt</h2><h3>Świt</h3><h4>!!!</h4><h2 id="existing">Kept</h2><h2> </h2><img>';
    const headings = prepareWikiRoot(root, 'en', labels);
    expect(headings.map((heading) => heading.id)).toEqual([
      'wiki-section-swit',
      'wiki-section-swit-2',
      'wiki-section-section',
      'existing',
    ]);
    expect(root.querySelectorAll('.wiki-infobox tr')).toHaveLength(1);
    expect(root.querySelector('.wiki-infobox th')).toHaveAttribute('scope', 'row');
    expect(root.querySelectorAll('.wiki-table-scroll')).toHaveLength(0);
    expect(root.querySelector('[id="existing"]')).toHaveAttribute('tabindex', '-1');
  });
  it('extracts readable entity text for search and excerpts', () => {
    expect(wikiText('<p>A&nbsp;&amp;&quot;&apos;&lt;&gt;&#39;&#243;</p>')).toBe(
      "A &\"'<>'ó",
    );
  });
});
