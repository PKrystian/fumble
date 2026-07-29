import { useRef, useState } from 'react';
import { Send, UserRound, X } from 'lucide-react';
import { useSessionStore } from '@/features/session-log/store';
import { Link } from '@/i18n/path';
import {
  ABILITY_KEYS,
  MAX_SPELL_LEVEL,
  SKILLS,
  type Character,
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
import { CompendiumSelectModalField } from './CompendiumPicker';
import { getCategory } from '@/features/compendium/categories';
import { useCategoryItems } from '@/features/compendium/useCategoryItems';
import { useT } from '@/i18n/useT';
import { sourceRank } from '@/data/compendium/sources';
import type { ClassSubclass } from '@/data/compendium/types';
import { findSubclass, subclassKey, useClassEntry } from './compendiumSync';
import { ImageCropperModal } from '@/features/ui/ImageCropperModal';

export type UpdateCharacter = (patch: Partial<Character>) => void;

interface SectionProps {
  character: Character;
  update: UpdateCharacter;
}

function ClassField({ character, update }: SectionProps) {
  const { t } = useT();
  const { items } = useCategoryItems(getCategory('classes'));
  const cls = useClassEntry(character.className);
  const options = items
    .filter((i) => !i.hidden)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-semibold text-ink-400">
        {t('character.sheet.fields.class')}
      </span>
      <select
        value={cls?.id ?? ''}
        onChange={(event) => update({ className: event.target.value, subclass: '' })}
        className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 text-ink-50 focus:border-arcane-500 focus:outline-none"
      >
        <option value="">{t('character.sheet.fields.noneSelected')}</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubclassField({ character, update }: SectionProps) {
  const { t } = useT();
  const cls = useClassEntry(character.className);
  const selected = findSubclass(cls, character.subclass);
  const byName = new Map<string, ClassSubclass>();
  for (const sub of cls?.subclasses ?? []) {
    const current = byName.get(sub.name);
    if (!current || sourceRank(sub.source) > sourceRank(current.source)) {
      byName.set(sub.name, sub);
    }
  }
  const options = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-semibold text-ink-400">
        {cls?.subclassTitle || t('character.sheet.fields.subclass')}
      </span>
      <select
        value={selected ? subclassKey(selected) : ''}
        onChange={(event) => update({ subclass: event.target.value })}
        disabled={options.length === 0}
        className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 text-ink-50 focus:border-arcane-500 focus:outline-none disabled:opacity-50"
      >
        <option value="">{t('character.sheet.fields.noneSelected')}</option>
        {options.map((item) => (
          <option key={subclassKey(item)} value={subclassKey(item)}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function PortraitField({ character, update }: SectionProps) {
  const { t } = useT();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        aria-label={
          character.portrait
            ? t('character.sheet.changePortrait')
            : t('character.sheet.addPortrait')
        }
        className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-ink-700 bg-ink-950 hover:border-arcane-500"
      >
        {character.portrait ? (
          <img src={character.portrait} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserRound className="text-ink-600" size={32} aria-hidden="true" />
        )}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) setPendingFile(file);
          event.target.value = '';
        }}
      />
      {character.portrait && (
        <button
          type="button"
          aria-label={t('character.sheet.removePortrait')}
          onClick={() => update({ portrait: '' })}
          className="absolute -right-1.5 -top-1.5 rounded-full bg-ink-800 p-0.5 text-ink-300 hover:text-red-400"
        >
          <X size={12} />
        </button>
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
  return (
    <div className="flex gap-4 rounded-xl border border-ink-700 bg-ink-900 p-4">
      <PortraitField character={character} update={update} />
      <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 sm:col-span-3 lg:col-span-2">
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
          min={1}
          max={20}
          onChange={(level) => update({ level })}
        />
        <CompendiumSelectModalField
          label={t('character.sheet.fields.species')}
          categoryId="species"
          value={character.species}
          onChange={(species) => update({ species })}
          placeholder={t('character.sheet.fields.searchSpecies')}
        />
        <CompendiumSelectModalField
          label={t('character.sheet.fields.background')}
          categoryId="backgrounds"
          value={character.background}
          onChange={(background) => update({ background })}
          placeholder={t('character.sheet.fields.searchBackgrounds')}
        />
      </div>
    </div>
  );
}

function ArmorClassField({ character, update }: SectionProps) {
  const { t } = useT();
  const breakdown = armorClassBreakdown(character, {
    base: t('character.sheet.acBase'),
    abilityAbbr: (key) => t(`character.sheet.abilityAbbr.${key}`),
  });

  return (
    <div className="flex flex-col gap-1">
      <span className="text-center text-[10px] font-semibold uppercase text-ink-400">
        {t('character.sheet.fields.armorClass')}
      </span>
      <NumberField
        value={breakdown.total}
        onChange={(value) => update({ acOverride: value })}
      />
      <button
        type="button"
        onClick={() => update({ acOverride: breakdown.manual ? null : breakdown.total })}
        title={
          breakdown.manual
            ? t('character.sheet.fields.acAuto')
            : breakdown.parts.join(' + ')
        }
        className="text-center text-[10px] text-ink-400 hover:text-arcane-300"
      >
        {breakdown.manual
          ? t('character.sheet.fields.acManual')
          : breakdown.parts.join(' + ')}
      </button>
    </div>
  );
}

export function AbilityScoresPanel({ character, update }: SectionProps) {
  const { t } = useT();
  return (
    <Panel title={t('character.sheet.panels.abilityScores')}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-2 xl:grid-cols-3">
        {ABILITY_KEYS.map((key) => {
          const mod = abilityModifier(character.abilities[key]);
          return (
            <div
              key={key}
              className="flex flex-col items-center gap-1 rounded-lg border border-ink-700 bg-ink-800 p-2"
            >
              <span className="text-xs font-semibold uppercase text-ink-400">
                {t(`character.sheet.abilityAbbr.${key}`)}
              </span>
              <span className="font-display text-2xl font-bold text-ink-50">
                {formatModifier(mod)}
              </span>
              <input
                type="number"
                aria-label={t(`character.sheet.abilities.${key}`)}
                className="w-14 rounded-md border border-ink-700 bg-ink-900 px-1 py-0.5 text-center text-sm text-ink-50 focus:border-arcane-500 focus:outline-none"
                value={character.abilities[key]}
                onChange={(event) =>
                  update({
                    abilities: {
                      ...character.abilities,
                      [key]: event.target.valueAsNumber || 0,
                    },
                  })
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
  return (
    <Panel title={t('character.sheet.panels.savingThrows')}>
      <ul className="flex flex-col gap-1">
        {ABILITY_KEYS.map((key) => {
          const proficient = character.savingThrowProficiencies.includes(key);
          const abilityName = t(`character.sheet.abilities.${key}`);
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                aria-label={t('character.sheet.skillsPanel.savingThrowProficiencyAria', {
                  ability: abilityName,
                })}
                checked={proficient}
                onChange={() =>
                  update({
                    savingThrowProficiencies: toggle(
                      character.savingThrowProficiencies,
                      key,
                    ),
                  })
                }
                className="accent-arcane-500"
              />
              <span className="w-12 font-mono text-ink-50">
                {formatModifier(savingThrowBonus(character, key))}
              </span>
              <span className="text-ink-200">{abilityName}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function SkillsPanel({ character, update }: SectionProps) {
  const { t } = useT();
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
      <ul className="flex flex-col gap-0.5">
        {SKILLS.map((skill) => {
          const isProf = character.skillProficiencies.includes(skill.id);
          const isExp = character.skillExpertise.includes(skill.id);
          const skillName = t(`character.sheet.skillNames.${skill.id}`);
          return (
            <li key={skill.id} className="flex items-center gap-2 text-sm">
              <button
                type="button"
                aria-label={t('character.sheet.skillsPanel.proficiencyAria', {
                  skill: skillName,
                })}
                aria-pressed={isProf || isExp}
                onClick={() => cycleSkill(skill.id)}
                title={t('character.sheet.skillsPanel.cycleTitle')}
                className={[
                  'flex h-4 w-4 items-center justify-center rounded-full border text-[8px]',
                  isExp
                    ? 'border-ember-400 bg-ember-400 text-ink-950'
                    : isProf
                      ? 'border-arcane-500 bg-arcane-500 text-ink-950'
                      : 'border-ink-600',
                ].join(' ')}
              >
                {isExp ? 'E' : isProf ? '●' : ''}
              </button>
              <span className="w-10 font-mono text-ink-50">
                {formatModifier(skillBonus(character, skill))}
              </span>
              <span className="text-ink-200">{skillName}</span>
              <span className="ml-auto text-xs uppercase text-ink-500">
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
    <div className="flex flex-col items-center rounded-lg border border-ink-700 bg-ink-800 px-2 py-1">
      <span className="text-[10px] font-semibold uppercase text-ink-400">{label}</span>
      <span className="font-display text-lg font-bold text-ink-50">{value}</span>
    </div>
  );
}

export function CombatPanel({ character, update }: SectionProps) {
  const { t } = useT();
  return (
    <Panel title={t('character.sheet.panels.combat')}>
      <div className="grid grid-cols-3 gap-2">
        <StatBox
          label={t('character.sheet.combat.profBonus')}
          value={formatModifier(proficiencyBonus(character))}
        />
        <StatBox
          label={t('character.sheet.combat.initiative')}
          value={formatModifier(initiativeBonus(character))}
        />
        <ArmorClassField character={character} update={update} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NumberField
          label={t('character.sheet.combat.walk')}
          value={character.speed.walk}
          onChange={(walk) => update({ speed: { ...character.speed, walk } })}
        />
        <NumberField
          label={t('character.sheet.combat.swim')}
          value={character.speed.swim}
          onChange={(swim) => update({ speed: { ...character.speed, swim } })}
        />
        <NumberField
          label={t('character.sheet.combat.climb')}
          value={character.speed.climb}
          onChange={(climb) => update({ speed: { ...character.speed, climb } })}
        />
        <NumberField
          label={t('character.sheet.combat.fly')}
          value={character.speed.fly}
          onChange={(fly) => update({ speed: { ...character.speed, fly } })}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-200">
        <input
          type="checkbox"
          checked={character.inspiration}
          onChange={(event) => update({ inspiration: event.target.checked })}
          className="accent-ember-400"
        />
        {t('character.sheet.combat.heroicInspiration')}
      </label>
    </Panel>
  );
}

export function HitPointsPanel({ character, update }: SectionProps) {
  const { t } = useT();
  const [amount, setAmount] = useState(0);
  const { hp } = character;

  const heal = () =>
    update({ hp: { ...hp, current: Math.min(hp.max, hp.current + amount) } });
  const damage = () => {
    const fromTemp = Math.min(hp.temp, amount);
    const remaining = amount - fromTemp;
    update({
      hp: {
        ...hp,
        temp: hp.temp - fromTemp,
        current: Math.max(0, hp.current - remaining),
      },
    });
  };

  return (
    <Panel title={t('character.sheet.panels.hitPoints')}>
      <div className="grid grid-cols-3 gap-2">
        <NumberField
          label={t('character.sheet.hpFields.current')}
          value={hp.current}
          onChange={(current) => update({ hp: { ...hp, current } })}
        />
        <NumberField
          label={t('character.sheet.hpFields.max')}
          value={hp.max}
          onChange={(max) => update({ hp: { ...hp, max } })}
        />
        <NumberField
          label={t('character.sheet.hpFields.temp')}
          value={hp.temp}
          onChange={(temp) => update({ hp: { ...hp, temp } })}
        />
      </div>
      <div className="flex items-end gap-2">
        <NumberField
          label={t('character.sheet.hpFields.amount')}
          value={amount}
          onChange={setAmount}
          min={0}
        />
        <button
          type="button"
          onClick={heal}
          className="rounded-md bg-green-700 px-3 py-1 text-sm font-medium text-ink-50 hover:bg-green-600"
        >
          {t('character.sheet.hpFields.heal')}
        </button>
        <button
          type="button"
          onClick={damage}
          className="rounded-md bg-red-700 px-3 py-1 text-sm font-medium text-ink-50 hover:bg-red-600"
        >
          {t('character.sheet.hpFields.damage')}
        </button>
      </div>
    </Panel>
  );
}

export function PassivesPanel({ character }: { character: Character }) {
  const { t } = useT();
  return (
    <Panel title={t('character.sheet.panels.passiveSenses')}>
      <div className="grid grid-cols-3 gap-2">
        <StatBox
          label={t('character.sheet.passives.perception')}
          value={`${passiveScore(character, 'perception')}`}
        />
        <StatBox
          label={t('character.sheet.passives.insight')}
          value={`${passiveScore(character, 'insight')}`}
        />
        <StatBox
          label={t('character.sheet.passives.investigation')}
          value={`${passiveScore(character, 'investigation')}`}
        />
      </div>
    </Panel>
  );
}

export function ProficienciesPanel({ character, update }: SectionProps) {
  const { t } = useT();
  return (
    <Panel title={t('character.sheet.panels.proficienciesLanguages')}>
      <TextField
        label={t('character.sheet.proficiencies.armor')}
        value={character.armorProficiencies}
        onChange={(armorProficiencies) => update({ armorProficiencies })}
      />
      <TextField
        label={t('character.sheet.proficiencies.weapons')}
        value={character.weaponProficiencies}
        onChange={(weaponProficiencies) => update({ weaponProficiencies })}
      />
      <TextField
        label={t('character.sheet.proficiencies.tools')}
        value={character.toolProficiencies}
        onChange={(toolProficiencies) => update({ toolProficiencies })}
      />
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

  const dc = spellSaveDc(character);
  const attack = spellAttackBonus(character);
  const configuredLevels = Array.from(
    { length: MAX_SPELL_LEVEL },
    (_, i) => i + 1,
  ).filter((level) => {
    const slot = getSpellSlot(character, level);
    return slot.longRestMax > 0 || slot.shortRestMax > 0;
  });

  return (
    <Panel title={t('character.sheet.panels.spellcasting')}>
      <div className="grid grid-cols-3 gap-2">
        <StatBox
          label={t('character.sheet.spellcasting.ability')}
          value={t(`character.sheet.abilities.${character.spellcastingAbility}`)}
        />
        <StatBox label={t('character.sheet.spellcasting.saveDc')} value={`${dc!}`} />
        <StatBox
          label={t('character.sheet.spellcasting.attack')}
          value={formatModifier(attack!)}
        />
      </div>
      {configuredLevels.length === 0 ? (
        <p className="text-sm text-ink-400">
          {t('character.sheet.spellcasting.noSlots')}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {configuredLevels.map((level) => {
            const slot = getSpellSlot(character, level);
            const max = slot.longRestMax + slot.shortRestMax;
            const used = slot.usedLongRest + slot.usedShortRest;
            return (
              <div key={level} className="flex items-center gap-2 text-sm">
                <span className="w-14 shrink-0 text-ink-300">
                  {t('character.sheet.spellcasting.spellLevelShort', { level })}
                </span>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: max }, (_, i) => (
                    <span
                      key={i}
                      className={[
                        'h-2.5 w-2.5 rounded-full border',
                        i < max - used
                          ? 'border-arcane-500 bg-arcane-500'
                          : 'border-ink-600 bg-transparent',
                      ].join(' ')}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

export function SessionLogQuickPanel() {
  const { t } = useT();
  const [text, setText] = useState('');
  const sessions = useSessionStore((s) => s.sessions);
  const addSession = useSessionStore((s) => s.addSession);
  const appendNote = useSessionStore((s) => s.appendNote);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = sessions[0]?.id ?? addSession();
    appendNote(id, trimmed);
    setText('');
  };

  return (
    <Panel title={t('character.sheet.panels.sessionLog')}>
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && send()}
          placeholder={t('character.sheet.sessionQuick.placeholder')}
          className="flex-1 rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-sm text-ink-50 placeholder:text-ink-400 focus:border-arcane-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={send}
          aria-label={t('character.sheet.sessionQuick.addNote')}
          className="rounded-md bg-arcane-700 p-1.5 text-ink-50 hover:bg-arcane-500"
        >
          <Send size={16} />
        </button>
      </div>
      <Link to="/session-log" className="text-xs text-arcane-300 hover:underline">
        {t('character.sheet.sessionQuick.openFull')}
      </Link>
    </Panel>
  );
}
