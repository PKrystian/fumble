import { useState } from 'react';
import type { Character } from './model';
import type { UpdateCharacter } from './sections';

type ListKey = 'actions' | 'inventory' | 'features' | 'spells';
type Row = { id: string; name: string };

export function useRowRemoval<K extends ListKey>(
  character: Character,
  key: K,
  update: UpdateCharacter,
) {
  const list = character[key] as Row[];
  const [removed, setRemoved] = useState<{ row: Row; index: number } | null>(null);

  const remove = (row: Row) => {
    const index = list.findIndex((entry) => entry.id === row.id);
    update({ [key]: list.filter((entry) => entry.id !== row.id) } as Partial<Character>);
    setRemoved({ row, index });
  };

  const undo = () => {
    const { row, index } = removed!;
    const next = [...list];
    next.splice(Math.min(index, next.length), 0, row);
    update({ [key]: next } as Partial<Character>);
    setRemoved(null);
  };

  return { removed: removed?.row ?? null, remove, undo };
}

export function focusNewRow(id: string) {
  requestAnimationFrame(() =>
    document.querySelector<HTMLElement>(`[data-row="${id}"] input`)?.focus(),
  );
}
