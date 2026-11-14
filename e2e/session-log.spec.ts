import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

async function createSession(page: Page, pl: boolean, title: string) {
  await page
    .getByRole('button', {
      name: pl ? 'Rozpocznij nową sesję' : 'Start a new session',
      exact: true,
    })
    .click();
  await page
    .getByRole('textbox', { name: pl ? 'Tytuł sesji' : 'Session title' })
    .fill(title);
}
async function selectSession(page: Page, pl: boolean, title: string) {
  if ((page.viewportSize()?.width ?? 1280) < 768)
    await page.getByRole('button', { name: pl ? /^Sesje \(/ : /^Sessions \(/ }).click();
  await page.getByRole('button', { name: new RegExp(`^${title}`) }).click();
}
async function openTranscript(page: Page, pl: boolean) {
  await page
    .getByRole('navigation', { name: pl ? 'Widoki sesji' : 'Session views' })
    .getByRole('button', { name: pl ? /^Transkrypcja/ : /^Transcript/ })
    .click();
}
async function installSpeech(page: Page) {
  await page.addInitScript(() => {
    type TestWindow = Window & {
      journalNative?: TestRecognition;
      journalDelay?: boolean;
      journalEmit?: (text: string) => void;
      journalFinish?: () => void;
    };
    const target = window as TestWindow;
    class TestRecognition {
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      lang = '';
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onresult:
        | ((event: {
            resultIndex: number;
            results: Array<{ isFinal: boolean; 0: { transcript: string } }>;
          }) => void)
        | null = null;
      start() {
        target.journalNative = this;
        this.onstart?.();
      }
      stop() {
        if (!target.journalDelay) this.onend?.();
      }
    }
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: TestRecognition,
    });
    target.journalEmit = (text) =>
      target.journalNative?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: text } }],
      });
    target.journalFinish = () => target.journalNative?.onend?.();
    target.journalDelay = true;
  });
}

for (const locale of ['', '/pl']) {
  const pl = Boolean(locale);
  test(`journal shares editable campaign context, copies notes and exports files: ${locale || 'en'}`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`${locale}/session-log/`);
    await createSession(page, pl, 'Ring session');
    await page
      .getByRole('textbox', { name: pl ? 'Notatki z sesji' : 'Session notes' })
      .fill('The party found a ring.');
    await page
      .getByRole('button', {
        name: pl ? 'Zarządzaj stałymi informacjami' : 'Manage campaign context',
        exact: true,
      })
      .click();
    const manager = page.getByRole('dialog', {
      name: pl ? 'Stałe informacje o kampanii' : 'Campaign context',
      exact: true,
    });
    await manager
      .getByLabel(pl ? 'Nazwa nowego zestawu' : 'New collection name')
      .fill('Fellowship');
    await manager
      .getByRole('button', { name: pl ? 'Utwórz zestaw' : 'Create collection' })
      .click();
    await manager
      .getByLabel(pl ? 'Wspólne informacje' : 'Shared facts')
      .fill('Aragorn is played by X.');
    await manager
      .getByLabel(pl ? 'Nazwa zestawu' : 'Collection name', { exact: true })
      .fill('The Ring');
    await manager
      .getByRole('button', { name: pl ? 'Zamknij' : 'Close', exact: true })
      .first()
      .click();
    await page
      .locator('summary')
      .filter({ hasText: pl ? 'Stałe informacje o kampanii' : 'Campaign context' })
      .click();
    await page
      .getByRole('checkbox', {
        name: pl
          ? 'Dołącz „The Ring” do tej sesji'
          : 'Include "The Ring" in this session',
      })
      .check();
    await page
      .getByLabel(pl ? 'Nowa wspólna informacja' : 'New shared fact')
      .fill('Rivendell is home to Elrond.');
    await page
      .getByRole('button', {
        name: pl ? 'Dopisz do wspólnych informacji' : 'Add to shared facts',
      })
      .click();
    await page
      .getByRole('button', {
        name: pl ? 'Kopiowanie i eksport' : 'Copy and export',
        exact: true,
      })
      .click();
    const exported = page.getByRole('dialog', {
      name: pl ? 'Kopiowanie i eksport' : 'Copy and export',
      exact: true,
    });
    await expect(exported.getByRole('textbox')).toHaveValue(
      /Aragorn is played by X\.[\s\S]*Rivendell/,
    );
    await exported
      .getByRole('button', {
        name: pl ? 'Kopiuj z promptem AI' : 'Copy with AI prompt',
        exact: true,
      })
      .click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain('Aragorn is played by X.');
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain('The party found a ring.');
    const downloadEvent = page.waitForEvent('download');
    await exported
      .getByRole('button', { name: pl ? 'Pobierz Markdown' : 'Download Markdown' })
      .click();
    const download = await downloadEvent;
    const content = await readFile((await download.path())!, 'utf8');
    expect(content).toContain('### The Ring');
    expect(content).toContain('The party found a ring.');
    await exported.getByRole('checkbox').uncheck();
    await expect(exported.getByRole('textbox')).not.toHaveValue(/Aragorn/);
    await exported
      .getByRole('button', { name: pl ? 'Zamknij' : 'Close', exact: true })
      .first()
      .press('Escape');
    await expect(exported).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole('textbox', { name: pl ? 'Tytuł sesji' : 'Session title' }),
    ).toHaveValue('Ring session');
    await page
      .getByRole('button', {
        name: pl ? 'Kopiowanie i eksport' : 'Copy and export',
        exact: true,
      })
      .click();
    await expect(page.getByRole('dialog').getByRole('textbox')).toHaveValue(/Aragorn/);
    const dimensions = await page.evaluate(() => ({
      width: innerWidth,
      document: document.documentElement.scrollWidth,
      dialog: document.querySelector('[role="dialog"]')!.getBoundingClientRect().width,
    }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.width);
    expect(dimensions.dialog).toBeLessThanOrEqual(320);
  });

  test(`journal keeps native speech, final results and time with the recording session: ${locale || 'en'}`, async ({
    page,
  }) => {
    await installSpeech(page);
    await page.goto(`${locale}/session-log/`);
    await createSession(page, pl, 'Capture A');
    await page
      .getByRole('button', { name: pl ? 'Nowa sesja' : 'New session', exact: true })
      .click();
    await page
      .getByRole('textbox', { name: pl ? 'Tytuł sesji' : 'Session title' })
      .fill('Capture B');
    await selectSession(page, pl, 'Capture A');
    await openTranscript(page, pl);
    await page
      .getByLabel(pl ? 'Tryb rozpoznawania mowy' : 'Speech recognition mode', {
        exact: true,
      })
      .selectOption('browser');
    await page
      .getByRole('button', {
        name: pl ? 'Rozpocznij transkrypcję' : 'Start transcription',
        exact: true,
      })
      .click();
    await expect(
      page.getByRole('button', {
        name: pl ? 'Usuń sesję' : 'Delete session',
        exact: true,
      }),
    ).toBeDisabled();
    await selectSession(page, pl, 'Capture B');
    await page.evaluate(() =>
      (window as Window & { journalEmit: (text: string) => void }).journalEmit(
        'Speech belongs to A',
      ),
    );
    await page
      .getByRole('button', { name: pl ? 'Zatrzymaj' : 'Stop', exact: true })
      .click();
    await expect(
      page.getByText(pl ? 'Kończenie transkrypcji' : 'Finishing transcription', {
        exact: true,
      }),
    ).toBeVisible();
    await page.evaluate(() => {
      const target = window as Window & {
        journalEmit: (text: string) => void;
        journalFinish: () => void;
      };
      target.journalEmit('Final words for A');
      target.journalFinish();
    });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem('fumble-sessions')!).state.sessions.find(
              (session: { title: string }) => session.title === 'Capture A',
            ).entries.length,
        ),
      )
      .toBe(2);
    const sessions = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('fumble-sessions')!).state.sessions as Array<{
          title: string;
          durationMs: number;
          entries: unknown[];
        }>,
    );
    expect(
      sessions.find((session) => session.title === 'Capture A')!.durationMs,
    ).toBeGreaterThan(0);
    expect(sessions.find((session) => session.title === 'Capture B')).toMatchObject({
      durationMs: 0,
      entries: [],
    });
    await page.reload();
    await expect(
      page.getByRole('textbox', { name: pl ? 'Tytuł sesji' : 'Session title' }),
    ).toHaveValue('Capture B');
    await openTranscript(page, pl);
    await page
      .getByRole('button', {
        name: pl ? 'Rozpocznij transkrypcję' : 'Start transcription',
        exact: true,
      })
      .click();
    if ((page.viewportSize()?.width ?? 1280) < 768)
      await page
        .getByRole('button', { name: pl ? 'Otwórz menu' : 'Open menu', exact: true })
        .click();
    await page
      .getByRole('link', { name: pl ? 'Kopia danych' : 'Data Backup', exact: true })
      .click();
    await expect(
      page.getByRole('dialog', {
        name: pl ? 'Kończenie przed zmianą strony' : 'Finishing before leaving',
        exact: true,
      }),
    ).toBeVisible();
    await page.evaluate(() =>
      (window as Window & { journalFinish: () => void }).journalFinish(),
    );
    await expect(page).toHaveURL(/\/data\/$/);
  });

  test(`journal recovers current memory with an emergency backup after a quota error: ${locale || 'en'}`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const write = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (
          (window as Window & { journalQuota?: boolean }).journalQuota &&
          key === 'fumble-sessions'
        )
          throw new DOMException('Quota', 'QuotaExceededError');
        write.call(this, key, value);
      };
    });
    await page.goto(`${locale}/session-log/`);
    await createSession(page, pl, 'Emergency');
    await page.evaluate(() => {
      (window as Window & { journalQuota?: boolean }).journalQuota = true;
    });
    await page
      .getByRole('textbox', { name: pl ? 'Notatki z sesji' : 'Session notes' })
      .fill('Current unsaved knowledge');
    await expect(
      page.getByRole('alert').filter({
        hasText: pl
          ? 'Nie udało się zapisać zmian na tym urządzeniu.'
          : 'Changes could not be saved on this device.',
      }),
    ).toBeVisible();
    const event = page.waitForEvent('download');
    await page
      .getByRole('button', {
        name: pl ? 'Pobierz aktualną kopię danych' : 'Download current data backup',
        exact: true,
      })
      .click();
    const file = await event;
    const backup = JSON.parse(await readFile((await file.path())!, 'utf8')) as {
      data: Record<string, string>;
    };
    expect(JSON.parse(backup.data['fumble-sessions']!).state.sessions[0].notes).toBe(
      'Current unsaved knowledge',
    );
    await page.evaluate(() => {
      (window as Window & { journalQuota?: boolean }).journalQuota = false;
    });
    await page
      .getByRole('button', { name: pl ? 'Ponów zapis' : 'Retry saving', exact: true })
      .click();
    await page.reload();
    await expect(
      page.getByRole('textbox', { name: pl ? 'Notatki z sesji' : 'Session notes' }),
    ).toHaveValue('Current unsaved knowledge');
  });

  test(`journal paginates long lists, searches content and restores keyboard focus: ${locale || 'en'}`, async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        'fumble-sessions',
        JSON.stringify({
          version: 4,
          state: {
            contexts: [],
            selectedSessionId: 's0',
            transcriptionLang: '',
            transcriptionMode: 'auto',
            sessions: Array.from({ length: 52 }, (_, index) => ({
              id: `s${index}`,
              title: `Journal ${index}`,
              createdAt: 1000 + index,
              updatedAt: index,
              durationMs: 0,
              notes: `Secret clue ${index}`,
              entries: [],
            })),
          },
        }),
      ),
    );
    await page.goto(`${locale}/session-log/`);
    const mobile = (page.viewportSize()?.width ?? 1280) < 768;
    const trigger = page.getByRole('button', { name: pl ? /^Sesje \(/ : /^Sessions \(/ });
    if (mobile) await trigger.click();
    const list = mobile
      ? page.getByRole('dialog', { name: pl ? 'Sesje' : 'Sessions', exact: true })
      : page.locator('main aside');
    await expect(list.locator('button[aria-pressed]')).toHaveCount(50);
    await list
      .getByRole('button', { name: pl ? 'Następna strona' : 'Next page', exact: true })
      .click();
    await expect(list.locator('button[aria-pressed]')).toHaveCount(2);
    await list.getByRole('searchbox').fill('Secret clue 51');
    await expect(list.locator('button[aria-pressed]')).toHaveCount(1);
    if (mobile) {
      await list.getByRole('searchbox').press('Escape');
      await expect(trigger).toBeFocused();
    }
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });
}
