import { useEffect, useRef, useState } from 'react';
import { normalizeSearchText } from '@/data/compendium/searchText';
import { armorClass, initiativeBonus, isDmCharacter } from '@/features/character/model';
import { useCharacterList } from '@/features/character/store';
import { Button, SearchField, Select } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { CombatantForm } from './CombatantForm';
import { InitiativeDialog } from './InitiativeDialog';
import type { Combatant, NewCombatant } from './model';

export function CombatantPicker({
  combatants,
  onPick,
  onClose,
}: {
  combatants: Combatant[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    search.current?.focus();
  }, []);
  const term = normalizeSearchText(query.trim());
  const results = combatants.flatMap((row, index) => {
    const name = row.name.trim() || t('initiative.unnamed');
    return normalizeSearchText(name).includes(term) ? [{ row, index, name }] : [];
  });
  return (
    <InitiativeDialog title={t('initiative.findCombatant')} onClose={onClose}>
      <SearchField
        ref={search}
        label={t('initiative.searchCombatants')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onClear={() => {
          setQuery('');
          search.current?.focus();
        }}
        clearLabel={t('common.clearSearch')}
      />
      <p className="text-sm text-ink-300" role="status">
        {t('initiative.results', { count: results.length })}
      </p>
      {results.length === 0 ? (
        <p className="empty-state">{t('initiative.noMatches')}</p>
      ) : (
        <ul className="space-y-2">
          {results.map(({ row, index, name }) => (
            <li key={row.id}>
              <Button
                className="w-full min-w-0 justify-start text-left"
                onClick={() => onPick(row.id)}
              >
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {t('initiative.queueResult', { position: index + 1, name })}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </InitiativeDialog>
  );
}

export function CharacterPicker({
  onAdd,
  onClose,
  blocked,
}: {
  onAdd: (row: NewCombatant) => boolean;
  onClose: () => void;
  blocked: boolean;
}) {
  const { t, locale } = useT();
  const characters = useCharacterList();
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const search = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLParagraphElement>(null);
  const selected = characters.find((row) => row.id === selectedId);
  const nameOf = (name: string) => name.trim() || t('initiative.unnamed');
  const term = normalizeSearchText(query.trim());
  const results = characters
    .filter(
      (row) =>
        (role === 'all' || (isDmCharacter(row) ? 'dm' : 'party') === role) &&
        normalizeSearchText(nameOf(row.name)).includes(term),
    )
    .sort((a, b) => nameOf(a.name).localeCompare(nameOf(b.name), locale));
  useEffect(() => {
    if (selectedId) preview.current?.focus();
    else search.current?.focus();
  }, [selectedId]);

  return (
    <InitiativeDialog title={t('initiative.addFromRoster')} onClose={onClose}>
      {selected ? (
        <>
          <Button onClick={() => setSelectedId('')}>
            {t('initiative.backToCharacters')}
          </Button>
          <p ref={preview} tabIndex={-1} className="text-sm text-ink-300">
            {t('initiative.characterCopy')}
          </p>
          <CombatantForm
            key={selected.id}
            mode="preview"
            disabled={blocked}
            rollBonus={initiativeBonus(selected)}
            initial={{
              name: nameOf(selected.name),
              initiative: null,
              ac: armorClass(selected),
              hpCurrent: selected.hp.current,
              hpMax: selected.hp.max,
              conditions: selected.conditions,
              isPlayer: !isDmCharacter(selected),
            }}
            onSubmit={onAdd}
            onCancel={onClose}
          />
          {blocked && (
            <p className="notice notice-error" role="alert">
              {t('initiative.addBlocked')}
            </p>
          )}
        </>
      ) : characters.length === 0 ? (
        <div className="space-y-2">
          <p className="empty-state">{t('initiative.noCharacters')}</p>
          <Link to="/character" className="back-link">
            {t('character.list.title')}
          </Link>
        </div>
      ) : (
        <>
          <SearchField
            ref={search}
            label={t('initiative.searchCharacters')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => {
              setQuery('');
              search.current?.focus();
            }}
            clearLabel={t('common.clearSearch')}
          />
          <label className="block space-y-1">
            <span className="field-label">{t('initiative.role')}</span>
            <Select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="all">{t('initiative.allRoles')}</option>
              <option value="party">{t('initiative.partyRole')}</option>
              <option value="dm">{t('initiative.dmRole')}</option>
            </Select>
          </label>
          <p className="text-sm text-ink-300" role="status">
            {t('initiative.results', { count: results.length })}
          </p>
          {results.length === 0 ? (
            <p className="empty-state">{t('initiative.noMatches')}</p>
          ) : (
            <ul className="space-y-2">
              {results.map((row) => (
                <li className={panelClass('min-w-0 p-1')} key={row.id}>
                  <Button
                    variant="ghost"
                    className="w-full min-w-0 justify-start text-left"
                    onClick={() => setSelectedId(row.id)}
                  >
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      <span className="block font-semibold">{nameOf(row.name)}</span>
                      <span className="block text-xs text-ink-300">
                        {t(
                          isDmCharacter(row)
                            ? 'initiative.dmRole'
                            : 'initiative.partyRole',
                        )}
                      </span>
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </InitiativeDialog>
  );
}
