import { expect, test } from './fixtures';

for (const locale of ['', '/pl']) {
  const pl = Boolean(locale);
  const labels = {
    damage: pl ? 'Obrażenia' : 'Damage',
    expression: pl ? 'Wyrażenie' : 'Expression',
    component: pl ? 'Wyrażenie obrażeń' : 'Damage expression',
    type: pl ? 'Typ obrażeń' : 'Damage type',
    add: pl ? 'Dodaj składnik obrażeń' : 'Add damage component',
    name: pl ? 'Nazwa' : 'Name',
    roll: pl ? 'Rzuć obrażenia' : 'Roll damage',
    latest: pl ? 'Ostatni wynik' : 'Latest result',
    save: pl ? 'Zapisz' : 'Save',
    history: pl ? 'Historia' : 'History',
    resistance: pl ? 'Odporność (połowa)' : 'Resistance (half)',
    vulnerable: pl ? 'Podatność (podwójne)' : 'Vulnerability (double)',
    immune: pl ? 'Immunitet (zero)' : 'Immunity (zero)',
  };
  test(`typed sword and smite recipe, target defenses, edit and persistent history: ${locale || 'en'}`, async ({
    page,
  }) => {
    await page.goto(`${locale}/dice/`);
    await page.getByRole('button', { name: labels.damage, exact: true }).click();
    await page.getByLabel(labels.component, { exact: true }).fill('5');
    await page.getByRole('button', { name: labels.add }).click();
    await page.getByLabel(labels.component, { exact: true }).nth(1).fill('2');
    const slashing = page.getByRole('group', {
      name: pl ? 'Sieczne' : 'Slashing',
      exact: true,
    });
    await slashing
      .getByRole('checkbox', { name: labels.resistance, exact: true })
      .check();
    await page
      .getByRole('group', { name: pl ? 'Promieniste' : 'Radiant', exact: true })
      .getByRole('checkbox', { name: labels.vulnerable, exact: true })
      .check();
    await page.getByLabel(labels.name, { exact: true }).fill('Sword + Smite');
    await page.getByRole('button', { name: labels.save, exact: true }).click();
    await page.getByRole('button', { name: labels.roll, exact: true }).click();
    const latest = page.getByRole('region', { name: labels.latest });
    await expect(latest.locator('p.text-5xl')).toContainText('6');
    await expect(latest.getByText('5 → 2', { exact: true })).toBeVisible();
    await expect(latest.getByText('2 → 4', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('complementary', { name: pl ? 'Wynik Rzutu' : 'Dice Result' }),
    ).toHaveCount(0);
    await page.reload();
    await expect(latest.locator('p.text-5xl')).toContainText('6');
    await page.getByRole('button', { name: /^Sword \+ Smite/ }).click();
    await expect(latest.locator('p.text-5xl')).toContainText('7');
    const savedRolls = page.getByRole('region', {
      name: pl ? 'Zapisane rzuty' : 'Saved rolls',
    });
    await savedRolls
      .getByText(
        pl ? 'Ustawienia celu dla: Sword + Smite' : 'Target defenses for Sword + Smite',
        { exact: true },
      )
      .click();
    await savedRolls
      .getByRole('group', { name: pl ? 'Sieczne' : 'Slashing', exact: true })
      .getByRole('checkbox', { name: labels.resistance, exact: true })
      .check();
    await page.getByRole('button', { name: /^Sword \+ Smite/ }).click();
    await expect(latest.locator('p.text-5xl')).toContainText('4');
    await page
      .getByRole('button', {
        name: pl ? 'Edytuj Sword + Smite' : 'Edit Sword + Smite',
        exact: true,
      })
      .click();
    await expect(page.getByLabel(labels.component, { exact: true })).toHaveCount(2);
    await page.getByLabel(labels.component, { exact: true }).nth(1).fill('3');
    await page
      .getByRole('button', { name: pl ? 'Zapisz zmiany' : 'Save changes', exact: true })
      .click();
    const history = page.getByRole('region', { name: labels.history });
    await history.locator('summary').last().click();
    await history
      .getByRole('button', { name: pl ? 'Przerzuć' : 'Reroll', exact: true })
      .click();
    await expect(latest.locator('p.text-5xl')).toContainText('6');
    await page
      .getByRole('button', {
        name: pl ? 'Usuń Sword + Smite' : 'Remove Sword + Smite',
        exact: true,
      })
      .click();
    await page.getByRole('button', { name: pl ? 'Cofnij' : 'Undo', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Sword \+ Smite/ })).toBeVisible();
  });
  test(`all damage types, immunities, rounding and 320 pixel reflow: ${locale || 'en'}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`${locale}/dice/`);
    await page.getByRole('button', { name: labels.damage, exact: true }).click();
    await page.getByLabel(labels.component, { exact: true }).fill('5');
    const select = page.getByRole('combobox', { name: labels.type, exact: true });
    await expect(select.locator('option')).toHaveCount(13);
    const types = await select
      .locator('option')
      .evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      );
    expect(types).toHaveLength(13);
    for (const type of types) {
      await select.selectOption(type);
      await page.getByRole('checkbox', { name: labels.resistance, exact: true }).check();
      await page.getByRole('checkbox', { name: labels.vulnerable, exact: true }).check();
      await page.getByRole('button', { name: labels.roll, exact: true }).click();
      const latest = page.getByRole('region', { name: labels.latest });
      await expect(latest.locator('p.text-5xl')).toContainText('4');
      await page.getByRole('checkbox', { name: labels.immune, exact: true }).check();
      await page.getByRole('button', { name: labels.roll, exact: true }).click();
      await expect(latest.locator('p.text-5xl')).toContainText('0');
      const dimensions = await page
        .locator('main')
        .evaluate((main) => ({ width: main.clientWidth, scroll: main.scrollWidth }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addStyleTag({ content: 'html { zoom: 2; }' });
    const dimensions = await page
      .locator('main')
      .evaluate((main) => ({ width: main.clientWidth, scroll: main.scrollWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
  });
}
