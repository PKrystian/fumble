import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHomebrewStore } from './store';

const { confirmDialog, looks5etools, parse5etoolsHomebrew } = vi.hoisted(() => ({
  confirmDialog: vi.fn(),
  looks5etools: vi.fn(),
  parse5etoolsHomebrew: vi.fn(),
}));

vi.mock('@/features/ui/confirmStore', () => ({ confirmDialog }));
vi.mock('./import5etools', () => ({
  looks5etools,
  parse5etoolsHomebrew,
}));
vi.mock('@/features/character/CompendiumPicker', () => ({
  CompendiumPicker: ({ onPick }: { onPick: (item: { name: string }) => void }) => (
    <button type="button" onClick={() => onPick({ name: 'Wizard' })}>
      Pick class
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
      <button type="button" onClick={() => onSave('data:image/png;base64,test')}>
        Save crop
      </button>
    </div>
  ),
}));

import { HomebrewPage } from './HomebrewPage';

const renderPage = (path = '/homebrew') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <HomebrewPage />
    </MemoryRouter>,
  );

describe('HomebrewPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useHomebrewStore.setState({ entries: [] });
    confirmDialog.mockReset();
    confirmDialog.mockResolvedValue(true);
    looks5etools.mockReset();
    parse5etoolsHomebrew.mockReset();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates a manual entry with a translation and edits it', () => {
    renderPage();
    expect(screen.getByText(/No homebrew yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Subclass' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compendium Entry' }));

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: '  Arcane Gift  ' },
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'feats' },
    });
    fireEvent.change(screen.getByLabelText('Subtitle'), {
      target: { value: '  Rare boon  ' },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: 'Base text' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Polski' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Dar Magii' },
    });
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: 'Polski opis' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Base' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create entry' }));

    expect(useHomebrewStore.getState().entries[0]).toMatchObject({
      kind: 'manual',
      name: 'Arcane Gift',
      subtitle: 'Rare boon',
      translations: { pl: { name: 'Dar Magii', body: 'Polski opis' } },
    });
    expect(screen.getByText('Entry created.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Arcane Gift' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Arcane Gift Revised' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(useHomebrewStore.getState().entries[0]).toMatchObject({
      name: 'Arcane Gift Revised',
    });
    expect(screen.getByText('Entry updated.')).toBeInTheDocument();
  });

  it('creates a subclass through the class picker', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Subclass' }));
    fireEvent.click(screen.getByRole('button', { name: 'Class' }));
    fireEvent.change(screen.getByLabelText('Subclass name'), {
      target: { value: '  Archivist  ' },
    });
    fireEvent.change(screen.getByLabelText('Source (optional)'), {
      target: { value: ' HB ' },
    });
    fireEvent.change(screen.getByLabelText(/Features/), {
      target: { value: 'Feature text' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create subclass' }));
    expect(useHomebrewStore.getState().entries[0]).toMatchObject({
      kind: 'subclass',
      className: 'Wizard',
      subclass: { name: 'Archivist', source: 'HB' },
    });
    expect(screen.getByText('Subclass created.')).toBeInTheDocument();
  });

  it('validates and saves imported JSON editing', () => {
    useHomebrewStore.getState().addImported(
      [
        {
          category: 'feats',
          data: {
            id: 'imported',
            name: 'Imported',
            source: 'HB',
            srd: false,
          },
        },
      ],
      'en',
    );
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Imported' }));
    const editor = screen.getByLabelText('Source JSON');

    fireEvent.change(editor, { target: { value: '{"source":"HB"}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      screen.getByText('Every language version must have a name.'),
    ).toBeInTheDocument();

    fireEvent.change(editor, { target: { value: '{' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('The edited entry is not valid JSON.')).toBeInTheDocument();

    fireEvent.change(editor, {
      target: { value: '{"id":"imported","name":"Updated","source":"HB","srd":false}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(useHomebrewStore.getState().entries[0]).toMatchObject({ name: 'Updated' });
  });

  it('handles pasted own, unsupported, invalid and 5etools documents', () => {
    parse5etoolsHomebrew.mockReturnValue({
      entries: [
        {
          category: 'skills',
          data: { id: 'lore', name: 'Lore', source: 'HB', srd: false },
        },
      ],
      subclasses: [],
      skipped: ['unknown'],
    });
    renderPage();
    const openPaste = () => {
      if (!screen.queryByLabelText(/Paste 5etools homebrew JSON/)) {
        fireEvent.click(screen.getByRole('button', { name: 'Paste JSON' }));
      }
      return screen.getByLabelText(/Paste 5etools homebrew JSON/);
    };
    const importText = (value: string) => {
      fireEvent.change(openPaste(), { target: { value } });
      fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    };

    importText('not-json');
    expect(screen.getByText(/Could not read that text/i)).toBeInTheDocument();
    importText('{"other":true}');
    expect(screen.getByText(/Unrecognized data/)).toBeInTheDocument();
    importText('{"entries":[]}');
    expect(screen.getByText(/Imported 0 entries/i)).toBeInTheDocument();

    looks5etools.mockReturnValue(true);
    importText('{"skill":[]}');
    expect(screen.getByText(/Imported 1 entry/i)).toBeInTheDocument();
    expect(screen.getByText(/Skipped unsupported: unknown/i)).toBeInTheDocument();
  });

  it('reports empty, plural 5etools and single own imports', () => {
    renderPage();
    const importText = (value: string) => {
      fireEvent.click(screen.getByRole('button', { name: 'Paste JSON' }));
      fireEvent.change(screen.getByLabelText(/Paste 5etools homebrew JSON/), {
        target: { value },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    };

    looks5etools.mockReturnValue(true);
    parse5etoolsHomebrew.mockReturnValue({
      entries: [],
      subclasses: [],
      skipped: [],
    });
    importText('{}');
    expect(screen.getByText(/No importable entries/i)).toBeInTheDocument();

    parse5etoolsHomebrew.mockReturnValue({
      entries: [
        {
          category: 'skills',
          data: { id: 'one', name: 'One', source: 'HB', srd: false },
        },
        {
          category: 'skills',
          data: { id: 'two', name: 'Two', source: 'HB', srd: false },
        },
      ],
      subclasses: [],
      skipped: [],
    });
    importText('{}');
    expect(screen.getByText(/Imported 2 entries/i)).toBeInTheDocument();

    looks5etools.mockReturnValue(false);
    importText(
      '{"entries":[{"kind":"manual","id":"old","category":"feats","name":"Own","subtitle":"","body":"","createdAt":1}]}',
    );
    expect(screen.getByText(/Imported 1 entry/i)).toBeInTheDocument();
  });

  it('filters, searches and deletes entries after confirmation', async () => {
    useHomebrewStore.getState().addManual({
      category: 'feats',
      name: 'Alpha',
      subtitle: '',
      body: '',
      translations: { pl: { name: 'Alfa', subtitle: '', body: '' } },
    });
    useHomebrewStore.getState().addManual({
      category: 'items',
      name: 'Beta',
      subtitle: '',
      body: '',
    });
    renderPage();

    const categoryFilter = screen.getByLabelText('Filter by category');
    fireEvent.change(categoryFilter, { target: { value: 'all' } });
    fireEvent.change(categoryFilter, { target: { value: 'feats' } });
    const translationFilter = screen.getByLabelText('Filter by translation status');
    fireEvent.change(translationFilter, { target: { value: 'all' } });
    fireEvent.change(translationFilter, { target: { value: 'translated' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'none' } });
    expect(screen.getByText('No entries match these filters.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'alpha' } });
    expect(screen.getByRole('link', { name: 'Alpha' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter by translation status'), {
      target: { value: 'translated' },
    });
    expect(screen.getByRole('link', { name: 'Alpha' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Alpha' }));
    await waitFor(() => expect(confirmDialog).toHaveBeenCalled());
    await waitFor(() => expect(useHomebrewStore.getState().entries).toHaveLength(1));
  });

  it('restores homebrew filters from the URL', () => {
    useHomebrewStore.getState().addManual({
      category: 'feats',
      name: 'Translated Feat',
      subtitle: '',
      body: '',
      translations: { pl: { name: 'Atut', subtitle: '', body: '' } },
    });
    useHomebrewStore.getState().addManual({
      category: 'items',
      name: 'Plain Item',
      subtitle: '',
      body: '',
    });
    renderPage('/homebrew?q=translated&category=feats&translation=translated');
    expect(screen.getByRole('searchbox')).toHaveValue('translated');
    expect(screen.getByRole('link', { name: 'Translated Feat' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Plain Item' })).not.toBeInTheDocument();
  });

  it('adds, replaces, removes and cancels entry artwork', () => {
    const { container } = renderPage();
    const imageInput = container.querySelector<HTMLInputElement>(
      'input[accept="image/*"]',
    )!;
    const first = new File(['first'], 'first.png', { type: 'image/png' });
    const imageClick = vi.spyOn(imageInput, 'click');

    fireEvent.click(screen.getByRole('button', { name: 'Add artwork' }));
    expect(imageClick).toHaveBeenCalled();
    fireEvent.change(imageInput, { target: { files: [first] } });
    expect(screen.getByRole('button', { name: 'Save crop' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel crop' }));
    expect(screen.queryByRole('button', { name: 'Save crop' })).not.toBeInTheDocument();

    fireEvent.change(imageInput, { target: { files: [first] } });
    fireEvent.click(screen.getByRole('button', { name: 'Save crop' }));
    expect(screen.getByRole('button', { name: 'Change artwork' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByRole('button', { name: 'Add artwork' })).toBeInTheDocument();
  });

  it('exports entries and imports a selected file', async () => {
    useHomebrewStore.getState().addManual({
      category: 'feats',
      name: 'Exported',
      subtitle: '',
      body: '',
    });
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const { container } = renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(anchorClick).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');

    const file = new File(['ignored'], 'homebrew.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', {
      value: async () => '{"entries":[]}',
    });
    const fileInput = container.querySelector<HTMLInputElement>(
      'input[accept="application/json,.json"]',
    )!;
    const fileClick = vi.spyOn(fileInput, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Import file' }));
    expect(fileClick).toHaveBeenCalled();
    fireEvent.change(fileInput, { target: { files: [] } });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() =>
      expect(screen.getByText(/Imported 0 entries/i)).toBeInTheDocument(),
    );
  });

  it('filters subclasses and untranslated entries and preserves a rejected deletion', async () => {
    useHomebrewStore.getState().addManual({
      category: 'items',
      name: 'Plain',
      subtitle: '',
      body: '',
    });
    useHomebrewStore.getState().addSubclass({
      className: 'Wizard',
      name: 'School',
      source: 'HB',
      body: '',
    });
    confirmDialog.mockResolvedValue(false);
    renderPage();

    fireEvent.change(screen.getByLabelText('Filter by category'), {
      target: { value: 'subclass' },
    });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'school' } });
    expect(screen.getByRole('link', { name: 'School' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete School' }));
    await waitFor(() => expect(confirmDialog).toHaveBeenCalled());
    expect(useHomebrewStore.getState().entries).toHaveLength(2);

    fireEvent.change(screen.getByLabelText('Filter by category'), {
      target: { value: 'items' },
    });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Filter by translation status'), {
      target: { value: 'untranslated' },
    });
    expect(screen.getByRole('link', { name: 'Plain' })).toBeInTheDocument();
  });

  it('changes import language and closes pasted JSON without importing', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('JSON language'), {
      target: { value: 'pl' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Paste JSON' }));
    fireEvent.change(screen.getByLabelText(/Paste 5etools homebrew JSON/), {
      target: { value: '{"entries":[]}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      screen.queryByLabelText(/Paste 5etools homebrew JSON/),
    ).not.toBeInTheDocument();
  });

  it('handles blank translations, placeholder fallbacks and sparse stored entries', () => {
    useHomebrewStore.setState({
      entries: [
        {
          kind: 'manual',
          id: 'manual-image',
          category: 'unknown',
          name: 'Image Entry',
          subtitle: '',
          body: '',
          image: 'data:image/png;base64,test',
          createdAt: 1,
        },
        {
          kind: 'manual',
          id: 'sparse-manual',
          category: 'items',
          name: 'Sparse Manual',
          subtitle: '',
          body: '',
          createdAt: 2,
        },
        {
          kind: 'imported',
          id: 'sparse-import',
          category: 'items',
          name: 'Sparse Import',
          baseLocale: 'en',
          data: {
            id: 'sparse-import',
            name: 'Sparse Import',
            source: 'HB',
            srd: false,
          },
          translations: {
            en: {
              id: 'sparse-import',
              name: 'Sparse Import',
              source: 'HB',
              srd: false,
            },
          },
          createdAt: 3,
        },
        {
          kind: 'imported',
          id: 'no-translations',
          category: 'items',
          name: 'No Translations',
          baseLocale: 'en',
          data: {
            id: 'no-translations',
            name: 'No Translations',
            source: 'HB',
            srd: false,
          },
          createdAt: 4,
        },
        {
          kind: 'subclass',
          id: 'subclass',
          className: 'Wizard',
          subclass: { name: 'A School', source: 'HB', features: [] },
          createdAt: 5,
        },
      ] as never,
    });
    const { container } = renderPage();

    expect(screen.getByText('unknown')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Polski' }));
    expect(screen.getByLabelText('Name')).toHaveAttribute(
      'placeholder',
      'e.g. Blade of the Rift',
    );
    expect(screen.getByLabelText('Subtitle')).toHaveAttribute(
      'placeholder',
      'e.g. Rare weapon (requires attunement)',
    );
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Base' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Blank Translation' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create entry' }));

    const imageInput = container.querySelector<HTMLInputElement>(
      'input[accept="image/*"]',
    )!;
    fireEvent.change(imageInput, { target: { files: [] } });

    fireEvent.click(screen.getByRole('button', { name: 'Edit Sparse Manual' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Sparse Import' }));
    expect(screen.getByLabelText('Source JSON')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  });

  it('edits imported category, source language and translation documents', () => {
    useHomebrewStore.getState().addImported(
      [
        {
          category: 'feats',
          data: {
            id: 'translated',
            name: 'Translated',
            source: 'HB',
            srd: false,
          },
        },
      ],
      'en',
    );
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Translated' }));

    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'items' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Polski' }));
    const translationEditor = screen.getByLabelText('Translated JSON');
    fireEvent.change(translationEditor, { target: { value: '{"source":"HB"}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      screen.getByText('Every language version must have a name.'),
    ).toBeInTheDocument();
    fireEvent.change(translationEditor, {
      target: {
        value: '{"id":"translated","name":"Przetłumaczone","source":"HB","srd":false}',
      },
    });
    const enabled = screen.getByRole('checkbox', {
      name: 'Use this language version in the Compendium',
    });
    expect(enabled).toBeChecked();
    fireEvent.click(enabled);
    expect(enabled).not.toBeChecked();
    fireEvent.click(enabled);

    fireEvent.click(screen.getByRole('button', { name: 'Base (EN)' }));
    fireEvent.change(screen.getByLabelText('Source language'), {
      target: { value: 'pl' },
    });
    fireEvent.change(screen.getByLabelText('Source language'), {
      target: { value: 'en' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(useHomebrewStore.getState().entries[0]).toMatchObject({
      category: 'items',
      baseLocale: 'en',
      translations: {
        pl: { name: 'Przetłumaczone' },
      },
    });
  });
});
