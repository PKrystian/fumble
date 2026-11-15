import { expect, test } from './fixtures';

for (const locale of ['', '/pl']) {
  const pl = Boolean(locale);
  test(`full catalog keeps pagination and search: ${locale || 'en'}`, async ({
    page,
  }) => {
    await page.goto(`${locale}/compendium/species/`);
    await page
      .getByRole('link', {
        name: pl ? 'Przeglądaj wszystkie wpisy' : 'Browse all entries',
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/view=all/);
    const cards = page.locator('main .catalog-card');
    await expect(cards).toHaveCount(50);
    await page
      .getByRole('button', { name: pl ? 'Następna strona' : 'Next page', exact: true })
      .click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator('main [role="status"]')).toContainText(
      pl ? 'Strona 2 z' : 'Page 2 of',
    );
    await cards.first().click();
    await expect(page.locator('main article')).toBeVisible();
    await page.locator('main .back-link').click();
    await expect(cards).toHaveCount(50);
    await expect(page).toHaveURL(/page=2/);
    await page.getByRole('searchbox').fill('Aarakocra');
    await expect(cards).toHaveCount(1);
    await expect(page).not.toHaveURL(/page=2/);
    await page.reload();
    await expect(cards).toHaveCount(1);
  });
  test(`unavailable filters remain removable on a narrow screen: ${locale || 'en'}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`${locale}/compendium/species/?size=Unavailable`);
    const open = page.getByRole('button', { name: pl ? /^Filtry/ : /^Filters/ });
    await open.click();
    const dialog = page.getByRole('dialog');
    const close = dialog.getByRole('button', {
      name: pl ? 'Zamknij filtry' : 'Close filters',
      exact: true,
    });
    await expect(close).toBeVisible();
    const bounds = await close.boundingBox();
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
    await dialog
      .getByRole('button', { name: pl ? 'Wyczyść wszystko' : 'Clear all', exact: true })
      .click();
    await expect(page).not.toHaveURL(/size=/);
    await dialog.getByRole('searchbox').fill(pl ? 'rozmiar' : 'size');
    await expect(
      dialog.getByRole('group', { name: pl ? 'Rozmiar' : 'Size', exact: true }),
    ).toBeVisible();
    await dialog.getByRole('searchbox').fill('zzzzzz');
    await expect(
      dialog.getByText(
        pl ? 'Brak pasujących opcji filtrów.' : 'No matching filter options.',
        { exact: true },
      ),
    ).toBeVisible();
    await close.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(open).toBeFocused();
  });
  test(`subclass controls and article outline survive refresh: ${locale || 'en'}`, async ({
    page,
  }) => {
    await page.goto(`${locale}/compendium/classes/wizard/`);
    const mode = page.getByRole('combobox', {
      name: pl ? 'Widok podklas' : 'Subclass view',
      exact: true,
    });
    await mode.selectOption('all');
    await expect(page).toHaveURL(/subclassMode=all/);
    const search = page.getByRole('searchbox', {
      name: pl ? 'Szukaj podklas i podręczników' : 'Search subclasses and sources',
      exact: true,
    });
    await search.fill('Evok');
    await expect(page).toHaveURL(/subclassSearch=Evok/);
    await page.reload();
    await expect(search).toHaveValue('Evok');
    await expect(mode).toHaveValue('all');
    const contents = page.getByText(pl ? 'Na tej stronie' : 'On this page', {
      exact: true,
    });
    await expect(contents).toBeVisible();
    await contents.click();
    await expect(
      page.getByRole('navigation', {
        name: pl ? 'Na tej stronie' : 'On this page',
        exact: true,
      }),
    ).toBeVisible();
  });
  test(`name tables can be selected and searched: ${locale || 'en'}`, async ({
    page,
  }) => {
    await page.goto(`${locale}/compendium/names/name-human-xge/`);
    const selector = page.getByRole('combobox', {
      name: pl ? 'Wybierz tabelę' : 'Choose a table',
      exact: true,
    });
    await selector.selectOption('0');
    await expect(page.locator('main article table')).toHaveCount(1);
    await page.reload();
    await expect(selector).toHaveValue('0');
    await selector.selectOption('');
    await page
      .getByRole('searchbox', {
        name: pl ? 'Szukaj tytułów tabel' : 'Search table titles',
        exact: true,
      })
      .fill('zzzzzz');
    await expect(
      page.getByText(pl ? 'Brak pasujących tabel.' : 'No matching tables.', {
        exact: true,
      }),
    ).toBeVisible();
  });
}
