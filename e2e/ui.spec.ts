import { expect, test } from './fixtures';

test('tools and catalogs reflow at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const route of [
    '/dice/',
    '/dm/initiative/',
    '/dm/encounter/',
    '/dm/loot/',
    '/compendium/spells/',
    '/homebrew/',
    '/legal/',
  ]) {
    await page.goto(route);
    const dimensions = await page
      .locator('main')
      .evaluate((main) => ({ width: main.clientWidth, content: main.scrollWidth }));
    expect(dimensions.content, route).toBeLessThanOrEqual(dimensions.width + 1);
  }
});

for (const locale of ['', '/pl']) {
  for (const route of [
    '/character',
    '/dice',
    '/books',
    '/homebrew',
    '/fumble-homebrew',
    '/data',
    '/dm/initiative',
    '/dm/encounter',
    '/dm/loot',
    '/dm/soundboard',
    '/session-log',
    '/wiki',
    '/legal',
    '/legal/privacy',
    '/legal/connections',
    '/legal/terms',
    '/legal/licenses',
    '/legal/accessibility',
    '/legal/contact',
  ]) {
    test(`shared heading and reflow: ${locale}${route}`, async ({ page }) => {
      await page.goto(`${locale}${route}/`);
      const heading = page.locator('main h1').first();
      await expect(heading).toBeVisible();
      await expect(heading).toHaveCSS('font-size', '30px');
      const dimensions = await page
        .locator('main')
        .evaluate((main) => ({ width: main.clientWidth, content: main.scrollWidth }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.width + 1);
    });
  }
}

test('category navigation stays compact and filters contain keyboard focus', async ({
  page,
}) => {
  await page.goto('/compendium/spells/');
  const navigation = page.getByRole('navigation', { name: 'Compendium categories' });
  await expect(
    navigation.getByRole('link', { name: 'Spells', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  if ((page.viewportSize()?.width ?? 1000) < 768) {
    expect((await navigation.boundingBox())!.height).toBeLessThan(80);
  }
  await page.getByRole('button', { name: /^Filters/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Filters', exact: true });
  await expect(dialog).toBeVisible();
  const search = dialog.getByRole('searchbox');
  await expect(search).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(
    true,
  );
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: /^Filters/ })).toBeFocused();
});

test('initiative name remains usable on a narrow screen', async ({ page }) => {
  await page.goto('/dm/initiative/');
  const name = page.getByRole('textbox', { name: 'Name', exact: true });
  await expect(name).toBeVisible();
  expect((await name.boundingBox())!.width).toBeGreaterThan(200);
  await name.fill('A character with a readable name');
  await expect(name).toHaveValue('A character with a readable name');
});

test('failed artwork leaves the detail title and no blank image block', async ({
  page,
}) => {
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() === 'image') await route.abort();
    else await route.continue();
  });
  await page.goto('/compendium/bestiary/aarakocra/');
  const title = page.getByRole('heading', { level: 1, name: 'Aarakocra', exact: true });
  await expect(title).toBeVisible();
  const image = page.locator('img[alt="Aarakocra"]');
  if (await image.count()) await expect(image.first()).not.toBeVisible();
  expect((await title.boundingBox())!.y).toBeLessThan(420);
});

test('reduced motion also disables smooth scrolling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/dice/');
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
});
