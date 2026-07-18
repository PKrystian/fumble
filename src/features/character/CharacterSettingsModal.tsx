import { useEffect } from 'react';
import { X } from 'lucide-react';
import {
  ABILITY_KEYS,
  ABILITY_NAMES,
  MAX_SPELL_LEVEL,
  type AbilityKey,
  type Character,
  getSpellSlot,
  isDmCharacter,
  setSpellSlot,
} from './model';
import type { UpdateCharacter } from './sections';
import { useLayoutStore } from './layoutStore';

interface CharacterSettingsModalProps {
  character: Character;
  update: UpdateCharacter;
  onClose: () => void;
}

export function CharacterSettingsModal({
  character,
  update,
  onClose,
}: CharacterSettingsModalProps) {
  const resetLayout = useLayoutStore((s) => s.reset);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const levels = Array.from({ length: MAX_SPELL_LEVEL }, (_, i) => i + 1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Character Settings"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 p-4 pt-12"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-ink-700 bg-ink-900 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-ink-700 p-3">
          <h2 className="font-display text-lg font-bold text-ink-50">
            Character Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-ink-400 hover:bg-ink-800 hover:text-ink-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto p-4">
          <section className="flex flex-col gap-3">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ember-400">
              Spellcasting
            </h3>

            <label className="flex max-w-xs flex-col gap-1 text-sm">
              <span className="text-xs font-semibold text-ink-400">
                Spellcasting Ability
              </span>
              <select
                value={character.spellcastingAbility ?? ''}
                onChange={(event) =>
                  update({
                    spellcastingAbility: (event.target.value ||
                      null) as AbilityKey | null,
                  })
                }
                className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-ink-50 focus:border-arcane-500 focus:outline-none"
              >
                <option value="">None</option>
                {ABILITY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {ABILITY_NAMES[key]}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1">
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-ink-400">
                <span>Spell Slots</span>
                <span className="text-center">Short Rest</span>
                <span className="text-center">Long Rest</span>
              </div>
              {levels.map((level) => {
                const slot = getSpellSlot(character, level);
                return (
                  <div key={level} className="grid grid-cols-3 items-center gap-2">
                    <span className="text-sm text-ink-300">Level {level}</span>
                    <input
                      type="number"
                      min={0}
                      value={slot.shortRestMax}
                      onChange={(event) =>
                        update({
                          spellSlots: setSpellSlot(character.spellSlots, level, {
                            shortRestMax: Math.max(0, event.target.valueAsNumber || 0),
                          }),
                        })
                      }
                      className="w-full rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-center text-ink-50 focus:border-arcane-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      value={slot.longRestMax}
                      onChange={(event) =>
                        update({
                          spellSlots: setSpellSlot(character.spellSlots, level, {
                            longRestMax: Math.max(0, event.target.valueAsNumber || 0),
                          }),
                        })
                      }
                      className="w-full rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-center text-ink-50 focus:border-arcane-500 focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ember-400">
              Preferences
            </h3>
            <label className="flex items-center gap-2 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={character.autoSyncFeatures}
                onChange={(event) => update({ autoSyncFeatures: event.target.checked })}
                className="accent-arcane-500"
              />
              Auto-sync features, proficiencies, and speed from class, subclass, species,
              and background
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={isDmCharacter(character)}
                onChange={(event) =>
                  update({ role: event.target.checked ? 'dm' : 'party' })
                }
                className="accent-arcane-500"
              />
              This is my (DM) character, not a party member
            </label>
            <button
              type="button"
              onClick={resetLayout}
              className="w-fit rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-200 hover:bg-ink-800"
            >
              Reset dashboard layout
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
