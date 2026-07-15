import { useRef, useState } from 'react';
import { Send, UserRound, X } from 'lucide-react';
import { useSessionStore } from '@/features/session-log/store';
import { Link } from '@/i18n/path';
import {
  ABILITY_KEYS,
  ABILITY_NAMES,
  MAX_SPELL_LEVEL,
  SKILLS,
  type Character,
  abilityModifier,
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
import { useClassEntry } from './compendiumSync';
import { ImageCropperModal } from '@/features/ui/ImageCropperModal';

export type UpdateCharacter = (patch: Partial<Character>) => void;

interface SectionProps {
  character: Character;
  update: UpdateCharacter;
}

function ClassField({ character, update }: SectionProps) {
  const { items } = useCategoryItems(getCategory('classes'));
  const options = [...new Set(items.filter((i) => !i.hidden).map((i) => i.name))].sort();

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-semibold text-ink-400">Class</span>
      <select
        value={character.className}
        onChange={(event) => update({ className: event.target.value, subclass: '' })}
        className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 text-ink-50 focus:border-arcane-500 focus:outline-none"
      >
        <option value="">None selected</option>
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubclassField({ character, update }: SectionProps) {
  const cls = useClassEntry(character.className);
  const options = [...new Set((cls?.subclasses ?? []).map((s) => s.name))].sort();

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-semibold text-ink-400">
        {cls?.subclassTitle || 'Subclass'}
      </span>
      <select
        value={character.subclass}
        onChange={(event) => update({ subclass: event.target.value })}
        disabled={options.length === 0}
        className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 text-ink-50 focus:border-arcane-500 focus:outline-none disabled:opacity-50"
      >
        <option value="">None selected</option>
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

function PortraitField({ character, update }: SectionProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        aria-label={character.portrait ? 'Change portrait' : 'Add portrait'}
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
          aria-label="Remove portrait"
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
          title="Adjust portrait"
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
  return (
    <div className="flex gap-4 rounded-xl border border-ink-700 bg-ink-900 p-4">
      <PortraitField character={character} update={update} />
      <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 sm:col-span-3 lg:col-span-2">
          <TextField
            label="Name"
            value={character.name}
            onChange={(name) => update({ name })}
          />
        </div>
        <ClassField character={character} update={update} />
        <SubclassField character={character} update={update} />
        <NumberField
          label="Level"
          value={character.level}
          min={1}
          max={20}
          onChange={(level) => update({ level })}
        />
        <CompendiumSelectModalField
          label="Species"
          categoryId="species"
          value={character.species}
          onChange={(species) => update({ species })}
          placeholder="Search species…"
        />
        <CompendiumSelectModalField
          label="Background"
          categoryId="backgrounds"
          value={character.background}
          onChange={(background) => update({ background })}
          placeholder="Search backgrounds…"
        />
      </div>
    </div>
  );
}

export function AbilityScoresPanel({ character, update }: SectionProps) {
  return (
    <Panel title="Ability Scores">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-2 xl:grid-cols-3">
        {ABILITY_KEYS.map((key) => {
          const mod = abilityModifier(character.abilities[key]);
          return (
            <div
              key={key}
              className="flex flex-col items-center gap-1 rounded-lg border border-ink-700 bg-ink-800 p-2"
            >
              <span className="text-xs font-semibold uppercase text-ink-400">{key}</span>
              <span className="font-display text-2xl font-bold text-ink-50">
                {formatModifier(mod)}
              </span>
              <input
                type="number"
                aria-label={ABILITY_NAMES[key]}
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
  return (
    <Panel title="Saving Throws">
      <ul className="flex flex-col gap-1">
        {ABILITY_KEYS.map((key) => {
          const proficient = character.savingThrowProficiencies.includes(key);
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                aria-label={`${ABILITY_NAMES[key]} saving throw proficiency`}
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
              <span className="text-ink-200">{ABILITY_NAMES[key]}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function SkillsPanel({ character, update }: SectionProps) {
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
    <Panel title="Skills">
      <ul className="flex flex-col gap-0.5">
        {SKILLS.map((skill) => {
          const isProf = character.skillProficiencies.includes(skill.id);
          const isExp = character.skillExpertise.includes(skill.id);
          return (
            <li key={skill.id} className="flex items-center gap-2 text-sm">
              <button
                type="button"
                aria-label={`${skill.name} proficiency`}
                aria-pressed={isProf || isExp}
                onClick={() => cycleSkill(skill.id)}
                title="Click to cycle: none → proficient → expertise"
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
              <span className="text-ink-200">{skill.name}</span>
              <span className="ml-auto text-xs uppercase text-ink-500">
                {skill.ability}
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
  return (
    <Panel title="Combat">
      <div className="grid grid-cols-3 gap-2">
        <StatBox
          label="Prof. Bonus"
          value={formatModifier(proficiencyBonus(character))}
        />
        <StatBox label="Initiative" value={formatModifier(initiativeBonus(character))} />
        <div className="flex flex-col gap-1">
          <span className="text-center text-[10px] font-semibold uppercase text-ink-400">
            Armor Class
          </span>
          <NumberField value={character.ac} onChange={(ac) => update({ ac })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NumberField
          label="Walk"
          value={character.speed.walk}
          onChange={(walk) => update({ speed: { ...character.speed, walk } })}
        />
        <NumberField
          label="Swim"
          value={character.speed.swim}
          onChange={(swim) => update({ speed: { ...character.speed, swim } })}
        />
        <NumberField
          label="Climb"
          value={character.speed.climb}
          onChange={(climb) => update({ speed: { ...character.speed, climb } })}
        />
        <NumberField
          label="Fly"
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
        Heroic Inspiration
      </label>
    </Panel>
  );
}

export function HitPointsPanel({ character, update }: SectionProps) {
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
    <Panel title="Hit Points">
      <div className="grid grid-cols-3 gap-2">
        <NumberField
          label="Current"
          value={hp.current}
          onChange={(current) => update({ hp: { ...hp, current } })}
        />
        <NumberField
          label="Max"
          value={hp.max}
          onChange={(max) => update({ hp: { ...hp, max } })}
        />
        <NumberField
          label="Temp"
          value={hp.temp}
          onChange={(temp) => update({ hp: { ...hp, temp } })}
        />
      </div>
      <div className="flex items-end gap-2">
        <NumberField label="Amount" value={amount} onChange={setAmount} min={0} />
        <button
          type="button"
          onClick={heal}
          className="rounded-md bg-green-700 px-3 py-1 text-sm font-medium text-ink-50 hover:bg-green-600"
        >
          Heal
        </button>
        <button
          type="button"
          onClick={damage}
          className="rounded-md bg-red-700 px-3 py-1 text-sm font-medium text-ink-50 hover:bg-red-600"
        >
          Damage
        </button>
      </div>
    </Panel>
  );
}

export function PassivesPanel({ character }: { character: Character }) {
  return (
    <Panel title="Passive Senses">
      <div className="grid grid-cols-3 gap-2">
        <StatBox label="Perception" value={`${passiveScore(character, 'perception')}`} />
        <StatBox label="Insight" value={`${passiveScore(character, 'insight')}`} />
        <StatBox
          label="Investigation"
          value={`${passiveScore(character, 'investigation')}`}
        />
      </div>
    </Panel>
  );
}

export function ProficienciesPanel({ character, update }: SectionProps) {
  return (
    <Panel title="Proficiencies & Languages">
      <TextField
        label="Armor"
        value={character.armorProficiencies}
        onChange={(armorProficiencies) => update({ armorProficiencies })}
      />
      <TextField
        label="Weapons"
        value={character.weaponProficiencies}
        onChange={(weaponProficiencies) => update({ weaponProficiencies })}
      />
      <TextField
        label="Tools"
        value={character.toolProficiencies}
        onChange={(toolProficiencies) => update({ toolProficiencies })}
      />
      <TextField
        label="Languages"
        value={character.languages}
        onChange={(languages) => update({ languages })}
      />
    </Panel>
  );
}

export function TrackingPanel({ character, update }: SectionProps) {
  return (
    <Panel title="Defenses & Tracking">
      <TextField
        label="Concentration"
        value={character.concentration}
        onChange={(concentration) => update({ concentration })}
        placeholder="e.g. Bless"
      />
      <TextField
        label="Active Conditions"
        value={character.conditions}
        onChange={(conditions) => update({ conditions })}
        placeholder="e.g. Poisoned"
      />
      <TextArea
        label="Resistances / Immunities"
        value={character.defenses}
        onChange={(defenses) => update({ defenses })}
        rows={3}
      />
    </Panel>
  );
}

export function SpellcastingPanel({ character }: { character: Character }) {
  if (!character.spellcastingAbility) {
    return (
      <Panel title="Spellcasting">
        <p className="text-sm text-ink-400">Not a spellcaster.</p>
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
    <Panel title="Spellcasting">
      <div className="grid grid-cols-3 gap-2">
        <StatBox label="Ability" value={ABILITY_NAMES[character.spellcastingAbility]} />
        <StatBox label="Save DC" value={dc == null ? '-' : `${dc}`} />
        <StatBox label="Attack" value={attack == null ? '-' : formatModifier(attack)} />
      </div>
      {configuredLevels.length === 0 ? (
        <p className="text-sm text-ink-400">No spell slots configured.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {configuredLevels.map((level) => {
            const slot = getSpellSlot(character, level);
            const max = slot.longRestMax + slot.shortRestMax;
            const used = slot.usedLongRest + slot.usedShortRest;
            return (
              <div key={level} className="flex items-center gap-2 text-sm">
                <span className="w-14 shrink-0 text-ink-300">Lvl {level}</span>
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
  const [text, setText] = useState('');
  const sessions = useSessionStore((s) => s.sessions);
  const addSession = useSessionStore((s) => s.addSession);
  const appendTranscript = useSessionStore((s) => s.appendTranscript);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = sessions[0]?.id ?? addSession();
    appendTranscript(id, trimmed);
    setText('');
  };

  return (
    <Panel title="Session Log">
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && send()}
          placeholder="Write a quick note…"
          className="flex-1 rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-sm text-ink-50 placeholder:text-ink-400 focus:border-arcane-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={send}
          aria-label="Add note to session log"
          className="rounded-md bg-arcane-700 p-1.5 text-ink-50 hover:bg-arcane-500"
        >
          <Send size={16} />
        </button>
      </div>
      <Link to="/session-log" className="text-xs text-arcane-300 hover:underline">
        Open full session log →
      </Link>
    </Panel>
  );
}
