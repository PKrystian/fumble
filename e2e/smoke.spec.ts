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
  const input = page.getByPlaceholder('e.g. 2d6 + 1d8 + 3');
  await input.fill('2d6');
  await input.press('Enter');

  await expect(page.getByText('2d6', { exact: true })).toBeVisible();
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

test('session log captures a transcript and summarizes it', async ({ page }) => {
  await page.goto('/session-log');
  await page.getByRole('button', { name: 'Start a new session' }).click();

  const transcript = page.getByPlaceholder(
    'Your session transcript will appear here as you speak…',
  );
  await transcript.fill(
    'The party entered the dragon lair. The dragon attacked fiercely. ' +
      'A rogue snuck behind the dragon. The wizard cast fireball at the dragon. ' +
      'The dragon roared in pain. The knight landed the final blow on the dragon.',
  );
  await page.getByRole('button', { name: 'Summarize', exact: true }).click();
  await expect(page.getByText('Summary', { exact: true })).toBeVisible();
});

test('soundboard adds a track and plays one', async ({ page }) => {
  await page.goto('/dm/soundboard');
  await expect(page.getByText('Me at the zoo music 123')).toBeVisible();

  await page.getByPlaceholder('Tavern brawl music').fill('My Ambience');
  await page
    .getByPlaceholder('https://www.youtube.com/watch?v=…')
    .fill('https://www.youtube.com/watch?v=jNQXAC9IVRw');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('My Ambience')).toBeVisible();

  await page.getByRole('button', { name: 'Boss Battle', exact: true }).click();
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
