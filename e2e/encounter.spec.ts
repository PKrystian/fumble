import { readFile } from 'node:fs/promises';
import { chooseToolBackup, expect, test } from './fixtures';

for (const locale of ['', '/pl']) {
  const pl = Boolean(locale);
  const route = locale + '/dm/encounter/';
  const labels = {
    draft: pl ? 'Robocze starcie' : 'Current draft',
    level: pl ? 'Poziom' : 'Level',
    save: pl ? 'Zapisz starcie' : 'Save encounter',
    name: pl ? 'Nazwa starcia' : 'Encounter name',
    library: pl ? 'Zapisane starcia (0)' : 'Saved encounters (0)',
    duplicate: pl ? 'Powiel: Las' : 'Duplicate Las',
    creature: pl ? 'Zjawa' : 'Wight',
    transfer: pl ? 'Dodaj do Inicjatywy' : 'Add to Initiative',
    submit: pl ? 'Dodaj uczestników (2)' : 'Add combatants (2)',
    more: pl ? 'Więcej: Zjawa' : 'More Wight',
    openInitiative: pl ? 'Otwórz Inicjatywę' : 'Open Initiative',
    add: pl ? 'Zjawa - dodaj do starcia' : 'Wight - add to encounter',
  };
  test(
    'encounter draft, named copy and initiative transfer ' + (locale || 'en'),
    async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 780 });
      await page.addInitScript(() => {
        if (sessionStorage.getItem('encounter-seeded')) return;
        localStorage.setItem(
          'fumble-initiative',
          JSON.stringify({
            version: 1,
            state: {
              round: 3,
              turnId: 'ally',
              combatants: [
                {
                  id: 'ally',
                  name: 'Mira',
                  initiative: 18,
                  ac: 15,
                  hpCurrent: 12,
                  hpMax: 20,
                  conditions: '',
                  isPlayer: true,
                },
              ],
            },
          }),
        );
        sessionStorage.setItem('encounter-seeded', '1');
      });
      await page.goto(route + '?monster=wight');
      const level = page.getByRole('spinbutton', { name: labels.level });
      await level.fill('1.5');
      await expect(level).toHaveAttribute('aria-invalid', 'true');
      await level.fill('5');
      await page.getByRole('button', { name: labels.add, exact: true }).click();
      await expect(page.getByRole('searchbox')).toBeFocused();
      await page.getByRole('button', { name: labels.more, exact: true }).click();
      await page.getByText(labels.library, { exact: true }).click();
      await page.getByRole('textbox', { name: labels.name }).fill('Las');
      await page.getByRole('button', { name: labels.save, exact: true }).click();
      await page.getByRole('button', { name: labels.duplicate, exact: true }).click();
      await page.reload();
      await expect(level).toHaveValue('5');
      await expect(
        page.getByRole('link', { name: labels.creature, exact: true }),
      ).toBeVisible();

      const dimensions = await page.locator('main').evaluate((main) => ({
        width: main.clientWidth,
        content: main.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.width + 1);

      const transfer = page.getByRole('button', { name: labels.transfer, exact: true });
      await transfer.click();
      const dialog = page.getByRole('dialog', { name: labels.transfer });
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(transfer).toBeFocused();
      await transfer.click();
      await dialog.getByRole('button', { name: labels.submit }).click();
      await expect(dialog).not.toBeVisible();
      const data = await page.evaluate(
        () => JSON.parse(localStorage.getItem('fumble-initiative')!).state,
      );
      expect(data).toMatchObject({ round: 3, turnId: 'ally' });
      expect(data.combatants.map((row: { name: string }) => row.name)).toEqual([
        'Mira',
        labels.creature + ' 1',
        labels.creature + ' 2',
      ]);
      await page.getByRole('link', { name: labels.openInitiative }).click();
      await expect(page.getByText(labels.creature + ' 2', { exact: true })).toBeVisible();
      await page.goto(route);
      await expect(
        page.getByRole('link', { name: labels.creature, exact: true }),
      ).toBeVisible();
    },
  );
}

test('encounter scoped and full backup restore', async ({ page }) => {
  await page.goto('/dm/encounter/?monster=wight');
  await page.getByRole('button', { name: 'Wight - add to encounter' }).click();
  await expect(
    page.getByRole('button', { name: 'Download encounter backup' }),
  ).toHaveCount(0);
  await page.goto('/data/');
  const downloading = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Encounter Builder: download a backup' })
    .click();
  const download = await downloading;
  const contents = await readFile((await download.path())!);
  await page.evaluate(() =>
    localStorage.setItem(
      'fumble-initiative',
      '{"state":{"combatants":[],"round":0,"turnId":null},"version":1}',
    ),
  );
  await page.goto('/dm/encounter/');
  await page.getByRole('button', { name: 'Remove Wight', exact: true }).click();
  await page.goto('/data/');
  const restoreTool = 'Encounter Builder: restore from a file';
  await chooseToolBackup(page, restoreTool, {
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{'),
  });
  await expect(page.getByRole('alert')).toContainText('not a valid backup');
  await chooseToolBackup(page, restoreTool, {
    name: 'valid.json',
    mimeType: 'application/json',
    buffer: contents,
  });
  const scoped = page.getByRole('group', { name: 'Check the backup: Encounter Builder' });
  await expect(scoped.getByRole('heading')).toBeFocused();
  await expect(scoped.getByText('valid.json')).toBeVisible();
  const restore = scoped.getByRole('button', { name: 'Replace and restore' });
  await restore.click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await restore.click();
  await dialog.getByRole('button', { name: 'Replace and restore' }).click();
  await expect(page.getByText('Restored: Encounter Builder.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('fumble-initiative'))).toBe(
    '{"state":{"combatants":[],"round":0,"turnId":null},"version":1}',
  );
  await page.goto('/dm/encounter/');
  await expect(page.getByRole('link', { name: 'Wight', exact: true })).toBeVisible();
  await page.goto('/data/');
  await expect(page.getByText('Encounter draft', { exact: true })).toBeVisible();
  const full = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup', exact: true }).click();
  const fullContents = JSON.parse(await readFile((await (await full).path())!, 'utf8'));
  expect(
    JSON.parse(fullContents.data['fumble-encounter']).state.draft.monsters[0].id,
  ).toBe('wight');
  await page.goto('/dm/encounter/');
  await page.getByRole('button', { name: 'Remove Wight', exact: true }).click();
  await page.goto('/data/');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'full.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(fullContents)),
    });
  const preview = page.getByRole('region', { name: 'Check the backup' });
  await preview.getByRole('button', { name: 'Replace data and restore' }).click();
  await Promise.all([
    page.waitForEvent('load'),
    dialog.getByRole('button', { name: 'Replace data and restore' }).click(),
  ]);
  await page.goto('/dm/encounter/');
  await expect(page.getByRole('link', { name: 'Wight', exact: true })).toBeVisible();
});

test('encounter retries a failed Bestiary load without losing its party', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'Worker', { value: undefined }),
  );
  let unavailable = true;
  await page.route(
    (url) => url.pathname.endsWith('/generated/bestiary.json'),
    (route) => {
      if (unavailable && route.request().resourceType() === 'fetch') {
        return route.fulfill({ status: 503, body: '' });
      }
      return route.continue();
    },
  );
  await page.goto('/dm/encounter/?monster=wight');
  await expect(page.getByRole('alert')).toContainText('The Bestiary could not load');
  const level = page.getByRole('spinbutton', { name: 'Level' });
  await level.fill('5');
  unavailable = false;
  await page.getByRole('button', { name: 'Retry Bestiary' }).click();
  await expect(
    page.getByRole('button', { name: 'Wight - add to encounter' }),
  ).toBeVisible();
  await expect(level).toHaveValue('5');
});
