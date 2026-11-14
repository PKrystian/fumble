import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test as base, type Page } from '@playwright/test';

export const test = base.extend<{ collectCoverage: void }>({
  collectCoverage: [
    async ({ page }, use) => {
      await use();
      if (!process.env.E2E_COVERAGE || page.isClosed()) return;
      const coverage = await page.evaluate(
        () =>
          (
            window as typeof window & {
              __coverage__?: Record<string, unknown>;
            }
          ).__coverage__,
      );
      if (!coverage) return;
      const directory = 'coverage/e2e/raw';
      await mkdir(directory, { recursive: true });
      await writeFile(
        `${directory}/${randomUUID()}.json`,
        JSON.stringify(coverage),
        'utf8',
      );
    },
    { auto: true },
  ],
});

export { expect };

export async function chooseToolBackup(
  page: Page,
  button: string,
  file: string | { name: string; mimeType: string; buffer: Buffer },
) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: button, exact: true }).click();
  await (await chooser).setFiles(file);
}
