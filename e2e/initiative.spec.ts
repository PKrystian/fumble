import { readFile } from 'node:fs/promises';
import { chooseToolBackup, expect, test } from './fixtures';

const key = 'fumble-initiative';
const combatant = (id: string, name: string, initiative: number) => ({
  id,
  name,
  initiative,
  ac: null,
  hpCurrent: 5,
  hpMax: 10,
  conditions: '',
  isPlayer: false,
});

for (const pl of [false, true]) {
  test(
    'initiative queue and keyboard at 320px ' + (pl ? 'PL' : 'EN'),
    async ({ page }) => {
      const labels = {
        title: pl ? 'Inicjatywa' : 'Initiative',
        find: pl ? 'Znajdź uczestnika' : 'Find participant',
        jump: pl ? 'Przejdź do aktywnego uczestnika' : 'Go to active participant',
        move: pl ? 'Przesuń wyżej w remisie: Żółw' : 'Move Żółw up within the tie',
        remove: pl ? 'Usuń Mira' : 'Remove Mira',
        cancel: pl ? 'Anuluj' : 'Cancel',
        delete: pl ? 'Usuń' : 'Delete',
        undo: pl ? 'Cofnij usunięcie' : 'Undo removal',
      };
      const name = 'BardzoDługaNazwa'.repeat(14);
      const combatants = [
        combatant('mira', 'Mira', 18),
        combatant('zolw', 'Żółw', 18),
        ...Array.from({ length: 118 }, (_, i) =>
          combatant(String(i), i === 117 ? name : 'Goblin ' + i, 10 - i),
        ),
      ];
      await page.setViewportSize({ width: 320, height: 780 });
      await page.addInitScript(
        ({ key, combatants }) => {
          if (localStorage.getItem(key) === null)
            localStorage.setItem(
              key,
              JSON.stringify({
                version: 2,
                state: { combatants, round: 3, turnId: 'mira' },
              }),
            );
        },
        { key, combatants },
      );
      await page.goto((pl ? '/pl' : '') + '/dm/initiative/');
      const main = page.getByRole('main');
      await expect(
        main.getByRole('heading', { name: labels.title, exact: true }),
      ).toBeVisible();
      expect(
        await main.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
      ).toBe(true);
      const ordered = main.getByRole('listitem');
      await expect(ordered).toHaveCount(120);
      await expect(ordered.first()).toHaveAttribute('aria-current', 'step');
      await main.getByRole('button', { name: labels.move }).press('Enter');
      await expect(ordered.first().getByRole('heading')).toHaveText('Żółw');
      await expect(ordered.nth(1)).toHaveAttribute('aria-current', 'step');

      await main.getByRole('button', { name: labels.find }).press('Enter');
      const search = page.getByRole('dialog').getByRole('searchbox');
      await expect(search).toBeFocused();
      await search.fill('bardzodluganazwa');
      await page
        .getByRole('dialog')
        .getByRole('button', { name: '120. ' + name })
        .press('Enter');
      await expect(ordered.last().getByRole('heading')).toBeFocused();
      const jump = main.getByRole('button', { name: labels.jump });
      await expect(jump).toBeInViewport();
      await jump.press('Enter');
      await expect(ordered.nth(1).getByRole('heading')).toBeFocused();
      await expect(ordered.nth(1)).toHaveAttribute('aria-current', 'step');

      await main.getByRole('button', { name: labels.remove }).click();
      const confirm = page.getByRole('alertdialog');
      await expect(confirm.getByRole('button', { name: labels.cancel })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(main.getByRole('button', { name: labels.remove })).toBeFocused();
      await main.getByRole('button', { name: labels.remove }).click();
      await confirm.getByRole('button', { name: labels.delete, exact: true }).click();
      await expect(ordered.nth(1)).toHaveAttribute('aria-current', 'step');
      await expect(ordered.nth(1).getByRole('heading')).toHaveText('Goblin 0');
      await main.getByRole('button', { name: labels.undo }).click();
      await expect(ordered).toHaveCount(120);
      await expect(ordered.nth(1)).toHaveAttribute('aria-current', 'step');
      await page.reload();
      await expect(ordered.first().getByRole('heading')).toHaveText('Żółw');
      await expect(ordered.nth(1)).toHaveAttribute('aria-current', 'step');
    },
  );
}

test('initiative backups recover from a quota failure, conflict, and an unreadable original', async ({
  page,
  context,
}) => {
  const save = (name: string) =>
    JSON.stringify({
      state: { combatants: [combatant('ally', name, 18)], round: 4, turnId: 'ally' },
      version: 1,
    });
  await page.addInitScript(
    ({ key, raw }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, raw);
      localStorage.setItem('fumble-test-preserved', '"other data"');
    },
    { key, raw: save('Mira') },
  );
  await page.goto('/dm/initiative/');
  const raw = () => page.evaluate((key) => localStorage.getItem(key), key);
  const download = async (name: string) => {
    const event = page.waitForEvent('download');
    await page.getByRole('button', { name, exact: true }).click();
    return readFile((await (await event).path())!);
  };

  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    let failed = false;
    Storage.prototype.setItem = function (name, value) {
      if (name === key && !failed) {
        failed = true;
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      }
      return original.call(this, name, value);
    };
  }, key);
  const hp = page.getByRole('textbox', { name: 'HP for Mira' });
  await hp.fill('6');
  await hp.press('Enter');
  await expect(page.getByRole('alert')).toContainText('could not be saved');
  expect(await raw()).toBe(save('Mira'));
  const pending = await download('Download initiative backup');
  expect(JSON.parse(pending.toString()).initiative.state.combatants[0].hpCurrent).toBe(6);

  await page.getByRole('link', { name: 'Data Backup', exact: true }).last().click();
  const full = JSON.parse((await download('Download backup')).toString());
  expect(JSON.parse(full.data[key]).state.combatants[0].hpCurrent).toBe(6);
  await page.goBack();
  await page.getByRole('button', { name: 'Retry save' }).click();
  expect(JSON.parse((await raw())!).state.combatants[0].hpCurrent).toBe(6);

  const other = await context.newPage();
  await other.goto('/dm/initiative/');
  await other.getByRole('textbox', { name: 'HP for Mira' }).fill('9');
  await other.getByRole('textbox', { name: 'HP for Mira' }).press('Enter');
  await expect(page.getByRole('alert')).toContainText('Another tab changed');
  await expect(hp).toBeDisabled();
  await page.getByRole('button', { name: 'Load saved initiative' }).click();
  await expect(hp).toHaveValue('9');

  await other.evaluate((key) => localStorage.setItem(key, '{broken'), key);
  await expect(page.getByRole('alert')).toContainText('cannot be read');
  await expect(page.getByRole('button', { name: 'Next turn' })).toBeDisabled();
  expect((await download('Download original initiative data')).toString()).toBe(
    '{broken',
  );

  await page.getByRole('button', { name: 'Replace saved initiative' }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  expect(await raw()).toBe('{broken');
  await page.getByRole('button', { name: 'Replace saved initiative' }).click();
  await confirm.getByRole('button', { name: 'Replace saved initiative' }).click();
  await expect(hp).toBeEnabled();

  await page.goto('/data/');
  const restoreTool = 'Initiative: restore from a file';
  await chooseToolBackup(page, restoreTool, {
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{'),
  });
  await expect(page.getByRole('alert')).toContainText('not a valid backup');
  const stored = await raw();
  await chooseToolBackup(page, restoreTool, {
    name: 'initiative.json',
    mimeType: 'application/json',
    buffer: pending,
  });
  const preview = page.getByRole('group', { name: 'Check the backup: Initiative' });
  await expect(preview.getByRole('heading')).toBeFocused();
  await expect(preview.getByText('Mira', { exact: true })).toBeVisible();
  expect(await raw()).toBe(stored);
  await preview.getByRole('button', { name: 'Replace and restore' }).click();
  await confirm.getByRole('button', { name: 'Replace and restore' }).click();
  await expect(page.getByText('Restored: Initiative.')).toBeVisible();
  expect(JSON.parse((await raw())!).state).toMatchObject({ round: 4, turnId: 'ally' });
  expect(await page.evaluate(() => localStorage.getItem('fumble-test-preserved'))).toBe(
    '"other data"',
  );
  await page.goto('/dm/initiative/');
  await expect(page.getByRole('textbox', { name: 'HP for Mira' })).toHaveValue('6');
  await other.close();
});

test('Bestiary previews missing stats and protects an unreadable initiative', async ({
  page,
}) => {
  await page.route('https://5e.tools/**', (route) => route.abort());
  await page.addInitScript((key) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, '{broken');
  }, key);
  await page.goto('/compendium/bestiary/elzerina-cassalanter/');
  const trigger = page.getByRole('button', { name: 'Add this creature to initiative' });
  await trigger.click();
  const preview = page.getByRole('dialog');
  await expect(preview.getByRole('textbox', { name: 'Current HP' })).toHaveValue('');
  await expect(preview.getByRole('textbox', { name: 'AC' })).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await preview.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(preview.getByRole('alert')).toContainText(
    'Initiative data needs attention',
  );
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe('{broken');
  await preview.getByRole('link', { name: 'Initiative', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Initiative', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start combat' })).toBeDisabled();
});
