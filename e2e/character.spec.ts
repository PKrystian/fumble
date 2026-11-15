import { createCharacter } from '../src/features/character/model';
import { expect, test } from './fixtures';

const key = 'fumble-characters';

function storedCharacters(page: import('@playwright/test').Page) {
  return page.evaluate((key) => {
    const value = JSON.parse(localStorage.getItem(key) ?? '{"state":{"order":[]}}') as {
      state: { characters: Record<string, Record<string, unknown>>; order: string[] };
    };
    return value.state.order.map((id) => value.state.characters[id]!);
  }, key);
}

test('character sheet keeps manual edits, tracks hit points and rests', async ({
  page,
}) => {
  await page.goto('/character');
  await page.getByRole('button', { name: 'New Character' }).first().click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'New Character' }),
  ).toBeVisible();

  await page.getByLabel('Class', { exact: true }).selectOption({ label: 'Barbarian' });
  await expect
    .poll(async () => (await storedCharacters(page))[0]?.savingThrowProficiencies)
    .toEqual(['str', 'con']);
  await expect(page.getByText('Level 1 - Barbarian')).toBeVisible();

  const saves = page.getByRole('button', { name: 'Saving Throws', exact: true });
  if (await saves.count()) await saves.click();
  const wisdom = page.getByRole('checkbox', { name: /Wisdom/ });
  await wisdom.check();
  await expect(
    page.getByRole('button', { name: 'Restore saving throws from class' }),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'Walk', exact: true }).fill('40');
  await page.reload();
  await expect(wisdom).toBeChecked();
  await expect(page.getByRole('textbox', { name: 'Walk', exact: true })).toHaveValue(
    '40',
  );
  await expect
    .poll(async () => (await storedCharacters(page))[0]?.manualFields)
    .toEqual(['savingThrows']);
  await page.getByRole('button', { name: 'Restore saving throws from class' }).click();
  await expect(wisdom).not.toBeChecked();

  await page.getByRole('textbox', { name: 'Max', exact: true }).fill('30');
  await page.getByRole('textbox', { name: 'Current', exact: true }).fill('30');
  const amount = page.getByRole('textbox', { name: 'Amount', exact: true });
  await amount.fill('-3');
  await expect(page.getByText('Enter a whole number from 1 to 9999.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Damage' })).toBeDisabled();
  await amount.fill('12');
  await page.getByRole('button', { name: 'Damage' }).click();
  const status = page.getByRole('region', { name: 'Character status' });
  await expect(status).toContainText('18/30');

  await page.getByRole('button', { name: 'Long rest' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Hit points are restored to 30');
  await dialog.getByRole('button', { name: 'Long rest' }).click();
  await expect(status).toContainText('30/30');
  await expect(page.getByText('Long rest complete.')).toBeVisible();

  await page.getByRole('tab', { name: 'Actions' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Spells' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page).toHaveURL(/tab=spells/);
});

test('character list imports duplicates as copies and undoes deletion', async ({
  page,
}) => {
  const hero = createCharacter('Mira');
  await page.addInitScript(
    ({ key, hero }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 2,
            state: { characters: { [hero.id]: hero }, order: [hero.id] },
          }),
        );
    },
    { key, hero },
  );
  await page.goto('/pl/data');
  await page
    .getByLabel('Postacie: importuj z pliku', { exact: true })
    .last()
    .setInputFiles({
      name: 'mira.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({ version: 1, character: { ...hero, name: 'Mira 2' } }),
      ),
    });
  const dialog = page.getByRole('dialog', { name: 'Import postaci' });
  await expect(dialog.getByText('Pojedyncza postać')).toBeVisible();
  await expect(
    dialog.getByRole('radio', { name: /Dodaj jako nowe postacie/ }),
  ).toBeChecked();
  await dialog.getByRole('button', { name: 'Importuj (1)' }).click();
  await expect(page.getByText('Zaimportowano postacie: 1.')).toBeVisible();
  await page.goto('/pl/character');
  expect((await storedCharacters(page)).map((c) => c.name)).toEqual([
    'Mira',
    'Mira 2 (kopia)',
  ]);

  await page.getByRole('button', { name: 'Usuń Mira 2 (kopia)' }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm.getByRole('button', { name: 'Anuluj' })).toBeFocused();
  await confirm.getByRole('button', { name: 'Usuń' }).click();
  await page.getByRole('button', { name: 'Cofnij usunięcie' }).click();
  await expect(page.getByText('Przywrócono postać.')).toBeVisible();
  expect(await storedCharacters(page)).toHaveLength(2);

  await page.getByRole('searchbox', { name: 'Szukaj postaci' }).fill('kopia');
  await expect(page.getByRole('article')).toHaveCount(1);
});

test('character sheet exports a PDF with Polish characters', async ({ page }) => {
  await page.goto('/pl/character');
  await page.getByRole('button', { name: 'Nowa postać' }).first().click();
  await page.getByRole('textbox', { name: 'Imię', exact: true }).fill('Zofia');
  await page.getByLabel('Klasa', { exact: true }).selectOption({ label: 'Barbarzyńca' });
  await page.getByRole('button', { name: 'Opcje eksportu' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Karta PDF (2024)' }).click();
  expect((await download).suggestedFilename()).toBe('Zofia-2024.pdf');
  await expect(page.getByText('Rozpoczęto pobieranie karty (2024).')).toBeVisible();
});

test('sheet panels can be arranged and collapsed without a pointer', async ({ page }) => {
  const hero = createCharacter('Mira');
  await page.addInitScript(
    ({ key, hero }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 3,
          state: { characters: { [hero.id]: hero }, order: [hero.id] },
        }),
      ),
    { key, hero },
  );
  await page.goto(`/character/${hero.id}`);
  const wide = (page.viewportSize()?.width ?? 0) >= 1024;
  const menu = page.getByRole('button', { name: 'Arrange Hit Points' });
  await menu.focus();
  await page.keyboard.press('Enter');
  if (wide) {
    await expect(page.getByRole('menuitem', { name: 'Move up' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
  }
  await expect(page.getByRole('menuitem', { name: 'Move down' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(menu).toBeFocused();
  await expect(
    page.getByRole('status').filter({ hasText: 'Hit Points moved' }),
  ).toHaveText(
    wide
      ? 'Hit Points moved to position 3 in the center column.'
      : 'Hit Points moved to position 2.',
  );
  if (!wide) {
    const skills = page.getByRole('button', { name: 'Skills', exact: true });
    await expect(skills).toHaveAttribute('aria-expanded', 'false');
    await skills.click();
    await expect(
      page.getByRole('button', { name: /Acrobatics proficiency/ }),
    ).toBeVisible();
  }
});
