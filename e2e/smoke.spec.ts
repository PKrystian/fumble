import { readFileSync } from 'node:fs';
import { expect, test } from './fixtures';

const packageInfo = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string };

test('home page loads and shows the app name', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fumble');
  await expect(
    page.getByText(`Version ${packageInfo.version}`, { exact: true }),
  ).toBeVisible();
});

test('remembers the selected language on a later home visit', async ({ page }) => {
  await page.goto('/');
  if ((page.viewportSize()?.width ?? 1000) < 768) {
    await page.getByRole('button', { name: 'Open menu' }).click();
  }
  await page.getByRole('button', { name: 'Change language' }).click();
  await page.getByRole('option', { name: 'Polski' }).click();
  await expect(page).toHaveURL(/\/pl\/$/);

  await page.goto('/');
  await expect(page).toHaveURL(/\/pl\/$/);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
    'href',
    'https://fumble.krystianpinczak.com/',
  );
  await expect(page.locator('link[rel="alternate"][hreflang="pl"]')).toHaveAttribute(
    'href',
    'https://fumble.krystianpinczak.com/pl/',
  );
});

test('legal pages are available in both languages', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Privacy policy' }).click();
  await expect(page).toHaveURL(/\/legal\/privacy\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy policy');

  await page.goto('/pl/legal/connections');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Połączenia zewnętrzne',
  );
  await expect(page.getByRole('heading', { name: 'GitHub Pages' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hugging Face' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'YouTube' })).toBeVisible();

  await page.goto('/legal/accessibility');
  await expect(page).toHaveURL(/\/pl\/legal\/accessibility\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dostępność');

  await page.evaluate(() => localStorage.removeItem('fumble-locale'));
  await page.goto('/legal/accessibility');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Accessibility');

  await page.goto('/pl/legal/contact');
  await expect(page.getByRole('link', { name: /Krystian Pińczak/ })).toBeVisible();
});

test('compendium loads spells and opens an entry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Species' }).first().click();

  await expect(page).toHaveURL(/\/compendium\/species\/$/);

  await page
    .getByRole('navigation', { name: 'Compendium categories' })
    .getByRole('link', { name: 'Spells', exact: true })
    .click();
  await expect(page).toHaveURL(/\/compendium\/spells\/$/);

  await page.getByRole('searchbox').fill('fireball');
  await expect(page).toHaveURL(/\/compendium\/spells\/\?q=fireball$/, { timeout: 15000 });
  await page.getByRole('link', { name: /^Fireball/ }).click();

  await expect(page).toHaveURL(/\/compendium\/spells\/fireball\/\?q=fireball$/, {
    timeout: 15000,
  });
  await expect(page.getByRole('heading', { name: 'Fireball' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('searchbox')).toHaveValue('fireball');
});

test('opens compendium records at the top after scrolling the list', async ({ page }) => {
  await page.goto('/pl/compendium/rules');
  await expect(page.locator('ul[data-category] a').last()).toBeVisible();

  const main = page.locator('main');
  const scrollTop = await main.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    return element.scrollTop;
  });
  expect(scrollTop).toBeGreaterThan(0);

  await page.locator('ul[data-category] a').last().click();
  await expect(page).toHaveURL(/\/pl\/compendium\/rules\/[^/]+\/$/);
  await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBe(0);
});

test('compendium links to older printings', async ({ page }) => {
  await page.goto('/compendium/spells/fireball');
  await expect(page.getByText('Source:')).toContainText("Player's Handbook (2024)");

  await page.getByRole('link', { name: "Player's Handbook (2014)" }).click();
  await expect(page).toHaveURL(/\/compendium\/spells\/fireball-phb\/$/);
  await expect(page.getByText('Source:')).toContainText("Player's Handbook (2014)");

  await page.goto('/compendium/spells/fireball-phb');
  await expect(page.getByRole('heading', { name: 'Fireball' })).toBeVisible();
  await expect(page.getByText('Source:')).toContainText("Player's Handbook (2014)");
});

test('compendium exposes magic variants and imported source collections', async ({
  page,
}) => {
  await page.goto('/compendium/items');
  await page.getByRole('searchbox').fill('Weapon of Warning');
  await page.getByRole('link', { name: /^Weapon of Warning/ }).click();
  await expect(page.getByRole('heading', { name: 'Weapon of Warning' })).toBeVisible();

  await page.goto('/compendium/psionics');
  await expect(page.getByRole('link', { name: /^Adaptive Body/ })).toBeVisible();

  await page.goto('/pl/compendium/items/1-armor');
  await expect(page.getByText(/zyskujesz \+1 premię do AC/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Napierśnik' })).toHaveAttribute(
    'href',
    '/pl/compendium/items/breastplate/',
  );
  await expect(page.getByRole('link', { name: 'Uzbrojenie - rzadkie' })).toHaveAttribute(
    'href',
    '/pl/compendium/loot/magicitems-armaments-rare-xdmg/',
  );
});

test('keeps Fumble firearms in their own category', async ({ page }) => {
  await page.goto('/fumble-homebrew?category=firearms');
  await expect(page.getByRole('button', { name: 'Firearms' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('link', { name: /^Pneumatic Pistol/ })).toHaveAttribute(
    'href',
    '/compendium/firearms/pneumatic-pistol/',
  );

  await page.goto('/compendium/firearms/pneumatic-pistol');
  await expect(page.getByRole('heading', { name: 'Pneumatic Pistol' })).toBeVisible();
});

test('weapon details include mastery and property rules in Polish', async ({ page }) => {
  await page.goto('/pl/compendium/items/greatsword');

  const article = page.locator('article');
  await expect(
    article.getByRole('heading', { name: 'Mistrzostwo broni: Musnięcie', exact: true }),
  ).toBeVisible();
  await expect(article.getByText('Ciężka', { exact: true })).toBeVisible();
  await expect(article.getByText('Dwuręczna', { exact: true })).toBeVisible();
  await expect(article.getByText(/Masz Utrudnienie.*ciężką bronią/)).toBeVisible();
  await expect(article.getByText(/Broń Dwuręczna wymaga użycia obu rąk/)).toBeVisible();
});

test('names render as readable rollable tables', async ({ page }) => {
  await page.goto('/pl/compendium/names/name-dragonborn-xge');

  await expect(page.getByRole('heading', { name: /Smokoludź/ })).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(3);
  await expect(
    page.getByRole('columnheader', { name: 'Wynik', exact: true }),
  ).toHaveCount(3);
  await expect(page.getByText('Kobieta', { exact: true })).toBeVisible();
  await expect(page.getByText('Mężczyzna', { exact: true })).toBeVisible();
});

test("monster features use the Dungeon Master's Guide source", async ({ page }) => {
  await page.goto('/pl/compendium/monsterfeatures/monsterfeatures-aggressive-dmg');

  await expect(page.getByRole('heading', { name: /Agresywny/ })).toBeVisible();
  await expect(
    page.getByText('Podręcznik Mistrza Podziemi (2014)', { exact: true }),
  ).toBeVisible();
});

test('source loot and craft details render structured Polish content', async ({
  page,
}) => {
  await page.goto('/pl/compendium/loot/dragon-ancient-ftd');
  await expect(page.getByRole('heading', { name: /^Starożytny/ })).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(3);
  const lootArticle = page.locator('article');
  await expect(lootArticle.getByText('Klejnoty', { exact: true }).first()).toBeVisible();
  await expect(
    lootArticle.getByText('Dzieła sztuki', { exact: true }).first(),
  ).toBeVisible();
  await expect(
    lootArticle.getByText('Przedmioty magiczne', { exact: true }).first(),
  ).toBeVisible();

  await page.goto(
    '/pl/compendium/homecrafts/crochetpattern-eye-and-hand-of-vecna-cabomp',
  );
  await expect(page.getByRole('heading', { name: /^Oko i dłoń Vecny/ })).toBeVisible();
  await expect(page.getByText('Runda 2-3:').first()).toBeVisible();
  await expect(
    page.getByText('215 mm (8½ cala / 21,5 cm)', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Grudzień', { exact: true })).toHaveCount(0);
  await expect(page.getByText('II miejsce', { exact: true })).toHaveCount(0);
});

test('compendium filters narrow the list', async ({ page }) => {
  await page.goto('/compendium/spells');
  await expect(page.getByRole('link', { name: /^Fireball/ })).toBeVisible();

  await page.getByRole('button', { name: /Filters/ }).click();
  await page.getByRole('button', { name: 'Cantrip', exact: true }).click();

  await expect(page.getByRole('link', { name: /^Fireball/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /^Fire Bolt/ })).toBeVisible();
});

test('Polish summoned creature formulas are localized', async ({ page }) => {
  await page.goto('/pl/compendium/bestiary');
  await page.getByRole('searchbox', { name: 'Szukaj: Bestiariusz' }).fill('Pozaświatowy');
  await page.getByRole('link', { name: /Pozaświatowy Wierzchowiec/ }).click();

  await expect(page.getByText(/5 \+ 10 za każdy poziom czaru/)).toBeVisible();
  await expect(page.getByText(/1d8 \+ poziom czaru/)).toBeVisible();
  await expect(page.getByText(/2d8 \+ poziom czaru/)).toBeVisible();
  await expect(page.getByText(/summonSpellLevel|per spell level/)).toHaveCount(0);
});

test('spell filters include imported homebrew classes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'fumble-homebrew',
      JSON.stringify({
        state: {
          entries: [
            {
              kind: 'imported',
              id: 'hb-animate-hut',
              category: 'spells',
              name: 'Animate Hut',
              baseLocale: 'en',
              data: {
                id: 'animate-hut',
                name: 'Animate Hut',
                source: 'WITCH',
                srd: false,
                level: 3,
                school: 'Conjuration',
                castingTime: '1 action',
                range: '60 feet',
                components: 'V, S, M',
                duration: '1 hour',
                entries: ['The hut awakens.'],
              },
              createdAt: 1,
            },
            {
              kind: 'imported',
              id: 'hb-witch',
              category: 'classes',
              name: 'Witch',
              baseLocale: 'en',
              data: {
                id: 'witch',
                name: 'Witch',
                source: 'WITCH',
                srd: false,
              },
              createdAt: 1,
            },
          ],
        },
        version: 3,
      }),
    );
  });

  await page.goto('/compendium/spells');
  await page.getByRole('button', { name: /Filters/ }).click();
  await page.getByRole('searchbox', { name: 'Search filter options' }).fill('Witch');
  await page.getByRole('button', { name: 'Witch', exact: true }).click();

  await expect(page.getByRole('link', { name: /^Animate Hut/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Acid Splash/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Fireball/ })).toHaveCount(0);
});

test('Polish spell filters include the Witch spell list', async ({ page }) => {
  await page.goto('/pl/compendium/spells');
  await page.getByRole('button', { name: /Filtry/ }).click();
  await page.getByRole('searchbox', { name: 'Szukaj opcji filtrów' }).fill('Wiedźma');
  await page.getByRole('button', { name: 'Wiedźma', exact: true }).click();

  await expect(page.getByRole('link', { name: /^Kwaśny Pryskacz/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Kula Ognia/ })).toHaveCount(0);
});

test('Polish filters normalize values and bulk actions', async ({ page }) => {
  await page.goto('/pl/compendium/spells');
  await page.getByRole('button', { name: /Filtry/ }).click();

  await expect(page.getByRole('button', { name: 'Kleryk', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duchowny', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: 'druid', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Druid', exact: true })).toHaveCount(1);

  const spellAll = page.getByRole('button', { name: 'Wszystkie', exact: true });
  await spellAll.nth(1).click();
  await expect(page.getByRole('button', { name: 'Kleryk', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const spellClear = page.getByRole('button', { name: 'Wyczyść', exact: true });
  await spellClear.nth(1).click();
  await expect(page.getByRole('button', { name: 'Kleryk', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  await page.getByRole('button', { name: 'Zamknij filtry' }).click();
  await page.goto('/pl/compendium/items');
  await page.getByRole('button', { name: /Filtry/ }).click();
  await expect(
    page.getByRole('button', { name: 'Broń do Walki Wręcz', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Broń biała', exact: true })).toHaveCount(
    0,
  );
  const itemAll = page.getByRole('button', { name: 'Wszystkie', exact: true });
  await itemAll.nth(1).click();
  await expect(
    page.getByRole('button', { name: 'Broń do Walki Wręcz', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  const itemClear = page.getByRole('button', { name: 'Wyczyść', exact: true });
  await itemClear.nth(1).click();
  await expect(
    page.getByRole('button', { name: 'Broń do Walki Wręcz', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
});

test('Fumble homebrew keeps class headers and hover previews usable', async ({
  page,
}) => {
  await page.goto('/pl/fumble-homebrew');

  await expect(page.getByRole('textbox', { name: 'Szukaj' })).toBeVisible();
  await expect(
    page.getByText(
      'Zasady kampanii, opcje, klasy, linie krwi, podklasy i przedmioty utrzymywane przez twórców Fumble.',
    ),
  ).toHaveCount(0);
  await expect(page.getByText('Linki otwierają zwykłe wpisy Kompendium.')).toHaveCount(0);

  await page.getByRole('textbox', { name: 'Szukaj' }).fill('Witch');
  await expect(page).toHaveURL(/\/pl\/fumble-homebrew\/?\?q=Witch/);
  await page.getByRole('button', { name: 'Klasy', exact: true }).click();
  await expect(page).toHaveURL(/\/pl\/fumble-homebrew\/?\?category=classes&q=Witch/);
  await page.getByRole('link', { name: /^Wied/ }).first().click();
  await expect(page).toHaveURL(/\/pl\/compendium\/classes\/witch\//);
  await page.goBack();
  await expect(page).toHaveURL(/\/pl\/fumble-homebrew\/?\?category=classes&q=Witch/);
  await expect(page.getByRole('textbox', { name: 'Szukaj' })).toHaveValue('Witch');
  await expect(page.getByRole('button', { name: 'Klasy', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.goto('/pl/compendium/classes/witch');
  await expect(page.getByText('Klasa', { exact: true })).toBeVisible();

  const cackle = page.getByRole('link', { name: 'Chichot', exact: true }).first();
  await cackle.scrollIntoViewIfNeeded();
  await cackle.hover();
  await expect(page.getByRole('tooltip')).toContainText('Wydajesz szalony chichot');
});

test('keeps long pages inside the app scroll containers', async ({ page }) => {
  for (const route of [
    '/pl/fumble-homebrew/',
    '/pl/compendium/rules/firearms-catalog/',
  ]) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    const metrics = await page.evaluate(() => ({
      documentClientHeight: document.documentElement.clientHeight,
      documentScrollHeight: document.documentElement.scrollHeight,
      bodyScrollHeight: document.body.scrollHeight,
      mainClientHeight: document.querySelector('main')?.clientHeight ?? 0,
      mainScrollHeight: document.querySelector('main')?.scrollHeight ?? 0,
    }));

    expect(metrics.documentScrollHeight).toBe(metrics.documentClientHeight);
    expect(metrics.bodyScrollHeight).toBe(metrics.documentClientHeight);
    expect(metrics.mainScrollHeight).toBeGreaterThan(metrics.mainClientHeight);
  }
});

test('can create a character and edit core stats', async ({ page }) => {
  await page.goto('/character');
  await page.getByRole('button', { name: 'New Character' }).click();
  await expect(page).toHaveURL(/\/character\/[a-f0-9-]+\/$/);

  const strength = page.getByRole('spinbutton', { name: 'Strength' });
  await expect(async () => {
    await strength.fill('16');
    await strength.press('Tab');
    await expect(page.getByText('+3', { exact: true }).first()).toBeVisible({
      timeout: 1_000,
    });
  }).toPass({
    timeout: 10_000,
  });

  await page.getByRole('textbox', { name: 'Name' }).fill('Thorin');
  await page.getByRole('link', { name: 'Characters' }).click();
  await expect(page.getByText('Thorin')).toBeVisible();
});

test('character list imports, validates and deletes character files', async ({
  page,
}) => {
  await page.goto('/character');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  });
  await expect(page.getByRole('alertdialog')).toContainText('Import failed');
  await page.getByRole('button', { name: 'OK' }).click();

  await fileInput.setInputFiles({
    name: 'character.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        character: {
          id: 'imported-character',
          name: 'Imported Hero',
          level: 7,
          className: 'Wizard',
          species: 'Elf',
          role: 'party',
          portrait: '',
        },
        layout: {
          left: ['abilities'],
          center: ['combat'],
          right: ['skills'],
        },
      }),
    ),
  });
  await expect(page.getByText('Imported Hero')).toBeVisible();
  const deleteButton = page.getByRole('button', { name: 'Delete Imported Hero' });
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    page.getByText('No characters yet. Create one to get started.'),
  ).toBeVisible();
});

test('character sheet adds a spell from the compendium', async ({ page }) => {
  await page.goto('/character');
  await page.getByRole('button', { name: 'New Character' }).click();
  await page.getByRole('button', { name: 'Spells', exact: true }).click();

  await page
    .getByRole('searchbox', { name: 'Add a spell from the compendium…' })
    .fill('fireball');
  await page.getByRole('button', { name: 'Fireball', exact: true }).click();

  await expect(page.getByPlaceholder('Spell name')).toHaveValue('Fireball');
});

test('character rolls tab rolls a d20 with modifiers', async ({ page }) => {
  await page.goto('/character');
  await page.getByRole('button', { name: 'New Character' }).click();
  await page.getByRole('button', { name: 'Rolls', exact: true }).click();
  await page.getByRole('button', { name: 'Initiative +0' }).click();

  await expect(page.getByText(/d20 \[/)).toBeVisible();
});

test('character settings configure spell slots and preferences', async ({ page }) => {
  await page.goto('/character');
  await page.getByRole('button', { name: 'New Character' }).click();
  const settingsButton = page.getByRole('button', { name: 'Settings' });
  await expect(settingsButton).toBeVisible();
  await expect(settingsButton).toHaveClass(/w-full/);
  await settingsButton.click();

  const dialog = page.getByRole('dialog', { name: 'Character Settings' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Spellcasting Ability').selectOption('int');
  const slots = dialog.getByRole('spinbutton');
  await slots.nth(0).fill('1');
  await slots.nth(1).fill('2');
  await dialog
    .getByText(
      'Auto-sync features, proficiencies, and speed from class, subclass, species, and background',
    )
    .click();
  await dialog.getByText('This is my (DM) character, not a party member').click();
  await dialog.getByRole('button', { name: 'Reset dashboard layout' }).click();
  await page.keyboard.press('Escape');

  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings' }).click();
  const reopened = page.getByRole('dialog', { name: 'Character Settings' });
  await expect(reopened.getByLabel('Spellcasting Ability')).toHaveValue('int');
  await expect(reopened.getByRole('spinbutton').nth(0)).toHaveValue('1');
  await expect(reopened.getByRole('spinbutton').nth(1)).toHaveValue('2');
  await reopened.getByRole('button', { name: 'Close' }).click();
});

test('dice roller evaluates an expression', async ({ page }) => {
  await page.goto('/dice');
  const input = page.getByPlaceholder('e.g. (2d6 + 4) / 2');
  await input.fill('(2k6 + 4) / 2');
  await input.press('Enter');

  await expect(
    page.getByRole('paragraph').filter({ hasText: /^\(2d6 \+ 4\) \/ 2$/ }),
  ).toBeVisible();
});

test('dice roller saves and reuses a named roll', async ({ page }) => {
  await page.goto('/dice');
  await page.getByPlaceholder('Longsword').fill('Flame Blade');
  await page.getByPlaceholder('e.g. 2d6 + 4').fill('2k6 + 4');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await page.reload();
  await page.getByRole('button', { name: /^Flame Blade 2k6/ }).click();

  await expect(page.getByText('Flame Blade', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole('paragraph').filter({ hasText: /^2d6 \+ 4$/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close dice result' }).click();
  await page.getByRole('button', { name: 'Remove Flame Blade' }).click();
  await expect(page.getByRole('button', { name: /^Flame Blade 2k6/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByText(/results appear here/)).toBeVisible();
});

test('dice roller builds and rolls a pool in different modes', async ({ page }) => {
  await page.goto('/dice');
  await page.getByRole('button', { name: 'd20', exact: true }).click();
  await page.getByRole('button', { name: 'd20', exact: true }).click();
  await page.getByRole('button', { name: 'd6', exact: true }).click();
  await page.getByRole('button', { name: /2d20/ }).click();
  await page.getByLabel('Modifier').fill('3');
  await page.getByRole('button', { name: 'Advantage', exact: true }).click();
  await page.getByRole('button', { name: 'Roll', exact: true }).first().click();
  await expect(page.getByText(/1d6 \+ 1d20 \+ 3/).first()).toBeVisible();

  await page.getByRole('button', { name: 'Clear pool' }).click();
  await page.getByRole('button', { name: 'Disadvantage', exact: true }).click();
  await expect(page.getByText(/results appear here/)).toHaveCount(0);
});

test('initiative tracker adds a combatant and advances the round', async ({ page }) => {
  await page.goto('/dm/initiative');
  await page.getByPlaceholder('Goblin, Aragorn…').fill('Goblin');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Goblin')).toBeVisible();
  await page.getByRole('button', { name: /Next turn/ }).click();
  await expect(page.getByText(/^Round 1$/)).toBeVisible();
});

test('initiative tracker edits, navigates and removes combatants', async ({ page }) => {
  await page.goto('/dm/initiative');
  await page.getByPlaceholder(/^Goblin, Aragorn/).fill('Orc');
  await page.getByLabel('HP').fill('15');
  await page.getByLabel('AC').fill('13');
  await page.getByText('PC', { exact: true }).click();
  await page.getByPlaceholder(/^Goblin, Aragorn/).press('Enter');

  await expect(page.getByText(/^Orc/)).toBeVisible();
  await expect(page.getByRole('listitem').getByText('PC', { exact: true })).toBeVisible();
  await page.getByPlaceholder('conditions').fill('Prone');
  await page.getByRole('button', { name: /Next turn/ }).click();
  await page.getByRole('button', { name: 'Previous turn' }).click();
  await page.getByRole('button', { name: 'Remove Orc' }).click();

  await expect(
    page.getByText('Add combatants to begin tracking initiative.'),
  ).toBeVisible();
});

test('encounter builder totals monster XP from the bestiary', async ({ page }) => {
  await page.goto('/dm/encounter');
  await page.getByRole('searchbox', { name: 'Search monsters' }).fill('Goblin Warrior');
  await page.getByRole('button', { name: /Goblin Warrior/ }).click();

  await expect(page.getByText('50', { exact: true })).toBeVisible();
});

test('loot generator produces a hoard', async ({ page }) => {
  await page.goto('/dm/loot');
  await page.getByRole('button', { name: 'Tier' }).click();
  await page.getByRole('button', { name: 'Generate Hoard' }).click();
  await expect(page.getByText('Coins', { exact: true })).toBeVisible();
  await expect(page.getByText(/gp$/).first()).toBeVisible();
});

test('loot generator covers party rewards, rerolls and wildcard mode', async ({
  page,
}) => {
  await page.goto('/character');
  await page.getByRole('button', { name: 'New Character' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('Loot Tester');
  await page.getByRole('link', { name: 'Characters' }).click();
  await expect(page.getByText('Loot Tester')).toBeVisible();
  await page.goto('/dm/loot');

  await page.getByRole('button', { name: 'Saved characters' }).click();
  await expect(page.getByText('Loot Tester')).toBeVisible();
  await page.getByRole('button', { name: 'Minor Reward' }).click();
  await expect(page.getByText('Coins', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Major Reward' }).click();
  await expect(page.getByText('Magic Items', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Tier' }).click();
  await page.getByRole('button', { name: /Tier 4/ }).click();
  await page.getByRole('button', { name: 'Generate Hoard' }).click();
  await page.getByRole('button', { name: 'Reroll items' }).click();

  await page.getByRole('button', { name: 'Wildcard' }).click();
  await page.getByRole('button', { name: 'Roll Wildcard Loot' }).click();
  await expect(page.getByText('Coins', { exact: true })).toBeVisible();
});

test('session log displays a transcript and saves notes', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => {
    localStorage.setItem(
      'fumble-sessions',
      JSON.stringify({
        state: {
          sessions: [
            {
              id: 'test-session',
              title: 'Dragon Lair',
              createdAt: 1,
              durationMs: 0,
              notes: '',
              entries: [
                {
                  time: 1,
                  text:
                    'The party entered the dragon lair. The dragon attacked fiercely. ' +
                    'A rogue snuck behind the dragon. The wizard cast fireball at the dragon. ' +
                    'The dragon roared in pain. The knight landed the final blow on the dragon.',
                },
              ],
            },
          ],
          transcriptionLang: 'english',
        },
        version: 3,
      }),
    );
  });
  await page.goto('/session-log');
  await expect(page.getByText(/The party entered the dragon lair/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Session notes' }).fill('The dragon is dead.');
  await expect(page.getByRole('textbox', { name: 'Session notes' })).toHaveValue(
    'The dragon is dead.',
  );
  await page.locator('main input').fill('Dragon Lair Complete');
  await page.getByLabel('Transcription language').selectOption('polish');
  await page.getByRole('button', { name: 'Copy transcript' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  await page.getByRole('button', { name: 'Copy with AI prompt' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toHaveCount(2);
  await page.getByRole('button', { name: 'Delete session' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('No session selected.')).toBeVisible();
});

test('soundboard adds a track and plays one', async ({ page }) => {
  await page.goto('/dm/soundboard');
  await expect(page.getByText('Floating Peace | D&D/TTRPG Music | 1 Hour')).toBeVisible();

  await page.getByPlaceholder(/^https:\/\/www\.youtube\.com/).fill('bad');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Enter a valid YouTube link.')).toBeVisible();
  await page.getByPlaceholder('Tavern brawl music').fill('My Ambience');
  await page
    .getByPlaceholder('https://www.youtube.com/watch?v=…')
    .fill('https://www.youtube.com/watch?v=jNQXAC9IVRw');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('My Ambience')).toBeVisible();

  await page
    .getByRole('button', {
      name: 'Floating Peace | D&D/TTRPG Music | 1 Hour',
      exact: true,
    })
    .click();
  await expect(page.getByText(/Now playing/)).toBeVisible();
  await page.getByRole('button', { name: 'Stop' }).click();
  await page.getByRole('button', { name: 'My tracks' }).click();
  await page.getByRole('button', { name: 'Remove My Ambience' }).click();
  await expect(page.getByText('My Ambience')).toHaveCount(0);
  await page.getByRole('button', { name: 'Restore example', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Restore example' })
    .click();
});

test('wiki renders the campaign and navigates wikilinks', async ({ page }) => {
  await page.goto('/wiki/home');
  await expect(
    page.getByRole('article').getByRole('heading', { name: 'Głód Smoka', level: 1 }),
  ).toBeVisible();

  const sessionLink = page.locator(
    '.wiki-content a[data-wiki-link="glod-smoka/sesja-1-zew-slonca"]',
  );
  await expect(sessionLink).toBeVisible();
  await sessionLink.click();
  await expect(page).toHaveURL(/\/wiki\/glod-smoka\/sesja-1-zew-slonca\/$/);
  await expect(
    page.getByRole('article').getByRole('heading', {
      name: 'Sesja 1 - Zew Słońca',
      level: 1,
    }),
  ).toBeVisible();

  await page.goto('/wiki/aconeth');
  await expect(page.getByRole('heading', { name: 'Aconeth', level: 1 })).toBeVisible();
  await page.locator('.wiki-content img[alt="Aconeth"]').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('img', { name: 'Aconeth' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('wiki chooses campaigns and configures the local Chult map editor', async ({
  page,
}) => {
  await page.goto('/wiki');
  await expect(
    page.getByRole('heading', { name: 'Choose a campaign', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText('Choose a campaign to browse its player-facing wiki and map.'),
  ).toHaveCount(0);
  await page.locator('a[href="/wiki/grobowiec-zaglady/"]').click();
  await expect(page).toHaveURL(/\/wiki\/grobowiec-zaglady\/$/);

  const mapLink = page.locator('a[href="/wiki/grobowiec-zaglady/map/"]');
  await expect(mapLink).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/wiki\/grobowiec-zaglady\/map\/$/),
    mapLink.click(),
  ]);
  await expect(
    page.getByRole('img', { name: 'Chult map with a hex grid' }),
  ).toBeVisible();
  await expect(page.locator('.wiki-chult-map__hex')).toHaveCount(0);
  await expect(page.locator('.wiki-chult-map__hidden-grid')).toBeVisible();
  await expect(page.locator('.wiki-chult-map__hidden-hexes')).toHaveAttribute('d', /M /);
  const gridToggle = page.getByRole('button', { name: 'Show hex grid' });
  await expect(gridToggle).toHaveAttribute('aria-pressed', 'false');
  await gridToggle.click();
  await expect(page.getByRole('button', { name: 'Hide hex grid' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.wiki-chult-map__grid-lines')).toBeVisible();
  await expect(page.locator('.wiki-chult-map__grid-line')).toHaveAttribute('d', /M /);
  await page.getByRole('button', { name: 'Hide hex grid' }).click();
  await expect(page.locator('.wiki-chult-map__grid-lines')).toHaveCount(0);
  const editorButton = page.getByRole('button', { name: 'Edit revealed hexes' });
  await expect(editorButton).toBeVisible();
  await editorButton.click();
  await expect(page.locator('.wiki-chult-map__hex')).toHaveCount(6120);
  const hiddenHex = page
    .locator('.wiki-chult-map__hex:not(.wiki-chult-map__hex--revealed)')
    .first();
  const initialRevealedCount = await page
    .locator('.wiki-chult-map__hex--revealed')
    .count();
  await expect(hiddenHex).toHaveCSS('opacity', '1');
  await expect(hiddenHex).toHaveCSS('background-color', 'rgb(93, 86, 69)');
  await expect
    .poll(() =>
      hiddenHex.evaluate((hex) => getComputedStyle(hex, '::after').backgroundColor),
    )
    .toBe('rgb(247, 240, 215)');
  const zoomIn = page.getByRole('button', { name: 'Zoom in' });
  const zoomOut = page.getByRole('button', { name: 'Zoom out' });
  const resetView = page.getByRole('button', { name: 'Reset map view' });
  await expect(zoomIn).toBeEnabled();
  await expect(zoomOut).toBeDisabled();
  await expect(
    page.getByRole('complementary', { name: 'Local hex editor' }),
  ).toBeVisible();
  await page
    .locator('.wiki-chult-map__hex:not(.wiki-chult-map__hex--revealed)')
    .first()
    .click();
  await expect(page.locator('.wiki-chult-map__hex--revealed')).toHaveCount(
    initialRevealedCount + 1,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Edit revealed hexes' }).click();
  await expect(page.locator('.wiki-chult-map__hex--revealed')).toHaveCount(
    initialRevealedCount + 1,
  );
  await page.getByRole('button', { name: 'Reset local changes' }).click();
  await expect(page.locator('.wiki-chult-map__hex--revealed')).toHaveCount(
    initialRevealedCount,
  );
  await zoomIn.click();
  await expect(page.getByText('125%', { exact: true })).toBeVisible();
  await resetView.click();
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
});

test('books can be searched, filtered and opened', async ({ page }) => {
  await page.goto('/books');
  const search = page.getByRole('searchbox', { name: 'Search books' });
  await search.fill("Player's Handbook");
  const handbook = page.getByRole('link', { name: /Player's Handbook/ }).first();
  await expect(handbook).toBeVisible();
  await handbook.click();
  await expect(page).toHaveURL(/\/books\//);
  await expect(page.getByRole('article')).toContainText("Player's Handbook");
  await page.getByRole('button', { name: 'This chapter' }).click();
  await expect(page.getByRole('button', { name: 'Whole book' })).toBeVisible();
  await page.getByRole('button', { name: 'Full width' }).click();
  await expect(page.getByRole('button', { name: 'Comfortable width' })).toBeVisible();

  if ((page.viewportSize()?.width ?? 0) >= 768) {
    const chapters = page.getByRole('navigation', { name: 'Chapters' });
    const expand = chapters.getByRole('button', { name: /^Expand/ }).first();
    await expand.click();
    await chapters
      .getByRole('button', { name: /^Collapse/ })
      .first()
      .click();
  }
});

test('book credit chapters remain readable without looking like empty pages', async ({
  page,
}) => {
  await page.goto('/books/ps-k/4');
  await expect(page.getByRole('heading', { name: 'Credits' })).toBeVisible();
  await expect(page.getByText('Written by James Wyatt')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, nofollow',
  );
});

test('global search navigates to a compendium entry', async ({ page }) => {
  await page.goto('/');
  if ((page.viewportSize()?.width ?? 1000) < 768) {
    await page.getByRole('button', { name: 'Open menu' }).click();
  }
  await page.getByRole('button', { name: 'Search' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Search' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('searchbox').fill('Fireball');
  await expect(dialog.getByRole('button', { name: /Fireball/ }).first()).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/compendium\/spells\/fireball\/$/);
});

test('Polish global search matches English names and ignores diacritics', async ({
  page,
}) => {
  await page.goto('/pl/');
  if ((page.viewportSize()?.width ?? 1000) < 768) {
    await page.getByRole('button', { name: 'Otwórz menu' }).click();
  }
  await page.getByRole('button', { name: 'Szukaj' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Szukaj' });
  await expect(dialog).toBeVisible();

  await dialog.getByRole('searchbox').fill('Weapon of Warning');
  await expect(dialog.getByRole('button', { name: /Broń Ostrzegawcza/ })).toBeVisible();

  await dialog.getByRole('searchbox').fill('Czlow');
  await expect(dialog.getByRole('button', { name: /Człowiek/ }).first()).toBeVisible();
});

test('homebrew creates, filters and edits an entry', async ({ page }) => {
  await page.goto('/homebrew');
  await page.getByPlaceholder('e.g. Blade of the Rift').fill('Moon Blade');
  await page
    .getByPlaceholder('e.g. Rare weapon (requires attunement)')
    .fill('Rare weapon');
  await page
    .getByPlaceholder(/You deal an extra/)
    .fill('The blade deals radiant damage.');
  await page.getByRole('button', { name: 'Create entry' }).click();

  await expect(page.getByText('Entry created.')).toBeVisible();
  await expect(page.getByText('Moon Blade', { exact: true })).toBeVisible();

  await page.getByPlaceholder('Search entries...').fill('missing');
  await expect(page.getByText('No entries match these filters.')).toBeVisible();
  await page.getByPlaceholder('Search entries...').fill('Moon');
  await page.getByRole('button', { name: 'Edit Moon Blade' }).click();
  await page.getByPlaceholder('e.g. Blade of the Rift').fill('Moon Blade Revised');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Entry updated.')).toBeVisible();
  await expect(page.getByText('Moon Blade Revised', { exact: true })).toBeVisible();
});

test('homebrew imports and deletes a 5etools entry', async ({ page }) => {
  await page.goto('/homebrew');
  await page.getByRole('button', { name: 'Paste JSON' }).click();
  await page
    .getByRole('textbox', {
      name: 'Paste 5etools homebrew JSON (or a Fumble export)',
    })
    .fill(
      JSON.stringify({
        spell: [
          {
            name: 'Starlight Dart',
            source: 'HB',
            level: 1,
            school: 'E',
            entries: ['A dart of starlight strikes the target.'],
          },
        ],
      }),
    );
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByText(/Imported 1 entry from 5etools homebrew/)).toBeVisible();
  await expect(page.getByText('Starlight Dart', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Delete Starlight Dart' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Starlight Dart', { exact: true })).toHaveCount(0);
});

test('homebrew creates a subclass attached to a compendium class', async ({ page }) => {
  await page.goto('/homebrew');
  await page.getByRole('button', { name: 'Subclass', exact: true }).click();
  await page.getByPlaceholder(/^Search for a class/).fill('Wizard');
  await page.getByRole('button', { name: 'Wizard', exact: true }).click();
  await page.getByPlaceholder('e.g. Oath of the Rift').fill('School of Stars');
  await page.getByPlaceholder('e.g. Homebrew').fill('STARS');
  await page
    .getByPlaceholder('At 3rd level, you gain...')
    .fill('At 3rd level, you read the night sky.');
  await page.getByRole('button', { name: 'Create subclass' }).click();

  await expect(page.getByText('Subclass created.')).toBeVisible();
  await expect(page.getByText('School of Stars', { exact: true })).toBeVisible();
  await expect(page.getByText('Subclass of Wizard')).toBeVisible();
});

test('homebrew validates pasted JSON and imports a Fumble export', async ({ page }) => {
  await page.goto('/homebrew');
  await page.getByRole('button', { name: 'Paste JSON' }).click();
  const input = page.getByRole('textbox', {
    name: 'Paste 5etools homebrew JSON (or a Fumble export)',
  });
  await input.fill('{');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByText(/invalid JSON/)).toBeVisible();

  await page.getByRole('button', { name: 'Paste JSON' }).click();
  const unrecognizedInput = page.getByRole('textbox', {
    name: 'Paste 5etools homebrew JSON (or a Fumble export)',
  });
  await unrecognizedInput.fill(JSON.stringify({ notes: [] }));
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByText(/Unrecognized data/)).toBeVisible();

  await page.getByRole('button', { name: 'Paste JSON' }).click();
  await page
    .getByRole('textbox', {
      name: 'Paste 5etools homebrew JSON (or a Fumble export)',
    })
    .fill(
      JSON.stringify({
        entries: [
          {
            kind: 'manual',
            id: 'exported-feat',
            category: 'feats',
            name: 'Exported Feat',
            subtitle: 'A saved feat',
            body: 'Imported from another browser.',
            createdAt: 1,
          },
        ],
      }),
    );
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByText('Imported 1 entry.')).toBeVisible();
  await expect(page.getByText('Exported Feat', { exact: true })).toBeVisible();
});
