import { expect, test } from '@playwright/test';

test('home page loads and shows the app name', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome to');
});

test('compendium loads spells and opens an entry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Compendium' }).first().click();

  await expect(page).toHaveURL(/\/compendium\/species$/);

  await page.getByRole('link', { name: 'Spells', exact: true }).click();
  await expect(page).toHaveURL(/\/compendium\/spells$/);

  await page.getByRole('searchbox').fill('fireball');
  await page.getByRole('link', { name: /^Fireball/ }).click();

  await expect(page).toHaveURL(/\/compendium\/spells\/fireball$/);
  await expect(page.getByRole('heading', { name: 'Fireball' })).toBeVisible();
});

test('compendium links to older printings', async ({ page }) => {
  await page.goto('/compendium/spells/fireball');
  await expect(page.getByText('Source:')).toContainText("Player's Handbook (2024)");

  await page.getByRole('link', { name: "Player's Handbook (2014)" }).click();
  await expect(page).toHaveURL(/\/compendium\/spells\/fireball-phb$/);
  await expect(page.getByText('Source:')).toContainText("Player's Handbook (2014)");
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
  await expect(page.getByRole('link', { name: /^Fireball/ })).toHaveCount(0);
});

test('can create a character and edit core stats', async ({ page }) => {
  await page.goto('/character');
  await page.getByRole('button', { name: 'New Character' }).click();
  await expect(page).toHaveURL(/\/character\/[a-f0-9-]+$/);

  await page.getByRole('spinbutton', { name: 'Strength' }).fill('16');
  await expect(page.getByText('+3', { exact: true }).first()).toBeVisible();

  await page.getByRole('textbox', { name: 'Name' }).fill('Thorin');
  await page.getByRole('link', { name: 'Characters' }).click();
  await expect(page.getByText('Thorin')).toBeVisible();
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
});

test('initiative tracker adds a combatant and advances the round', async ({ page }) => {
  await page.goto('/dm/initiative');
  await page.getByPlaceholder('Goblin, Aragorn…').fill('Goblin');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Goblin')).toBeVisible();
  await page.getByRole('button', { name: /Next turn/ }).click();
  await expect(page.getByText('Round')).toContainText('1');
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

test('session log displays a transcript and saves notes', async ({ page }) => {
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
});

test('soundboard adds a track and plays one', async ({ page }) => {
  await page.goto('/dm/soundboard');
  await expect(page.getByText('Floating Peace | D&D/TTRPG Music | 1 Hour')).toBeVisible();

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
});

test('wiki hides secrets and navigates wikilinks', async ({ page }) => {
  await page.goto('/wiki/silverhaven');
  await expect(
    page.getByRole('heading', { name: 'Silverhaven', level: 1 }),
  ).toBeVisible();

  await expect(page.getByText('Not yet unlocked')).toBeVisible();
  await expect(page.getByText(/doppelganger/)).toHaveCount(0);

  await expect(page.getByRole('link', { name: 'Secret Plot' })).toHaveCount(0);

  await page.locator('.wiki-content a', { hasText: 'Sunken Temple' }).click();
  await expect(page).toHaveURL(/\/wiki\/the-sunken-temple$/);
});
