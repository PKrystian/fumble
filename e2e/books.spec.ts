import { expect, test } from './fixtures';

test.beforeEach(async ({ context }) => {
  await context.route('https://5e.tools/**', (route) => route.abort());
});

test('Polish catalog keeps search, filters and sort when returning from a book', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/pl/books/');
  await page.getByRole('searchbox', { name: 'Szukaj ksiąg' }).fill('Podrecznik Gracza');
  await page.getByLabel('Sortuj według').selectOption('newest');
  const filters = page.getByRole('button', { name: /Filtry \(/ });
  await filters.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: /Filtry \(/ });
  await dialog.getByRole('button', { name: 'Podręczniki', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(filters).toBeFocused();
  await expect(page.getByRole('status').filter({ hasText: 'Wyniki: 2' })).toBeVisible();
  await page.getByRole('link', { name: /Podręcznik Gracza \(2024\)/ }).click();
  await expect(page.locator('#book-content article')).toBeVisible();
  await page
    .locator('#book-content')
    .getByRole('link', { name: 'Wszystkie księgi' })
    .click();
  await expect(page.getByRole('searchbox', { name: 'Szukaj ksiąg' })).toHaveValue(
    'Podrecznik Gracza',
  );
  await expect(page.getByLabel('Sortuj według')).toHaveValue('newest');
  await expect(page).toHaveURL(/format=book/);
  await expect(page.locator('main')).toHaveJSProperty('scrollWidth', 320);
});

test('mobile contents focuses a stable section and saves it for a later visit', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/books/xphb/1/');
  const trigger = page.getByRole('button', { name: 'Table of contents' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Table of contents' });
  await expect(dialog.getByRole('link', { name: /Playing the Game/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('link', { name: 'Combat', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/#section=[a-z0-9]+$/i);
  const anchor = new URL(page.url()).hash;
  const heading = page.getByRole('heading', { name: 'Combat', exact: true });
  await expect(heading).toBeFocused();
  await expect
    .poll(async () => {
      const y = (await heading.boundingBox())?.y ?? -1;
      const bar = await trigger.boundingBox();
      return !!bar && y >= bar.y + bar.height;
    })
    .toBe(true);
  await page.goto('/pl/books/xphb/1/' + anchor);
  await expect(page.getByRole('heading', { name: 'Walka', exact: true })).toBeFocused();
  await page.goto('/books/');
  const resume = page.getByRole('link', { name: /Continue reading.*Player's Handbook/ });
  await expect(resume).toHaveAttribute('href', '/books/xphb/1/' + anchor);
});

test('reader keeps the English chapter available while retrying a Polish translation', async ({
  page,
}) => {
  let failed = true;
  await page.route('**/data/pl/book/xphb.json', (route) =>
    failed ? route.fulfill({ status: 503, body: 'offline' }) : route.continue(),
  );
  await page.goto('/pl/books/xphb/');
  const article = page.locator('#book-content article');
  await expect(article).toHaveAttribute('lang', 'en');
  await expect(page.getByText(/Wyświetlana jest wersja angielska/)).toBeVisible();
  failed = false;
  await page.getByRole('button', { name: 'Wczytaj polski tekst ponownie' }).click();
  await expect(article).toHaveAttribute('lang', 'pl');
  await expect(page.getByText(/Wyświetlana jest wersja angielska/)).toBeHidden();
});

test('whole-book mode shows chapters in batches and remembers view preferences', async ({
  page,
}) => {
  await page.goto('/books/xphb/5/');
  const rendered = page.locator('article [data-book-chapter]');
  await expect(rendered).toHaveCount(1);
  await page.getByRole('button', { name: 'Whole book' }).click();
  await expect(rendered).toHaveCount(3);
  await page.getByRole('button', { name: 'Load more chapters' }).click();
  await expect(rendered).toHaveCount(6);
  await page.getByRole('button', { name: 'Full width' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Whole book' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Full width' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(rendered).toHaveCount(3);
});

test('a Compendium source link reaches the spell index and explains its scope', async ({
  page,
}) => {
  await page.goto('/pl/compendium/spells/fireball/');
  await page.locator('main a[href*="/books/xphb"]').click();
  await expect(page).toHaveURL(/\/pl\/books\/xphb\/#page=274/);
  await expect(page.getByText(/Pełny wpis jest w Kompendium/)).toBeVisible();
  await expect(page.locator('article [data-entry-reference="fireball"]')).toBeFocused();
});

test('reading history can be exported, cleared and restored through Data backup', async ({
  page,
}) => {
  await page.goto('/books/xphb/2/');
  await expect(
    page.getByRole('heading', { name: 'Chapter 2: Creating a Character' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Full width' }).click();
  await page.goto('/data/');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup', exact: true }).click();
  const download = await downloading;
  const path = await download.path();
  expect(path).not.toBeNull();

  await page.goto('/books/');
  await page.getByRole('button', { name: 'Clear reading history' }).click();
  const clear = page.getByRole('alertdialog');
  await expect(clear.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await clear.getByRole('button', { name: 'Clear reading history' }).click();
  await expect(page.getByRole('link', { name: /Continue reading/ })).toHaveCount(0);

  await page.goto('/data/');
  await page.locator('input[type=file]').first().setInputFiles(path!);
  await expect(page.getByRole('heading', { name: 'Check the backup' })).toBeVisible();
  await expect(page.getByText('Saved reading positions', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Replace data and restore' }).click();
  const confirmation = page.getByRole('alertdialog');
  await expect(confirmation.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await Promise.all([
    page.waitForEvent('load'),
    confirmation.getByRole('button', { name: 'Replace data and restore' }).click(),
  ]);
  await page.goto('/books/');
  await page.getByRole('link', { name: /Continue reading.*Player's Handbook/ }).click();
  await expect(page).toHaveURL(/\/books\/xphb\/2\//);
  await expect(page.getByRole('button', { name: 'Full width' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
