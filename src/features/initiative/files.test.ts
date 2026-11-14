import { expect, it } from 'vitest';
import { MAX_BACKUP_BYTES, parseBackup } from '@/features/data/backup';
import { initiativeBackupText, parseInitiativeFile } from './files';
import {
  INITIATIVE_KEY,
  emptyInitiative,
  initiativeSnapshot,
  readInitiative,
  serializeInitiative,
} from './model';

const combatant = {
  id: 'one',
  name: 'Żmija',
  initiative: -2,
  ac: null,
  hpCurrent: 0,
  hpMax: null,
  conditions: 'Prone',
  isPlayer: false,
};
const data = { combatants: [combatant], round: 2, turnId: combatant.id };
const version = 2;
const exportedAt = '2026-11-09T18:00:00.000Z';

it('round trips a scoped backup, keeping zero distinct from unknown values', () => {
  expect(parseInitiativeFile(initiativeBackupText(data))).toMatchObject({
    data,
    version: 1,
  });
  expect(parseInitiativeFile(initiativeBackupText(emptyInitiative())).data).toEqual(
    emptyInitiative(),
  );
});

it('extracts initiative from a full backup', () => {
  const text = JSON.stringify({
    app: 'fumble',
    exportedAt,
    version: 1,
    data: { [INITIATIVE_KEY]: serializeInitiative(data), 'fumble-other': 'true' },
  });
  expect(parseInitiativeFile(text)).toEqual({ exportedAt, version: 1, data });
});

it.each([
  null,
  {},
  { app: 'wrong', exportedAt, version: 1 },
  { app: 'fumble', exportedAt, version: 1, data: {} },
  { app: INITIATIVE_KEY, exportedAt: 'not a date', version: 1 },
  { app: INITIATIVE_KEY, exportedAt: '2026-11-09', version: 1 },
  { app: INITIATIVE_KEY, exportedAt, version: 2 },
])('rejects an invalid or unrelated file (%j)', (file) => {
  expect(() => parseInitiativeFile(JSON.stringify(file))).toThrow(
    'initiative-backup-invalid',
  );
});

it('rejects oversized import and export files', () => {
  const largeText = 'x'.repeat(MAX_BACKUP_BYTES + 1);
  expect(() => parseInitiativeFile(largeText)).toThrow('initiative-backup-too-large');
  expect(() =>
    initiativeBackupText({
      ...data,
      combatants: [{ ...combatant, conditions: largeText }],
    }),
  ).toThrow('initiative-backup-too-large');
});

it.each([
  null,
  { version, state: {} },
  { version, state: { ...data, next: null } },
  { version, state: { ...data, combatants: null } },
  { version, state: { ...data, combatants: [null] } },
  { version, state: { ...data, combatants: [{ ...combatant, id: '' }] } },
  { version, state: { ...data, combatants: [{ ...combatant, ac: '13' }] } },
  { version, state: { ...data, round: -1 } },
  { version, state: { ...data, round: 2.5 } },
  { version, state: { ...data, round: 0 } },
  { version, state: { ...data, turnId: 42 } },
  { version, state: { ...data, turnId: 'missing' } },
  { version, state: { ...data, combatants: [combatant, combatant] } },
  { version: 1, state: data },
])('rejects inconsistent initiative data (%j)', (invalid) => {
  expect(readInitiative(invalid)).toBeNull();
  const text = JSON.stringify({
    app: 'fumble',
    exportedAt,
    version: 1,
    data: { [INITIATIVE_KEY]: JSON.stringify(invalid) },
  });
  expect(() => parseBackup(text)).toThrow('backup-invalid-data');
});

it('retains legacy partial backups and rejects newer storage versions', () => {
  expect(readInitiative({ version: 1, state: {} })).toEqual(emptyInitiative());
  expect(readInitiative(initiativeSnapshot(data))).toEqual(data);
  const unknown = { ...initiativeSnapshot(data), version: 99 };
  const text = JSON.stringify({
    app: 'fumble',
    exportedAt,
    version: 1,
    data: { [INITIATIVE_KEY]: JSON.stringify(unknown) },
  });
  expect(() => parseBackup(text)).toThrow('backup-version');
});
