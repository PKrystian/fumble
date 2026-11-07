import type { MonsterEntry } from '@/data/compendium/types';
import type { Combatant } from './store';

function fixedStat(value: string): number | null {
  const match = /^\s*(\d+)(?:\s*\([^)]*\))?\s*$/.exec(value);
  return match ? Number(match[1]) : null;
}

export function monsterCombatant(
  monster: Pick<MonsterEntry, 'name' | 'initiative' | 'dex' | 'hp' | 'ac'>,
): Omit<Combatant, 'id'> {
  const hp = fixedStat(monster.hp) ?? 0;
  const initiative = /^\s*([+-]?\d+)(?:\s*\((\d+)\))?/.exec(monster.initiative ?? '');
  const modifier = initiative
    ? Number(initiative[1])
    : Math.floor((monster.dex - 10) / 2);
  return {
    name: monster.name,
    initiative: initiative?.[2] ? Number(initiative[2]) : 10 + modifier,
    ac: fixedStat(monster.ac),
    hpCurrent: hp,
    hpMax: hp,
    conditions: '',
    isPlayer: false,
  };
}
