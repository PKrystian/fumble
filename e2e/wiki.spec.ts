import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function catalog(page: Page, label: string) {
  const button = page.getByRole('button', { name: label, exact: true });
  if ((page.viewportSize()?.width ?? 1280) < 1280) {
    await button.click();
    return page.getByRole('dialog', { name: label });
  }
  return page.locator('main aside').filter({ has: page.getByRole('searchbox') });
}

for (const locale of ['pl', 'en'] as const) {
  test(`wiki browsing and article navigation ${locale}`, async ({ page }) => {
    const prefix = locale === 'pl' ? '/pl' : '';
    const label = locale === 'pl' ? 'Wszystkie strony' : 'All pages';
    await page.goto(`${prefix}/wiki/`);
    await expect(
      page.getByRole('heading', {
        name: locale === 'pl' ? 'Wybierz kampanię' : 'Choose a campaign',
      }),
    ).toBeVisible();
    const tomb = page.locator('main a').filter({ hasText: 'Grobowiec Zagłady' });
    await expect(tomb).toContainText(locale === 'pl' ? '0 stron wiki' : '0 wiki pages');
    await tomb.click();
    await expect(
      page.getByRole('heading', { name: 'Grobowiec Zagłady', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', {
        name: locale === 'pl' ? 'Mapa Chult' : 'Chult map',
        exact: true,
      }),
    ).toBeVisible();
    await page.goto(`${prefix}/wiki/glod-smoka/`);
    await expect(
      page.getByRole('heading', { name: 'Głód Smoka', level: 1 }),
    ).toBeVisible();
    if (locale === 'en')
      await expect(
        page.getByText('Campaign content is available in Polish.'),
      ).toBeVisible();
    let panel = await catalog(page, label);
    await panel.getByRole('searchbox').fill('  SLONCE  ');
    await panel.getByRole('combobox').selectOption({ label: 'Postacie' });
    await expect(panel.getByRole('status')).not.toContainText(
      locale === 'pl' ? 'Wyniki: 0,' : '0 results,',
    );
    const first = panel.locator('nav a').first();
    await first.click();
    await expect(page).toHaveURL(/q=/);
    await expect(page).toHaveURL(/category=Postacie/);
    await page.reload();
    panel = await catalog(page, label);
    await expect(panel.getByRole('searchbox')).toHaveValue('  SLONCE  ');
    await panel.getByRole('searchbox').fill('nieistniejacehaslo123');
    await expect(panel.getByRole('status')).toContainText(
      locale === 'pl' ? 'Wyniki: 0,' : '0 results,',
    );
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape');
    await page.goto(`${prefix}/wiki/glod-smoka/sesja-1-zew-slonca/`);
    const contents = page.locator('article details');
    await contents.locator('summary').click();
    await contents.getByRole('link', { name: 'Pytania na następną sesję' }).click();
    await expect(page).toHaveURL(/#wiki-section-/);
    await expect(
      page.locator('article h2').filter({ hasText: 'Pytania na następną sesję' }),
    ).toBeInViewport();
    const link = page.locator('article a[data-wiki-link]').first();
    await expect(link).toHaveAttribute('href', new RegExp(`^${prefix}/wiki/`));
    await page.setViewportSize({ width: 320, height: 750 });
    await page.goto(`${prefix}/wiki/glod-smoka/`);
    const trigger = page.getByRole('button', { name: label, exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(
      page.getByRole('heading', { name: 'Głód Smoka', level: 1 }),
    ).toBeVisible();
    expect(
      await page
        .locator('main')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
  });
}

test('map drafts persist, export, and require confirmation before reset', async ({
  page,
}) => {
  await page.goto('/pl/wiki/grobowiec-zaglady/map/');
  await page.getByRole('button', { name: 'Edytuj odkryte heksy' }).click();
  const viewport = page.getByRole('region', { name: 'Mapa Chult z siatką heksów' });
  expect(await viewport.locator('[data-hex][tabindex="0"]').count()).toBe(1);
  await page.getByRole('spinbutton', { name: 'Numer heksu' }).fill('29');
  await page.getByRole('button', { name: 'Przejdź do heksu' }).click();
  const hex = viewport.locator('[data-hex="29"]');
  const original = await hex.getAttribute('aria-pressed');
  await page.keyboard.press('Enter');
  await expect(hex).toHaveAttribute(
    'aria-pressed',
    original === 'true' ? 'false' : 'true',
  );
  await expect(page.getByText('Szkic zapisany w tej przeglądarce.')).toBeVisible();
  const saved = await page.evaluate(() =>
    localStorage.getItem('fumble-campaign-map-editor:grobowiec-zaglady'),
  );
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Pobierz aktualny szkic' }).click();
  expect((await event).suggestedFilename()).toBe('grobowiec-zaglady-revealed-ranges.txt');
  await page.reload();
  await page.getByRole('button', { name: 'Edytuj odkryte heksy' }).click();
  expect(
    await page.evaluate(() =>
      localStorage.getItem('fumble-campaign-map-editor:grobowiec-zaglady'),
    ),
  ).toBe(saved);
  await page.getByRole('button', { name: 'Usuń lokalne zmiany' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('button', { name: 'Anuluj' })).toBeFocused();
  await page.keyboard.press('Escape');
  expect(
    await page.evaluate(() =>
      localStorage.getItem('fumble-campaign-map-editor:grobowiec-zaglady'),
    ),
  ).toBe(saved);
  await page.getByRole('button', { name: 'Usuń lokalne zmiany' }).click();
  await dialog.getByRole('button', { name: 'Usuń lokalne zmiany' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem('fumble-campaign-map-editor:grobowiec-zaglady'),
      ),
    )
    .toBeNull();
});

test('an unsaved map draft blocks navigation until it is saved or explicitly discarded', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('fumble-campaign-map-editor:'))
        throw new DOMException('full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
    window.addEventListener('test-enable-storage', () => {
      Storage.prototype.setItem = original;
    });
  });
  await page.goto('/pl/wiki/grobowiec-zaglady/map/');
  await page.getByRole('button', { name: 'Edytuj odkryte heksy' }).click();
  await page.getByRole('button', { name: 'Przejdź do heksu' }).click();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Nie udało się zapisać aktualnego szkicu/)).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem('fumble-campaign-map-editor:grobowiec-zaglady'),
    ),
  ).toBeNull();
  await page.getByRole('link', { name: 'Wróć do kampanii' }).click();
  const dialog = page.getByRole('dialog', { name: 'Opuścić niezapisany szkic mapy?' });
  await expect(
    dialog.getByRole('button', { name: 'Zostań na tej stronie' }),
  ).toBeFocused();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Pobierz aktualny szkic' }).click();
  expect((await download).suggestedFilename()).toBe(
    'grobowiec-zaglady-revealed-ranges.txt',
  );
  await page.evaluate(() => window.dispatchEvent(new Event('test-enable-storage')));
  await dialog.getByRole('button', { name: 'Ponów zapis szkicu' }).click();
  await expect(page).toHaveURL(/\/pl\/wiki\/grobowiec-zaglady\/$/);
  expect(
    await page.evaluate(() =>
      localStorage.getItem('fumble-campaign-map-editor:grobowiec-zaglady'),
    ),
  ).not.toBeNull();
});
