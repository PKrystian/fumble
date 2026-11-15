import type { CompendiumEntryBase } from './types';

const ACTION_TIMES: Record<string, string> = {
  'cast-a-spell': 'Varies',
  'end-concentration': 'Free',
  'end-concentration-phb': 'Free',
  'improvising-an-action': 'Varies',
  'improvising-an-action-phb': 'Varies',
  'other-activity': 'Varies',
};

export function repairSourceMetadata<T extends CompendiumEntryBase>(entry: T): T {
  if (
    (entry.source === 'PHB' || entry.source === 'XPHB') &&
    'time' in entry &&
    entry.time === 'undefined undefineds' &&
    ACTION_TIMES[entry.id]
  )
    return { ...entry, time: ACTION_TIMES[entry.id] };
  return entry;
}
