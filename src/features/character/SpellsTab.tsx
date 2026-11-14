import { useId, useState } from 'react';
import { ExternalLink, Minus, Pencil, Plus } from 'lucide-react';
import type { SpellEntry } from '@/data/compendium/types';
import { FormDialog } from '@/features/ui/FormDialog';
import { Button, IconButton, Select, ToggleChip } from '@/features/ui/primitives';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import {
  ABILITY_KEYS,
  LIMITS,
  MAX_SPELL_LEVEL,
  formatModifier,
  getSpellSlot,
  setSpellSlot,
  spellAttackBonus,
  spellSaveDc,
  uid,
  type AbilityKey,
  type KnownSpell,
} from './model';
import { NumberField, TextField } from './fields';
import { CompendiumPicker } from './CompendiumPicker';
import type { SectionProps } from './sections';
import { AddButton, RemoveButton, RemovedNotice } from './rows';
import { focusNewRow, useRowRemoval } from './rowRemoval';

function SpellSlotsDialog({
  character,
  update,
  onClose,
}: SectionProps & { onClose: () => void }) {
  const { t } = useT();
  const levels = Array.from({ length: MAX_SPELL_LEVEL }, (_, i) => i + 1);
  return (
    <FormDialog
      title={t('character.sheet.spellsTab.editSlots')}
      onClose={onClose}
      actions={
        <Button variant="primary" onClick={onClose} data-dialog-focus>
          {t('character.sheet.done')}
        </Button>
      }
    >
      <p className="mb-3 text-sm text-ink-300">
        {t('character.sheet.spellsTab.slotsHelp')}
      </p>
      <div className="flex flex-col gap-2">
        {levels.map((level) => {
          const slot = getSpellSlot(character, level);
          return (
            <fieldset
              key={level}
              className="grid grid-cols-[minmax(0,1fr)_6rem_6rem] items-end gap-2"
            >
              <legend className="sr-only">
                {t('character.sheet.spellsTab.level', { level })}
              </legend>
              <span className="pb-2 text-sm text-ink-300" aria-hidden="true">
                {t('character.sheet.spellsTab.level', { level })}
              </span>
              <NumberField
                label={t('character.sheet.spellsTab.longRestSlots', { level })}
                hideLabel={level > 1}
                value={slot.longRestMax}
                min={LIMITS.slots.min}
                max={LIMITS.slots.max}
                inputClassName="text-center"
                onChange={(longRestMax) =>
                  update({
                    spellSlots: setSpellSlot(character.spellSlots, level, {
                      longRestMax,
                      usedLongRest: Math.min(slot.usedLongRest, longRestMax),
                    }),
                  })
                }
              />
              <NumberField
                label={t('character.sheet.spellsTab.shortRestSlots', { level })}
                hideLabel={level > 1}
                value={slot.shortRestMax}
                min={LIMITS.slots.min}
                max={LIMITS.slots.max}
                inputClassName="text-center"
                onChange={(shortRestMax) =>
                  update({
                    spellSlots: setSpellSlot(character.spellSlots, level, {
                      shortRestMax,
                      usedShortRest: Math.min(slot.usedShortRest, shortRestMax),
                    }),
                  })
                }
              />
            </fieldset>
          );
        })}
      </div>
    </FormDialog>
  );
}

function SpellSlots({ character, update }: SectionProps) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const configuredLevels = Array.from(
    { length: MAX_SPELL_LEVEL },
    (_, i) => i + 1,
  ).filter((level) => {
    const slot = getSpellSlot(character, level);
    return slot.longRestMax > 0 || slot.shortRestMax > 0;
  });

  const spendSlot = (level: number) => {
    const slot = getSpellSlot(character, level);
    update({
      spellSlots: setSpellSlot(
        character.spellSlots,
        level,
        slot.usedLongRest < slot.longRestMax
          ? { usedLongRest: slot.usedLongRest + 1 }
          : { usedShortRest: slot.usedShortRest + 1 },
      ),
    });
  };
  const recoverSlot = (level: number) => {
    const slot = getSpellSlot(character, level);
    update({
      spellSlots: setSpellSlot(
        character.spellSlots,
        level,
        slot.usedShortRest > 0
          ? { usedShortRest: slot.usedShortRest - 1 }
          : { usedLongRest: slot.usedLongRest - 1 },
      ),
    });
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-200">
          {t('character.sheet.spellsTab.slots')}
        </h3>
        <Button size="sm" onClick={() => setEditing(true)}>
          <Pencil size={14} aria-hidden="true" />
          {t('character.sheet.spellsTab.editSlots')}
        </Button>
      </div>
      {configuredLevels.length === 0 ? (
        <p className="text-sm text-ink-400">
          {t('character.sheet.spellsTab.noSlotsHint')}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {configuredLevels.map((level) => {
            const slot = getSpellSlot(character, level);
            const max = slot.longRestMax + slot.shortRestMax;
            const remaining = Math.max(0, max - slot.usedLongRest - slot.usedShortRest);
            return (
              <li key={level} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-20 text-ink-300">
                  {t('character.sheet.spellsTab.level', { level })}
                </span>
                <IconButton
                  label={t('character.sheet.spellsTab.spendSlot', { level })}
                  onClick={() => spendSlot(level)}
                  disabled={remaining <= 0}
                  size="sm"
                >
                  <Minus size={14} aria-hidden="true" />
                </IconButton>
                <span className="min-w-20 text-center tabular-nums text-ink-50">
                  {t('character.sheet.spellcasting.remaining', { remaining, max })}
                </span>
                <IconButton
                  label={t('character.sheet.spellsTab.recoverSlot', { level })}
                  onClick={() => recoverSlot(level)}
                  disabled={remaining >= max}
                  size="sm"
                >
                  <Plus size={14} aria-hidden="true" />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-ink-400">{t('character.sheet.spellsTab.restHint')}</p>
      {editing && (
        <SpellSlotsDialog
          character={character}
          update={update}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  );
}

function ConcentrationChip({
  spell,
  character,
  update,
}: SectionProps & { spell: KnownSpell }) {
  const { t } = useT();
  if (!spell.concentration) return null;
  const active = character.concentration === spell.name;
  return (
    <ToggleChip
      active={active}
      onClick={() => update({ concentration: active ? '' : spell.name })}
      aria-label={t('character.sheet.spellsTab.concentrateOn', { name: spell.name })}
    >
      {t('character.sheet.spellsTab.concentrating')}
    </ToggleChip>
  );
}

function SpellLink({ spell }: { spell: KnownSpell }) {
  const { t } = useT();
  if (!spell.spellId) return null;
  return (
    <Link
      to={`/compendium/spells/${spell.spellId}`}
      className="back-link mb-0"
      aria-label={t('character.sheet.spellsTab.openSpell', { name: spell.name })}
      title={t('character.sheet.spellsTab.openSpell', { name: spell.name })}
    >
      <ExternalLink size={14} aria-hidden="true" />
    </Link>
  );
}

export function SpellsTab({ character, update }: SectionProps) {
  const { t } = useT();
  const abilityId = useId();
  const [preparedOnly, setPreparedOnly] = useState(false);
  const removal = useRowRemoval(character, 'spells', update);
  const dc = spellSaveDc(character);
  const attack = spellAttackBonus(character);

  const patchSpell = (id: string, patch: Partial<KnownSpell>) =>
    update({
      spells: character.spells.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  const addSpell = () => {
    const id = uid();
    update({
      spells: [...character.spells, { id, name: '', level: 0, prepared: false }],
    });
    focusNewRow(id);
  };
  const addFromCompendium = (entry: SpellEntry) =>
    update({
      spells: [
        ...character.spells,
        {
          id: uid(),
          name: entry.name,
          level: entry.level,
          prepared: false,
          spellId: entry.id,
          concentration: entry.concentration,
        },
      ],
    });

  const shown = character.spells.filter((spell) => !preparedOnly || spell.prepared);
  const levels = [...new Set(shown.map((spell) => spell.level))].sort((a, b) => a - b);
  const preparedCount = character.spells.filter((spell) => spell.prepared).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-1 text-sm">
          <label htmlFor={abilityId} className="field-label">
            {t('character.sheet.spellsTab.spellcastingAbility')}
          </label>
          <Select
            id={abilityId}
            value={character.spellcastingAbility ?? ''}
            onChange={(event) =>
              update({
                spellcastingAbility: (event.target.value || null) as AbilityKey | null,
              })
            }
          >
            <option value="">{t('character.sheet.spellsTab.none')}</option>
            {ABILITY_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`character.sheet.abilities.${key}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">{t('character.sheet.spellsTab.saveDc')}</span>
          <span className="stat-tile-value">{dc ?? '-'}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">{t('character.sheet.spellsTab.attack')}</span>
          <span className="stat-tile-value">
            {attack == null ? '-' : formatModifier(attack)}
          </span>
        </div>
      </div>

      <SpellSlots character={character} update={update} />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink-200">
            {t('character.sheet.spellsTab.spells')}
          </h3>
          <div
            role="group"
            aria-label={t('character.sheet.spellsTab.filterLabel')}
            className="flex flex-wrap gap-1"
          >
            <ToggleChip active={!preparedOnly} onClick={() => setPreparedOnly(false)}>
              {t('character.sheet.spellsTab.all', { count: character.spells.length })}
            </ToggleChip>
            <ToggleChip active={preparedOnly} onClick={() => setPreparedOnly(true)}>
              {t('character.sheet.spellsTab.preparedOnly', { count: preparedCount })}
            </ToggleChip>
          </div>
        </div>
        <CompendiumPicker
          categoryId="spells"
          label={t('character.sheet.spellsTab.addFromCompendium')}
          placeholder={t('character.sheet.spellsTab.addFromCompendium')}
          describe={(item) => {
            const level = (item as SpellEntry).level;
            return level === 0
              ? t('character.sheet.spellsTab.cantrips')
              : t('character.sheet.spellsTab.level', { level });
          }}
          onPick={(item) => addFromCompendium(item as SpellEntry)}
        />
        <RemovedNotice name={removal.removed?.name ?? null} onUndo={removal.undo} />
        {shown.length === 0 && (
          <p className="empty-state">
            {t(
              preparedOnly
                ? 'character.sheet.spellsTab.noPrepared'
                : 'character.sheet.spellsTab.empty',
            )}
          </p>
        )}
        {levels.map((level) => (
          <section key={level} className="flex flex-col gap-2">
            <h4 className="field-label uppercase tracking-wide">
              {level === 0
                ? t('character.sheet.spellsTab.cantrips')
                : t('character.sheet.spellsTab.level', { level })}
            </h4>
            <ul className="flex flex-col gap-2">
              {shown
                .filter((spell) => spell.level === level)
                .map((spell) => (
                  <li
                    key={spell.id}
                    data-row={spell.id}
                    className="flex flex-col gap-2 rounded-lg border border-ink-700 p-3"
                  >
                    {spell.auto ? (
                      <AutoSpellRow spell={spell} character={character} update={update} />
                    ) : (
                      <ManualSpellRow
                        spell={spell}
                        character={character}
                        update={update}
                        onPatch={(patch) => patchSpell(spell.id, patch)}
                        onRemove={() => removal.remove(spell)}
                      />
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}
        <AddButton label={t('character.sheet.spellsTab.add')} onClick={addSpell} />
      </section>
    </div>
  );
}

function AutoSpellRow({
  spell,
  character,
  update,
}: SectionProps & { spell: KnownSpell }) {
  const { t } = useT();
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="min-w-0 flex-1 font-semibold text-ink-50 [overflow-wrap:anywhere]">
        {spell.name}
      </span>
      <span className="badge">
        {t('character.sheet.spellsTab.grantedBy', { source: spell.source ?? '' })}
      </span>
      <span className="text-xs text-ink-400">
        {t('character.sheet.spellsTab.alwaysPrepared')}
      </span>
      <ConcentrationChip spell={spell} character={character} update={update} />
      <SpellLink spell={spell} />
    </div>
  );
}

function ManualSpellRow({
  spell,
  character,
  update,
  onPatch,
  onRemove,
}: SectionProps & {
  spell: KnownSpell;
  onPatch: (patch: Partial<KnownSpell>) => void;
  onRemove: () => void;
}) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <TextField
          label={t('character.sheet.spellsTab.nameLabel')}
          hideLabel
          value={spell.name}
          onChange={(name) => onPatch({ name })}
          placeholder={t('character.sheet.spellsTab.namePlaceholder')}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <NumberField
          label={t('character.sheet.spellsTab.spellLevelLabel', {
            name: spell.name.trim() || t('character.sheet.rows.unnamed'),
          })}
          hideLabel
          value={spell.level}
          min={LIMITS.spellLevel.min}
          max={LIMITS.spellLevel.max}
          className="w-16"
          inputClassName="text-center"
          onChange={(level) => onPatch({ level })}
        />
        <label className="flex items-center gap-2 text-sm text-ink-300">
          <input
            type="checkbox"
            checked={spell.prepared}
            onChange={(event) => onPatch({ prepared: event.target.checked })}
            className="accent-arcane-500"
          />
          {t('character.sheet.spellsTab.prep')}
        </label>
        <ConcentrationChip spell={spell} character={character} update={update} />
        <SpellLink spell={spell} />
        <RemoveButton onClick={onRemove} name={spell.name} />
      </div>
    </div>
  );
}
