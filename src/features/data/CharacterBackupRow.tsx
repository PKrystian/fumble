import { useRef, useState } from 'react';
import {
  CharacterImportDialog,
  type CharacterImportPreview,
} from '@/features/character/CharacterImportDialog';
import {
  characterFileText,
  parseCharacterFile,
} from '@/features/character/characterData';
import { layoutSnapshot, useLayoutStore } from '@/features/character/layoutStore';
import {
  type CharacterImportMode,
  useCharacterList,
  useCharacterStore,
} from '@/features/character/store';
import { downloadTextFile } from '@/features/storage/downloadFile';
import { Button } from '@/features/ui/primitives';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';

function importErrorKey(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message === 'character-file-too-large') return 'character.import.tooLarge';
  if (message === 'character-file-empty') return 'character.import.noCharacters';
  return 'character.import.invalid';
}

interface CharacterBackupRowProps {
  busy: boolean;
  notify: (text: string, error?: boolean) => void;
  onChange: () => void;
}

export function CharacterBackupRow({ busy, notify, onChange }: CharacterBackupRowProps) {
  const { t } = useT();
  const characters = useCharacterList();
  const status = useCharacterStore((state) => state.status);
  const fileInput = useRef<HTMLInputElement>(null);
  const importButton = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState<CharacterImportPreview | null>(null);
  const available = status !== 'unreadable' && status !== 'conflict';
  const tool = t('nav.characterSheet');

  const exportAll = () => {
    try {
      downloadTextFile(
        characterFileText(characters, layoutSnapshot()),
        'fumble-characters.json',
      );
      notify(t('character.list.exportedAll'));
    } catch {
      notify(t('character.data.downloadFailed'), true);
    }
  };

  const selectFile = async (file: File) => {
    try {
      const parsed = parseCharacterFile(await file.text());
      setPreview({ ...parsed, filename: file.name });
    } catch (error) {
      notify(t(importErrorKey(error), { filename: file.name }), true);
    }
  };

  const runImport = (
    selected: CharacterImportPreview,
    mode: CharacterImportMode,
    applyLayout: boolean,
  ) => {
    const ids = useCharacterStore
      .getState()
      .importCharacters(selected.characters, mode, (character) =>
        t('character.list.copyName', {
          name: character.name.trim() || t('character.unnamed'),
        }),
      );
    if (applyLayout) useLayoutStore.getState().applyLayout(selected.layout);
    setPreview(null);
    notify(t('character.import.done', { count: ids.length }));
    onChange();
    requestAnimationFrame(() => importButton.current?.focus());
  };

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1 basis-48">
        <Link to="/character" className="font-semibold text-ink-50 hover:underline">
          {tool}
        </Link>
        <p className="text-sm text-ink-400">
          {available
            ? `${t('data.counts.characters')}: ${characters.length}`
            : t('data.tools.unavailable')}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy || !available || characters.length === 0}
          aria-label={t('data.tools.downloadNamed', { tool })}
          onClick={exportAll}
        >
          {t('data.tools.download')}
        </Button>
        <Button
          ref={importButton}
          size="sm"
          disabled={busy || !available}
          aria-label={t('data.tools.importNamed', { tool })}
          onClick={() => fileInput.current?.click()}
        >
          {t('data.tools.importFile')}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          tabIndex={-1}
          aria-label={t('data.tools.importNamed', { tool })}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void selectFile(file);
            event.target.value = '';
          }}
        />
      </div>
      {preview && (
        <CharacterImportDialog
          preview={preview}
          existing={characters}
          onCancel={() => {
            setPreview(null);
            requestAnimationFrame(() => importButton.current?.focus());
          }}
          onImport={(mode, applyLayout) => runImport(preview, mode, applyLayout)}
        />
      )}
    </li>
  );
}
