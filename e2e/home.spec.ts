import { expect, test } from './fixtures';

const MONTH = 31 * 86_400_000;

const labels = {
  '': {
    start: 'Start here',
    create: 'Create a character',
    search: 'Search',
    tool: 'dice roller',
    toolResult: /Dice Roller/,
    continueTitle: 'Continue',
    character: 'Mira Character, level 4',
    backup: 'Data backup',
    openBackup: 'Open Data backup',
    later: 'Remind me in 30 days',
    compendium: /^Compendium/,
    sections: [
      'Player',
      'Rules and references',
      'Dungeon Master',
      'Campaign',
      'Utilities',
    ],
  },
  '/pl': {
    start: 'Zacznij tutaj',
    create: 'Stwórz postać',
    search: 'Szukaj',
    tool: 'kosci',
    toolResult: /Rzuty kośćmi/,
    continueTitle: 'Kontynuuj',
    character: 'Mira Postać, poziom 4',
    backup: 'Kopia danych',
    openBackup: 'Otwórz Kopię danych',
    later: 'Przypomnij za 30 dni',
    compendium: /^Kompendium/,
    sections: ['Gracz', 'Zasady i źródła', 'Mistrz Gry', 'Kampania', 'Narzędzia'],
  },
} as const;

for (const locale of ['', '/pl'] as const) {
  const text = labels[locale];

  test(`home starts empty and finds tools from its search: ${locale || '/en'}`, async ({
    page,
  }) => {
    await page.goto(`${locale}/`);
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: text.start })).toBeVisible();
    await expect(main.getByRole('link', { name: text.create })).toHaveAttribute(
      'href',
      `${locale}/character/`,
    );
    for (const section of text.sections)
      await expect(main.getByRole('region', { name: section })).toBeVisible();
    await expect(
      main
        .getByRole('region', { name: text.sections[1] })
        .getByRole('link', { name: text.compendium }),
    ).toHaveAttribute('href', `${locale}/compendium/`);
    await expect(page.getByRole('complementary', { name: text.backup })).toHaveCount(0);
    expect(
      await page.evaluate(() => localStorage.getItem('fumble-characters')),
    ).toBeNull();

    const opener = main.getByRole('button', { name: text.search, exact: true });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: text.search });
    await dialog.getByRole('combobox').fill(text.tool);
    await expect(dialog.getByRole('option', { name: text.toolResult })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(opener).toBeFocused();

    await opener.click();
    await dialog.getByRole('combobox').fill(text.tool);
    await expect(dialog.getByRole('option', { name: text.toolResult })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${locale}/dice/$`));
  });

  test(`home continues saved work and postpones the backup reminder: ${locale || '/en'}`, async ({
    page,
  }) => {
    const characters = JSON.stringify({
      version: 3,
      state: {
        characters: {
          mira: {
            id: 'mira',
            name: 'Mira',
            level: 4,
            createdAt: Date.now() - MONTH,
            updatedAt: Date.now() - MONTH,
          },
        },
        order: ['mira'],
      },
    });
    await page.addInitScript((value) => {
      if (!sessionStorage.getItem('home-test-seeded')) {
        localStorage.setItem('fumble-characters', value);
        sessionStorage.setItem('home-test-seeded', 'yes');
      }
    }, characters);
    await page.goto(`${locale}/`);
    const region = page.getByRole('region', { name: text.continueTitle });
    await expect(region.getByRole('link', { name: text.character })).toHaveAttribute(
      'href',
      `${locale}/character/mira/`,
    );
    await expect(page.getByRole('heading', { name: text.start })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('fumble-characters'))).toBe(
      characters,
    );

    const reminder = page.getByRole('complementary', { name: text.backup });
    await expect(reminder).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(reminder.getByRole('link', { name: text.openBackup })).toHaveAttribute(
      'href',
      `${locale}/data/`,
    );
    await page
      .getByRole('main')
      .getByRole('button', { name: text.search, exact: true })
      .focus();
    await reminder.getByRole('button', { name: text.later }).click();
    await expect(reminder).toHaveCount(0);
    await page.reload();
    await expect(region.getByRole('link', { name: text.character })).toBeVisible();
    await expect(reminder).toHaveCount(0);
  });
}

test('home reflows into compact rows at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const route of ['/', '/pl/']) {
    await page.goto(route);
    const main = page.locator('main');
    const dimensions = await main.evaluate((element) => ({
      width: element.clientWidth,
      content: element.scrollWidth,
    }));
    expect(dimensions.content, route).toBeLessThanOrEqual(dimensions.width + 1);
    const cards = main.locator('.nav-card');
    await expect(cards).toHaveCount(23);
    const boxes = await cards.evaluateAll((items) =>
      items.map((item) => {
        const box = item.getBoundingClientRect();
        return { left: Math.round(box.left), height: Math.round(box.height) };
      }),
    );
    expect(new Set(boxes.map((box) => box.left)).size, route).toBe(1);
    expect(Math.max(...boxes.map((box) => box.height)), route).toBeLessThanOrEqual(80);
  }
});

test('the skip link stays out of the layout and leads to the home content', async ({
  page,
}) => {
  await page.goto('/');
  const main = page.getByRole('main');
  const before = await main.boundingBox();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  expect(await main.boundingBox()).toEqual(before);
  await page.keyboard.press('Enter');
  await expect(main).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(main.getByRole('button', { name: 'Search', exact: true })).toBeFocused();
});
