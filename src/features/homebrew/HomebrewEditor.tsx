import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from 'react';
import { useBlocker } from 'react-router-dom';
import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import { categories } from '@/features/compendium/categories';
import { classFilterLabel } from '@/features/compendium/classNames';
import { CompendiumPicker } from '@/features/character/CompendiumPicker';
import { isUaSource } from '@/data/compendium/sources';
import type { ClassFeature, CompendiumCategoryId } from '@/data/compendium/types';
import { Button, IconButton, Select, TextInput } from '@/features/ui/primitives';
import { FormDialog } from '@/features/ui/FormDialog';
import { ImageCropperModal } from '@/features/ui/ImageCropperModal';
import { confirmDialog } from '@/features/ui/confirmStore';
import { inputClass, panelClass } from '@/features/ui/styles';
import { type Locale, SUPPORTED_LOCALES } from '@/i18n/locales';
import { useT } from '@/i18n/useT';
import {
  bodyToEntries,
  fitsEntryLimit,
  homebrewEntryName,
  homebrewSubclassParent,
  isHomebrew,
  isImportedData,
  isRecord,
  MAX_HOME_BREW_TEXT,
  useHomebrewStore,
  withHomebrewWrite,
  type HomebrewEntry,
  type HomebrewImportedEntry,
  type HomebrewManualEntry,
  type HomebrewSubclassEntry,
  type HomebrewTranslation,
  type ManualInput,
  type SubclassInput,
} from './store';
import {
  canRenderHomebrew,
  isHomebrewDescription,
  isHomebrewFeature,
} from './validateImported';
import { HomebrewImage } from './HomebrewImage';

export type EditorTarget = { kind: 'new' } | HomebrewEntry;
type Saved = (name: string, created: boolean, subclass?: boolean) => void;

export function HomebrewEditor({
  target,
  onClose,
  onSaved,
}: {
  target: EditorTarget;
  onClose: () => void;
  onSaved: Saved;
}) {
  const { t } = useT();
  const [kind, setKind] = useState(target.kind === 'subclass' ? 'subclass' : 'manual');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [croppedImage, setCroppedImage] = useState<string>();
  const [subclassFormOpened, setSubclassFormOpened] = useState(
    target.kind === 'subclass',
  );
  const imageInput = useRef<HTMLInputElement>(null);
  const formId = useId();
  const errorId = error ? formId + '-error' : undefined;
  const warningPending = useRef(false);
  const blocker = useBlocker(dirty || busy);

  const allowDiscard = useCallback(async () => {
    if (warningPending.current) return false;
    warningPending.current = true;
    try {
      return await confirmDialog(t('homebrew.discardDraft'), {
        tone: 'danger',
        initialFocus: 'cancel',
        confirmLabel: t('homebrew.discard'),
      });
    } finally {
      warningPending.current = false;
    }
  }, [t]);

  useEffect(() => {
    if (blocker.state !== 'blocked' || warningPending.current) return;
    void allowDiscard().then((accepted) => {
      if (accepted && !busy) blocker.proceed();
      else blocker.reset();
    });
  }, [allowDiscard, blocker, busy]);

  useEffect(() => {
    if (!dirty && !busy) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [busy, dirty]);

  const close = async () => {
    if (!busy && (!dirty || (await allowDiscard()))) onClose();
  };

  const save = async (write: () => string | boolean, name: string, subclass = false) => {
    setBusy(true);
    setError('');
    try {
      if (await withHomebrewWrite(write)) {
        onSaved(name, target.kind === 'new', subclass);
        return;
      }
      setError(t('homebrew.editorSaveBlocked'));
    } catch {
      setError(t('homebrew.editorSaveBlocked'));
    } finally {
      setBusy(false);
    }
  };

  const invalid = (message: string) => setError(message);
  const changed = () => {
    setDirty(true);
    setError('');
  };
  const title =
    target.kind === 'new'
      ? t('homebrew.newEntry')
      : t('homebrew.editLabel', { name: homebrewEntryName(target) });

  const activeFormId = target.kind === 'imported' ? formId : formId + '-' + kind;
  const formProps = { onChange: changed, onInvalid: invalid, save, errorId };

  return (
    <>
      <FormDialog
        title={title}
        onClose={() => void close()}
        actions={
          <>
            <Button onClick={() => void close()} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" type="submit" form={activeFormId} disabled={busy}>
              {target.kind !== 'new'
                ? t('homebrew.saveChanges')
                : t(
                    kind === 'subclass'
                      ? 'homebrew.createSubclass'
                      : 'homebrew.createEntry',
                  )}
            </Button>
          </>
        }
      >
        {target.kind === 'new' && (
          <div
            role="group"
            aria-label={t('homebrew.entryType')}
            className="mb-4 flex flex-wrap gap-2"
          >
            <Button
              aria-pressed={kind === 'manual'}
              variant={kind === 'manual' ? 'primary' : 'secondary'}
              onClick={() => setKind('manual')}
            >
              {t('homebrew.compendiumEntry')}
            </Button>
            <Button
              aria-pressed={kind === 'subclass'}
              variant={kind === 'subclass' ? 'primary' : 'secondary'}
              onClick={() => {
                setSubclassFormOpened(true);
                setKind('subclass');
              }}
            >
              {t('homebrew.subclass')}
            </Button>
          </div>
        )}
        {error && (
          <p id={errorId} role="alert" className="notice mb-4" data-tone="error">
            {error}
          </p>
        )}
        {target.kind === 'imported' && (
          <ImportedFields {...formProps} entry={target} id={formId} />
        )}
        {(target.kind === 'new' || target.kind === 'manual') && (
          <div hidden={kind !== 'manual'}>
            <ManualFields
              {...formProps}
              entry={target.kind === 'manual' ? target : undefined}
              id={formId + '-manual'}
              onImage={setImageFile}
              imageInput={imageInput}
              image={croppedImage}
              onRemoveImage={() => {
                setCroppedImage('');
                changed();
              }}
            />
          </div>
        )}
        {subclassFormOpened && (
          <div hidden={kind !== 'subclass'}>
            <SubclassFields
              {...formProps}
              entry={target.kind === 'subclass' ? target : undefined}
              id={formId + '-subclass'}
            />
          </div>
        )}
      </FormDialog>
      {imageFile && (
        <ImageCropperModal
          file={imageFile}
          aspect={3 / 4}
          outputWidth={480}
          title={t('homebrew.adjustArtwork')}
          onCancel={() => setImageFile(null)}
          onChooseAnother={() => imageInput.current?.click()}
          onSave={(image) => {
            setCroppedImage(image);
            setImageFile(null);
            changed();
          }}
        />
      )}
    </>
  );
}

type FieldsProps = {
  id: string;
  errorId: string | undefined;
  onChange: () => void;
  onInvalid: (message: string) => void;
  save: (
    write: () => string | boolean,
    name: string,
    subclass?: boolean,
  ) => Promise<void>;
};

function CategoryField({
  value,
  onChange,
}: {
  value: CompendiumCategoryId;
  onChange: (value: CompendiumCategoryId) => void;
}) {
  const { t } = useT();
  return (
    <label className="field-label">
      {t('homebrew.category')}
      <Select
        value={value}
        onChange={(event) => onChange(event.target.value as CompendiumCategoryId)}
      >
        {categories.map((category) => (
          <option value={category.id} key={category.id}>
            {t(`compendium.categories.${category.id}`)}
          </option>
        ))}
      </Select>
    </label>
  );
}

const blank = { name: '', subtitle: '', body: '' };
const hasText = (fields: HomebrewTranslation | undefined) =>
  fields && Object.values(fields).some((value) => value.trim());

function ManualFields({
  entry,
  id,
  errorId,
  onChange,
  onInvalid,
  save,
  image,
  onImage,
  onRemoveImage,
  imageInput,
}: FieldsProps & {
  entry?: HomebrewManualEntry | undefined;
  image: string | undefined;
  onImage: (file: File) => void;
  imageInput: RefObject<HTMLInputElement | null>;
  onRemoveImage: () => void;
}) {
  const { t } = useT();
  const [base, setBase] = useState(
    entry ? { name: entry.name, subtitle: entry.subtitle, body: entry.body } : blank,
  );
  const [translations, setTranslations] = useState(entry?.translations ?? {});
  const [category, setCategory] = useState(entry?.category ?? categories[0]!.id);
  const [lang, setLang] = useState<'base' | Locale>('base');
  const nameInput = useRef<HTMLInputElement>(null);
  const artwork = image ?? entry?.image ?? '';
  const fields = lang === 'base' ? base : (translations[lang] ?? blank);
  const change = (key: keyof HomebrewTranslation, value: string) => {
    const next = { ...fields, [key]: value };
    if (lang === 'base') setBase(next);
    else setTranslations({ ...translations, [lang]: next });
    onChange();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const name = base.name.trim();
    if (!name) {
      setLang('base');
      nameInput.current?.focus();
      onInvalid(t('homebrew.nameRequired'));
      return;
    }
    const payload: ManualInput = {
      name,
      category,
      subtitle: base.subtitle.trim(),
      body: base.body,
      image: artwork,
      translations: Object.fromEntries(
        Object.entries(translations).filter(([, value]) => hasText(value)),
      ),
    };
    if (
      !fitsEntryLimit(payload) &&
      (!entry || !fitsEntryLimit({ ...payload, image: '' }))
    ) {
      onInvalid(t('homebrew.entryTooLarge'));
      return;
    }
    const store = useHomebrewStore.getState();
    void save(
      () => (entry ? store.updateManual(entry.id, payload) : store.addManual(payload)),
      name,
    );
  };
  return (
    <form id={id} aria-describedby={errorId} onSubmit={submit} className="space-y-4">
      <div
        role="group"
        aria-label={t('homebrew.contentLanguage')}
        className="flex flex-wrap gap-2"
      >
        <Button
          size="sm"
          variant={lang === 'base' ? 'primary' : 'secondary'}
          aria-pressed={lang === 'base'}
          onClick={() => setLang('base')}
        >
          {t('homebrew.baseLanguage')}
        </Button>
        {SUPPORTED_LOCALES.map(({ code, nativeLabel }) => (
          <Button
            key={code}
            size="sm"
            variant={lang === code ? 'primary' : 'secondary'}
            aria-pressed={lang === code}
            onClick={() => setLang(code)}
          >
            {nativeLabel}
            {hasText(translations[code]) && (
              <span className="sr-only"> {t('homebrew.translated')}</span>
            )}
          </Button>
        ))}
      </div>
      {lang !== 'base' && (
        <p className="text-sm text-ink-300">{t('homebrew.translationHint')}</p>
      )}
      <label className="field-label">
        {t('homebrew.nameLabel')}
        <TextInput
          ref={nameInput}
          aria-describedby={errorId}
          data-dialog-focus
          value={fields.name}
          onChange={(event) => change('name', event.target.value)}
          placeholder={(lang !== 'base' && base.name) || t('homebrew.namePlaceholder')}
          maxLength={500}
        />
      </label>
      {lang === 'base' && (
        <>
          <CategoryField
            value={category}
            onChange={(value) => {
              setCategory(value);
              onChange();
            }}
          />
          <div className={panelClass('space-y-2 p-3')}>
            <p className="text-sm text-ink-300">{t('homebrew.artworkOptional')}</p>
            {artwork && (
              <HomebrewImage
                src={artwork}
                alt=""
                className="max-h-28 w-auto rounded-md"
              />
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => imageInput.current?.click()} size="sm">
                <ImagePlus size={16} aria-hidden="true" />
                {t(artwork ? 'homebrew.changeArtwork' : 'homebrew.addArtwork')}
              </Button>
              {artwork && (
                <Button variant="ghost" size="sm" onClick={onRemoveImage}>
                  {t('homebrew.removeImage')}
                </Button>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={imageInput}
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) onImage(file);
              }}
            />
          </div>
        </>
      )}
      <label className="field-label">
        {t('homebrew.subtitle')}
        <TextInput
          value={fields.subtitle}
          onChange={(event) => change('subtitle', event.target.value)}
          maxLength={2000}
          placeholder={
            (lang !== 'base' && base.subtitle) || t('homebrew.subtitlePlaceholder')
          }
        />
      </label>
      <label className="field-label">
        {t('homebrew.descriptionLabel')}
        <textarea
          className={inputClass('resize-y')}
          rows={8}
          value={fields.body}
          onChange={(event) => change('body', event.target.value)}
          maxLength={MAX_HOME_BREW_TEXT}
          placeholder={
            (lang !== 'base' && base.body) || t('homebrew.descriptionPlaceholder')
          }
        />
      </label>
    </form>
  );
}

type FeatureDraft = {
  key: number;
  name: string;
  level: string;
  body: string;
  structured: boolean;
};
const blankFeature: FeatureDraft = {
  key: 0,
  name: '',
  level: '3',
  body: '',
  structured: false,
};

function SubclassFields({
  entry,
  id,
  errorId,
  onChange,
  onInvalid,
  save,
}: FieldsProps & { entry?: HomebrewSubclassEntry | undefined }) {
  const { t, locale } = useT();
  const [name, setName] = useState(entry?.subclass.name ?? '');
  const [source, setSource] = useState(entry?.subclass.source ?? '');
  const [parent, setParent] = useState({
    name: entry?.className ?? '',
    label: entry ? classFilterLabel(entry.className, locale) : '',
    id: entry ? homebrewSubclassParent(entry) : undefined,
  });
  const [features, setFeatures] = useState<FeatureDraft[]>(() =>
    entry
      ? entry.subclass.features.filter(isHomebrewFeature).map((feature, key) => {
          const structured = !feature.entries.every((node) => typeof node === 'string');
          return {
            key,
            name: feature.name,
            level: String(feature.level),
            body: structured
              ? JSON.stringify(feature.entries, null, 2)
              : feature.entries.join('\n\n'),
            structured,
          };
        })
      : [blankFeature],
  );
  const nextKey = useRef(features.length);
  const changeFeature = (key: number, patch: Partial<FeatureDraft>) => {
    setFeatures((current) =>
      current.map((feature) =>
        feature.key === key ? { ...feature, ...patch } : feature,
      ),
    );
    onChange();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!parent.name || !name.trim()) {
      onInvalid(t('homebrew.subclassRequired'));
      return;
    }
    const normalized: ClassFeature[] = [];
    for (const feature of features) {
      if (!feature.body.trim() && !feature.name.trim()) continue;
      const level = Number(feature.level);
      if (!Number.isInteger(level) || level < 1 || level > 20) {
        onInvalid(t('homebrew.featureLevelInvalid'));
        return;
      }
      let entries = bodyToEntries(feature.body);
      if (feature.structured) {
        try {
          const parsed: unknown = JSON.parse(feature.body);
          if (
            !Array.isArray(parsed) ||
            !parsed.every((node) => isHomebrewDescription(node))
          )
            throw new Error();
          entries = parsed;
        } catch {
          onInvalid(t('homebrew.invalidFeature'));
          return;
        }
      }
      normalized.push({ level, name: feature.name.trim() || name.trim(), entries });
    }
    const payload: SubclassInput = {
      className: parent.name,
      ...(parent.id ? { parentClassId: parent.id } : {}),
      name: name.trim(),
      source: source.trim(),
      features: normalized,
    };
    if (!fitsEntryLimit(payload)) {
      onInvalid(t('homebrew.entryTooLarge'));
      return;
    }
    const store = useHomebrewStore.getState();
    void save(
      () =>
        entry ? store.updateSubclass(entry.id, payload) : store.addSubclass(payload),
      payload.name,
      true,
    );
  };
  return (
    <form
      id={id}
      aria-describedby={errorId}
      noValidate
      onSubmit={submit}
      className="space-y-4"
    >
      <div className="space-y-1">
        <p className="field-label">{t('homebrew.classLabel')}</p>
        <CompendiumPicker
          categoryId="classes"
          placeholder={t('homebrew.searchForClass')}
          accept={(item) => !isHomebrew(item) || !item._manual}
          onPick={(item) => {
            setParent({
              name: item.englishName ?? item.name,
              label: item.name,
              id: item.id,
            });
            onChange();
          }}
        />
        {parent.name && (
          <p className="text-sm text-ink-300">
            {t('homebrew.attachingTo')} {parent.label}
          </p>
        )}
      </div>
      <label className="field-label">
        {t('homebrew.subclassName')}
        <TextInput
          data-dialog-focus
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            onChange();
          }}
          maxLength={500}
          placeholder={t('homebrew.subclassNamePlaceholder')}
        />
      </label>
      <label className="field-label">
        {t('homebrew.sourceOptional')}
        <TextInput
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            onChange();
          }}
          maxLength={200}
          placeholder={t('homebrew.sourcePlaceholder')}
        />
      </label>
      {features.map((feature, index) => (
        <fieldset className={panelClass('min-w-0 space-y-3 p-3')} key={feature.key}>
          <legend className="px-1 text-sm text-ink-200">
            {t('homebrew.featureNumber', { number: index + 1 })}
          </legend>
          <div className="grid gap-3 sm:grid-cols-[6rem_1fr_auto] sm:items-end">
            <label className="field-label">
              {t('homebrew.featureLevel')}
              <TextInput
                type="number"
                min={1}
                max={20}
                step={1}
                value={feature.level}
                onChange={(event) =>
                  changeFeature(feature.key, { level: event.target.value })
                }
              />
            </label>
            <label className="field-label">
              {t('homebrew.featureName')}
              <TextInput
                value={feature.name}
                maxLength={500}
                onChange={(event) =>
                  changeFeature(feature.key, { name: event.target.value })
                }
              />
            </label>
            <IconButton
              label={t('homebrew.removeFeature', { number: index + 1 })}
              variant="danger"
              onClick={() => {
                setFeatures(features.filter((item) => item.key !== feature.key));
                onChange();
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
            </IconButton>
          </div>
          <label className="field-label">
            {t(feature.structured ? 'homebrew.featureJson' : 'homebrew.featuresLabel')}
            <textarea
              className={inputClass(
                feature.structured ? 'resize-y font-mono' : 'resize-y',
              )}
              rows={4}
              value={feature.body}
              onChange={(event) =>
                changeFeature(feature.key, { body: event.target.value })
              }
              maxLength={MAX_HOME_BREW_TEXT}
              placeholder={t('homebrew.featuresPlaceholder')}
            />
          </label>
        </fieldset>
      ))}
      <Button
        onClick={() => {
          setFeatures([...features, { ...blankFeature, key: nextKey.current++ }]);
          onChange();
        }}
      >
        <Plus size={16} aria-hidden="true" />
        {t('homebrew.addFeature')}
      </Button>
    </form>
  );
}

function ImportedFields({
  entry,
  id,
  errorId,
  onChange,
  onInvalid,
  save,
}: FieldsProps & { entry: HomebrewImportedEntry }) {
  const { t } = useT();
  const [category, setCategory] = useState(entry.category);
  const [base, setBase] = useState(entry.baseLocale);
  const [lang, setLang] = useState(entry.baseLocale);
  const [documents, setDocuments] = useState<Partial<Record<Locale, string>>>(() => ({
    ...Object.fromEntries(
      Object.entries(entry.translations ?? {}).map(([locale, data]) => [
        locale,
        JSON.stringify(data, null, 2),
      ]),
    ),
    [entry.baseLocale]: JSON.stringify(entry.data, null, 2),
  }));
  const [disabled, setDisabled] = useState<Locale[]>([]);
  const active =
    lang === base || (documents[lang] !== undefined && !disabled.includes(lang));
  const selectBase = (value: Locale) => {
    setDocuments((current) =>
      current[value] === undefined ? { [value]: current[base]! } : current,
    );
    setDisabled((current) =>
      current.filter((locale) => locale !== value && locale !== base),
    );
    setBase(value);
    setLang(value);
    onChange();
  };
  const jsonInput = useRef<HTMLTextAreaElement>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const values: Partial<Record<Locale, HomebrewImportedEntry['data']>> = {};
    for (const { code, nativeLabel } of SUPPORTED_LOCALES) {
      const document = documents[code];
      if (code !== base && (document === undefined || disabled.includes(code))) continue;
      try {
        const raw: unknown = JSON.parse(document ?? '');
        if (!isRecord(raw) || typeof raw.name !== 'string' || !raw.name.trim()) {
          onInvalid(t('homebrew.importedJsonNeedsNameLocale', { language: nativeLabel }));
        } else if (
          isImportedData(raw) &&
          canRenderHomebrew(category, raw) &&
          fitsEntryLimit(raw)
        ) {
          values[code] = {
            ...raw,
            id:
              raw.id || (typeof entry.data.id === 'string' && entry.data.id) || entry.id,
            name: raw.name.trim(),
          };
          continue;
        } else onInvalid(t('homebrew.importedSchema', { language: nativeLabel }));
      } catch {
        onInvalid(t('homebrew.importedJsonInvalidLocale', { language: nativeLabel }));
      }
      setLang(code);
      jsonInput.current?.focus();
      return;
    }
    const data = values[base]!;
    delete values[base];
    const payload = {
      category,
      name: data.name,
      baseLocale: base,
      ua: isUaSource(String(data.source ?? '')),
      data,
      translations: values,
    };
    if (!fitsEntryLimit(payload)) {
      onInvalid(t('homebrew.entryTooLarge'));
      return;
    }
    const store = useHomebrewStore.getState();
    void save(() => store.updateImported(entry.id, payload), data.name);
  };
  return (
    <form id={id} aria-describedby={errorId} className="space-y-4" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field-label">
          {t('homebrew.sourceLanguage')}
          <Select
            value={base}
            onChange={(event) => selectBase(event.target.value as Locale)}
          >
            {SUPPORTED_LOCALES.map(({ code, nativeLabel }) => (
              <option key={code} value={code}>
                {nativeLabel}
              </option>
            ))}
          </Select>
        </label>
        <CategoryField
          value={category}
          onChange={(value) => {
            setCategory(value);
            onChange();
          }}
        />
      </div>
      <div
        role="group"
        aria-label={t('homebrew.contentLanguage')}
        className="flex flex-wrap gap-2"
      >
        {SUPPORTED_LOCALES.map(({ code, nativeLabel }) => (
          <Button
            key={code}
            size="sm"
            variant={lang === code ? 'primary' : 'secondary'}
            aria-pressed={lang === code}
            onClick={() => setLang(code)}
          >
            {code === base
              ? `${t('homebrew.baseLanguage')} (${code.toUpperCase()})`
              : nativeLabel}
          </Button>
        ))}
      </div>
      {lang !== base && (
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink-200">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => {
              if (event.target.checked)
                setDocuments((current) => ({
                  ...current,
                  [lang]: current[lang] ?? current[base]!,
                }));
              setDisabled((current) =>
                event.target.checked
                  ? current.filter((code) => code !== lang)
                  : [...current, lang],
              );
              onChange();
            }}
          />
          {t('homebrew.enableTranslation')}
        </label>
      )}
      <label className="field-label">
        {t(lang === base ? 'homebrew.baseJson' : 'homebrew.translationJson')}
        <textarea
          ref={jsonInput}
          aria-describedby={errorId}
          data-dialog-focus
          className={inputClass('resize-y font-mono')}
          rows={15}
          spellCheck={false}
          value={documents[lang] ?? documents[base] ?? ''}
          onChange={(event) => {
            setDocuments({ ...documents, [lang]: event.target.value });
            setDisabled(disabled.filter((code) => code !== lang));
            onChange();
          }}
        />
      </label>
      <p className="text-sm text-ink-300">{t('homebrew.importedEditorHint')}</p>
    </form>
  );
}
