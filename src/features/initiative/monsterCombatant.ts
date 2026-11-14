import type { MonsterEntry } from '@/data/compendium/types';
import type { NewCombatant } from './model';

export function fixedStat(value: string | undefined): number | null {
  const match = /^\s*(\d+)(?:\s*\([^)]*\))?\s*$/.exec(
    typeof value === 'string' ? value : '',
  );
  return match ? Number(match[1]) : null;
}

export function monsterInitiative(value: string | undefined, dex: number | undefined) {
  const initiative = /^\s*([+-]?\d+)(?:\s*\((\d+)\))?/.exec(
    typeof value === 'string' ? value : '',
  );
  if (initiative)
    return initiative[2] ? Number(initiative[2]) : 10 + Number(initiative[1]);
  return typeof dex === 'number' && Number.isFinite(dex)
    ? 10 + Math.floor((dex - 10) / 2)
    : null;
}

export function monsterCombatant(
  monster: Pick<MonsterEntry, 'name' | 'initiative' | 'dex' | 'hp' | 'ac'>,
): NewCombatant {
  const hp = fixedStat(monster.hp);
  return {
    name: monster.name,
    initiative: monsterInitiative(monster.initiative, monster.dex),
    ac: fixedStat(monster.ac),
    hpCurrent: hp,
    hpMax: hp,
    conditions: '',
    isPlayer: false,
  };
}
