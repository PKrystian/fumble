import { ToggleChip } from '@/features/ui/primitives';
import { useT } from '@/i18n/useT';
import { armorClass, initiativeBonus } from './model';
import { RollValue, type SectionProps } from './sections';
import { RollModeChips } from './tabs';
import { useSheetRoll } from './rolls';

function StatusControls({ character, update }: SectionProps) {
  const { t } = useT();
  return (
    <>
      <ToggleChip
        active={character.inspiration}
        onClick={() => update({ inspiration: !character.inspiration })}
      >
        {t('character.sheet.combat.heroicInspiration')}
      </ToggleChip>
      <RollModeChips />
    </>
  );
}

export function SheetStatusBar({ character, update }: SectionProps) {
  const { t } = useT();
  const { rollCheck } = useSheetRoll(character, t('character.unnamed'));
  const initiative = initiativeBonus(character);
  const { current, max, temp } = character.hp;

  return (
    <>
      <section aria-label={t('character.sheet.statusBar')} className="sheet-status-bar">
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-baseline gap-1.5">
            <dt className="field-label">{t('character.sheet.statusAc')}</dt>
            <dd className="font-display text-base font-bold tabular-nums text-ink-50">
              {armorClass(character)}
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="field-label">{t('character.sheet.statusHp')}</dt>
            <dd className="font-display text-base font-bold tabular-nums text-ink-50">
              {t('character.sheet.hp.short', { current, max })}
              {temp > 0 && (
                <span className="ml-1 text-sm font-semibold text-arcane-300">
                  {t('character.sheet.hp.tempShort', { temp })}
                </span>
              )}
            </dd>
          </div>
          <div className="flex items-center gap-1">
            <dt className="field-label">{t('character.sheet.combat.initiative')}</dt>
            <dd>
              <RollValue
                label={t('character.sheet.combat.initiative')}
                bonus={initiative}
                onRoll={() =>
                  rollCheck(t('character.sheet.combat.initiative'), initiative)
                }
              />
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="field-label">{t('character.sheet.combat.walk')}</dt>
            <dd className="tabular-nums text-ink-50">
              {t('character.sheet.speedValue', { speed: character.speed.walk })}
            </dd>
          </div>
        </dl>
        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          <StatusControls character={character} update={update} />
        </div>
      </section>
      <div className="mb-4 flex flex-wrap items-center gap-2 lg:hidden">
        <StatusControls character={character} update={update} />
      </div>
    </>
  );
}
