import { expect, test } from './fixtures';

for (const locale of ['', '/pl']) {
  const polish = locale === '/pl';
  test(`homebrew library browsing and mobile settings: ${locale || '/en'}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`${locale}/fumble-homebrew/`);
    const search = page.getByRole('searchbox', {
      name: polish ? 'Szukaj' : 'Search',
      exact: true,
    });
    const filters = page.getByRole('button', {
      name: polish ? 'Filtry (0)' : 'Filters (0)',
      exact: true,
    });
    await expect(filters).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('main .catalog-card')).toHaveCount(50);
    const first = await page.locator('main .catalog-card').first().getAttribute('href');
    await page
      .getByRole('button', { name: polish ? 'Następna' : 'Next', exact: true })
      .click();
    await expect(page).toHaveURL(/page=2/);
    await expect(
      page.getByRole('region', {
        name: polish ? 'Przeglądaj własną zawartość Fumble' : 'Browse Fumble homebrew',
      }),
    ).toBeFocused();
    await expect(page.locator('main .catalog-card').first()).not.toHaveAttribute(
      'href',
      first!,
    );
    await page.goBack();
    await expect(page.locator('main .catalog-card').first()).toHaveAttribute(
      'href',
      first!,
    );

    await search.fill(polish ? 'Kość Wytrzymałości' : 'Hit Die');
    await expect(
      page.getByRole('link', { name: polish ? /^Wiedźma Witch/ : /^Witch / }),
    ).toBeVisible();
    await expect(page).not.toHaveURL(/page=/);
    await filters.click();
    await page
      .getByRole('button', { name: polish ? 'Klasy' : 'Classes', exact: true })
      .click();
    const activeFilters = page.getByRole('button', {
      name: polish ? 'Filtry (1)' : 'Filters (1)',
      exact: true,
    });
    await activeFilters.click();
    await expect(activeFilters).toHaveAttribute('aria-expanded', 'false');
    await expect(
      page.getByRole('button', {
        name: polish ? 'Zresetuj filtry' : 'Reset filters',
        exact: true,
      }),
    ).toBeVisible();

    await search.fill('no-such-fumble-entry');
    await expect(
      page.getByText(
        polish
          ? 'Żaden wpis Fumble nie pasuje do wyszukiwania.'
          : 'No Fumble entries match this search.',
      ),
    ).toBeVisible();
    await page
      .getByRole('button', {
        name: polish ? 'Zresetuj filtry' : 'Reset filters',
        exact: true,
      })
      .click();
    await expect(search).toHaveValue('no-such-fumble-entry');
    await page
      .getByRole('button', {
        name: polish ? 'Wyczyść wyszukiwanie' : 'Clear search',
        exact: true,
      })
      .last()
      .click();
    await expect(page.locator('main .catalog-card')).toHaveCount(50);

    const settings = page.getByRole('button', {
      name: polish ? 'W Kompendium: wyłączone' : 'In the Compendium: disabled',
      exact: true,
    });
    await settings.click();
    const configure = page.getByRole('button', {
      name: polish ? 'Konfiguruj zawartość kompendium' : 'Configure Compendium content',
      exact: true,
    });
    await configure.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(
      polish
        ? 'Widoczność w Kompendium jest wyłączona.'
        : 'Compendium visibility is disabled.',
    );
    for (const button of await dialog.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    }
    await dialog
      .getByRole('button', {
        name: polish ? 'Wyczyść kampanie' : 'Clear campaigns',
        exact: true,
      })
      .click();
    await expect(dialog.getByRole('status')).toHaveText(
      polish ? 'Wybrano wpisów Fumble: 0' : '0 Fumble entries selected',
    );
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(configure).toBeFocused();
    await expect(settings).toHaveText(
      polish ? 'W Kompendium: wyłączone' : 'In the Compendium: disabled',
    );
    const dimensions = await page
      .locator('main')
      .evaluate((main) => ({ width: main.clientWidth, content: main.scrollWidth }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.width + 1);
  });
}
