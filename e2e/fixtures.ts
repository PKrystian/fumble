import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test as base } from '@playwright/test';

export const test = base;

test.afterEach(async ({ page }) => {
  if (!process.env.E2E_COVERAGE) return;
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
  await writeFile(`${directory}/${randomUUID()}.json`, JSON.stringify(coverage), 'utf8');
});

export { expect };
