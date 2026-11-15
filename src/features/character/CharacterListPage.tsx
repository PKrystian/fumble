import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, Plus, Trash2, Upload, UserRound } from 'lucide-react';
import { normalizeSearchText } from '@/data/compendium/searchText';
import { downloadTextFile } from '@/features/storage/downloadFile';
import { confirmDialog } from '@/features/ui/confirmStore';
import { Button, IconButton, SearchField, ToggleChip } from '@/features/ui/primitives';
import { buttonClass, inputClass, panelClass } from '@/features/ui/styles';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';
import { Link } from '@/i18n/path';
import { useNavigate } from '@/i18n/pathUtils';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { CharacterDataNotice } from './CharacterDataNotice';
import { characterFileText, safeFilename } from './characterData';
import { type Character, isDmCharacter } from './model';
import { useCharacterList, useCharacterStore } from './store';
import { useCharacterLabels } from './useCharacterLabels';

export const CHARACTER_PAGE_SIZE = 50;
const SORTS = ['manual', 'name', 'updated', 'level'] as const;
type CharacterSort = (typeof SORTS)[number];
const ROLES = ['all', 'party', 'dm'] as const;
type RoleFilter = (typeof ROLES)[number];

export function CharacterListPage() {
  const { t, locale } = useT();
  useSeo(t('seo.pageTitles.character'), t('seo.pageDescriptions.character'), false);
  const navigate = useNavigate();
  const characters = useCharacterList();
  const deleted = useCharacterStore((state) => state.deleted);
  const status = useCharacterStore((state) => state.status);
  const labels = useCharacterLabels();
  const { params, update } = useUrlSearchState();
  const resultsRef = useRef<HTMLParagraphElement>(null);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const sort = (SORTS as readonly string[]).includes(params.get('sort') ?? '')
    ? (params.get('sort') as CharacterSort)
    : 'manual';
  const role = (ROLES as readonly string[]).includes(params.get('role') ?? '')
    ? (params.get('role') as RoleFilter)
    : 'all';
  const requestedPage = Number.parseInt(params.get('page') ?? '1', 10);

  useEffect(() => {
    useCharacterStore.getState().checkStorage();
  }, []);

  const unnamed = t('character.unnamed');
  const displayName = (character: Character) => character.name.trim() || unnamed;

  const filtered = useMemo(() => {
    const term = normalizeSearchText(query.trim());
    const matches = characters.filter((character) => {
      if (role === 'dm' && !isDmCharacter(character)) return false;
      if (role === 'party' && isDmCharacter(character)) return false;
      if (!term) return true;
      const label = labels(character);
      return [
        character.name,
        label.className,
        label.species,
        label.background,
        label.englishClass,
        label.englishSpecies,
      ].some((value) => normalizeSearchText(value).includes(term));
    });
    if (sort === 'manual') return matches;
    const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
    return [...matches].sort((a, b) => {
      if (sort === 'updated') return b.updatedAt - a.updatedAt;
      if (sort === 'level' && a.level !== b.level) return b.level - a.level;
      return collator.compare(a.name.trim() || unnamed, b.name.trim() || unnamed);
    });
  }, [characters, query, role, sort, labels, locale, unnamed]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / CHARACTER_PAGE_SIZE));
  const page = Number.isInteger(requestedPage)
    ? Math.min(Math.max(1, requestedPage), pageCount)
    : 1;
  const visible = filtered.slice(
    (page - 1) * CHARACTER_PAGE_SIZE,
    page * CHARACTER_PAGE_SIZE,
  );

  const copyName = (character: Character) =>
    t('character.list.copyName', { name: displayName(character) });

  const handleCreate = () => {
    const id = useCharacterStore
      .getState()
      .addCharacter(t('character.list.newCharacter'));
    navigate(`/character/${id}`);
  };

  const exportOne = (character: Character) => {
    try {
      downloadTextFile(
        characterFileText([character]),
        `${safeFilename(displayName(character), 'character')}.json`,
      );
    } catch {
      setMessage({ text: t('character.data.downloadFailed'), error: true });
    }
  };

  const remove = async (character: Character) => {
    const ok = await confirmDialog(
      t('character.list.deleteConfirm', { name: displayName(character) }),
      { tone: 'danger', confirmLabel: t('common.delete'), initialFocus: 'cancel' },
    );
    if (!ok) return;
    useCharacterStore.getState().deleteCharacter(character.id);
    setMessage({
      text: t('character.list.deleted', { name: displayName(character) }),
      error: false,
    });
  };

  const undo = () => {
    const id = useCharacterStore.getState().undoDelete();
    if (!id) return;
    setMessage({ text: t('character.list.restored'), error: false });
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-character-open="${id}"]`)?.focus(),
    );
  };

  const duplicate = (character: Character) => {
    const id = useCharacterStore
      .getState()
      .duplicateCharacter(character.id, copyName(character));
    setMessage({
      text: t('character.list.duplicated', { name: displayName(character) }),
      error: false,
    });
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-character-open="${id}"]`)?.focus(),
    );
  };

  const setView = (values: Record<string, string | null>) =>
    update({ ...values, page: null }, true);
  const filtersActive = role !== 'all';

  return (
    <div className="page-shell">
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-title">{t('character.list.title')}</h1>
          <p className="page-description">{t('character.list.description')}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Link to="/data" className={buttonClass({ className: 'w-full sm:w-auto' })}>
            <Upload size={16} aria-hidden="true" /> {t('character.list.transfer')}
          </Link>
          <Button
            className="order-first w-full sm:order-none sm:w-auto"
            onClick={handleCreate}
            variant="primary"
          >
            <Plus size={16} aria-hidden="true" /> {t('character.list.newCharacter')}
          </Button>
        </div>
      </header>

      <CharacterDataNotice />

      {message && (
        <div
          role={message.error ? 'alert' : 'status'}
          className={`mb-6 flex flex-wrap items-center justify-between gap-2 ${message.error ? 'notice notice-error' : 'notice notice-success'}`}
        >
          <span>{message.text}</span>
          {!message.error && deleted && (
            <Button size="sm" disabled={status === 'unreadable'} onClick={undo}>
              {t('character.list.undoDelete')}
            </Button>
          )}
        </div>
      )}

      {characters.length === 0 ? (
        <div className="empty-state">{t('character.list.emptyState')}</div>
      ) : (
        <>
          <section className="catalog-toolbar" aria-label={t('character.list.toolbar')}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
              <SearchField
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (page !== 1) update({ page: null }, true);
                }}
                onClear={() => setQuery('')}
                label={t('character.list.searchLabel')}
                clearLabel={t('common.clearSearch')}
                placeholder={t('character.list.searchPlaceholder')}
              />
              <label className="flex flex-col gap-1">
                <span className="sr-only">{t('character.list.sortLabel')}</span>
                <select
                  className={inputClass()}
                  value={sort}
                  aria-label={t('character.list.sortLabel')}
                  onChange={(event) =>
                    setView({
                      sort: event.target.value === 'manual' ? null : event.target.value,
                    })
                  }
                >
                  {SORTS.map((option) => (
                    <option key={option} value={option}>
                      {t(`character.list.sorts.${option}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-label={t('character.list.roleLabel')}
            >
              {ROLES.map((option) => (
                <ToggleChip
                  key={option}
                  active={role === option}
                  onClick={() => setView({ role: option === 'all' ? null : option })}
                >
                  {t(`character.list.roles.${option}`)}
                </ToggleChip>
              ))}
              {filtersActive && (
                <Button size="sm" variant="ghost" onClick={() => setView({ role: null })}>
                  {t('character.list.resetFilters')}
                </Button>
              )}
            </div>
            <p
              ref={resultsRef}
              tabIndex={-1}
              role="status"
              className="text-sm text-ink-300"
            >
              {filtered.length === 0
                ? t('character.list.noResultsCount', { total: characters.length })
                : t('character.list.resultCount', {
                    from: (page - 1) * CHARACTER_PAGE_SIZE + 1,
                    to: (page - 1) * CHARACTER_PAGE_SIZE + visible.length,
                    count: filtered.length,
                    total: characters.length,
                  })}
            </p>
          </section>

          {filtered.length === 0 ? (
            <div className="empty-state flex flex-col items-center gap-3">
              <p>{t('character.list.noMatches')}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {query && (
                  <Button size="sm" onClick={() => setQuery('')}>
                    {t('common.clearSearch')}
                  </Button>
                )}
                {filtersActive && (
                  <Button size="sm" onClick={() => setView({ role: null })}>
                    {t('character.list.resetFilters')}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((character) => {
                const label = labels(character);
                const name = displayName(character);
                const summary = [
                  t('character.list.level', { level: character.level }),
                  label.className,
                  label.species,
                ]
                  .filter(Boolean)
                  .join(' - ');
                return (
                  <li key={character.id} className="min-w-0">
                    <article
                      className={panelClass(
                        'flex h-full min-w-0 flex-col gap-3 p-4 transition-colors duration-150 hover:border-arcane-500 hover:bg-ink-800',
                      )}
                    >
                      <button
                        type="button"
                        data-character-open={character.id}
                        onClick={() => navigate(`/character/${character.id}`)}
                        className="flex min-w-0 items-start gap-3 rounded-lg text-left"
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
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-lg font-semibold text-ink-50">
                            <span className="min-w-0 [overflow-wrap:anywhere]">
                              {name}
                            </span>
                            {isDmCharacter(character) && (
                              <span className="badge border-ember-500/50 text-ember-400">
                                {t('character.dmBadge')}
                              </span>
                            )}
                          </span>
                          <span className="text-sm text-ink-300 [overflow-wrap:anywhere]">
                            {summary}
                          </span>
                          <span className="text-xs text-ink-400">
                            {t('character.list.updated', {
                              date: new Date(character.updatedAt).toLocaleDateString(
                                locale,
                              ),
                            })}
                          </span>
                        </span>
                      </button>
                      <div className="mt-auto flex flex-wrap justify-end gap-1">
                        <IconButton
                          label={t('character.list.duplicateLabel', { name })}
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicate(character)}
                        >
                          <Copy size={16} aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          label={t('character.list.exportLabel', { name })}
                          variant="ghost"
                          size="sm"
                          onClick={() => exportOne(character)}
                        >
                          <Download size={16} aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          label={t('character.list.deleteLabel', { name })}
                          variant="ghost"
                          size="sm"
                          className="hover:text-red-300"
                          onClick={() => void remove(character)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </IconButton>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}

          {filtered.length > CHARACTER_PAGE_SIZE && (
            <nav
              className="my-6 flex flex-wrap items-center justify-between gap-3"
              aria-label={t('character.list.pagination')}
            >
              <Button
                disabled={page === 1}
                onClick={() => {
                  update({ page: page - 1 > 1 ? String(page - 1) : null });
                  resultsRef.current?.focus();
                }}
              >
                {t('character.list.previousPage')}
              </Button>
              <span className="text-sm tabular-nums text-ink-300">
                {page} / {pageCount}
              </span>
              <Button
                disabled={page >= pageCount}
                onClick={() => {
                  update({ page: String(page + 1) });
                  resultsRef.current?.focus();
                }}
              >
                {t('character.list.nextPage')}
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
