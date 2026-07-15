import { type ReactNode, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import {
  ABILITY_KEYS,
  ABILITY_NAMES,
  MAX_SPELL_LEVEL,
  SKILLS,
  type AbilityKey,
  abilityModifier,
  formatModifier,
  getSpellSlot,
  initiativeBonus,
  savingThrowBonus,
  setSpellSlot,
  skillBonus,
  spellAttackBonus,
  spellSaveDc,
  uid,
} from './model';
import { NumberField, TextArea, TextField } from './fields';
import { CompendiumPicker } from './CompendiumPicker';
import { type RollMode, type RollOutcome, rollParsed } from '@/features/dice/engine';
import type { UpdateCharacter } from './sections';
import type { Character } from './model';
import type {
  FeatEntry,
  ItemEntry,
  SpellEntry as CompendiumSpell,
} from '@/data/compendium/types';

interface TabProps {
  character: Character;
  update: UpdateCharacter;
}

const TABS = ['Actions', 'Spells', 'Inventory', 'Features', 'Rolls', 'Notes'] as const;
type TabName = (typeof TABS)[number];

export function SheetTabs({ character, update }: TabProps) {
  const [active, setActive] = useState<TabName>('Actions');

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-ink-700 bg-ink-900 p-4">
      <nav className="flex flex-wrap gap-2 border-b border-ink-700 pb-3">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={[
              'rounded-md px-3 py-1 text-sm font-medium transition-colors',
              tab === active
                ? 'bg-arcane-700 text-ink-50'
                : 'text-ink-300 hover:bg-ink-800 hover:text-ink-50',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </nav>

      {active === 'Actions' && <ActionsTab character={character} update={update} />}
      {active === 'Spells' && <SpellsTab character={character} update={update} />}
      {active === 'Inventory' && <InventoryTab character={character} update={update} />}
      {active === 'Features' && <FeaturesTab character={character} update={update} />}
      {active === 'Rolls' && <RollsTab character={character} />}
      {active === 'Notes' && <NotesTab character={character} update={update} />}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 self-start rounded-md border border-ink-700 px-3 py-1 text-sm text-ink-200 hover:bg-ink-800"
    >
      <Plus size={14} /> {label}
    </button>
  );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded p-1 text-ink-400 hover:bg-ink-800 hover:text-red-400"
    >
      <Trash2 size={16} />
    </button>
  );
}

function ActionsTab({ character, update }: TabProps) {
  const add = () =>
    update({ actions: [...character.actions, { id: uid(), name: '', notes: '' }] });
  const patch = (id: string, key: 'name' | 'notes', value: string) =>
    update({
      actions: character.actions.map((a) => (a.id === id ? { ...a, [key]: value } : a)),
    });
  const remove = (id: string) =>
    update({ actions: character.actions.filter((a) => a.id !== id) });

  return (
    <div className="flex flex-col gap-3">
      {character.actions.map((action) => (
        <div key={action.id} className="flex gap-2 rounded-lg border border-ink-700 p-3">
          <div className="flex flex-1 flex-col gap-2">
            <TextField
              value={action.name}
              onChange={(v) => patch(action.id, 'name', v)}
              placeholder="Action name (e.g. Longsword Attack)"
            />
            <TextArea
              value={action.notes}
              onChange={(v) => patch(action.id, 'notes', v)}
              rows={2}
              placeholder="Details, to-hit, damage…"
            />
          </div>
          <RemoveButton onClick={() => remove(action.id)} label="Remove action" />
        </div>
      ))}
      <AddButton label="Add action" onClick={add} />
    </div>
  );
}

function InventoryTab({ character, update }: TabProps) {
  const add = () =>
    update({
      inventory: [
        ...character.inventory,
        { id: uid(), name: '', quantity: 1, notes: '' },
      ],
    });
  const patch = (id: string, patchObj: Partial<(typeof character.inventory)[number]>) =>
    update({
      inventory: character.inventory.map((i) =>
        i.id === id ? { ...i, ...patchObj } : i,
      ),
    });
  const remove = (id: string) =>
    update({ inventory: character.inventory.filter((i) => i.id !== id) });
  const addFromCompendium = (entry: ItemEntry) =>
    update({
      inventory: [
        ...character.inventory,
        {
          id: uid(),
          name: entry.name,
          quantity: 1,
          notes: [entry.type, entry.rarity].filter(Boolean).join(' · '),
        },
      ],
    });

  return (
    <div className="flex flex-col gap-3">
      <CompendiumPicker
        categoryId="items"
        placeholder="Add an item from the compendium…"
        onPick={(item) => addFromCompendium(item as ItemEntry)}
      />
      {character.inventory.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-2 rounded-lg border border-ink-700 p-3"
        >
          <div className="w-16">
            <NumberField
              value={item.quantity}
              min={0}
              onChange={(quantity) => patch(item.id, { quantity })}
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <TextField
              value={item.name}
              onChange={(name) => patch(item.id, { name })}
              placeholder="Item name"
            />
            <TextField
              value={item.notes}
              onChange={(notes) => patch(item.id, { notes })}
              placeholder="Short description"
            />
          </div>
          <RemoveButton onClick={() => remove(item.id)} label="Remove item" />
        </div>
      ))}
      <AddButton label="Add item" onClick={add} />
    </div>
  );
}

function FeaturesTab({ character, update }: TabProps) {
  const add = () =>
    update({
      features: [...character.features, { id: uid(), name: '', source: '', notes: '' }],
    });
  const patch = (id: string, patchObj: Partial<(typeof character.features)[number]>) =>
    update({
      features: character.features.map((f) => (f.id === id ? { ...f, ...patchObj } : f)),
    });
  const remove = (id: string) =>
    update({ features: character.features.filter((f) => f.id !== id) });
  const addFromCompendium = (entry: FeatEntry) =>
    update({
      features: [
        ...character.features,
        { id: uid(), name: entry.name, source: 'Feat', notes: '' },
      ],
    });

  return (
    <div className="flex flex-col gap-3">
      <CompendiumPicker
        categoryId="feats"
        placeholder="Add a feat from the compendium…"
        onPick={(item) => addFromCompendium(item as FeatEntry)}
      />
      {character.features.map((feature) => (
        <div key={feature.id} className="flex gap-2 rounded-lg border border-ink-700 p-3">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <TextField
                  value={feature.name}
                  onChange={(name) => patch(feature.id, { name })}
                  placeholder="Feature / trait / feat"
                />
              </div>
              <div className="w-40">
                <TextField
                  value={feature.source}
                  onChange={(source) => patch(feature.id, { source })}
                  placeholder="Source"
                />
              </div>
            </div>
            <TextArea
              value={feature.notes}
              onChange={(notes) => patch(feature.id, { notes })}
              rows={2}
              placeholder="Description"
            />
          </div>
          <RemoveButton onClick={() => remove(feature.id)} label="Remove feature" />
        </div>
      ))}
      <AddButton label="Add feature" onClick={add} />
    </div>
  );
}

function SpellsTab({ character, update }: TabProps) {
  const dc = spellSaveDc(character);
  const attack = spellAttackBonus(character);

  const configuredLevels = Array.from(
    { length: MAX_SPELL_LEVEL },
    (_, i) => i + 1,
  ).filter((level) => {
    const slot = getSpellSlot(character, level);
    return slot.longRestMax > 0 || slot.shortRestMax > 0;
  });

  const spendSlot = (level: number) => {
    const slot = getSpellSlot(character, level);
    if (slot.usedLongRest < slot.longRestMax) {
      update({
        spellSlots: setSpellSlot(character.spellSlots, level, {
          usedLongRest: slot.usedLongRest + 1,
        }),
      });
    } else if (slot.usedShortRest < slot.shortRestMax) {
      update({
        spellSlots: setSpellSlot(character.spellSlots, level, {
          usedShortRest: slot.usedShortRest + 1,
        }),
      });
    }
  };
  const recoverSlot = (level: number) => {
    const slot = getSpellSlot(character, level);
    if (slot.usedShortRest > 0) {
      update({
        spellSlots: setSpellSlot(character.spellSlots, level, {
          usedShortRest: slot.usedShortRest - 1,
        }),
      });
    } else if (slot.usedLongRest > 0) {
      update({
        spellSlots: setSpellSlot(character.spellSlots, level, {
          usedLongRest: slot.usedLongRest - 1,
        }),
      });
    }
  };
  const shortRest = () =>
    update({
      spellSlots: character.spellSlots.map((s) => ({ ...s, usedShortRest: 0 })),
    });
  const longRest = () =>
    update({
      spellSlots: character.spellSlots.map((s) => ({
        ...s,
        usedShortRest: 0,
        usedLongRest: 0,
      })),
    });

  const addSpell = () =>
    update({
      spells: [...character.spells, { id: uid(), name: '', level: 0, prepared: false }],
    });
  const patchSpell = (id: string, patchObj: Partial<(typeof character.spells)[number]>) =>
    update({
      spells: character.spells.map((s) => (s.id === id ? { ...s, ...patchObj } : s)),
    });
  const removeSpell = (id: string) =>
    update({ spells: character.spells.filter((s) => s.id !== id) });
  const addFromCompendium = (entry: CompendiumSpell) =>
    update({
      spells: [
        ...character.spells,
        { id: uid(), name: entry.name, level: entry.level, prepared: false },
      ],
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-semibold text-ink-400">Spellcasting Ability</span>
          <select
            className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-ink-50 focus:border-arcane-500 focus:outline-none"
            value={character.spellcastingAbility ?? ''}
            onChange={(event) =>
              update({
                spellcastingAbility: (event.target.value || null) as AbilityKey | null,
              })
            }
          >
            <option value="">None</option>
            {ABILITY_KEYS.map((key) => (
              <option key={key} value={key}>
                {ABILITY_NAMES[key]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col items-center justify-center rounded-lg border border-ink-700 bg-ink-800 p-2">
          <span className="text-xs font-semibold uppercase text-ink-400">
            Spell Save DC
          </span>
          <span className="font-display text-xl font-bold text-ink-50">{dc ?? '-'}</span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-ink-700 bg-ink-800 p-2">
          <span className="text-xs font-semibold uppercase text-ink-400">
            Spell Attack
          </span>
          <span className="font-display text-xl font-bold text-ink-50">
            {attack == null ? '-' : formatModifier(attack)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-200">Spell Slots</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={shortRest}
              className="rounded-md border border-ink-700 px-2 py-1 text-xs text-ink-200 hover:bg-ink-800"
            >
              Short Rest
            </button>
            <button
              type="button"
              onClick={longRest}
              className="rounded-md border border-ink-700 px-2 py-1 text-xs text-ink-200 hover:bg-ink-800"
            >
              Long Rest
            </button>
          </div>
        </div>
        {configuredLevels.length === 0 && (
          <p className="text-sm text-ink-400">
            No spell slots configured - set them in Character Settings.
          </p>
        )}
        {configuredLevels.map((level) => {
          const slot = getSpellSlot(character, level);
          const max = slot.longRestMax + slot.shortRestMax;
          const remaining = max - slot.usedLongRest - slot.usedShortRest;
          return (
            <div key={level} className="flex items-center gap-2 text-sm">
              <span className="w-16 text-ink-300">Level {level}</span>
              <button
                type="button"
                aria-label={`Spend a level ${level} slot`}
                onClick={() => spendSlot(level)}
                disabled={remaining <= 0}
                className="rounded border border-ink-700 p-1 text-ink-200 hover:bg-ink-800 disabled:opacity-40"
              >
                <Minus size={14} />
              </button>
              <span className="w-16 text-center font-mono text-ink-50">
                {remaining} / {max}
              </span>
              <button
                type="button"
                aria-label={`Recover a level ${level} slot`}
                onClick={() => recoverSlot(level)}
                disabled={remaining >= max}
                className="rounded border border-ink-700 p-1 text-ink-200 hover:bg-ink-800 disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-ink-200">Spells</h3>
        <CompendiumPicker
          categoryId="spells"
          placeholder="Add a spell from the compendium…"
          onPick={(item) => addFromCompendium(item as CompendiumSpell)}
        />
        {character.spells.map((spell) => (
          <div key={spell.id} className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-ink-300">
              <input
                type="checkbox"
                checked={spell.prepared}
                onChange={(event) =>
                  patchSpell(spell.id, { prepared: event.target.checked })
                }
                className="accent-arcane-500"
              />
              Prep
            </label>
            <div className="w-16">
              <NumberField
                value={spell.level}
                min={0}
                max={9}
                onChange={(level) => patchSpell(spell.id, { level })}
              />
            </div>
            <div className="flex-1">
              <TextField
                value={spell.name}
                onChange={(name) => patchSpell(spell.id, { name })}
                placeholder="Spell name"
              />
            </div>
            <RemoveButton onClick={() => removeSpell(spell.id)} label="Remove spell" />
          </div>
        ))}
        <AddButton label="Add spell" onClick={addSpell} />
      </div>
    </div>
  );
}

const ROLL_MODES: RollMode[] = ['normal', 'advantage', 'disadvantage'];
const ROLL_MODE_LABELS: Record<RollMode, string> = {
  normal: 'Normal',
  advantage: 'Advantage',
  disadvantage: 'Disadvantage',
};

interface NamedRoll {
  label: string;
  outcome: RollOutcome;
}

function RollsTab({ character }: { character: Character }) {
  const [mode, setMode] = useState<RollMode>('normal');
  const [last, setLast] = useState<NamedRoll | null>(null);
  const [history, setHistory] = useState<NamedRoll[]>([]);

  const roll = (label: string, bonus: number) => {
    const outcome = rollParsed(
      { terms: [{ count: 1, sides: 20 }], modifier: bonus },
      mode,
    );
    setLast({ label, outcome });
    setHistory((prev) => [{ label, outcome }, ...prev].slice(0, 8));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {ROLL_MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={[
              'rounded-md px-3 py-1 text-sm font-medium transition-colors',
              m === mode
                ? 'bg-ember-500 text-ink-950'
                : 'bg-ink-800 text-ink-200 hover:bg-ink-700',
            ].join(' ')}
          >
            {ROLL_MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {last && (
        <div className="rounded-xl border border-arcane-700 bg-ink-950 p-4 text-center">
          <p className="text-sm text-ink-300">
            {last.label}
            {last.outcome.mode !== 'normal' &&
              ` (${ROLL_MODE_LABELS[last.outcome.mode]})`}
          </p>
          <p className="my-1 font-display text-4xl font-bold text-ember-400">
            {last.outcome.total}
          </p>
          <p className="text-xs text-ink-400">
            d20 [{last.outcome.groups[0]?.rolls.join(', ')}]{' '}
            {last.outcome.modifier
              ? `${last.outcome.modifier > 0 ? '+' : ''}${last.outcome.modifier}`
              : ''}
          </p>
        </div>
      )}

      <RollGroup title="Quick">
        <RollButton label="Initiative" bonus={initiativeBonus(character)} onRoll={roll} />
      </RollGroup>

      <RollGroup title="Ability Checks">
        {ABILITY_KEYS.map((key) => (
          <RollButton
            key={key}
            label={ABILITY_NAMES[key]}
            bonus={abilityModifier(character.abilities[key])}
            onRoll={roll}
          />
        ))}
      </RollGroup>

      <RollGroup title="Saving Throws">
        {ABILITY_KEYS.map((key) => (
          <RollButton
            key={key}
            label={`${ABILITY_NAMES[key]} save`}
            bonus={savingThrowBonus(character, key)}
            onRoll={roll}
          />
        ))}
      </RollGroup>

      <RollGroup title="Skills">
        {SKILLS.map((skill) => (
          <RollButton
            key={skill.id}
            label={skill.name}
            bonus={skillBonus(character, skill)}
            onRoll={roll}
          />
        ))}
      </RollGroup>

      {history.length > 1 && (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
            Recent
          </h3>
          <ul className="flex flex-col gap-0.5 text-sm">
            {history.slice(1).map((entry, index) => (
              <li key={index} className="flex justify-between text-ink-300">
                <span>{entry.label}</span>
                <span className="font-mono text-ink-50">{entry.outcome.total}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RollGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
        {title}
      </h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
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
    <button
      type="button"
      onClick={() => onRoll(label, bonus)}
      className="rounded-md border border-ink-700 bg-ink-900 px-2.5 py-1 text-sm text-ink-100 hover:border-arcane-500 hover:bg-ink-800"
    >
      {label} <span className="font-mono text-arcane-300">{formatModifier(bonus)}</span>
    </button>
  );
}

function NotesTab({ character, update }: TabProps) {
  return (
    <TextArea
      value={character.notes}
      onChange={(notes) => update({ notes })}
      rows={12}
      placeholder="Backstory, session notes, anything…"
    />
  );
}
