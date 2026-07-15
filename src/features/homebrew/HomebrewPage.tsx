import { useRef, useState } from 'react';
import {
  ClipboardPaste,
  Download,
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { categories } from '@/features/compendium/categories';
import { CompendiumPicker } from '@/features/character/CompendiumPicker';
import type { ClassEntry, CompendiumCategoryId } from '@/data/compendium/types';
import { slugify } from '@/data/transform/util';
import { confirmDialog } from '@/features/ui/confirmStore';
import { ImageCropperModal } from '@/features/ui/ImageCropperModal';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { type HomebrewEntry, useHomebrewStore } from './store';
import { looks5etools, parse5etoolsHomebrew } from './import5etools';

const DEFAULT_CATEGORY = categories[0]!.id;

type EntryType = 'entry' | 'subclass';

interface FormState {
  id: string | null;
  name: string;
  category: CompendiumCategoryId;
  subtitle: string;
  body: string;
  image: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  name: '',
  category: DEFAULT_CATEGORY,
  subtitle: '',
  body: '',
  image: '',
};

interface SubclassFormState {
  className: string;
  name: string;
  source: string;
  body: string;
}

const EMPTY_SUBCLASS_FORM: SubclassFormState = {
  className: '',
  name: '',
  source: '',
  body: '',
};

const categoryLabel = (id: string, t: (key: string) => string) =>
  categories.find((c) => c.id === id) ? t(`compendium.categories.${id}`) : id;

export function HomebrewPage() {
  const { t } = useT();
  useSeo(t('nav.homebrew'));
  const entries = useHomebrewStore((s) => s.entries);
  const addManual = useHomebrewStore((s) => s.addManual);
  const updateManual = useHomebrewStore((s) => s.updateManual);
  const deleteEntry = useHomebrewStore((s) => s.deleteEntry);
  const addImported = useHomebrewStore((s) => s.addImported);
  const addSubclass = useHomebrewStore((s) => s.addSubclass);
  const addImportedSubclasses = useHomebrewStore((s) => s.addImportedSubclasses);
  const importOwn = useHomebrewStore((s) => s.importOwn);

  const [entryType, setEntryType] = useState<EntryType>('entry');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [subclassForm, setSubclassForm] =
    useState<SubclassFormState>(EMPTY_SUBCLASS_FORM);
  const [notice, setNotice] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);

  const editing = form.id !== null;
  const resetForm = () => setForm(EMPTY_FORM);

  const submit = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      category: form.category,
      subtitle: form.subtitle.trim(),
      body: form.body,
      image: form.image,
    };
    if (form.id) updateManual(form.id, payload);
    else addManual(payload);
    resetForm();
    setNotice(form.id ? t('homebrew.entryUpdated') : t('homebrew.entryCreated'));
  };

  const submitSubclass = () => {
    if (!subclassForm.className.trim() || !subclassForm.name.trim()) return;
    addSubclass({
      className: subclassForm.className.trim(),
      name: subclassForm.name.trim(),
      source: subclassForm.source.trim(),
      body: subclassForm.body,
    });
    setSubclassForm(EMPTY_SUBCLASS_FORM);
    setNotice(t('homebrew.subclassCreated'));
  };

  const startEdit = (entry: HomebrewEntry) => {
    if (entry.kind !== 'manual') return;
    setEntryType('entry');
    setForm({
      id: entry.id,
      name: entry.name,
      category: entry.category,
      subtitle: entry.subtitle,
      body: entry.body,
      image: entry.image ?? '',
    });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ entries }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fumble-homebrew.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importText = (text: string, sourceLabel: string) => {
    try {
      const parsed = JSON.parse(text) as unknown;

      if (looks5etools(parsed)) {
        const {
          entries: imported,
          subclasses: importedSubclasses,
          skipped,
        } = parse5etoolsHomebrew(parsed as Record<string, unknown>);
        const count = addImported(imported);
        const subclassCount = addImportedSubclasses(importedSubclasses);
        const total = count + subclassCount;
        setNotice(
          total > 0
            ? t(
                total === 1
                  ? 'homebrew.importedFromEtoolsOne'
                  : 'homebrew.importedFromEtoolsOther',
                { count: total },
              ) +
                (skipped.length
                  ? t('homebrew.skipped', { list: skipped.join(', ') })
                  : '')
            : t('homebrew.noImportable'),
        );
        return;
      }

      const own = (parsed as { entries?: HomebrewEntry[] }).entries;
      if (Array.isArray(own)) {
        const count = importOwn(own);
        setNotice(
          t(count === 1 ? 'homebrew.importedOwnOne' : 'homebrew.importedOwnOther', {
            count,
          }),
        );
        return;
      }
      setNotice(t('homebrew.unrecognizedData'));
    } catch {
      setNotice(t('homebrew.couldNotRead', { source: sourceLabel }));
    }
  };

  const importJson = async (file: File) => importText(await file.text(), 'file');

  const importPasted = () => {
    if (!pasteText.trim()) return;
    importText(pasteText, 'text');
    setPasteText('');
    setPasteOpen(false);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-50">
            {t('nav.homebrew')}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-ink-300">
            {t('homebrew.description')}{' '}
            <span className="text-ink-100">5etools homebrew</span>{' '}
            {t('homebrew.descriptionSuffix')} <span className="text-ember-400">HB</span>.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportJson}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-700 px-3 py-1.5 text-sm text-ink-100 hover:bg-ink-800 disabled:opacity-50"
          >
            <Download size={16} /> {t('homebrew.export')}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-700 px-3 py-1.5 text-sm text-ink-100 hover:bg-ink-800"
          >
            <Upload size={16} /> {t('homebrew.importFile')}
          </button>
          <button
            type="button"
            onClick={() => setPasteOpen((v) => !v)}
            aria-pressed={pasteOpen}
            className={[
              'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-ink-800',
              pasteOpen
                ? 'border-arcane-500 text-arcane-300'
                : 'border-ink-700 text-ink-100',
            ].join(' ')}
          >
            <ClipboardPaste size={16} /> {t('homebrew.pasteJson')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importJson(file);
              e.target.value = '';
            }}
          />
        </div>
      </header>

      {pasteOpen && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-ink-700 bg-ink-900 p-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold text-ink-400">
              {t('homebrew.pastePlaceholderLabel')}
            </span>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={6}
              placeholder='{"subclass": [...], "subclassFeature": [...]}'
              className="resize-y rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 font-mono text-xs text-ink-100 focus:border-arcane-500 focus:outline-none"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setPasteOpen(false);
                setPasteText('');
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-ink-400 hover:text-ink-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={importPasted}
              disabled={!pasteText.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-arcane-700 px-3 py-1.5 text-sm font-medium text-ink-50 hover:bg-arcane-500 disabled:opacity-50"
            >
              <ClipboardPaste size={16} /> {t('homebrew.import')}
            </button>
          </div>
        </div>
      )}

      {notice && (
        <p className="mb-4 rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-200">
          {notice}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-xl border border-ink-700 bg-ink-900 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink-50">
              {editing ? t('homebrew.editEntry') : t('homebrew.newEntry')}
            </h2>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-ink-50"
              >
                <X size={14} /> {t('common.cancel')}
              </button>
            )}
          </div>

          {!editing && (
            <div className="flex gap-1 rounded-lg border border-ink-700 bg-ink-950 p-1 text-sm">
              <button
                type="button"
                onClick={() => setEntryType('entry')}
                className={[
                  'flex-1 rounded-md px-2 py-1 transition-colors',
                  entryType === 'entry'
                    ? 'bg-arcane-700 text-ink-50'
                    : 'text-ink-300 hover:bg-ink-800',
                ].join(' ')}
              >
                {t('homebrew.compendiumEntry')}
              </button>
              <button
                type="button"
                onClick={() => setEntryType('subclass')}
                className={[
                  'flex-1 rounded-md px-2 py-1 transition-colors',
                  entryType === 'subclass'
                    ? 'bg-arcane-700 text-ink-50'
                    : 'text-ink-300 hover:bg-ink-800',
                ].join(' ')}
              >
                {t('homebrew.subclass')}
              </button>
            </div>
          )}

          {entryType === 'entry' || editing ? (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-semibold text-ink-400">Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Blade of the Rift"
                  className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-ink-50 focus:border-arcane-500 focus:outline-none"
                />
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => imageFileRef.current?.click()}
                  aria-label={form.image ? 'Change artwork' : 'Add artwork'}
                  className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-700 bg-ink-950 hover:border-arcane-500"
                >
                  {form.image ? (
                    <img src={form.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="text-ink-600" size={22} aria-hidden="true" />
                  )}
                </button>
                <div className="flex flex-col gap-1 text-xs text-ink-400">
                  <span className="font-semibold text-ink-300">Artwork (optional)</span>
                  <span>Shown on the entry&apos;s Compendium page.</span>
                  {form.image && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, image: '' }))}
                      className="inline-flex w-fit items-center gap-1 text-red-400 hover:text-red-300"
                    >
                      <X size={12} /> Remove
                    </button>
                  )}
                </div>
                <input
                  ref={imageFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setPendingImageFile(file);
                    e.target.value = '';
                  }}
                />
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-semibold text-ink-400">
                  {t('homebrew.category')}
                </span>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      category: e.target.value as CompendiumCategoryId,
                    }))
                  }
                  className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-ink-50 focus:border-arcane-500 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {t(`compendium.categories.${c.id}`)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-semibold text-ink-400">
                  {t('homebrew.subtitle')}
                </span>
                <input
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  placeholder="e.g. Rare weapon (requires attunement)"
                  className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-ink-50 focus:border-arcane-500 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-semibold text-ink-400">
                  {t('homebrew.descriptionLabel')}
                </span>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  rows={8}
                  placeholder="You deal an extra {@damage 1d6} radiant damage on a hit.&#10;&#10;While attuned, you have the {@condition Blessed} condition."
                  className="resize-y rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-ink-100 focus:border-arcane-500 focus:outline-none"
                />
              </label>

              <button
                type="button"
                onClick={submit}
                disabled={!form.name.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-arcane-700 px-4 py-2 font-medium text-ink-50 hover:bg-arcane-500 disabled:opacity-50"
              >
                <Plus size={16} />{' '}
                {editing ? t('homebrew.saveChanges') : t('homebrew.createEntry')}
              </button>

              {pendingImageFile && (
                <ImageCropperModal
                  file={pendingImageFile}
                  aspect={3 / 4}
                  outputWidth={480}
                  title="Adjust artwork"
                  onCancel={() => setPendingImageFile(null)}
                  onSave={(dataUrl) => {
                    setForm((f) => ({ ...f, image: dataUrl }));
                    setPendingImageFile(null);
                  }}
                />
              )}
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-semibold text-ink-400">
                  {t('homebrew.classLabel')}
                </span>
                <CompendiumPicker
                  categoryId="classes"
                  placeholder={t('homebrew.searchForClass')}
                  onPick={(item) =>
                    setSubclassForm((f) => ({
                      ...f,
                      className: (item as ClassEntry).name,
                    }))
                  }
                />
                {subclassForm.className && (
                  <span className="text-xs text-ink-300">
                    {t('homebrew.attachingTo')}{' '}
                    <span className="text-ink-100">{subclassForm.className}</span>
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-semibold text-ink-400">
                  {t('homebrew.subclassName')}
                </span>
                <input
                  value={subclassForm.name}
                  onChange={(e) =>
                    setSubclassForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Oath of the Rift"
                  className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-ink-50 focus:border-arcane-500 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-semibold text-ink-400">
                  {t('homebrew.sourceOptional')}
                </span>
                <input
                  value={subclassForm.source}
                  onChange={(e) =>
                    setSubclassForm((f) => ({ ...f, source: e.target.value }))
                  }
                  placeholder="e.g. Homebrew"
                  className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-ink-50 focus:border-arcane-500 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-semibold text-ink-400">
                  {t('homebrew.featuresLabel')}
                </span>
                <textarea
                  value={subclassForm.body}
                  onChange={(e) =>
                    setSubclassForm((f) => ({ ...f, body: e.target.value }))
                  }
                  rows={8}
                  placeholder="At 3rd level, you gain..."
                  className="resize-y rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-ink-100 focus:border-arcane-500 focus:outline-none"
                />
              </label>

              <button
                type="button"
                onClick={submitSubclass}
                disabled={!subclassForm.className.trim() || !subclassForm.name.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-arcane-700 px-4 py-2 font-medium text-ink-50 hover:bg-arcane-500 disabled:opacity-50"
              >
                <Plus size={16} /> {t('homebrew.createSubclass')}
              </button>
            </>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-bold text-ink-50">
            {t('homebrew.yourEntries')} ({entries.length})
          </h2>
          {entries.length === 0 ? (
            <p className="text-sm text-ink-400">
              {t('homebrew.emptyState')} <code className="text-ink-200">.json</code>{' '}
              {t('homebrew.emptyStateFile')}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2"
                >
                  {entry.kind === 'manual' && entry.image && (
                    <img
                      src={entry.image}
                      alt=""
                      className="h-10 w-8 shrink-0 rounded object-cover"
                    />
                  )}
                  {entry.kind === 'subclass' ? (
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/compendium/classes/${slugify(entry.className)}`}
                        className="flex items-center gap-2 truncate font-medium text-ink-50 hover:text-arcane-300"
                      >
                        <span className="truncate">{entry.subclass.name}</span>
                      </Link>
                      <span className="block truncate text-xs text-ink-400">
                        {t('homebrew.subclassOf', { className: entry.className })}
                      </span>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/compendium/${entry.category}/${entry.id}`}
                        className="flex items-center gap-2 truncate font-medium text-ink-50 hover:text-arcane-300"
                      >
                        <span className="truncate">{entry.name}</span>
                        {entry.kind === 'imported' && (
                          <span className="shrink-0 rounded-full border border-ink-600 px-1.5 text-[0.6rem] uppercase text-ink-400">
                            5etools
                          </span>
                        )}
                      </Link>
                      <span className="block truncate text-xs text-ink-400">
                        {categoryLabel(entry.category, t)}
                        {entry.kind === 'manual' &&
                          entry.subtitle &&
                          ` · ${entry.subtitle}`}
                      </span>
                    </div>
                  )}
                  {entry.kind === 'manual' && (
                    <button
                      type="button"
                      aria-label={`Edit ${entry.name}`}
                      onClick={() => startEdit(entry)}
                      className="rounded p-1.5 text-ink-400 hover:bg-ink-800 hover:text-ink-50"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={t('character.list.deleteLabel', {
                      name: entry.kind === 'subclass' ? entry.subclass.name : entry.name,
                    })}
                    onClick={async () => {
                      const label =
                        entry.kind === 'subclass' ? entry.subclass.name : entry.name;
                      const ok = await confirmDialog(
                        t('homebrew.deleteConfirm', { label }),
                        {
                          tone: 'danger',
                          confirmLabel: t('common.delete'),
                        },
                      );
                      if (ok) deleteEntry(entry.id);
                    }}
                    className="rounded p-1.5 text-ink-400 hover:bg-ink-800 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
