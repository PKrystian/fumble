import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { chooseToolBackup, expect, test } from './fixtures';

const key = 'fumble-homebrew';
const imageUrl = 'https://homebrew-test.invalid/illustration.png';
const image =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==';

async function createEntry(page: Page, name: string) {
  await page.getByRole('button', { name: 'New entry' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  await dialog.getByRole('button', { name: 'Create entry' }).click();
  await expect(dialog).toHaveCount(0);
}

test('personal Homebrew reflows at 320 px, searches both languages and opens a subclass directly', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.addInitScript((key) => {
    if (localStorage.getItem(key)) return;
    const entries = Array.from({ length: 54 }, (_, index) => ({
      kind: 'manual',
      id: 'entry-' + index,
      name: 'Long record ' + index,
      category: 'items',
      subtitle: '',
      body: '',
      createdAt: index,
      ...(index === 0
        ? {
            translations: {
              pl: { name: 'Żółty dar ' + 'ą'.repeat(130), subtitle: '', body: '' },
            },
          }
        : {}),
    }));
    localStorage.setItem(key, JSON.stringify({ version: 4, state: { entries } }));
  }, key);
  await page.goto('/pl/homebrew/');
  const rows = page.locator('main section ul > li');
  await expect(rows).toHaveCount(50);
  const box = await page.getByRole('heading', { name: 'Twoje wpisy' }).boundingBox();
  expect(box?.y).toBeLessThan(600);
  await page.getByRole('button', { name: 'Następna' }).click();
  await expect(rows).toHaveCount(4);
  const search = page.getByRole('searchbox', { name: 'Szukaj wpisów...' });
  await search.fill('zolty DAR');
  await expect(rows).toHaveCount(1);
  await expect(page).not.toHaveURL(/page=/);
  await page.getByRole('button', { name: 'Filtry (0)' }).click();
  const filter = page.getByRole('combobox', { name: 'Filtruj według stanu tłumaczenia' });
  await filter.selectOption('untranslated');
  await expect(
    page.getByText('Żaden wpis nie pasuje do wybranych filtrów.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Zresetuj filtry' }).click();
  await expect(search).toHaveValue('zolty DAR');
  expect(
    await page.locator('main').evaluate((main) => main.scrollWidth),
  ).toBeLessThanOrEqual(321);
  await page.getByRole('button', { name: 'Wyczyść wyszukiwanie' }).last().click();

  await page.getByRole('button', { name: 'Nowy wpis' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Podklasa', exact: true }).click();
  await dialog.getByRole('combobox', { name: 'Szukaj klasy...' }).fill('wizard');
  await dialog.getByRole('option', { name: 'Czarodziej', exact: true }).first().click();
  await dialog.getByRole('textbox', { name: 'Nazwa podklasy' }).fill('Szkoła popiołu');
  await dialog.getByRole('textbox', { name: /^Cechy/ }).fill('Cecha testowa');
  await dialog.getByRole('button', { name: 'Stwórz podklasę' }).click();
  await expect(dialog).toHaveCount(0);
  await search.fill('szkola popiolu');
  const link = page.getByRole('link', { name: 'Szkoła popiołu', exact: true });
  const target = (await link.getAttribute('href'))!;
  await link.click();
  await expect(page.getByText('Cecha testowa', { exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.goto(target.replace(/^\/pl/, ''));
  await expect(page.getByText('Cecha testowa', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to Homebrew' }).click();
  await expect(
    page.getByRole('link', { name: 'Szkoła popiołu', exact: true }),
  ).toBeVisible();
});

test('Homebrew retains failed writes and prevents a second tab from overwriting a newer version', async ({
  page,
  context,
}) => {
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key && sessionStorage.getItem('test-quota'))
        throw new DOMException('Test quota', 'QuotaExceededError');
      original.call(this, name, value);
    };
  }, key);
  await page.goto('/homebrew/');
  const second = await context.newPage();
  try {
    await second.goto('/homebrew/');
    await expect(
      second.getByRole('heading', { name: 'Homebrew', exact: true }),
    ).toBeVisible();
    await page.evaluate(() => sessionStorage.setItem('test-quota', '1'));
    await createEntry(page, 'Unsaved draft');
    await expect(page.getByRole('alert')).toContainText('still in memory');
    await expect(page.getByText('Entry created.')).toHaveCount(0);
    expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBeNull();
    await page.evaluate(() => sessionStorage.removeItem('test-quota'));
    await page.getByRole('button', { name: 'Retry save' }).click();
    await expect(page.getByText('Homebrew saved in this browser.')).toBeVisible();
    await expect(second.getByRole('alert')).toContainText('changed in another tab');
    await expect(second.getByRole('button', { name: 'New entry' })).toBeDisabled();
    await second.getByRole('button', { name: 'Load stored version' }).click();
    await expect(second.getByRole('link', { name: 'Unsaved draft' })).toBeVisible();
    await createEntry(second, 'Second tab');
    await expect(page.getByRole('alert')).toContainText('changed in another tab');
  } finally {
    await second.close();
  }
});

test('Homebrew crops local art, restores the exported entry and defers a remote image', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  let remoteRequests = 0;
  await page.route(imageUrl, async (route) => {
    remoteRequests += 1;
    await route.fulfill({ contentType: 'image/png', body: Buffer.from(image, 'base64') });
  });
  await page.goto('/homebrew/');
  await page.getByRole('button', { name: 'New entry' }).click();
  const editor = page.getByRole('dialog', { name: 'New entry' });
  await editor
    .getByRole('textbox', { name: 'Name', exact: true })
    .fill('Illustrated entry');
  const file = editor.locator('input[accept="image/*"]');
  await file.setInputFiles({
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: Buffer.from('broken'),
  });
  const crop = page.getByRole('dialog', { name: 'Adjust artwork' });
  await expect(crop.getByRole('alert')).toContainText('could not be opened');
  await expect(crop.getByRole('button', { name: 'Choose another image' })).toBeVisible();
  const buffer = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 640;
    const context = canvas.getContext('2d')!;
    const gradient = context.createLinearGradient(0, 0, 480, 640);
    gradient.addColorStop(0, '#152663');
    gradient.addColorStop(1, '#f8a05f');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 480, 640);
    return canvas.toDataURL('image/png').split(',')[1]!;
  });
  await file.setInputFiles({
    name: 'illustration.png',
    mimeType: 'image/png',
    buffer: Buffer.from(buffer, 'base64'),
  });
  const zoom = crop.getByRole('slider');
  await zoom.focus();
  await zoom.press('End');
  const frame = crop.getByRole('group', { name: 'Image crop area' });
  await frame.focus();
  await frame.press('ArrowRight');
  await expect(frame.locator('img')).toHaveAttribute('style', /translate\(6px/);
  await crop.getByRole('button', { name: 'Save', exact: true }).click();
  await editor.getByRole('button', { name: 'Create entry' }).click();
  await expect(editor).toHaveCount(0);
  const entry = page.getByRole('link', { name: 'Illustrated entry' });
  const target = await entry.getAttribute('href');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const backup = await readFile((await (await download).path())!);
  await page.getByRole('button', { name: 'Delete Illustrated entry' }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(entry).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Restore Homebrew backup' })).toHaveCount(
    0,
  );
  await page.goto('/data/');
  await chooseToolBackup(page, 'Homebrew: restore from a file', {
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: backup,
  });
  const restore = page.getByRole('group', { name: 'Check the backup: Homebrew' });
  await expect(restore.getByRole('heading')).toBeFocused();
  await restore.getByRole('button', { name: 'Replace and restore' }).click();
  await confirm.getByRole('button', { name: 'Replace and restore' }).click();
  await expect(page.getByText('Restored: Homebrew.')).toBeVisible();
  await page.goto('/homebrew/');
  await expect(entry).toHaveAttribute('href', target!);

  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const importer = page.getByRole('dialog', { name: 'Import Homebrew' });
  await importer.getByRole('textbox').fill(
    JSON.stringify({
      entries: [
        {
          kind: 'manual',
          id: 'remote',
          category: 'items',
          name: 'Remote art',
          subtitle: '',
          body: '',
          image: imageUrl,
          createdAt: 1,
        },
      ],
    }),
  );
  await importer.getByRole('button', { name: 'Preview pasted JSON' }).click();
  await importer.getByRole('button', { name: 'Add entries' }).click();
  await page.getByRole('link', { name: 'Remote art' }).click();
  const show = page.getByRole('button', { name: 'Show external image' });
  await expect(show).toBeVisible();
  expect(remoteRequests).toBe(0);
  await show.click();
  await expect.poll(() => remoteRequests).toBe(1);
});
