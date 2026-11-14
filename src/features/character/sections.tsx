import { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, RotateCcw, Send, UserRound, X } from 'lucide-react';
import { useSessionStore } from '@/features/session-log/store';
import { getCategory } from '@/features/compendium/categories';
import { useCategoryItems } from '@/features/compendium/useCategoryItems';
import { sourceRank } from '@/data/compendium/sources';
import type { ClassSubclass } from '@/data/compendium/types';
import { ImageCropperModal } from '@/features/ui/ImageCropperModal';
import { Button, IconButton, Select } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import {
  ABILITY_KEYS,
  LIMITS,
  MAX_SPELL_LEVEL,
  SKILLS,
  type Character,
  type SyncedField,
  abilityModifier,
  armorClassBreakdown,
  formatModifier,
  getSpellSlot,
  initiativeBonus,
  passiveScore,
  proficiencyBonus,
  savingThrowBonus,
  skillBonus,
  spellAttackBonus,
  spellSaveDc,
} from './model';
import { NumberField, Panel, TextArea, TextField } from './fields';
import { CompendiumSelectField } from './CompendiumPicker';
import { findSubclass, subclassKey, useClassEntry } from './compendiumSync';
import { markManual, restoreSyncedField, useSyncedComputed } from './sync';
import { useSheetRoll } from './rolls';
import { useWideLayout } from './layoutMeta';

export type UpdateCharacter = (patch: Partial<Character>) => void;

export interface SectionProps {
  character: Character;
  update: UpdateCharacter;
}

function useLabelId(prefix: string, character: Character) {
  return `${prefix}-${character.id}`;
}

function ClassField({ character, update }: SectionProps) {
  const { t, locale } = useT();
  const { items } = useCategoryItems(getCategory('classes'));
  const cls = useClassEntry(character.className);
  const id = useLabelId('class', character);
  const options = useMemo(() => {
    const collator = new Intl.Collator(locale);
    return items
      .filter((item) => !item.hidden)
      .sort((a, b) => collator.compare(a.name, b.name));
  }, [items, locale]);

  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
      <label htmlFor={id} className="field-label">
        {t('character.sheet.fields.class')}
      </label>
      <Select
        id={id}
        value={cls?.id ?? ''}
        onChange={(event) => update({ className: event.target.value, subclass: '' })}
      >
        <option value="">{t('character.sheet.fields.noneSelected')}</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

function SubclassField({ character, update }: SectionProps) {
  const { t, locale } = useT();
  const cls = useClassEntry(character.className);
  const id = useLabelId('subclass', character);
  const selected = findSubclass(cls, character.subclass);
  const byName = new Map<string, ClassSubclass>();
  for (const sub of cls?.subclasses ?? []) {
    const current = byName.get(sub.name);
    if (!current || sourceRank(sub.source) > sourceRank(current.source)) {
      byName.set(sub.name, sub);
    }
  }
  const collator = new Intl.Collator(locale);
  const options = [...byName.values()].sort((a, b) => collator.compare(a.name, b.name));

  return (
    <div className="flex min-w-0 flex-col gap-1 text-sm">
      <label htmlFor={id} className="field-label">
        {cls?.subclassTitle || t('character.sheet.fields.subclass')}
      </label>
      <Select
        id={id}
        value={selected ? subclassKey(selected) : ''}
        onChange={(event) => update({ subclass: event.target.value })}
        disabled={options.length === 0}
      >
        <option value="">{t('character.sheet.fields.noneSelected')}</option>
        {options.map((item) => (
          <option key={subclassKey(item)} value={subclassKey(item)}>
            {item.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

function PortraitField({ character, update }: SectionProps) {
  const { t } = useT();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  return (
    <div className="relative shrink-0 self-start">
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        aria-label={
          character.portrait
            ? t('character.sheet.changePortrait')
            : t('character.sheet.addPortrait')
        }
        title={
          character.portrait
            ? t('character.sheet.changePortrait')
            : t('character.sheet.addPortrait')
        }
        className="portrait-button"
      >
        {character.portrait ? (
          <img
            src={character.portrait}
            alt=""
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
        ) : (
          <UserRound className="text-ink-500" size={32} aria-hidden="true" />
        )}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) setPendingFile(file);
          event.target.value = '';
        }}
      />
      {character.portrait && (
        <IconButton
          label={t('character.sheet.removePortrait')}
          onClick={() => update({ portrait: '' })}
          variant="secondary"
          size="sm"
          className="absolute -right-3 -top-3"
        >
          <X size={14} aria-hidden="true" />
        </IconButton>
      )}
      {pendingFile && (
        <ImageCropperModal
          file={pendingFile}
          aspect={1}
          outputWidth={320}
          title={t('character.sheet.adjustPortrait')}
          onCancel={() => setPendingFile(null)}
          onSave={(dataUrl) => {
            update({ portrait: dataUrl });
            setPendingFile(null);
          }}
        />
      )}
    </div>
  );
}

export function IdentityHeader({ character, update }: SectionProps) {
  const { t } = useT();
  const wide = useWideLayout();
  const [open, setOpen] = useState(!character.className);
  if (!wide && !open) {
    return (
      <section aria-label={t('character.sheet.identity')} className={panelClass('p-2')}>
        <button
          type="button"
          aria-expanded={false}
          onClick={() => setOpen(true)}
          className="selection-row flex items-center gap-2"
        >
          <ChevronRight size={16} aria-hidden="true" />
          {t('character.sheet.editIdentity')}
        </button>
      </section>
    );
  }
  return (
    <section
      aria-label={t('character.sheet.identity')}
      className="flex flex-col gap-4 rounded-xl border border-ink-700 bg-ink-900 p-4 sm:flex-row"
    >
      {!wide && (
        <button
          type="button"
          aria-expanded
          onClick={() => setOpen(false)}
          className="selection-row flex items-center gap-2"
        >
          <ChevronDown size={16} aria-hidden="true" />
          {t('character.sheet.editIdentity')}
        </button>
      )}
      <PortraitField character={character} update={update} />
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        <div className="min-[380px]:col-span-2 sm:col-span-3 xl:col-span-2">
          <TextField
            label={t('character.sheet.fields.name')}
            value={character.name}
            onChange={(name) => update({ name })}
          />
        </div>
        <ClassField character={character} update={update} />
        <SubclassField character={character} update={update} />
        <NumberField
          label={t('character.sheet.fields.level')}
          value={character.level}
          min={LIMITS.level.min}
          max={LIMITS.level.max}
          onChange={(level) => update({ level })}
        />
        <CompendiumSelectField
          label={t('character.sheet.fields.species')}
          categoryId="species"
          value={character.species}
          onChange={(species) => update({ species })}
          placeholder={t('character.sheet.fields.searchSpecies')}
        />
        <CompendiumSelectField
          label={t('character.sheet.fields.background')}
          categoryId="backgrounds"
          value={character.background}
          onChange={(background) => update({ background })}
          placeholder={t('character.sheet.fields.searchBackgrounds')}
        />
      </div>
    </section>
  );
}

export function RestoreSyncButton({
  character,
  update,
  field,
}: SectionProps & { field: SyncedField }) {
  const { t } = useT();
  const computed = useSyncedComputed();
  if (!computed || !character.manualFields.includes(field)) return null;
  return (
    <Button
      size="sm"
      variant="ghost"
      className="self-start"
      onClick={() => update(restoreSyncedField(character, computed, field))}
    >
      <RotateCcw size={14} aria-hidden="true" />
      {t(`character.sheet.sync.restore.${field}`)}
    </Button>
  );
}

function useManualUpdate(character: Character, update: UpdateCharacter) {
  const computed = useSyncedComputed();
  return (field: SyncedField, patch: Partial<Character>) =>
    update({ ...patch, ...markManual(character, field, computed) });
}

export function RollValue({
  label,
  bonus,
  onRoll,
  className,
}: {
  label: string;
  bonus: number;
  onRoll: () => void;
  className?: string;
}) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={onRoll}
      aria-label={t('character.sheet.rollAria', {
        label,
        bonus: formatModifier(bonus),
      })}
      title={t('character.sheet.rollAria', { label, bonus: formatModifier(bonus) })}
      className={`roll-value-button ${className ?? ''}`.trim()}
    >
      {formatModifier(bonus)}
    </button>
  );
}

function ArmorClassField({ character, update }: SectionProps) {
  const { t } = useT();
  const breakdown = armorClassBreakdown(character, {
    base: t('character.sheet.acBase'),
    abilityAbbr: (key) => t(`character.sheet.abilityAbbr.${key}`),
  });

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <NumberField
        label={t('character.sheet.fields.armorClass')}
        value={breakdown.total}
        min={LIMITS.ac.min}
        max={LIMITS.ac.max}
        onChange={(value) => update({ acOverride: value })}
        inputClassName="text-center"
        hint={
          breakdown.manual
            ? t('character.sheet.fields.acManualHint')
            : breakdown.parts.join(' + ')
        }
      />
      {breakdown.manual && (
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          onClick={() => update({ acOverride: null })}
        >
          <RotateCcw size={14} aria-hidden="true" />
          {t('character.sheet.fields.acAuto')}
        </Button>
      )}
    </div>
  );
}

export function AbilityScoresPanel({ character, update }: SectionProps) {
  const { t } = useT();
  const { rollCheck } = useSheetRoll(character, t('character.unnamed'));
  return (
    <Panel title={t('character.sheet.panels.abilityScores')}>
      <div className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-3 sm:grid-cols-6 lg:grid-cols-2 xl:grid-cols-3">
        {ABILITY_KEYS.map((key) => {
          const mod = abilityModifier(character.abilities[key]);
          const name = t(`character.sheet.abilities.${key}`);
          return (
            <div key={key} className="stat-tile gap-1">
              <span className="stat-tile-label" aria-hidden="true">
                {t(`character.sheet.abilityAbbr.${key}`)}
              </span>
              <RollValue
                label={t('character.sheet.checkLabel', { ability: name })}
                bonus={mod}
                onRoll={() =>
                  rollCheck(t('character.sheet.checkLabel', { ability: name }), mod)
                }
                className="text-2xl"
              />
              <NumberField
                label={t('character.sheet.scoreLabel', { ability: name })}
                hideLabel
                value={character.abilities[key]}
                min={LIMITS.ability.min}
                max={LIMITS.ability.max}
                inputClassName="text-center"
                className="w-full max-w-20"
                onChange={(value) =>
                  update({ abilities: { ...character.abilities, [key]: value } })
                }
              />
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((entry) => entry !== value)
    : [...list, value];
}

export function SavingThrowsPanel({ character, update }: SectionProps) {
  const { t } = useT();
  const { rollCheck } = useSheetRoll(character, t('character.unnamed'));
  const updateManual = useManualUpdate(character, update);
  return (
    <Panel title={t('character.sheet.panels.savingThrows')}>
      <ul className="flex flex-col gap-1">
        {ABILITY_KEYS.map((key) => {
          const abilityName = t(`character.sheet.abilities.${key}`);
          const bonus = savingThrowBonus(character, key);
          const label = t('character.sheet.rollsTab.saveLabel', { ability: abilityName });
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              <RollValue
                label={label}
                bonus={bonus}
                onRoll={() => rollCheck(label, bonus)}
              />
              <label className="flex min-w-0 flex-1 items-center gap-2 text-ink-200">
                <input
                  type="checkbox"
                  checked={character.savingThrowProficiencies.includes(key)}
                  onChange={() =>
                    updateManual('savingThrows', {
                      savingThrowProficiencies: toggle(
                        character.savingThrowProficiencies,
                        key,
                      ),
                    })
                  }
                  className="accent-arcane-500"
                />
                <span className="min-w-0 [overflow-wrap:anywhere]">{abilityName}</span>
                <span className="sr-only">
                  {t('character.sheet.skillsPanel.proficientSuffix')}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <RestoreSyncButton character={character} update={update} field="savingThrows" />
    </Panel>
  );
}

export function SkillsPanel({ character, update }: SectionProps) {
  const { t } = useT();
  const { rollCheck } = useSheetRoll(character, t('character.unnamed'));
  const cycleSkill = (id: string) => {
    const isProf = character.skillProficiencies.includes(id);
    const isExp = character.skillExpertise.includes(id);
    if (!isProf && !isExp) {
      update({ skillProficiencies: [...character.skillProficiencies, id] });
    } else if (isProf) {
      update({
        skillProficiencies: character.skillProficiencies.filter((s) => s !== id),
        skillExpertise: [...character.skillExpertise, id],
      });
    } else {
      update({ skillExpertise: character.skillExpertise.filter((s) => s !== id) });
    }
  };

  return (
    <Panel title={t('character.sheet.panels.skills')}>
      <p className="text-xs text-ink-400">
        {t('character.sheet.skillsPanel.cycleTitle')}
      </p>
      <ul className="flex flex-col gap-1">
        {SKILLS.map((skill) => {
          const isProf = character.skillProficiencies.includes(skill.id);
          const isExp = character.skillExpertise.includes(skill.id);
          const skillName = t(`character.sheet.skillNames.${skill.id}`);
          const bonus = skillBonus(character, skill);
          const state = isExp ? 'expertise' : isProf ? 'proficient' : 'none';
          return (
            <li
              key={skill.id}
              className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2 text-sm"
            >
              <button
                type="button"
                aria-label={t('character.sheet.skillsPanel.proficiencyAria', {
                  skill: skillName,
                  state: t(`character.sheet.skillsPanel.states.${state}`),
                })}
                title={t(`character.sheet.skillsPanel.states.${state}`)}
                onClick={() => cycleSkill(skill.id)}
                data-state={state}
                className="skill-cycle"
              >
                <span aria-hidden="true">
                  {state === 'none'
                    ? ''
                    : t(`character.sheet.skillsPanel.symbols.${state}`)}
                </span>
              </button>
              <RollValue
                label={skillName}
                bonus={bonus}
                onRoll={() => rollCheck(skillName, bonus)}
              />
              <span className="min-w-0 text-ink-200 [overflow-wrap:anywhere]">
                {skillName}
              </span>
              <span className="text-xs uppercase text-ink-400">
                {t(`character.sheet.abilityAbbr.${skill.ability}`)}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <span className="stat-tile-label">{label}</span>
      <span className="stat-tile-value">{value}</span>
    </div>
  );
}

export function CombatPanel({ character, update }: SectionProps) {
  const { t } = useT();
  const { rollCheck } = useSheetRoll(character, t('character.unnamed'));
  const updateManual = useManualUpdate(character, update);
  const initiative = initiativeBonus(character);
  const speeds = ['walk', 'swim', 'climb', 'fly'] as const;
  return (
    <Panel title={t('character.sheet.panels.combat')}>
      <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-3">
        <StatBox
          label={t('character.sheet.combat.profBonus')}
          value={formatModifier(proficiencyBonus(character))}
        />
        <div className="stat-tile">
          <span className="stat-tile-label">
            {t('character.sheet.combat.initiative')}
          </span>
          <RollValue
            label={t('character.sheet.combat.initiative')}
            bonus={initiative}
            className="text-lg"
            onRoll={() => rollCheck(t('character.sheet.combat.initiative'), initiative)}
          />
        </div>
        <ArmorClassField character={character} update={update} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {speeds.map((speed) => (
          <NumberField
            key={speed}
            label={t(`character.sheet.combat.${speed}`)}
            value={character.speed[speed]}
            min={LIMITS.speed.min}
            max={LIMITS.speed.max}
            onChange={(value) =>
              updateManual('speed', { speed: { ...character.speed, [speed]: value } })
            }
          />
        ))}
      </div>
      <RestoreSyncButton character={character} update={update} field="speed" />

      <label className="flex items-center gap-2 text-sm text-ink-200">
        <input
          type="checkbox"
          checked={character.inspiration}
          onChange={(event) => update({ inspiration: event.target.checked })}
          className="accent-arcane-500"
        />
        {t('character.sheet.combat.heroicInspiration')}
      </label>
    </Panel>
  );
}

export function PassivesPanel({ character }: { character: Character }) {
  const { t } = useT();
  return (
    <Panel title={t('character.sheet.panels.passiveSenses')}>
      <dl className="flex flex-col gap-1">
        {(['perception', 'insight', 'investigation'] as const).map((skill) => (
          <div key={skill} className="stat-row">
            <dt className="min-w-0 [overflow-wrap:anywhere]">
              {t(`character.sheet.passives.${skill}`)}
            </dt>
            <dd className="stat-tile-value">{passiveScore(character, skill)}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

export function ProficienciesPanel({ character, update }: SectionProps) {
  const { t } = useT();
  const updateManual = useManualUpdate(character, update);
  const fields = [
    ['armorProficiencies', 'armor'],
    ['weaponProficiencies', 'weapons'],
    ['toolProficiencies', 'tools'],
  ] as const;
  return (
    <Panel title={t('character.sheet.panels.proficienciesLanguages')}>
      {fields.map(([field, label]) => (
        <div key={field} className="flex flex-col gap-1">
          <TextField
            label={t(`character.sheet.proficiencies.${label}`)}
            value={character[field]}
            onChange={(value) => updateManual(field, { [field]: value })}
          />
          <RestoreSyncButton character={character} update={update} field={field} />
        </div>
      ))}
      <TextField
        label={t('character.sheet.proficiencies.languages')}
        value={character.languages}
        onChange={(languages) => update({ languages })}
      />
    </Panel>
  );
}

export function TrackingPanel({ character, update }: SectionProps) {
  const { t } = useT();
  return (
    <Panel title={t('character.sheet.panels.defensesTracking')}>
      <TextField
        label={t('character.sheet.tracking.concentration')}
        value={character.concentration}
        onChange={(concentration) => update({ concentration })}
        placeholder={t('character.sheet.tracking.concentrationPlaceholder')}
      />
      <TextField
        label={t('character.sheet.tracking.activeConditions')}
        value={character.conditions}
        onChange={(conditions) => update({ conditions })}
        placeholder={t('character.sheet.tracking.conditionsPlaceholder')}
      />
      <TextArea
        label={t('character.sheet.tracking.resistancesImmunities')}
        value={character.defenses}
        onChange={(defenses) => update({ defenses })}
        rows={3}
      />
    </Panel>
  );
}

export function SpellcastingPanel({ character }: { character: Character }) {
  const { t } = useT();
  if (!character.spellcastingAbility) {
    return (
      <Panel title={t('character.sheet.panels.spellcasting')}>
        <p className="text-sm text-ink-400">
          {t('character.sheet.spellcasting.notSpellcaster')}
        </p>
      </Panel>
    );
  }

  const configuredLevels = Array.from(
    { length: MAX_SPELL_LEVEL },
    (_, i) => i + 1,
  ).filter((level) => {
    const slot = getSpellSlot(character, level);
    return slot.longRestMax > 0 || slot.shortRestMax > 0;
  });

  return (
    <Panel title={t('character.sheet.panels.spellcasting')}>
      <dl className="flex flex-col gap-1">
        {[
          [
            t('character.sheet.spellcasting.ability'),
            t(`character.sheet.abilities.${character.spellcastingAbility}`),
          ],
          [t('character.sheet.spellcasting.saveDc'), `${spellSaveDc(character)!}`],
          [
            t('character.sheet.spellcasting.attack'),
            formatModifier(spellAttackBonus(character)!),
          ],
        ].map(([label, value]) => (
          <div key={label} className="stat-row">
            <dt className="min-w-0 [overflow-wrap:anywhere]">{label}</dt>
            <dd className="stat-tile-value">{value}</dd>
          </div>
        ))}
      </dl>
      {configuredLevels.length === 0 ? (
        <p className="text-sm text-ink-400">
          {t('character.sheet.spellcasting.noSlots')}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {configuredLevels.map((level) => {
            const slot = getSpellSlot(character, level);
            const max = slot.longRestMax + slot.shortRestMax;
            const remaining = Math.max(0, max - slot.usedLongRest - slot.usedShortRest);
            return (
              <li key={level} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-ink-300">
                  {t('character.sheet.spellsTab.level', { level })}
                </span>
                <span className="tabular-nums text-ink-50">
                  {t('character.sheet.spellcasting.remaining', { remaining, max })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function SessionLogQuickPanel() {
  const { t } = useT();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const sessions = useSessionStore((s) => s.sessions);
  const selectedSessionId = useSessionStore((s) => s.selectedSessionId);
  const addSession = useSessionStore((s) => s.addSession);
  const appendNote = useSessionStore((s) => s.appendNote);
  const target =
    sessions.find((session) => session.id === selectedSessionId) ?? sessions[0];
  const targetName = target?.title.trim() || t('character.sheet.sessionQuick.untitled');

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = target?.id ?? addSession();
    appendNote(id, trimmed);
    setText('');
    setStatus(
      target
        ? t('character.sheet.sessionQuick.added', { session: targetName })
        : t('character.sheet.sessionQuick.addedNew'),
    );
  };

  return (
    <Panel title={t('character.sheet.panels.sessionLog')}>
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <span className="field-label">
            {target
              ? t('character.sheet.sessionQuick.target', { session: targetName })
              : t('character.sheet.sessionQuick.targetNew')}
          </span>
          <input
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setStatus(null);
            }}
            placeholder={t('character.sheet.sessionQuick.placeholder')}
            className="ui-field"
          />
        </label>
        <IconButton
          type="submit"
          label={t('character.sheet.sessionQuick.addNote')}
          variant="primary"
          disabled={!text.trim()}
        >
          <Send size={16} aria-hidden="true" />
        </IconButton>
      </form>
      <p role="status" className="text-xs text-ink-300">
        {status}
      </p>
      <Link to="/session-log" className="back-link mb-0 self-start">
        {t('character.sheet.sessionQuick.openFull')}
      </Link>
    </Panel>
  );
}
