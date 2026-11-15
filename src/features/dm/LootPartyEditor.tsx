import { useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { normalizeSearchText } from '@/data/compendium/searchText';
import { isDmCharacter, type Character } from '@/features/character/model';
import {
  Button,
  IconButton,
  SearchField,
  Select,
  TextInput,
  ToggleChip,
} from '@/features/ui/primitives';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { MAX_PARTY_COUNT, validPartyNumber, type LootSettings } from './lootData';

interface Props {
  settings: LootSettings;
  characters: Character[];
  selectedIds: string[];
  update: (patch: Partial<LootSettings>) => void;
}

export function LootPartyEditor({ settings, characters, selectedIds, update }: Props) {
  const { locale, t } = useT();
  const addRef = useRef<HTMLButtonElement>(null);
  const [requestedPage, setPage] = useState(1);
  const term = normalizeSearchText(settings.search.trim());
  const filtered = characters
    .filter(
      (character) =>
        (settings.role === 'all' ||
          isDmCharacter(character) === (settings.role === 'dm')) &&
        normalizeSearchText(
          `${character.name} ${character.className} ${character.subclass}`,
        ).includes(term),
    )
    .sort(
      (a, b) =>
        (settings.sort === 'level' ? b.level - a.level : 0) ||
        a.name.localeCompare(b.name, locale) ||
        a.id.localeCompare(b.id),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 50));
  const page = Math.min(requestedPage, pages);
  const shown = filtered.slice((page - 1) * 50, page * 50);
  const selectMatches = (selected: boolean) => {
    const ids = new Set(selectedIds);
    for (const character of filtered) {
      if (selected) ids.add(character.id);
      else ids.delete(character.id);
    }
    update({ selectedIds: [...ids] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <ToggleChip
          active={settings.source === 'manual'}
          onClick={() => update({ source: 'manual' })}
        >
          {t('dm.loot.manualParty')}
        </ToggleChip>
        <ToggleChip
          active={settings.source === 'saved'}
          onClick={() => update({ source: 'saved' })}
        >
          {t('dm.loot.savedCharacters')}
        </ToggleChip>
      </div>
      {settings.source === 'manual' ? (
        <div className="space-y-3">
          {settings.groups.map((group) => (
            <div
              key={group.id}
              className="grid grid-cols-1 items-start gap-3 rounded-lg border border-ink-700 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            >
              {(['count', 'level'] as const).map((field) => {
                const valid = validPartyNumber(
                  group[field],
                  field === 'count' ? MAX_PARTY_COUNT : 20,
                );
                const errorId = `loot-${group.id}-${field}-error`;
                return (
                  <div key={field} className="min-w-0">
                    <label>
                      <span className="field-label">
                        {t(
                          field === 'count'
                            ? 'dm.loot.characterCount'
                            : 'dm.loot.characterLevel',
                        )}
                      </span>
                      <TextInput
                        type="number"
                        min={1}
                        max={field === 'count' ? MAX_PARTY_COUNT : 20}
                        step={1}
                        value={group[field]}
                        aria-invalid={!valid}
                        aria-describedby={!valid ? errorId : undefined}
                        onChange={(event) =>
                          update({
                            groups: settings.groups.map((row) =>
                              row.id === group.id
                                ? { ...row, [field]: event.target.value }
                                : row,
                            ),
                          })
                        }
                      />
                    </label>
                    {!valid && (
                      <span
                        id={errorId}
                        role="alert"
                        className="mt-1 block text-sm text-red-300"
                      >
                        {t(
                          field === 'count'
                            ? 'dm.loot.invalidCount'
                            : 'dm.loot.invalidLevel',
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
              {settings.groups.length > 1 && (
                <IconButton
                  label={t('dm.loot.removeLevelGroup')}
                  variant="ghost"
                  className="self-end"
                  onClick={() => {
                    update({
                      groups: settings.groups.filter((row) => row.id !== group.id),
                    });
                    addRef.current?.focus();
                  }}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </IconButton>
              )}
            </div>
          ))}
          <Button
            ref={addRef}
            size="sm"
            onClick={() =>
              update({
                groups: [
                  ...settings.groups,
                  { id: crypto.randomUUID(), count: '1', level: '1' },
                ],
              })
            }
          >
            <Plus size={16} aria-hidden="true" />
            {t('dm.loot.addLevelGroup')}
          </Button>
        </div>
      ) : characters.length === 0 ? (
        <p className="empty-state">
          {t('dm.loot.noCharactersYet')}{' '}
          <Link to="/character" className="back-link">
            {t('dm.loot.createYourParty')}
          </Link>
        </p>
      ) : (
        <>
          <div className="catalog-toolbar">
            <SearchField
              label={t('dm.loot.partySearch')}
              placeholder={t('dm.loot.partySearch')}
              value={settings.search}
              clearLabel={t('common.clearSearch')}
              onClear={() => {
                update({ search: '' });
                setPage(1);
              }}
              onChange={(event) => {
                update({ search: event.target.value });
                setPage(1);
              }}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                <span className="field-label">{t('dm.loot.role')}</span>
                <Select
                  value={settings.role}
                  onChange={(event) => {
                    update({ role: event.target.value as LootSettings['role'] });
                    setPage(1);
                  }}
                >
                  {(['party', 'dm', 'all'] as const).map((role) => (
                    <option key={role} value={role}>
                      {t(`dm.loot.roles.${role}`)}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                <span className="field-label">{t('dm.loot.sort')}</span>
                <Select
                  value={settings.sort}
                  onChange={(event) =>
                    update({ sort: event.target.value as LootSettings['sort'] })
                  }
                >
                  <option value="name">{t('dm.loot.sortName')}</option>
                  <option value="level">{t('dm.loot.sortLevel')}</option>
                </Select>
              </label>
            </div>
            <p role="status" className="text-sm text-ink-300">
              {t('dm.loot.selectionSummary', {
                selected: characters.filter((character) =>
                  selectedIds.includes(character.id),
                ).length,
                total: characters.length,
                matches: filtered.length,
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={filtered.every((character) =>
                  selectedIds.includes(character.id),
                )}
                onClick={() => selectMatches(true)}
              >
                {t('dm.loot.selectMatches')}
              </Button>
              <Button
                size="sm"
                disabled={
                  !filtered.some((character) => selectedIds.includes(character.id))
                }
                onClick={() => selectMatches(false)}
              >
                {t('dm.loot.clearMatches')}
              </Button>
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="empty-state">{t('dm.loot.noMatchingCharacters')}</p>
          ) : (
            <div
              role="region"
              aria-label={t('dm.loot.savedCharacters')}
              tabIndex={0}
              className="max-h-80 overflow-y-auto p-1"
            >
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {shown.map((character) => (
                  <li key={character.id} className="min-w-0">
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-700 bg-ink-950 p-3 text-sm hover:bg-ink-800">
                      <input
                        type="checkbox"
                        className="mt-1 shrink-0 accent-arcane-500"
                        checked={selectedIds.includes(character.id)}
                        onChange={(event) =>
                          update({
                            selectedIds: event.target.checked
                              ? [...selectedIds, character.id]
                              : selectedIds.filter((id) => id !== character.id),
                          })
                        }
                      />
                      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                        <span className="block font-medium text-ink-50">
                          {character.name || t('character.unnamed')}
                          {isDmCharacter(character) && (
                            <span className="badge ml-2">{t('character.dmBadge')}</span>
                          )}
                        </span>
                        <span className="mt-1 block text-xs text-ink-400">
                          {[
                            t('dm.loot.level', { level: character.level }),
                            character.className,
                            character.subclass,
                          ]
                            .filter(Boolean)
                            .join(' - ')}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {pages > 1 && (
            <nav
              className="flex flex-wrap items-center gap-3"
              aria-label={t('dm.loot.savedCharacters')}
            >
              <Button size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                {t('dm.loot.previous')}
              </Button>
              <span className="text-sm text-ink-400">
                {t('dm.loot.pageInfo', { page, pages })}
              </span>
              <Button
                size="sm"
                disabled={page === pages}
                onClick={() => setPage(page + 1)}
              >
                {t('dm.loot.next')}
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
