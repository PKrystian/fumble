import { downloadTextFile } from '@/features/storage/downloadFile';
import { encounterBackupText, parseEncounterFile } from '@/features/dm/encounterFiles';
import { useEncounterStore } from '@/features/dm/encounterStore';
import { downloadLootBackup, parseLootFile } from '@/features/dm/lootFiles';
import { useLootStore } from '@/features/dm/lootStore';
import {
  homebrewBackupText,
  readHomebrewBackup,
} from '@/features/homebrew/homebrewFiles';
import { useHomebrewStore, withHomebrewWrite } from '@/features/homebrew/store';
import { initiativeBackupText, parseInitiativeFile } from '@/features/initiative/files';
import { useInitiativeStore } from '@/features/initiative/store';
import { getSessionSaveStatus } from '@/features/session-log/persistence';
import {
  parseSessionsFile,
  sessionsBackupText,
} from '@/features/session-log/sessionFiles';
import { restoreStoredSessions, useSessionStore } from '@/features/session-log/store';
import { downloadSoundboard, parseSoundboardFile } from '@/features/soundboard/files';
import {
  allowSoundboardReplacement,
  getSoundboardSaveStatus,
} from '@/features/soundboard/persistence';
import { useSoundboardStore } from '@/features/soundboard/store';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export interface ToolRestore {
  exportedAt: string | null;
  version: number | null;
  details: Array<{ label: string; value: string | number }>;
  empty: boolean;
  apply: () => boolean | Promise<boolean>;
}

export interface ToolBackup {
  id: string;
  labelKey: string;
  to: string;
  countKey: string;
  scopeKey: string;
  emptyKey: string;
  count: () => number;
  available: () => boolean;
  download: () => void;
  parse: (text: string, t: Translate) => ToolRestore;
}

const soundboardSnapshot = () => {
  const { tracks, categories } = useSoundboardStore.getState();
  return { tracks, categories };
};

export const TOOL_BACKUPS: ToolBackup[] = [
  {
    id: 'sessions',
    labelKey: 'nav.sessionLog',
    to: '/session-log',
    countKey: 'data.counts.sessions',
    scopeKey: 'sessionLog.importScope',
    emptyKey: 'sessionLog.emptyImport',
    count: () => useSessionStore.getState().sessions.length,
    available: () => getSessionSaveStatus().state === 'saved',
    download: () => downloadTextFile(sessionsBackupText(), 'fumble-sessions-backup.json'),
    parse: (text, t) => {
      const file = parseSessionsFile(text);
      return {
        exportedAt: file.exportedAt,
        version: file.version,
        details: [
          { label: t('data.counts.sessions'), value: file.sessions },
          { label: t('data.counts.contexts'), value: file.contexts },
        ],
        empty: file.sessions === 0 && file.contexts === 0,
        apply: () => restoreStoredSessions(file.raw),
      };
    },
  },
  {
    id: 'soundboard',
    labelKey: 'nav.soundboard',
    to: '/dm/soundboard',
    countKey: 'data.counts.tracks',
    scopeKey: 'soundboard.importScope',
    emptyKey: 'soundboard.importEmpty',
    count: () => useSoundboardStore.getState().tracks.length,
    available: () => !getSoundboardSaveStatus().blocked,
    download: () => downloadSoundboard(soundboardSnapshot()),
    parse: (text, t) => {
      const file = parseSoundboardFile(text);
      return {
        exportedAt: file.exportedAt,
        version: file.version,
        details: [
          { label: t('data.counts.tracks'), value: file.data.tracks.length },
          { label: t('soundboard.categories'), value: file.data.categories.length },
          {
            label: t('soundboard.favorites'),
            value: file.data.tracks.filter((track) => track.favorite).length,
          },
        ],
        empty: file.data.tracks.length === 0,
        apply: () => {
          allowSoundboardReplacement();
          useSoundboardStore.getState().replaceData(file.data);
          return getSoundboardSaveStatus().saved;
        },
      };
    },
  },
  {
    id: 'initiative',
    labelKey: 'nav.initiative',
    to: '/dm/initiative',
    countKey: 'data.counts.combatants',
    scopeKey: 'initiative.importScope',
    emptyKey: 'initiative.emptyImport',
    count: () => useInitiativeStore.getState().combatants.length,
    available: () => {
      const { status } = useInitiativeStore.getState();
      return status !== 'unreadable' && status !== 'conflict';
    },
    download: () =>
      downloadTextFile(
        initiativeBackupText(useInitiativeStore.getState()),
        'fumble-initiative-backup.json',
      ),
    parse: (text, t) => {
      const file = parseInitiativeFile(text);
      const active = file.data.combatants.find((row) => row.id === file.data.turnId);
      return {
        exportedAt: file.exportedAt,
        version: file.version,
        details: [
          { label: t('data.counts.combatants'), value: file.data.combatants.length },
          {
            label: t('initiative.round'),
            value: file.data.round || t('initiative.notStarted'),
          },
          {
            label: t('initiative.active'),
            value: active
              ? active.name.trim() || t('initiative.unnamed')
              : t('initiative.noActive'),
          },
        ],
        empty: file.data.combatants.length === 0,
        apply: () => useInitiativeStore.getState().restore(file.data),
      };
    },
  },
  {
    id: 'encounter',
    labelKey: 'nav.encounterCr',
    to: '/dm/encounter',
    countKey: 'data.counts.encounters',
    scopeKey: 'encounter.importScope',
    emptyKey: 'encounter.emptyImport',
    count: () => useEncounterStore.getState().data.library.length,
    available: () => !useEncounterStore.getState().blocked,
    download: () =>
      downloadTextFile(
        encounterBackupText(useEncounterStore.getState().data),
        'fumble-encounter-backup.json',
      ),
    parse: (text, t) => {
      const file = parseEncounterFile(text);
      const creatures = file.data.draft.monsters.reduce((sum, row) => sum + row.count, 0);
      return {
        exportedAt: file.exportedAt,
        version: file.version,
        details: [
          { label: t('data.counts.encounters'), value: file.data.library.length },
          { label: t('encounter.draftCreatures'), value: creatures },
        ],
        empty: file.data.library.length === 0 && file.data.draft.monsters.length === 0,
        apply: () => {
          useEncounterStore.getState().restore(file.data);
          return useEncounterStore.getState().saved;
        },
      };
    },
  },
  {
    id: 'loot',
    labelKey: 'nav.lootGenerator',
    to: '/dm/loot',
    countKey: 'data.counts.loot',
    scopeKey: 'dm.loot.importScope',
    emptyKey: 'dm.loot.emptyImport',
    count: () => useLootStore.getState().data.history.length,
    available: () => !useLootStore.getState().blocked,
    download: () => downloadLootBackup(useLootStore.getState().data),
    parse: (text, t) => {
      const file = parseLootFile(text);
      return {
        exportedAt: file.exportedAt,
        version: file.version,
        details: [{ label: t('data.counts.loot'), value: file.data.history.length }],
        empty: file.data.history.length === 0,
        apply: () => {
          useLootStore.getState().replaceData(file.data);
          return useLootStore.getState().saved;
        },
      };
    },
  },
  {
    id: 'homebrew',
    labelKey: 'nav.homebrew',
    to: '/homebrew',
    countKey: 'data.counts.homebrew',
    scopeKey: 'homebrew.restoreScope',
    emptyKey: 'homebrew.acceptEmpty',
    count: () => useHomebrewStore.getState().entries.length,
    available: () => {
      const { status } = useHomebrewStore.getState();
      return status !== 'unreadable' && status !== 'conflict';
    },
    download: () =>
      downloadTextFile(
        homebrewBackupText(useHomebrewStore.getState().entries),
        'fumble-homebrew-backup.json',
      ),
    parse: (text, t) => {
      const file = readHomebrewBackup(text);
      useHomebrewStore.getState().checkStorage();
      const baseline = useHomebrewStore.getState().baseline();
      return {
        exportedAt: file.exportedAt,
        version: file.version,
        details: [{ label: t('data.counts.homebrew'), value: file.entries.length }],
        empty: file.entries.length === 0,
        apply: () =>
          withHomebrewWrite(() =>
            useHomebrewStore.getState().restore(file.entries, baseline),
          ),
      };
    },
  },
];
