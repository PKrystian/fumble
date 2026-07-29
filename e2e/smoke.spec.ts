import { expect, test } from './fixtures';

test('home page loads and shows the app name', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fumble');
});

test('legal pages are available in both languages', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Privacy policy' }).click();
  await expect(page).toHaveURL(/\/legal\/privacy$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy policy');

  await page.goto('/pl/legal/connections');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Połączenia zewnętrzne',
  );
  await expect(page.getByRole('heading', { name: 'GitHub Pages' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hugging Face' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'YouTube' })).toBeVisible();

  await page.goto('/legal/accessibility');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Accessibility');

  await page.goto('/pl/legal/contact');
  await expect(page.getByRole('link', { name: /Krystian Pińczak/ })).toBeVisible();
});

test('compendium loads spells and opens an entry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Species' }).first().click();

  await expect(page).toHaveURL(/\/compendium\/species$/);

  await page
    .getByRole('navigation', { name: 'Compendium categories' })
    .getByRole('link', { name: 'Spells', exact: true })
    .click();
  await expect(page).toHaveURL(/\/compendium\/spells$/);

  await page.getByRole('searchbox').fill('fireball');
  await page.getByRole('link', { name: /^Fireball/ }).click();

  await expect(page).toHaveURL(/\/compendium\/spells\/fireball\?q=fireball$/);
  await expect(page.getByRole('heading', { name: 'Fireball' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('searchbox')).toHaveValue('fireball');
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
  await page.getByRole('button', { name: 'Delete Imported Hero' }).click();
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
  await page.getByRole('button', { name: 'Settings' }).click();

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
  await expect(page).toHaveURL(/\/compendium\/spells\/fireball$/);
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
