import { useRef } from 'react';
import { Plus, Trash2, Upload, UserRound } from 'lucide-react';
import { alertDialog, confirmDialog } from '@/features/ui/confirmStore';
import { useNavigate } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { Button, IconButton } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { type Character, isDmCharacter } from './model';
import { type LayoutZone, useLayoutStore } from './layoutStore';
import { useCharacterList, useCharacterStore } from './store';

interface CharacterExportFile {
  version: number;
  character: Character;
  layout?: Record<LayoutZone, string[]>;
}

export function CharacterListPage() {
  const { t } = useT();
  useSeo(t('seo.pageTitles.character'), t('seo.pageDescriptions.character'));
  const navigate = useNavigate();
  const characters = useCharacterList();
  const addCharacter = useCharacterStore((state) => state.addCharacter);
  const saveCharacter = useCharacterStore((state) => state.saveCharacter);
  const deleteCharacter = useCharacterStore((state) => state.deleteCharacter);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    const id = addCharacter(t('character.list.newCharacter'));
    navigate(`/character/${id}`);
  };

  const handleImport = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<CharacterExportFile> &
        Partial<Character>;

      const character = (parsed.character ?? parsed) as Character;
      if (!character.id || !character.name) throw new Error('Invalid character file');
      saveCharacter(character);
      if (parsed.layout) {
        useLayoutStore.setState({ zones: parsed.layout });
      }
    } catch {
      await alertDialog(t('character.list.importFailedMessage'), {
        title: t('character.list.importFailedTitle'),
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-ink-50 sm:text-3xl">
          {t('character.list.title')}
        </h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="w-full sm:w-auto" onClick={() => fileInput.current?.click()}>
            <Upload size={16} /> {t('character.list.import')}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImport(file);
              event.target.value = '';
            }}
          />
          <Button className="w-full sm:w-auto" onClick={handleCreate} variant="primary">
            <Plus size={16} /> {t('character.list.newCharacter')}
          </Button>
        </div>
      </header>

      {characters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-700 p-12 text-center text-ink-300">
          {t('character.list.emptyState')}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <li key={character.id} className="min-w-0">
              <div
                className={panelClass(
                  'group relative flex min-w-0 flex-col gap-2 border-ink-700 p-4 transition-colors hover:border-arcane-500',
                )}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/character/${character.id}`)}
                  className="flex min-w-0 items-center gap-3 pr-10 text-left"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-700 bg-ink-950">
                    {character.portrait ? (
                      <img
                        src={character.portrait}
                        alt=""
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound
                        className="text-arcane-300"
                        size={24}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-lg font-semibold text-ink-50">
                      <span className="break-words">
                        {character.name || t('character.unnamed')}
                      </span>
                      {isDmCharacter(character) && (
                        <span className="rounded-full border border-ember-500/50 px-1.5 text-[0.65rem] uppercase tracking-wide text-ember-400">
                          {t('character.dmBadge')}
                        </span>
                      )}
                    </p>
                    <p className="break-words text-sm text-ink-400">
                      {t('character.list.level', { level: character.level })}
                      {character.className && ` ${character.className}`}
                      {character.species && ` · ${character.species}`}
                    </p>
                  </div>
                </button>
                <IconButton
                  label={t('character.list.deleteLabel', { name: character.name })}
                  onClick={async () => {
                    const ok = await confirmDialog(
                      t('character.list.deleteConfirm', {
                        name: character.name || t('character.list.thisCharacter'),
                      }),
                      { tone: 'danger', confirmLabel: t('common.delete') },
                    );
                    if (ok) deleteCharacter(character.id);
                  }}
                  variant="ghost"
                  size="sm"
                  className="absolute right-3 top-3 text-ink-400 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
