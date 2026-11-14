import { readFile } from 'node:fs/promises';
import { createCharacter } from '../src/features/character/model';
import { expect, test } from './fixtures';

const original = {
  'fumble-custom-rolls': JSON.stringify({
    state: { customRolls: [{ id: 'roll', name: 'Attack', expression: '1d20+3' }] },
    version: 0,
  }),
};
const hero = createCharacter('Mira');
const incoming = {
  'fumble-characters': JSON.stringify({
    state: { characters: { [hero.id]: hero }, order: [hero.id] },
    version: 2,
  }),
  'fumble-sessions': JSON.stringify({
    state: {
      sessions: [
        {
          id: 'session',
          title: 'Into the forest',
          createdAt: 1,
          durationMs: 10,
          notes: 'Meet the ranger',
          entries: [],
        },
      ],
      transcriptionLang: 'english',
    },
    version: 3,
  }),
  'fumble-homebrew': JSON.stringify({
    state: {
      entries: [
        {
          kind: 'manual',
          id: 'homebrew',
          category: 'spells',
          name: 'Moonlight',
          subtitle: '',
          body: 'A soft glow.',
          createdAt: 1,
        },
      ],
    },
    version: 4,
  }),
};
const makeBackup = (data: Record<string, string>) =>
  JSON.stringify({
    app: 'fumble',
    version: 1,
    exportedAt: '2026-11-07T12:00:00.000Z',
    data,
  });

for (const locale of ['', '/pl']) {
  const pl = Boolean(locale);
  const labels = {
    download: pl ? 'Pobierz kopię' : 'Download backup',
    choose: pl ? 'Wybierz plik kopii' : 'Choose backup file',
    preview: pl ? 'Sprawdź kopię' : 'Check the backup',
    restore: pl ? 'Zastąp dane i przywróć' : 'Replace data and restore',
    safety: pl ? 'Najpierw pobierz obecne dane' : 'Download current data first',
    cancel: pl ? 'Anuluj' : 'Cancel',
  };

  test(`backup preview, safety download, confirmation and restore: ${locale || '/en'}`, async ({
    page,
  }) => {
    await page.addInitScript((data) => {
      if (!sessionStorage.getItem('backup-test-seeded')) {
        for (const [key, value] of Object.entries(data)) localStorage.setItem(key, value);
        localStorage.setItem('unrelated-app', 'keep');
        sessionStorage.setItem('backup-test-seeded', 'yes');
      }
    }, original);
    await page.goto(`${locale}/data/`);
    const exportButton = page.getByRole('button', { name: labels.download, exact: true });
    await exportButton.focus();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: labels.choose, exact: true }),
    ).toBeFocused();
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: 'campaign-backup.json',
        mimeType: 'application/json',
        buffer: Buffer.from(makeBackup(incoming)),
      });
    const preview = page.getByRole('region', { name: labels.preview });
    await expect(preview.getByRole('heading')).toBeFocused();
    await expect(preview.getByText('campaign-backup.json')).toBeVisible();
    await expect(
      preview.getByText(pl ? 'Postacie' : 'Characters', { exact: true }).locator('..'),
    ).toHaveText(pl ? 'Postacie1' : 'Characters1');
    expect(await page.evaluate(() => localStorage.getItem('fumble-custom-rolls'))).toBe(
      original['fumble-custom-rolls'],
    );
    const downloadPromise = page.waitForEvent('download');
    await preview.getByRole('button', { name: labels.safety }).click();
    const download = await downloadPromise;
    const file = JSON.parse(await readFile((await download.path())!, 'utf8')) as {
      data: Record<string, string>;
    };
    expect(file.data['fumble-custom-rolls']).toBe(original['fumble-custom-rolls']);
    expect(file.data['unrelated-app']).toBeUndefined();
    await preview.getByRole('button', { name: labels.restore }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('campaign-backup.json');
    await dialog.getByRole('button', { name: labels.cancel, exact: true }).click();
    await expect(preview.getByRole('button', { name: labels.restore })).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('fumble-custom-rolls'))).toBe(
      original['fumble-custom-rolls'],
    );
    await preview.getByRole('button', { name: labels.restore }).click();
    await Promise.all([
      page.waitForEvent('load'),
      dialog.getByRole('button', { name: labels.restore, exact: true }).click(),
    ]);
    expect(await page.evaluate(() => localStorage.getItem('fumble-characters'))).toBe(
      incoming['fumble-characters'],
    );
    expect(
      await page.evaluate(() => localStorage.getItem('fumble-custom-rolls')),
    ).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('unrelated-app'))).toBe('keep');
    await page.goto(`${locale}/character/`);
    await expect(page.getByText('Mira', { exact: true })).toBeVisible();
    await page.goto(`${locale}/session-log/`);
    await expect(
      page.getByRole('textbox', {
        name: pl ? 'Tytuł sesji' : 'Session title',
        exact: true,
      }),
    ).toHaveValue('Into the forest');
    await expect(
      page.getByRole('textbox', {
        name: pl ? 'Notatki z sesji' : 'Session notes',
        exact: true,
      }),
    ).toHaveValue('Meet the ranger');
  });

  test(`backup empty acknowledgement, errors and narrow preview: ${locale || '/en'}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`${locale}/data/`);
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles({
      name: 'damaged.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        makeBackup({ 'fumble-characters': '{"state":{"characters":null},"version":2}' }),
      ),
    });
    await expect(page.getByRole('alert')).toContainText(
      pl ? 'nieprawidłowe dane' : 'invalid Fumble data',
    );
    await input.setInputFiles({
      name: 'newer.json',
      mimeType: 'application/json',
      buffer: Buffer.from(makeBackup({}).replace('"version":1', '"version":99')),
    });
    await expect(page.getByRole('alert')).toContainText(
      pl ? 'nieobsługiwanej wersji' : 'unsupported version',
    );
    await input.setInputFiles({
      name: 'empty-campaign-backup-with-a-very-long-filename-that-needs-to-wrap-on-a-phone.json',
      mimeType: 'application/json',
      buffer: Buffer.from(makeBackup({})),
    });
    const preview = page.getByRole('region', { name: labels.preview });
    await expect(preview.getByRole('button', { name: labels.restore })).toBeDisabled();
    await preview.getByRole('checkbox').check();
    await expect(preview.getByRole('button', { name: labels.restore })).toBeEnabled();
    const dimensions = await page
      .locator('main')
      .evaluate((main) => ({ width: main.clientWidth, content: main.scrollWidth }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.width + 1);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addStyleTag({ content: 'html { zoom: 2; }' });
    const zoomed = await page
      .locator('main')
      .evaluate((main) => ({ width: main.clientWidth, content: main.scrollWidth }));
    expect(zoomed.content).toBeLessThanOrEqual(zoomed.width + 1);
    await preview.getByRole('button', { name: labels.restore }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText(pl ? 'jest pusty' : 'is empty');
    const dialogDimensions = await dialog
      .locator('.dialog-panel')
      .evaluate((panel) => ({ width: panel.clientWidth, content: panel.scrollWidth }));
    expect(dialogDimensions.content).toBeLessThanOrEqual(dialogDimensions.width + 1);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(preview.getByRole('button', { name: labels.restore })).toBeFocused();
    await preview.getByRole('button', { name: labels.cancel, exact: true }).click();
    await expect(
      page.getByRole('button', { name: labels.choose, exact: true }),
    ).toBeFocused();
  });
}
