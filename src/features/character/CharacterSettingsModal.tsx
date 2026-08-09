import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/i18n/useT';
import {
  ABILITY_KEYS,
  MAX_SPELL_LEVEL,
  type AbilityKey,
  type Character,
  getSpellSlot,
  isDmCharacter,
  setSpellSlot,
} from './model';
import type { UpdateCharacter } from './sections';
import { useLayoutStore } from './layoutStore';
import { useDialogFocus } from '@/features/ui/useDialogFocus';

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
  const { t } = useT();
  const resetLayout = useLayoutStore((s) => s.reset);
  const dialogRef = useDialogFocus(true);

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
      aria-label={t('character.sheet.settingsModal.title')}
      ref={dialogRef}
      tabIndex={-1}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 p-4 pt-12"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-ink-700 bg-ink-900 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-ink-700 p-3">
          <h2 className="font-display text-lg font-bold text-ink-50">
            {t('character.sheet.settingsModal.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('character.sheet.settingsModal.close')}
            className="rounded p-1 text-ink-400 hover:bg-ink-800 hover:text-ink-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto p-4">
          <section className="flex flex-col gap-3">
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ember-400">
              {t('character.sheet.settingsModal.spellcasting')}
            </h3>

            <label className="flex max-w-xs flex-col gap-1 text-sm">
              <span className="text-xs font-semibold text-ink-400">
                {t('character.sheet.settingsModal.spellcastingAbility')}
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
                <option value="">{t('character.sheet.settingsModal.none')}</option>
                {ABILITY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(`character.sheet.abilities.${key}`)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1">
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-ink-400">
                <span>{t('character.sheet.settingsModal.spellSlots')}</span>
                <span className="text-center">
                  {t('character.sheet.settingsModal.shortRest')}
                </span>
                <span className="text-center">
                  {t('character.sheet.settingsModal.longRest')}
                </span>
              </div>
              {levels.map((level) => {
                const slot = getSpellSlot(character, level);
                return (
                  <div key={level} className="grid grid-cols-3 items-center gap-2">
                    <span className="text-sm text-ink-300">
                      {t('character.sheet.settingsModal.level', { level })}
                    </span>
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
              {t('character.sheet.settingsModal.preferences')}
            </h3>
            <label className="flex items-center gap-2 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={character.autoSyncFeatures}
                onChange={(event) => update({ autoSyncFeatures: event.target.checked })}
                className="accent-arcane-500"
              />
              {t('character.sheet.settingsModal.autoSync')}
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
              {t('character.sheet.settingsModal.dmCharacter')}
            </label>
            <button
              type="button"
              onClick={resetLayout}
              className="w-fit rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-200 hover:bg-ink-800"
            >
              {t('character.sheet.settingsModal.resetLayout')}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
