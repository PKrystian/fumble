import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Trash2, UserPlus } from 'lucide-react';
import { confirmDialog } from '@/features/ui/confirmStore';
import { Button, IconButton } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { CombatantForm } from './CombatantForm';
import { CombatantRow } from './CombatantRow';
import { InitiativeDataControls } from './InitiativeDataControls';
import { InitiativeDialog } from './InitiativeDialog';
import { CharacterPicker, CombatantPicker } from './InitiativePickers';
import { INITIATIVE_KEY, sortCombatants } from './model';
import { useInitiativeStore } from './store';

export function InitiativeTrackerPage() {
  const { t } = useT();
  useSeo(t('seo.pageTitles.initiative'), t('seo.pageDescriptions.initiative'));
  const state = useInitiativeStore();
  const {
    combatants,
    round,
    turnId,
    status,
    addCombatant,
    updateCombatant,
    removeCombatant,
    clear,
    next,
    previous,
    undoData,
    undo,
    moveTie,
  } = state;
  const [dialog, setDialog] = useState<'roster' | 'find' | { edit: string } | null>(null);
  const [manualOpen, setManualOpen] = useState(combatants.length === 0);
  const manualSummary = useRef<HTMLElement>(null);
  const recovery = useRef<HTMLDetailsElement>(null);
  const rowHeadings = useRef(new Map<string, HTMLHeadingElement>());
  const sorted = useMemo(() => sortCombatants(combatants), [combatants]);
  const active = sorted.find((row) => row.id === turnId);
  const editing =
    typeof dialog === 'object' && dialog !== null
      ? sorted.find((row) => row.id === dialog.edit)
      : undefined;
  const blocked = status === 'unreadable' || status === 'conflict';
  const displayName = (name: string) => name.trim() || t('initiative.unnamed');

  useEffect(() => {
    const { checkStorage } = useInitiativeStore.getState();
    checkStorage();
    const onStorage = (event: StorageEvent) => {
      if (event.key === INITIATIVE_KEY || event.key === null) checkStorage();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const focusRow = (id?: string) => {
    requestAnimationFrame(() => {
      const heading = id ? rowHeadings.current.get(id) : undefined;
      if (heading) {
        heading.focus({ preventScroll: true });
        heading.scrollIntoView({ block: 'nearest' });
      } else {
        manualSummary.current?.focus();
      }
    });
  };

  const remove = async (id?: string) => {
    const index = sorted.findIndex((row) => row.id === id);
    const row = sorted[index];
    const accepted = await confirmDialog(
      row
        ? t('initiative.removeConfirm', { name: displayName(row.name) })
        : t('initiative.clearAllConfirm', { count: sorted.length }),
      {
        tone: 'danger',
        confirmLabel: t('common.delete'),
        initialFocus: 'cancel',
      },
    );
    if (!accepted) return;
    if (row) {
      if (removeCombatant(row.id)) focusRow((sorted[index + 1] ?? sorted[index - 1])?.id);
    } else if (clear()) focusRow();
  };

  const close = () => setDialog(null);

  return (
    <div className="page-shell space-y-6">
      <header>
        <h1 className="page-title">{t('initiative.title')}</h1>
        <p className="page-description">{t('initiative.description')}</p>
      </header>

      <section
        className={panelClass(
          'sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 p-3',
        )}
        aria-label={t('initiative.turnControls')}
      >
        <div className="min-w-0 basis-full sm:flex-1">
          <p className="font-semibold text-ink-50 tabular-nums">
            {round ? t('initiative.roundNumber', { round }) : t('initiative.notStarted')}
          </p>
          {active && (
            <p className="line-clamp-2 text-sm text-ink-300 [overflow-wrap:anywhere]">
              {t('initiative.currentTurn', { name: displayName(active.name) })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IconButton
            onClick={previous}
            label={t('initiative.previousTurn')}
            disabled={blocked || !active || (round <= 1 && active.id === sorted[0]?.id)}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </IconButton>
          <Button
            onClick={next}
            disabled={blocked || sorted.length === 0}
            variant="primary"
          >
            {t(active ? 'initiative.nextTurn' : 'initiative.start')}
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
          {active && (
            <IconButton
              label={t('initiative.jumpActive')}
              onClick={() => focusRow(active.id)}
            >
              <Search size={18} aria-hidden="true" />
            </IconButton>
          )}
        </div>
        <p className="sr-only" role="status" aria-atomic="true">
          {active
            ? t('initiative.announceTurn', { round, name: displayName(active.name) })
            : t('initiative.noActive')}
        </p>
        {status !== 'saved' && (
          <div className="notice notice-error flex basis-full flex-wrap items-center gap-2">
            <p role="alert">{t('initiative.' + status)}</p>
            <Button
              size="sm"
              onClick={() => {
                const disclosure = recovery.current;
                if (!disclosure) return;
                disclosure.open = true;
                disclosure.querySelector('summary')?.focus({ preventScroll: true });
                disclosure.scrollIntoView({ block: 'start' });
              }}
            >
              {t('initiative.openRecovery')}
            </Button>
          </div>
        )}
      </section>

      <InitiativeDataControls disclosure={recovery} />

      <section className="space-y-3" aria-labelledby="initiative-add-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title" id="initiative-add-title">
            {t('initiative.addTitle')}
          </h2>
          <Button onClick={() => setDialog('roster')} disabled={blocked}>
            <UserPlus size={16} aria-hidden="true" />
            {t('initiative.addFromRoster')}
          </Button>
        </div>
        <details
          className={panelClass('space-y-4 p-4')}
          open={manualOpen}
          onToggle={(event) => setManualOpen(event.currentTarget.open)}
        >
          <summary
            ref={manualSummary}
            className="cursor-pointer font-semibold text-ink-50"
          >
            {t('initiative.addManual')}
          </summary>
          <CombatantForm disabled={blocked} onSubmit={addCombatant} />
        </details>
      </section>

      <section className="space-y-3" aria-labelledby="initiative-queue-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title" id="initiative-queue-title">
            {t('initiative.queue')}
          </h2>
          {sorted.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setDialog('find')}>
                <Search size={16} aria-hidden="true" />
                {t('initiative.findCombatant')}
              </Button>
              <IconButton
                size="sm"
                variant="danger"
                label={t('initiative.clearAll')}
                disabled={blocked}
                onClick={() => void remove()}
              >
                <Trash2 size={16} aria-hidden="true" />
              </IconButton>
            </div>
          )}
        </div>
        {undoData && (
          <div className="notice flex flex-wrap items-center gap-2">
            <span role="status">{t('initiative.removed')}</span>
            <Button
              size="sm"
              disabled={blocked}
              onClick={() => {
                if (undo())
                  focusRow(undoData.turnId ?? sortCombatants(undoData.combatants)[0]?.id);
              }}
            >
              {t('initiative.undo')}
            </Button>
          </div>
        )}
        {sorted.length === 0 ? (
          <p className="empty-state">{t('initiative.emptyState')}</p>
        ) : (
          <ol className="space-y-2">
            {sorted.map((row, index) => (
              <CombatantRow
                key={row.id}
                row={row}
                active={row.id === turnId}
                blocked={blocked}
                moveUp={sorted[index - 1]?.initiative === row.initiative}
                moveDown={sorted[index + 1]?.initiative === row.initiative}
                rowRef={(element) => {
                  if (element) rowHeadings.current.set(row.id, element);
                  else rowHeadings.current.delete(row.id);
                }}
                onMove={(direction) => {
                  moveTie(row.id, direction);
                  focusRow(row.id);
                }}
                onEdit={() => setDialog({ edit: row.id })}
                onRemove={() => void remove(row.id)}
              />
            ))}
          </ol>
        )}
      </section>

      {dialog === 'find' && (
        <CombatantPicker
          combatants={sorted}
          onClose={close}
          onPick={(id) => {
            close();
            focusRow(id);
          }}
        />
      )}
      {dialog === 'roster' && (
        <CharacterPicker
          onClose={close}
          blocked={blocked}
          onAdd={(row) => {
            if (!addCombatant(row)) return false;
            close();
            return true;
          }}
        />
      )}
      {editing && (
        <InitiativeDialog
          title={t('initiative.editCombatant', { name: displayName(editing.name) })}
          onClose={close}
        >
          <CombatantForm
            initial={{ ...editing, name: displayName(editing.name) }}
            mode="edit"
            disabled={blocked}
            onCancel={close}
            onSubmit={(row) => {
              if (!updateCombatant(editing.id, row)) return false;
              close();
              return true;
            }}
          />
          {blocked && (
            <p role="alert" className="notice notice-error">
              {t('initiative.addBlocked')}
            </p>
          )}
        </InitiativeDialog>
      )}
    </div>
  );
}
