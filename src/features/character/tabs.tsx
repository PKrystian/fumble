import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Button, ToggleChip } from '@/features/ui/primitives';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';
import { useT } from '@/i18n/useT';
import {
  ABILITY_KEYS,
  SKILLS,
  abilityModifier,
  formatModifier,
  initiativeBonus,
  savingThrowBonus,
  skillBonus,
  uid,
  type Character,
} from './model';
import { Panel, TextArea, TextField } from './fields';
import type { SectionProps } from './sections';
import { AddButton, RemoveButton, RemovedNotice } from './rows';
import { focusNewRow, useRowRemoval } from './rowRemoval';
import { ROLL_MODES, ROLL_MODE_KEYS, useSheetRoll, useSheetRollMode } from './rolls';
import { SpellsTab } from './SpellsTab';
import { InventoryTab } from './InventoryTab';
import { FeaturesTab } from './FeaturesTab';

const SHEET_TABS = [
  'actions',
  'spells',
  'inventory',
  'features',
  'rolls',
  'notes',
] as const;
type SheetTab = (typeof SHEET_TABS)[number];

export function SheetTabs({ character, update }: SectionProps) {
  const { t } = useT();
  const baseId = useId();
  const { params, update: updateParams } = useUrlSearchState();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const requested = params.get('tab');
  const active: SheetTab = (SHEET_TABS as readonly string[]).includes(requested ?? '')
    ? (requested as SheetTab)
    : 'actions';

  const select = (tab: SheetTab, focus = false) => {
    updateParams({ tab: tab === 'actions' ? null : tab }, true);
    if (focus) tabRefs.current[SHEET_TABS.indexOf(tab)]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, number> = {
      ArrowRight: (index + 1) % SHEET_TABS.length,
      ArrowLeft: (index - 1 + SHEET_TABS.length) % SHEET_TABS.length,
      Home: 0,
      End: SHEET_TABS.length - 1,
    };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(SHEET_TABS[next]!, true);
  };

  return (
    <Panel title={t('character.sheet.panels.details')}>
      <div role="tablist" aria-label={t('character.sheet.tabsLabel')} className="ui-tabs">
        {SHEET_TABS.map((tab, index) => (
          <button
            key={tab}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`${baseId}-tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={tab === active}
            aria-controls={`${baseId}-panel`}
            tabIndex={tab === active ? 0 : -1}
            onClick={() => select(tab)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className="ui-tab"
          >
            {t(`character.sheet.tabs.${tab}`)}
          </button>
        ))}
      </div>
      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
        className="min-w-0"
      >
        {active === 'actions' && <ActionsTab character={character} update={update} />}
        {active === 'spells' && <SpellsTab character={character} update={update} />}
        {active === 'inventory' && <InventoryTab character={character} update={update} />}
        {active === 'features' && <FeaturesTab character={character} update={update} />}
        {active === 'rolls' && <RollsTab character={character} />}
        {active === 'notes' && <NotesTab character={character} update={update} />}
      </div>
    </Panel>
  );
}

function ActionsTab({ character, update }: SectionProps) {
  const { t } = useT();
  const removal = useRowRemoval(character, 'actions', update);
  const add = () => {
    const id = uid();
    update({ actions: [...character.actions, { id, name: '', notes: '' }] });
    focusNewRow(id);
  };
  const patch = (id: string, key: 'name' | 'notes', value: string) =>
    update({
      actions: character.actions.map((a) => (a.id === id ? { ...a, [key]: value } : a)),
    });

  return (
    <div className="flex flex-col gap-3">
      <RemovedNotice name={removal.removed?.name ?? null} onUndo={removal.undo} />
      {character.actions.length === 0 && (
        <p className="empty-state">{t('character.sheet.actionsTab.empty')}</p>
      )}
      {character.actions.map((action) => (
        <div
          key={action.id}
          data-row={action.id}
          className="flex gap-2 rounded-lg border border-ink-700 p-3"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <TextField
              label={t('character.sheet.actionsTab.nameLabel')}
              hideLabel
              value={action.name}
              onChange={(v) => patch(action.id, 'name', v)}
              placeholder={t('character.sheet.actionsTab.namePlaceholder')}
            />
            <TextArea
              label={t('character.sheet.actionsTab.detailsLabel')}
              hideLabel
              value={action.notes}
              onChange={(v) => patch(action.id, 'notes', v)}
              rows={2}
              placeholder={t('character.sheet.actionsTab.detailsPlaceholder')}
            />
          </div>
          <RemoveButton onClick={() => removal.remove(action)} name={action.name} />
        </div>
      ))}
      <AddButton label={t('character.sheet.actionsTab.add')} onClick={add} />
    </div>
  );
}

export function RollModeChips() {
  const { t } = useT();
  const mode = useSheetRollMode((state) => state.mode);
  const setMode = useSheetRollMode((state) => state.setMode);
  return (
    <div
      role="group"
      aria-label={t('character.sheet.rollMode')}
      className="flex flex-wrap gap-1"
    >
      {ROLL_MODES.map((option) => (
        <ToggleChip key={option} active={option === mode} onClick={() => setMode(option)}>
          {t(ROLL_MODE_KEYS[option])}
        </ToggleChip>
      ))}
    </div>
  );
}

function RollsTab({ character }: { character: Character }) {
  const { t } = useT();
  const { rollCheck } = useSheetRoll(character, t('character.unnamed'));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="field-label">{t('character.sheet.rollMode')}</span>
        <RollModeChips />
        <p className="text-xs text-ink-400">{t('character.sheet.rollsTab.dockHint')}</p>
      </div>

      <RollGroup title={t('character.sheet.rollsTab.quick')}>
        <RollButton
          label={t('character.sheet.combat.initiative')}
          bonus={initiativeBonus(character)}
          onRoll={rollCheck}
        />
      </RollGroup>

      <RollGroup title={t('character.sheet.rollsTab.abilityChecks')}>
        {ABILITY_KEYS.map((key) => (
          <RollButton
            key={key}
            label={t('character.sheet.checkLabel', {
              ability: t(`character.sheet.abilities.${key}`),
            })}
            bonus={abilityModifier(character.abilities[key])}
            onRoll={rollCheck}
          />
        ))}
      </RollGroup>

      <RollGroup title={t('character.sheet.rollsTab.savingThrows')}>
        {ABILITY_KEYS.map((key) => (
          <RollButton
            key={key}
            label={t('character.sheet.rollsTab.saveLabel', {
              ability: t(`character.sheet.abilities.${key}`),
            })}
            bonus={savingThrowBonus(character, key)}
            onRoll={rollCheck}
          />
        ))}
      </RollGroup>

      <RollGroup title={t('character.sheet.rollsTab.skills')}>
        {SKILLS.map((skill) => (
          <RollButton
            key={skill.id}
            label={t(`character.sheet.skillNames.${skill.id}`)}
            bonus={skillBonus(character, skill)}
            onRoll={rollCheck}
          />
        ))}
      </RollGroup>
    </div>
  );
}

function RollGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="field-label uppercase tracking-wide">{title}</h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </section>
  );
}

function RollButton({
  label,
  bonus,
  onRoll,
}: {
  label: string;
  bonus: number;
  onRoll: (label: string, bonus: number) => void;
}) {
  return (
    <Button size="sm" onClick={() => onRoll(label, bonus)}>
      {label}
      <span className="font-mono tabular-nums text-arcane-300">
        {formatModifier(bonus)}
      </span>
    </Button>
  );
}

function NotesTab({ character, update }: SectionProps) {
  const { t } = useT();
  return (
    <TextArea
      label={t('character.sheet.tabs.notes')}
      hideLabel
      value={character.notes}
      onChange={(notes) => update({ notes })}
      rows={12}
      placeholder={t('character.sheet.notesTab.placeholder')}
    />
  );
}
