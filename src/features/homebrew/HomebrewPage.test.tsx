import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '@/features/ui/ConfirmDialog';
import { HomebrewPage } from './HomebrewPage';
import {
  HOMEBREW_KEY,
  serializeHomebrew,
  useHomebrewStore,
  type HomebrewManualEntry,
} from './store';

vi.mock('@/features/character/CompendiumPicker', () => ({
  CompendiumPicker: ({
    onPick,
  }: {
    onPick: (item: { id: string; name: string; englishName: string }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onPick({ id: 'wizard', name: 'Czarodziej', englishName: 'Wizard' })}
    >
      Wizard
    </button>
  ),
}));
vi.mock('@/features/ui/ImageCropperModal', () => ({
  ImageCropperModal: ({
    onCancel,
    onSave,
  }: {
    onCancel: () => void;
    onSave: (value: string) => void;
  }) => (
    <div>
      <button type="button" onClick={onCancel}>
        Cancel crop
      </button>
      <button type="button" onClick={() => onSave(artwork)}>
        Save crop
      </button>
    </div>
  ),
}));

const artwork = 'data:image/jpeg;base64,' + 'a'.repeat(4096);
const manual = (name: string, id = name): HomebrewManualEntry => ({
  kind: 'manual',
  id,
  name,
  category: 'items',
  subtitle: '',
  body: '',
  createdAt: 1,
});
const seed = (entries: Parameters<typeof serializeHomebrew>[0]) => {
  localStorage.setItem(HOMEBREW_KEY, serializeHomebrew(entries));
  useHomebrewStore.getState().loadStored();
};
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const click = (name: string | RegExp) => fireEvent.click(button(name));
const type = (name: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(name), { target: { value } });
const dialog = () => within(screen.getByRole('dialog'));
const entries = () => useHomebrewStore.getState().entries;
const waitClosed = () =>
  waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

function renderPage(path = '/homebrew') {
  const router = createMemoryRouter(
    [
      {
        path: '/homebrew',
        element: (
          <>
            <HomebrewPage />
            <ConfirmDialog />
          </>
        ),
      },
      {
        path: '/pl/homebrew',
        element: (
          <>
            <HomebrewPage />
            <ConfirmDialog />
          </>
        ),
      },
      { path: '/other', element: <h1>Other page</h1> },
    ],
    { initialEntries: [path] },
  );
  return { ...render(<RouterProvider router={router} />), router };
}

const importText = (text: string) => {
  type(/Paste 5etools/, text);
  click('Preview pasted JSON');
};

function choose(container: HTMLElement, text: string) {
  const file = new File([text], 'test.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) });
  fireEvent.change(container.querySelector('input[accept*="json"]')!, {
    target: { files: [file] },
  });
}

const spell = {
  id: 'ember',
  name: 'Ember',
  source: 'HB',
  srd: false,
  entries: ['One sentence.'],
};

describe('personal Homebrew', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    useHomebrewStore.getState().loadStored();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('creates bilingual entries with artwork and saves edits using the same ID', async () => {
    const { container } = renderPage();
    expect(screen.getByText(/No homebrew yet/)).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Name' })).toBeNull();
    button('New entry').focus();
    click('New entry');
    expect(dialog().getByRole('textbox', { name: 'Name' })).toHaveFocus();
    click('Create entry');
    expect(screen.getByRole('alert')).toHaveTextContent(/Enter a name/);
    type('Name', '  Arcane Gift  ');
    type('Category', 'feats');
    type('Subtitle', 'Rare boon');
    type(/^Description/, 'Base text');
    click('Polski');
    type('Name', 'Dar Magii');
    click('Base');
    const input = container.querySelector('input[accept="image/*"]')!;
    fireEvent.change(input, { target: { files: [new File(['x'], 'crop.png')] } });
    click('Cancel crop');
    fireEvent.change(input, { target: { files: [new File(['x'], 'crop.png')] } });
    click('Save crop');
    click('Create entry');
    await waitClosed();
    const id = entries()[0]!.id;
    expect(entries()[0]).toMatchObject({
      kind: 'manual',
      name: 'Arcane Gift',
      subtitle: 'Rare boon',
      image: artwork,
      translations: { pl: { name: 'Dar Magii', body: '' } },
    });
    expect(button('New entry')).toHaveFocus();
    click('Edit Arcane Gift');
    type('Name', 'New name');
    click('Remove');
    click('Save changes');
    await waitClosed();
    expect(entries()[0]).toMatchObject({ id, name: 'New name', image: '' });
    expect(screen.getByText('Entry updated.')).toBeVisible();
  });

  it('keeps search and sort independent and finds alternate Polish names and metadata', async () => {
    seed([
      {
        ...manual('Arcane Gift', 'first'),
        translations: { pl: { name: 'Żółty Dar', subtitle: '', body: '' } },
        subtitle: 'Ancient relic',
      },
      { ...manual('Newest', 'second'), createdAt: 2 },
    ]);
    const { router } = renderPage('/pl/homebrew?sort=date');
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Newest',
      'Żółty Dar',
    ]);
    const search = screen.getByRole('searchbox', { name: 'Szukaj wpisów...' });
    for (const query of [' zolty DAR ', 'ARCANE gift', 'ancient relic']) {
      fireEvent.change(search, { target: { value: query } });
      expect(screen.getByRole('link', { name: 'Żółty Dar' })).toBeVisible();
    }
    fireEvent.change(screen.getByLabelText('Filtruj według stanu tłumaczenia'), {
      target: { value: 'untranslated' },
    });
    await screen.findByText(/Żaden wpis nie pasuje/);
    click('Zresetuj filtry');
    expect(search).toHaveValue('ancient relic');
    expect(router.state.location.search).toContain('sort=date');
    click('Wyczyść wyszukiwanie');
    expect(search).toHaveValue('');
  });

  it('pages large lists and resets the page on search', async () => {
    seed(
      Array.from({ length: 55 }, (_, index) =>
        manual('Entry ' + index, 'entry-' + index),
      ),
    );
    const { router } = renderPage();
    expect(screen.getAllByRole('listitem')).toHaveLength(50);
    click('Next');
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(5));
    expect(router.state.location.search).toContain('page=2');
    expect(screen.getByRole('region', { name: 'Your entries' })).toHaveFocus();
    click('Previous');
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(50));
    expect(router.state.location.search).not.toContain('page=');
    click('Next');
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(5));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Entry 10' } });
    expect(router.state.location.search).not.toContain('page=');
    expect(screen.getByRole('link', { name: 'Entry 10' })).toBeVisible();
  });

  it('confirms discarding edits, prevents accidental navigation and restores focus', async () => {
    seed([manual('Draft', 'draft')]);
    const { router } = renderPage();
    const edit = button('Edit Draft');
    edit.focus();
    click('Edit Draft');
    type('Name', 'Changed');
    fireEvent.keyDown(window, { key: 'Escape' });
    const warning = within(await screen.findByRole('alertdialog'));
    expect(warning.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    fireEvent.click(warning.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByLabelText('Name')).toHaveValue('Changed');
    await act(async () => {
      await router.navigate('/other');
    });
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Discard changes',
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Other page' })).toBeVisible();
    expect(entries()[0]!.id).toBe('draft');
  });

  it('confirms named deletion, keeps the row on Cancel and offers undo', async () => {
    seed([manual('One', 'one'), manual('Two', 'two')]);
    renderPage();
    button('Delete One').focus();
    click('Delete One');
    let warning = within(await screen.findByRole('alertdialog'));
    expect(warning.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(button('Delete One')).toHaveFocus());
    click('Delete One');
    warning = within(await screen.findByRole('alertdialog'));
    fireEvent.click(warning.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(button('Edit Two')).toHaveFocus());
    click('Undo deletion');
    expect(await screen.findByRole('link', { name: 'One' })).toBeVisible();
    expect(entries()).toHaveLength(2);
  });

  it('saves and edits individual subclass features and links by stable identifiers', async () => {
    renderPage();
    click('New entry');
    click('Subclass');
    click('Create subclass');
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a parent class');
    click('Wizard');
    type('Subclass name', 'Archivist');
    type('Source (optional)', 'HB');
    type(/^Features/, 'First feature');
    click('Add feature');
    const feature = within(screen.getByRole('group', { name: 'Feature 2' }));
    fireEvent.change(feature.getByLabelText('Level'), { target: { value: '10' } });
    fireEvent.change(feature.getByLabelText('Feature name'), {
      target: { value: 'Hidden record' },
    });
    click('Create subclass');
    await waitClosed();
    expect(screen.getByRole('link', { name: 'Archivist' })).toHaveAttribute(
      'href',
      expect.stringContaining('/compendium/classes/wizard/'),
    );
    expect(entries()[0]).toMatchObject({
      parentClassId: 'wizard',
      subclass: { features: [{ level: 3 }, { level: 10, name: 'Hidden record' }] },
    });
    click('Edit Archivist');
    click('Remove feature 2');
    click('Save changes');
    await waitClosed();
    expect(entries()[0]).toMatchObject({ subclass: { features: [{ level: 3 }] } });
  });

  it('previews import, keeps malformed paste and reports skipped and duplicate entries', async () => {
    renderPage();
    click('Import');
    importText('{');
    expect(screen.getByRole('alert')).toHaveTextContent('not valid JSON');
    expect(dialog().getByRole('textbox')).toHaveValue('{');
    importText('{"notes":[]}');
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a 5etools');
    const document = JSON.stringify({
      spell: [spell, { name: 'Copy', _copy: {} }, null],
      unknown: [{}],
    });
    importText(document);
    expect(entries()).toHaveLength(0);
    expect(screen.getByText('Invalid entries skipped: 1')).toBeVisible();
    expect(screen.getByText('Unsupported entries skipped: 1')).toBeVisible();
    expect(screen.getByText(/reference other entries: 1/)).toBeVisible();
    click('Add entries');
    await waitClosed();
    expect(entries()).toHaveLength(1);
    click('Import');
    importText(document);
    expect(screen.getByText('Duplicates skipped: 1')).toBeVisible();
    expect(button('Add entries')).toBeDisabled();
  });

  it('validates category fields and retains both languages when the source changes', async () => {
    seed([
      {
        kind: 'imported',
        id: 'entry',
        name: spell.name,
        category: 'spells',
        baseLocale: 'en',
        data: spell,
        translations: { pl: { ...spell, name: 'Żar' } },
        createdAt: 1,
      },
    ]);
    renderPage();
    click('Edit Ember');
    type('Source JSON', '{');
    click('Save changes');
    expect(screen.getByRole('alert')).toHaveTextContent('English contains invalid JSON');
    type('Source JSON', JSON.stringify({ ...spell, entries: [null], classes: 'wrong' }));
    click('Save changes');
    expect(screen.getByRole('alert')).toHaveTextContent('English has fields');
    type('Source JSON', JSON.stringify(spell));
    type('Source language', 'pl');
    click('Save changes');
    await waitClosed();
    expect(entries()[0]).toMatchObject({
      baseLocale: 'pl',
      data: { name: 'Żar' },
      translations: { en: { name: 'Ember' } },
    });
    expect(screen.getByRole('link', { name: 'Ember' })).toBeVisible();
  });

  it('exports the library directly and leaves restoring to the Data backup page', () => {
    seed([manual('Existing', 'original')]);
    renderPage();
    click('Export');
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Backups' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Restore Homebrew backup' })).toBeNull();
  });

  it('leaves corrupt storage untouched until explicitly replaced', async () => {
    localStorage.setItem(HOMEBREW_KEY, '{damaged');
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('could not be read');
    expect(button('New entry')).toBeDisabled();
    click('Download stored original');
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    click('Replace stored Homebrew');
    const confirmation = within(await screen.findByRole('alertdialog'));
    expect(localStorage.getItem(HOMEBREW_KEY)).toBe('{damaged');
    fireEvent.click(
      confirmation.getByRole('button', { name: 'Replace stored Homebrew' }),
    );
    await waitFor(() => expect(button('New entry')).toBeEnabled());
    expect(localStorage.getItem(HOMEBREW_KEY)).toBe(serializeHomebrew([]));
  });

  it('previews a 5etools file in the selected language and handles unreadable files', async () => {
    const { container } = renderPage();
    click('Import');
    const input = container.querySelector('input[accept*="json"]')!;
    const broken = new File([], 'unreadable.json', { type: 'application/json' });
    Object.defineProperty(broken, 'text', {
      value: () => Promise.reject(new Error('read failed')),
    });
    fireEvent.change(input, { target: { files: [broken] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('file could not be read');
    choose(container, JSON.stringify({ spell: [spell] }));
    await screen.findByRole('heading', { name: 'Review the file' });
    expect(entries()).toHaveLength(0);
    type('JSON language', 'pl');
    expect(dialog().getByText('Polski', { selector: 'dd' })).toBeVisible();
    click('Add entries');
    await waitClosed();
    expect(entries()[0]).toMatchObject({ baseLocale: 'pl' });
  });

  it('warns on failed writes, exports memory, and retries successfully', async () => {
    renderPage();
    const failed = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota');
    });
    click('New entry');
    type('Name', 'Pending');
    click('Create entry');
    await waitClosed();
    expect(screen.getByRole('alert')).toHaveTextContent('still in memory');
    expect(screen.queryByText('Entry created.')).toBeNull();
    click('Download current Homebrew');
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    click('Retry save');
    expect(await screen.findByText(/The data could not be saved/)).toBeVisible();
    expect(localStorage.getItem(HOMEBREW_KEY)).toBeNull();
    failed.mockRestore();
    click('Retry save');
    expect(await screen.findByText('Homebrew saved in this browser.')).toBeVisible();
    expect(localStorage.getItem(HOMEBREW_KEY)).toContain('Pending');
  });

  it('can disable an imported translation and correct an invalid translation name', async () => {
    seed([
      {
        kind: 'imported',
        id: 'entry',
        name: spell.name,
        category: 'spells',
        baseLocale: 'en',
        data: spell,
        createdAt: 1,
      },
    ]);
    renderPage();
    click('Edit Ember');
    click('Polski');
    fireEvent.click(
      dialog().getByRole('checkbox', {
        name: 'Use this language version in the Compendium',
      }),
    );
    type('Translated JSON', '{"entries":[]}');
    click('Save changes');
    expect(screen.getByRole('alert')).toHaveTextContent('Polski needs a name');
    type('Translated JSON', JSON.stringify({ ...spell, name: 'Żar' }));
    fireEvent.click(
      dialog().getByRole('checkbox', {
        name: 'Use this language version in the Compendium',
      }),
    );
    click('Save changes');
    await waitClosed();
    expect(entries()[0]).toMatchObject({ translations: {} });
    click('Edit Ember');
    type('Source language', 'pl');
    click('Save changes');
    await waitClosed();
    expect(entries()[0]).toMatchObject({
      baseLocale: 'pl',
      data: { name: 'Ember' },
      translations: {},
    });
  });

  it('checks the level and JSON of structured subclass features', async () => {
    seed([
      {
        kind: 'subclass',
        id: 'school',
        className: 'Wizard',
        createdAt: 1,
        subclass: {
          name: 'School',
          source: 'Homebrew',
          features: [
            { name: 'Feature', level: 3, entries: [{ type: 'list', items: ['Text'] }] },
          ],
        },
      },
    ]);
    renderPage();
    click('Edit School');
    type('Level', '21');
    click('Save changes');
    expect(screen.getByRole('alert')).toHaveTextContent('whole level');
    type('Level', '10');
    type('Feature content (JSON)', '[null]');
    click('Save changes');
    expect(screen.getByRole('alert')).toHaveTextContent('valid JSON list');
    type('Feature content (JSON)', '["New body"]');
    click('Save changes');
    await waitClosed();
    expect(entries()[0]).toMatchObject({
      subclass: { features: [{ level: 10, entries: ['New body'] }] },
    });
  });

  it('sorts and filters local entries, including subclasses of imported classes', async () => {
    const scholar = {
      kind: 'imported' as const,
      id: 'scholar',
      name: 'Scholar',
      category: 'classes' as const,
      baseLocale: 'en' as const,
      createdAt: 6,
      data: { ...spell, name: 'Scholar' },
      translations: { pl: { ...spell, name: 'Uczony' } },
    };
    seed([
      scholar,
      {
        kind: 'subclass',
        id: 'school',
        className: 'Scholar',
        createdAt: 2,
        subclass: { name: 'Archivist', source: 'HB', features: [] },
      },
      {
        kind: 'subclass',
        id: 'other',
        className: 'Unknown class',
        createdAt: 3,
        subclass: { name: 'Other', source: 'Homebrew', features: [] },
      },
      {
        ...manual('Ritual', 'r1'),
        translations: { pl: { name: '', subtitle: 'Podtytuł', body: '' } },
      },
      {
        ...manual('Ritual', 'r2'),
        translations: { pl: { name: '', subtitle: '', body: 'Treść' } },
      },
    ]);
    const { router } = renderPage('/pl/homebrew?category=subclass');
    expect(screen.getByRole('link', { name: 'Archivist' })).toHaveAttribute(
      'href',
      expect.stringContaining('/classes/scholar/school/'),
    );
    expect(screen.getByText('Other')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Other' })).toBeNull();
    expect(screen.getByText(/Podklasa klasy Uczony/)).toBeVisible();
    click('Filtry (1)');
    expect(button('Filtry (1)')).toHaveAttribute('aria-expanded', 'true');
    type('Filtruj według kategorii', 'items');
    type('Filtruj według stanu tłumaczenia', 'translated');
    expect(screen.getAllByRole('link', { name: 'Ritual' })).toHaveLength(2);
    type('Sortuj według', 'date');
    expect(router.state.location.search).toContain('sort=date');
    type('Sortuj według', 'name');
    expect(router.state.location.search).not.toContain('sort=');
    type('Filtruj według stanu tłumaczenia', 'all');
    type('Filtruj według kategorii', 'all');
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('reports stale import previews and preserves pending edits when reloading is declined', async () => {
    seed([manual('Original', 'original')]);
    const previous = localStorage.getItem(HOMEBREW_KEY);
    const failed = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota');
    });
    useHomebrewStore
      .getState()
      .addManual({ name: 'Pending', category: 'items', body: '', subtitle: '' });
    failed.mockRestore();
    renderPage();
    click('Import');
    importText(
      JSON.stringify({
        entries: [manual('Imported', 'imported'), manual('Another', 'another')],
      }),
    );
    expect(screen.getByText('Fumble Homebrew')).toBeVisible();
    const next = serializeHomebrew([manual('Different tab', 'different')]);
    localStorage.setItem(HOMEBREW_KEY, next);
    click('Add entries');
    expect(await dialog().findByRole('alert')).toHaveTextContent(
      'entry could not be saved',
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitClosed();
    expect(screen.getByText(/changed in another tab/)).toBeVisible();
    click('Load stored version');
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Cancel',
      }),
    );
    expect(screen.getByRole('link', { name: 'Pending' })).toBeVisible();
    click('Load stored version');
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Load stored version',
      }),
    );
    expect(await screen.findByRole('link', { name: 'Different tab' })).toBeVisible();
    expect(localStorage.getItem(HOMEBREW_KEY)).not.toBe(previous);
  });

  it('handles oversized file selection and appends multiple valid records', async () => {
    const { container } = renderPage();
    click('Import');
    const input = container.querySelector('input[accept*="json"]')!;
    fireEvent.change(input, { target: { files: [] } });
    const tooLarge = new File([], 'large.json');
    Object.defineProperty(tooLarge, 'size', { value: 11 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [tooLarge] } });
    expect(await dialog().findByRole('alert')).toHaveTextContent('up to 10 MB');
    choose(container, JSON.stringify({ entries: [manual('One'), manual('Two')] }));
    await dialog().findByRole('heading', { name: 'Review the file' });
    click('Add entries');
    await waitClosed();
    expect(screen.getByText('Imported 2 entries.')).toBeVisible();
  });

  it('keeps a draft in the editor when another tab changes the library before save', async () => {
    renderPage();
    click('New entry');
    fireEvent.change(document.querySelector('input[accept="image/*"]')!, {
      target: { files: [] },
    });
    type('Name', 'Draft');
    localStorage.setItem(HOMEBREW_KEY, serializeHomebrew([manual('Other', 'other')]));
    click('Create entry');
    expect(await dialog().findByRole('alert')).toHaveTextContent(
      'entry could not be saved',
    );
    expect(dialog().getByLabelText('Name')).toHaveValue('Draft');
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Discard changes',
      }),
    );
    await waitClosed();
    expect(entries()).toEqual([]);
  });

  it('repairs older imported JSON without replacing its route and reports oversized language versions', async () => {
    seed([
      {
        kind: 'imported',
        id: 'route',
        name: 'Ember',
        category: 'spells',
        baseLocale: 'en',
        data: spell,
        createdAt: 1,
      },
    ]);
    renderPage();
    click('Edit Ember');
    const original = { name: 'Ember', entries: ['Text'] };
    type('Source JSON', JSON.stringify({ ...original, entries: ['x'.repeat(280_000)] }));
    click('Polski');
    type(
      'Translated JSON',
      JSON.stringify({ name: 'Żar', entries: ['x'.repeat(280_000)] }),
    );
    click('Save changes');
    expect(dialog().getByRole('alert')).toHaveTextContent('entry exceeds the size limit');
    type('Translated JSON', JSON.stringify({ name: 'Żar' }));
    click('Base (EN)');
    type('Source JSON', JSON.stringify(original));
    click('Save changes');
    await waitClosed();
    expect(entries()[0]).toMatchObject({
      id: 'route',
      data: { id: 'ember' },
      translations: { pl: { id: 'ember' } },
    });
  });

  it('rejects oversized manual entries and keeps the original library', async () => {
    renderPage();
    click('New entry');
    type('Name', 'Long draft');
    type(/^Description/, 'x'.repeat(200_000));
    click('Polski');
    type(/^Description/, 'y'.repeat(200_000));
    click('English');
    type(/^Description/, 'z'.repeat(200_000));
    click('Create entry');
    expect(dialog().getByRole('alert')).toHaveTextContent('entry exceeds the size limit');
    expect(entries()).toEqual([]);
  });
  it('keeps damaged storage after a cancelled replacement', async () => {
    localStorage.setItem(HOMEBREW_KEY, '{broken');
    renderPage();
    click('Replace stored Homebrew');
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Cancel',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(localStorage.getItem(HOMEBREW_KEY)).toBe('{broken');
    expect(button('Export')).toBeDisabled();
  });
});
