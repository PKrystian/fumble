import { chooseToolBackup, test, expect } from './fixtures';

for (const locale of ['en', 'pl'] as const) {
  const pl = locale === 'pl';
  const root = pl ? '/pl' : '';
  const tracks = [
    { id: 'rain', name: 'Rain', videoId: 'jNQXAC9IVRw', category: 'custom' },
    { id: 'battle', name: 'Battle', videoId: 'ewceCUF4qtU', category: 'custom' },
  ];
  test(`soundboard ${locale} keeps edits, favorites, keyboard order and scoped backups`, async ({
    page,
  }) => {
    await page.addInitScript((data) => {
      if (!localStorage.getItem('fumble-soundboard'))
        localStorage.setItem(
          'fumble-soundboard',
          JSON.stringify({
            version: 5,
            state: { tracks: data, categories: [{ id: 'custom', name: null }] },
          }),
        );
      localStorage.setItem('fumble-audit-preserved', 'keep');
    }, tracks);
    await page.route('https://img.youtube.com/**', (route) => route.abort());
    await page.goto(`${root}/dm/soundboard`);
    const favorite = page.getByRole('button', {
      name: `${pl ? 'Ulubiony' : 'Favorite'}: Rain`,
      exact: true,
    });
    await favorite.click();
    await expect(favorite).toHaveAttribute('aria-pressed', 'true');
    await page
      .getByRole('button', { name: pl ? 'Ulubione (1)' : 'Favorites (1)', exact: true })
      .click();
    await expect(page.getByRole('button', { name: 'Battle', exact: true })).toHaveCount(
      0,
    );
    await page
      .getByRole('button', { name: pl ? 'Wyczyść filtry' : 'Reset filters', exact: true })
      .click();
    const handle = page.getByRole('button', {
      name: `${pl ? 'Zmień kolejność' : 'Reorder'}: Rain`,
      exact: true,
    });
    await handle.focus();
    await handle.press('Space');
    await expect(page.locator('main li').first()).toHaveClass(/opacity-40/);
    const firstCard = await page.locator('main li').nth(0).boundingBox();
    const secondCard = await page.locator('main li').nth(1).boundingBox();
    await handle.press(secondCard!.x > firstCard!.x + 20 ? 'ArrowRight' : 'ArrowDown');
    await expect(
      page.getByText(pl ? 'Nad: Battle' : 'Over: Battle', { exact: true }),
    ).toHaveCount(1);
    await handle.press('Space');
    await expect(page.locator('main li').first()).toContainText('Battle');
    await page
      .getByRole('button', { name: `${pl ? 'Edytuj' : 'Edit'} Rain`, exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('textbox', { name: pl ? 'Nazwa' : 'Name', exact: true })
      .fill('Rain after the battle');
    await dialog
      .getByRole('button', { name: pl ? 'Zapisz' : 'Save', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Rain after the battle', exact: true }),
    ).toBeVisible();
    const tool = pl ? 'Panel dźwięków' : 'Soundboard';
    await page.goto(`${root}/data`);
    const download = page.waitForEvent('download');
    await page
      .getByRole('button', {
        name: pl ? `${tool}: pobierz kopię` : `${tool}: download a backup`,
        exact: true,
      })
      .click();
    const file = await download;
    const path = await file.path();
    expect(file.suggestedFilename()).toBe('fumble-soundboard.json');
    await page.goto(`${root}/dm/soundboard`);
    await page
      .getByText(pl ? 'Porządkowanie biblioteki' : 'Library cleanup', { exact: true })
      .click();
    await page
      .getByRole('button', {
        name: pl ? 'Wyczyść panel' : 'Clear soundboard',
        exact: true,
      })
      .click();
    await expect(
      page
        .getByRole('alertdialog')
        .getByRole('button', { name: pl ? 'Anuluj' : 'Cancel', exact: true }),
    ).toBeFocused();
    await page
      .getByRole('alertdialog')
      .getByRole('button', {
        name: pl ? 'Wyczyść panel' : 'Clear soundboard',
        exact: true,
      })
      .click();
    await expect(
      page.getByRole('button', { name: 'Rain after the battle', exact: true }),
    ).toHaveCount(0);
    await page.goto(`${root}/data`);
    await chooseToolBackup(
      page,
      pl ? `${tool}: przywróć z pliku` : `${tool}: restore from a file`,
      path!,
    );
    const preview = page.getByRole('group', {
      name: pl ? `Sprawdź kopię: ${tool}` : `Check the backup: ${tool}`,
    });
    await expect(preview).toContainText(path!.split(/[\\/]/).pop()!);
    const restore = pl ? 'Zastąp i przywróć' : 'Replace and restore';
    await preview.getByRole('button', { name: restore, exact: true }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: restore, exact: true })
      .click();
    await expect(
      page.getByText(pl ? `Przywrócono: ${tool}.` : `Restored: ${tool}.`),
    ).toBeVisible();
    await page.goto(`${root}/dm/soundboard`);
    await expect(
      page.getByRole('button', { name: 'Rain after the battle', exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem('fumble-audit-preserved')),
    ).toBe('keep');
    await page.getByRole('searchbox').fill('not found');
    await expect(
      page.getByText(
        pl
          ? 'Brak pasujących utworów. Zmień lub wyczyść wyszukiwanie.'
          : 'No matching tracks. Change or clear the search.',
      ),
    ).toBeVisible();
  });
  test(`soundboard ${locale} reflows at 320px and protects unreadable data`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.addInitScript(() => localStorage.setItem('fumble-soundboard', '{broken'));
    await page.goto(`${root}/dm/soundboard`);
    await expect(page.getByRole('searchbox')).toHaveCount(0);
    await page
      .getByText(pl ? 'Porządkowanie biblioteki' : 'Library cleanup', { exact: true })
      .click();
    expect(await page.evaluate(() => localStorage.getItem('fumble-soundboard'))).toBe(
      '{broken',
    );
    await page
      .getByRole('button', {
        name: pl ? 'Wyczyść panel' : 'Clear soundboard',
        exact: true,
      })
      .click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', {
        name: pl ? 'Wyczyść panel' : 'Clear soundboard',
        exact: true,
      })
      .click();
    await page
      .getByRole('button', {
        name: pl ? 'Dodaj utwór lub playlistę' : 'Add a track or playlist',
        exact: true,
      })
      .click();
    const name = page.getByRole('textbox', { name: pl ? 'Nazwa' : 'Name', exact: true });
    const bounds = await name.boundingBox();
    expect(bounds!.width).toBeGreaterThan(200);
    await name.fill(
      'A long private soundtrack name for a forest and a village after midnight',
    );
    await page
      .getByRole('textbox', {
        name: pl ? 'Link do YouTube' : 'YouTube link',
        exact: true,
      })
      .fill('https://youtube.com/playlist?list=PL1234567890');
    await page.getByRole('button', { name: pl ? 'Dodaj' : 'Add', exact: true }).click();
    await expect(
      page.getByRole('button', {
        name: 'A long private soundtrack name for a forest and a village after midnight',
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    expect(new URL(page.url()).searchParams.has('q')).toBe(false);
  });
}
