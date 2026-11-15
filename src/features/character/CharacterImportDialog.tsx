import { useId, useState } from 'react';
import { downloadTextFile } from '@/features/storage/downloadFile';
import { confirmDialog } from '@/features/ui/confirmStore';
import { FormDialog } from '@/features/ui/FormDialog';
import { Button } from '@/features/ui/primitives';
import { useT } from '@/i18n/useT';
import { characterFileText, type CharacterFile } from './characterData';
import { readLayout } from './layoutStore';
import type { Character } from './model';
import type { CharacterImportMode } from './store';

export interface CharacterImportPreview extends CharacterFile {
  filename: string;
}

interface CharacterImportDialogProps {
  preview: CharacterImportPreview;
  existing: Character[];
  onCancel: () => void;
  onImport: (mode: CharacterImportMode, applyLayout: boolean) => void;
}

const PREVIEW_LIMIT = 10;

export function CharacterImportDialog({
  preview,
  existing,
  onCancel,
  onImport,
}: CharacterImportDialogProps) {
  const { t, locale } = useT();
  const groupId = useId();
  const existingIds = new Set(existing.map((character) => character.id));
  const duplicates = preview.characters.filter((character) =>
    existingIds.has(character.id),
  );
  const [mode, setMode] = useState<CharacterImportMode>('copy');
  const [useLayout, setUseLayout] = useState(false);
  const [emptyAccepted, setEmptyAccepted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const layoutAvailable = readLayout(preview.layout) !== null;
  const empty = preview.characters.length === 0;
  const replacing = mode !== 'copy';
  const blocked =
    (empty && mode !== 'replaceAll') ||
    (empty && mode === 'replaceAll' && !emptyAccepted);

  const modes: CharacterImportMode[] = [
    'copy',
    ...(duplicates.length > 0 ? (['replace'] as const) : []),
    ...(existing.length > 0 ? (['replaceAll'] as const) : []),
  ];

  const downloadCurrent = () => {
    try {
      downloadTextFile(characterFileText(existing), 'fumble-characters-current.json');
      setFeedback(t('character.data.downloaded'));
    } catch {
      setFeedback(t('character.data.downloadFailed'));
    }
  };

  const submit = async () => {
    if (
      replacing &&
      !(await confirmDialog(
        t(
          mode === 'replaceAll'
            ? 'character.import.confirmReplaceAll'
            : 'character.import.confirmReplace',
          { count: mode === 'replaceAll' ? existing.length : duplicates.length },
        ),
        {
          tone: 'danger',
          confirmLabel: t('character.import.replaceAction'),
          initialFocus: 'cancel',
        },
      ))
    )
      return;
    onImport(mode, layoutAvailable && useLayout);
  };

  return (
    <FormDialog
      title={t('character.import.title')}
      onClose={onCancel}
      actions={
        <>
          <Button onClick={onCancel}>{t('common.cancel')}</Button>
          <Button
            data-dialog-focus
            variant={replacing ? 'danger' : 'primary'}
            disabled={blocked}
            onClick={() => void submit()}
          >
            {t(replacing ? 'character.import.replaceAction' : 'character.import.add', {
              count: preview.characters.length,
            })}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm text-ink-200">
        <dl className="grid grid-cols-1 gap-3 [overflow-wrap:anywhere] sm:grid-cols-2">
          <div>
            <dt className="field-label">{t('data.filename')}</dt>
            <dd>{preview.filename}</dd>
          </div>
          <div>
            <dt className="field-label">{t('data.exportedAt')}</dt>
            <dd>
              {preview.exportedAt
                ? new Date(preview.exportedAt).toLocaleString(locale)
                : t('character.import.unknownDate')}
            </dd>
          </div>
          <div>
            <dt className="field-label">{t('character.import.fileType')}</dt>
            <dd>{t(`character.import.kinds.${preview.kind}`)}</dd>
          </div>
          <div>
            <dt className="field-label">{t('data.fileVersion')}</dt>
            <dd>{preview.version}</dd>
          </div>
          <div>
            <dt className="field-label">{t('data.counts.characters')}</dt>
            <dd className="tabular-nums">{preview.characters.length}</dd>
          </div>
          <div>
            <dt className="field-label">{t('character.import.duplicates')}</dt>
            <dd className="tabular-nums">{duplicates.length}</dd>
          </div>
        </dl>

        {empty ? (
          <p className="empty-state">{t('character.import.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {preview.characters.slice(0, PREVIEW_LIMIT).map((character) => (
              <li
                key={character.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-700 px-3 py-2"
              >
                <span className="min-w-0 font-semibold text-ink-50 [overflow-wrap:anywhere]">
                  {character.name.trim() || t('character.unnamed')}
                </span>
                <span className="flex flex-wrap gap-1">
                  <span className="badge">
                    {t('character.list.level', { level: character.level })}
                  </span>
                  {existingIds.has(character.id) && (
                    <span className="badge">{t('character.import.alreadySaved')}</span>
                  )}
                </span>
              </li>
            ))}
            {preview.characters.length > PREVIEW_LIMIT && (
              <li className="text-ink-400">
                {t('character.import.more', {
                  count: preview.characters.length - PREVIEW_LIMIT,
                })}
              </li>
            )}
          </ul>
        )}

        {modes.length > 1 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="field-label mb-1">
              {t('character.import.modeLabel')}
            </legend>
            {modes.map((option) => (
              <label key={option} className="flex items-start gap-2">
                <input
                  type="radio"
                  name={groupId}
                  value={option}
                  checked={mode === option}
                  onChange={() => setMode(option)}
                  className="mt-1 accent-arcane-500"
                />
                <span>
                  <span className="font-semibold text-ink-50">
                    {t(`character.import.modes.${option}`)}
                  </span>
                  <span className="block text-ink-400">
                    {t(`character.import.modeHelp.${option}`, {
                      count:
                        option === 'replaceAll' ? existing.length : duplicates.length,
                    })}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {layoutAvailable && (
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={useLayout}
              onChange={(event) => setUseLayout(event.target.checked)}
              className="mt-1 accent-arcane-500"
            />
            {t('character.import.applyLayout')}
          </label>
        )}

        {replacing && (
          <div className="notice notice-warning flex flex-col gap-2">
            <p>{t('character.import.replaceWarning')}</p>
            <Button className="self-start" onClick={downloadCurrent}>
              {t('character.data.downloadCurrent')}
            </Button>
          </div>
        )}

        {empty && mode === 'replaceAll' && (
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={emptyAccepted}
              onChange={(event) => setEmptyAccepted(event.target.checked)}
              className="mt-1 accent-arcane-500"
            />
            {t('character.import.emptyAccept')}
          </label>
        )}

        {feedback && (
          <p role="status" className="notice">
            {feedback}
          </p>
        )}
      </div>
    </FormDialog>
  );
}
