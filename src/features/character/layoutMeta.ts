import { useSyncExternalStore } from 'react';

export const PANEL_TITLE_KEYS: Record<string, string> = {
  abilities: 'character.sheet.panels.abilityScores',
  savingThrows: 'character.sheet.panels.savingThrows',
  passives: 'character.sheet.panels.passiveSenses',
  combat: 'character.sheet.panels.combat',
  hitPoints: 'character.sheet.panels.hitPoints',
  tabs: 'character.sheet.panels.details',
  skills: 'character.sheet.panels.skills',
  proficiencies: 'character.sheet.panels.proficienciesLanguages',
  tracking: 'character.sheet.panels.defensesTracking',
  spellcasting: 'character.sheet.panels.spellcasting',
  sessionLog: 'character.sheet.panels.sessionLog',
};

const WIDE_QUERY = '(min-width: 1024px)';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

function wideSnapshot() {
  return typeof window === 'undefined' || !window.matchMedia
    ? true
    : window.matchMedia(WIDE_QUERY).matches;
}

export function useWideLayout(): boolean {
  return useSyncExternalStore(subscribe, wideSnapshot, () => true);
}
