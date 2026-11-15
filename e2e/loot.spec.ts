import { chooseToolBackup, test, expect } from './fixtures';
import { createCharacter } from '../src/features/character/model';
import { emptyLootData, LOOT_KEY, type LootData } from '../src/features/dm/lootData';
import type { Page } from '@playwright/test';

async function storedLoot(page: Page): Promise<LootData> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state, LOOT_KEY);
}

test('loot preserves canonical rewards through mode, tier, language and page changes', async ({
  page,
}) => {
  await page.goto('/pl/dm/loot/');
  const count = page.getByRole('spinbutton', { name: 'Postacie', exact: true });
  const level = page.getByRole('spinbutton', { name: 'Poziom', exact: true });
  await count.fill('-2');
  await level.fill('99');
  await expect(
    page.getByRole('button', { name: 'Duża nagroda', exact: true }),
  ).toBeDisabled();
  await count.fill('4');
  await level.fill('6');
  await page.getByRole('button', { name: 'Duża nagroda', exact: true }).click();
  const original = (await storedLoot(page)).history[0]!;
  await page.getByRole('button', { name: 'Drużyna', exact: true }).click();
  expect((await storedLoot(page)).history).toHaveLength(1);
  await page.getByRole('button', { name: 'Próg', exact: true }).click();
  await page.getByRole('button', { name: 'Próg 4 Poziomy 17-20', exact: true }).click();
  await page.getByRole('button', { name: 'Przerzuć przedmioty', exact: true }).click();
  const rerolled = (await storedLoot(page)).history[0]!;
  expect(rerolled.context).toEqual(original.context);
  expect(rerolled.gold).toBe(original.gold);
  expect(rerolled.gemValue).toBe(original.gemValue);
  await page.goto('/dm/loot/');
  await expect(
    page.getByRole('heading', { name: 'Major Reward', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tier', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect((await storedLoot(page)).history[0]!.id).toBe(original.id);
  await page.getByRole('button', { name: 'Rename reward', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Reward name' })
    .fill('Reward from the dragon vault');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Divide coins and valuables' }).check();
  await page.getByRole('spinbutton', { name: 'Number of shares' }).fill('3');
  await expect(page.getByText(/^Per share:/)).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download reward', exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toContain('fumble-loot-');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Reward from the dragon vault' }),
  ).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Number of shares' })).toHaveValue(
    '3',
  );
  await page
    .getByRole('button', {
      name: 'Delete reward: Reward from the dragon vault',
      exact: true,
    })
    .click();
  const dialog = page.getByRole('alertdialog', { name: 'Reward history', exact: true });
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Delete reward: Reward from the dragon vault',
      exact: true,
    }),
  ).toBeFocused();
});

for (const locale of ['en', 'pl']) {
  test(`loot party search and long metadata reflow on phones: ${locale}`, async ({
    page,
  }, testInfo) => {
    const characters = Array.from({ length: 60 }, (_, index) => ({
      ...createCharacter(
        index === 0
          ? 'Żółw with a very long name and family history'
          : `Hero ${String(index).padStart(2, '0')}`,
      ),
      className: 'Wizard with an exceptionally long custom class title',
      subclass: 'School of extraordinarily lengthy magical traditions',
      role: index === 59 ? 'dm' : 'party',
      level: (index % 20) + 1,
    }));
    await page.addInitScript(
      ({ characters }) => {
        localStorage.setItem(
          'fumble-characters',
          JSON.stringify({
            version: 2,
            state: {
              characters: Object.fromEntries(
                characters.map((character) => [character.id, character]),
              ),
              order: characters.map((character) => character.id),
            },
          }),
        );
      },
      { characters },
    );
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`${locale === 'pl' ? '/pl' : ''}/dm/loot/`);
    await page
      .getByRole('button', {
        name: locale === 'pl' ? 'Zapisane postacie' : 'Saved characters',
        exact: true,
      })
      .click();
    await expect(
      page.getByText(locale === 'pl' ? /Wybrano 59 z 60/ : /59 selected of 60/),
    ).toBeVisible();
    const main = page.getByRole('main');
    expect(
      await main.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`loot-party-${locale}-320.png`) });
    await page
      .getByRole('combobox', {
        name: locale === 'pl' ? 'Sortuj postacie' : 'Sort characters',
      })
      .selectOption('level');
    await page
      .getByRole('searchbox', {
        name: locale === 'pl' ? 'Szukaj postaci' : 'Search characters',
      })
      .fill('  zolw  ');
    await expect(main.getByRole('checkbox')).toHaveCount(1);
    await page
      .getByRole('button', {
        name:
          locale === 'pl' ? 'Odznacz pasujące postacie' : 'Deselect matching characters',
        exact: true,
      })
      .click();
    await expect(main.getByRole('checkbox')).not.toBeChecked();
    await page
      .getByRole('button', {
        name:
          locale === 'pl' ? 'Zaznacz pasujące postacie' : 'Select matching characters',
        exact: true,
      })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await main.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`loot-party-${locale}-390.png`) });
    await page
      .getByRole('button', {
        name: locale === 'pl' ? 'Ręczny skład' : 'Manual party',
        exact: true,
      })
      .click();
    await page
      .getByRole('button', {
        name: locale === 'pl' ? 'Dodaj grupę poziomów' : 'Add level group',
        exact: true,
      })
      .click();
    await page
      .getByRole('button', {
        name: locale === 'pl' ? 'Usuń grupę poziomów' : 'Remove level group',
        exact: true,
      })
      .last()
      .focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('button', {
        name: locale === 'pl' ? 'Dodaj grupę poziomów' : 'Add level group',
        exact: true,
      }),
    ).toBeFocused();
  });
}

test('loot safely handles incomplete homebrew and recovers a failed catalog load', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'fumble-homebrew',
      JSON.stringify({
        version: 4,
        state: {
          entries: [
            {
              kind: 'manual',
              id: 'hb-test',
              name: 'Descriptive homebrew',
              category: 'items',
              subtitle: '',
              body: 'A custom item description.',
              createdAt: 1,
            },
          ],
        },
      }),
    );
  });
  let fail = true;
  await page.route('**/generated/items.json', (route) =>
    fail ? route.abort() : route.continue(),
  );
  await page.goto('/dm/loot/');
  await expect(page.getByText(/The item catalog could not be loaded/)).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Retry loading items', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Major Reward', exact: true }),
  ).toBeEnabled();
  await page.getByText('Incomplete entries skipped: 1', { exact: true }).click();
  await expect(page.getByText('Descriptive homebrew', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Major Reward', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Major Reward', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('fumble-homebrew')!).state.entries[0].body,
    ),
  ).toBe('A custom item description.');
});

test('loot keeps unsaved history exportable and restores scoped backups without replacing characters', async ({
  page,
}) => {
  const hero = createCharacter('Protected hero');
  await page.addInitScript((hero) => {
    if (!localStorage.getItem('fumble-characters'))
      localStorage.setItem(
        'fumble-characters',
        JSON.stringify({
          version: 2,
          state: { characters: { [hero.id]: hero }, order: [hero.id] },
        }),
      );
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'fumble-loot' && sessionStorage.getItem('fail-loot-write') === 'yes')
        throw new DOMException('quota', 'QuotaExceededError');
      setItem.call(this, key, value);
    };
  }, hero);
  await page.goto('/dm/loot/');
  await page.getByRole('button', { name: 'Major Reward', exact: true }).click();
  const first = (await storedLoot(page)).history[0]!;
  await page.evaluate(() => sessionStorage.setItem('fail-loot-write', 'yes'));
  await page.getByRole('button', { name: 'Major Reward', exact: true }).click();
  await expect(page.getByText(/Changes are in memory/)).toBeVisible();
  expect((await storedLoot(page)).history).toHaveLength(1);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download loot backup', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('fumble-loot-backup.json');
  await page.evaluate(() => sessionStorage.removeItem('fail-loot-write'));
  await page.getByRole('button', { name: 'Retry saving', exact: true }).click();
  expect((await storedLoot(page)).history).toHaveLength(2);
  const data = { ...emptyLootData(), history: [first], selectedId: first.id };
  await page.goto('/data/');
  await chooseToolBackup(page, 'Loot Generator: restore from a file', {
    name: 'restore.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'fumble-loot',
        version: 1,
        exportedAt: new Date().toISOString(),
        loot: { version: 1, state: data },
      }),
    ),
  });
  await expect(
    page.getByRole('group', { name: 'Check the backup: Loot Generator' }),
  ).toBeVisible();
  expect((await storedLoot(page)).history).toHaveLength(2);
  await page.getByRole('button', { name: 'Replace and restore', exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await dialog.getByRole('button', { name: 'Replace and restore', exact: true }).click();
  await expect(page.getByText('Restored: Loot Generator.')).toBeVisible();
  expect((await storedLoot(page)).history).toHaveLength(1);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('fumble-characters')!).state.order,
    ),
  ).toEqual([hero.id]);
});

test('loot preserves unreadable originals until an explicit replacement', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('fumble-loot', '{broken');
    localStorage.setItem('fumble-unrelated-test', 'keep');
  });
  await page.goto('/dm/loot/');
  await expect(page.getByText(/Automatic writes are blocked/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Major Reward', exact: true }),
  ).toBeDisabled();
  const download = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download original stored contents', exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe('fumble-loot-original.json');
  await page
    .getByRole('button', { name: 'Replace unreadable loot data', exact: true })
    .click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => localStorage.getItem('fumble-loot'))).toBe('{broken');
  await page
    .getByRole('button', { name: 'Replace unreadable loot data', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Replace unreadable loot data', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Major Reward', exact: true }),
  ).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem('fumble-unrelated-test'))).toBe(
    'keep',
  );
});
