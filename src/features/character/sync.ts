import { createContext, useContext, useEffect, useMemo } from 'react';
import { LEGACY_SYNC, type Character, type SyncedField } from './model';
import {
  findSubclassPair,
  syncClassFeatures,
  useBackgroundEntryPair,
  useClassEntryPair,
  useSpeciesEntryPair,
  useSpellIndex,
} from './compendiumSync';

export const SYNCED_KEYS: Record<SyncedField, keyof Character> = {
  speed: 'speed',
  savingThrows: 'savingThrowProficiencies',
  armorProficiencies: 'armorProficiencies',
  weaponProficiencies: 'weaponProficiencies',
  toolProficiencies: 'toolProficiencies',
};

const MANUAL_BY_KEY = new Map(
  Object.entries(SYNCED_KEYS).map(([field, key]) => [key, field as SyncedField]),
);

export function syncSignature(character: Character): string {
  return JSON.stringify([
    character.className,
    character.subclass,
    character.level,
    character.species,
    character.background,
  ]);
}

export function buildSyncPatch(
  character: Character,
  computed: Partial<Character>,
  force = false,
): Partial<Character> {
  const patch: Partial<Character> = {};
  if (computed.features) patch.features = computed.features;
  if (computed.spells) patch.spells = computed.spells;
  const signature = syncSignature(character);
  const changed =
    force ||
    (character.syncSignature !== LEGACY_SYNC && character.syncSignature !== signature);
  if (changed) {
    for (const [key, value] of Object.entries(computed) as Array<
      [keyof Character, Character[keyof Character]]
    >) {
      if (key === 'features' || key === 'spells') continue;
      const field = MANUAL_BY_KEY.get(key);
      if (!force && field && character.manualFields.includes(field)) continue;
      Object.assign(patch, { [key]: value });
    }
    if (force) patch.manualFields = [];
  }
  if (character.syncSignature !== signature) patch.syncSignature = signature;
  return patch;
}

export function restoreSyncedField(
  character: Character,
  computed: Partial<Character>,
  field: SyncedField,
): Partial<Character> {
  const key = SYNCED_KEYS[field];
  return {
    ...(computed[key] === undefined ? {} : { [key]: computed[key] }),
    manualFields: character.manualFields.filter((entry) => entry !== field),
  };
}

export function markManual(
  character: Character,
  field: SyncedField,
  computed: Partial<Character> | null,
): Partial<Character> {
  if (
    !character.autoSyncFeatures ||
    !computed ||
    computed[SYNCED_KEYS[field]] === undefined ||
    character.manualFields.includes(field)
  )
    return {};
  return { manualFields: [...character.manualFields, field] };
}

export interface SheetSync {
  computed: Partial<Character> | null;
  ready: boolean;
}

export function useSheetSync(
  character: Character | undefined,
  update: (patch: Partial<Character>) => void,
): SheetSync {
  const classPair = useClassEntryPair(character?.className ?? '');
  const speciesPair = useSpeciesEntryPair(character?.species ?? '');
  const backgroundPair = useBackgroundEntryPair(character?.background ?? '');
  const spells = useSpellIndex();
  const subclassPair = findSubclassPair(classPair, character?.subclass ?? '');
  const ready = Boolean(
    character &&
    classPair.ready &&
    speciesPair.ready &&
    backgroundPair.ready &&
    spells.ready,
  );

  const computed = useMemo(
    () =>
      character && ready
        ? syncClassFeatures(
            character,
            classPair.localized,
            subclassPair.localized,
            speciesPair.localized,
            backgroundPair.localized,
            {
              cls: classPair.english,
              background: backgroundPair.english,
              subclass: subclassPair.english,
              spellIndex: spells.index,
            },
          )
        : null,
    [
      character,
      ready,
      classPair.localized,
      classPair.english,
      subclassPair.localized,
      subclassPair.english,
      speciesPair.localized,
      backgroundPair.localized,
      backgroundPair.english,
      spells.index,
    ],
  );

  useEffect(() => {
    if (!character || !computed || !character.autoSyncFeatures) return;
    update(buildSyncPatch(character, computed));
  }, [character, computed, update]);

  return { computed, ready };
}

export const SheetSyncContext = createContext<Partial<Character> | null>(null);

export function useSyncedComputed(): Partial<Character> | null {
  return useContext(SheetSyncContext);
}
