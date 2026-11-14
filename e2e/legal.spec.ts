import { expect, test } from './fixtures';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string };
const releaseId = `version-${version.replaceAll('.', '-')}`;

for (const locale of ['', '/pl']) {
  test(`footer, site map and release navigation ${locale || 'en'}`, async ({ page }) => {
    await page.goto(`${locale}/legal/`);
    const footer = page.getByRole('contentinfo');
    await expect(footer).toHaveCount(1);
    await expect(page.locator('main footer')).toHaveCount(0);
    await footer.getByRole('link', { name: locale ? 'Mapa strony' : 'Site map' }).click();
    const catalogs = page.locator('main a[href*="view=all"]');
    await expect(catalogs).toHaveCount(34);
    await catalogs.first().click();
    await expect(page).toHaveURL(/view=all/);
    await expect(page.locator('ul[data-category]')).toBeVisible();
    await footer
      .getByRole('link', { name: locale ? /Lista zmian wersji/ : /Version .* changelog/ })
      .click();
    await expect(page).toHaveURL(new RegExp(`changelog/#${releaseId}$`));
    await expect(page.locator(`#${releaseId}`)).toBeInViewport();
  });

  test(`legal documents and narrow footer ${locale || 'en'}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    for (const path of [
      '',
      'privacy/',
      'connections/',
      'terms/',
      'licenses/',
      'accessibility/',
      'contact/',
    ]) {
      await page.goto(`${locale}/legal/${path}`);
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('main time')).toHaveAttribute('datetime', /^2026-/);
      await expect(page.locator('main')).not.toContainText('[[');
      const measurements = await page.evaluate(() => {
        const main = document.querySelector('main')!;
        const footer = document.querySelector('footer')!;
        return {
          width: document.documentElement.scrollWidth,
          innerWidth,
          overlap:
            main.getBoundingClientRect().bottom - footer.getBoundingClientRect().top,
          targets: [...footer.querySelectorAll('a')].map(
            (a) => a.getBoundingClientRect().height,
          ),
        };
      });
      expect(measurements.width).toBeLessThanOrEqual(measurements.innerWidth);
      expect(measurements.overlap).toBeLessThanOrEqual(1);
      expect(measurements.targets.every((height) => height >= 44)).toBe(true);
    }
    const version = page.locator('footer a[href*="changelog"]');
    await version.press('Shift+Tab');
    await expect(page.locator('footer a[href$="legal/contact/"]')).toBeFocused();
  });
}
