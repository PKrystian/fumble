import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter } from './model';
import { fillCharacterSheetPdf } from './pdfExport';

const setText = vi.fn();
const check = vi.fn();
const getTextField = vi.fn(() => ({ setText }));
const getCheckBox = vi.fn(() => ({ check }));
const save = vi.fn(async () => new Uint8Array([1, 2, 3]));

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn(async () => ({
      getForm: () => ({ getTextField, getCheckBox }),
      save,
    })),
  },
}));

describe('character PDF export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4),
      })),
    );
  });

  it.each(['2024', '2014'] as const)('fills the %s character sheet', async (edition) => {
    const character = createCharacter('Aria');
    character.className = 'Wizard';
    character.subclass = 'Evoker';
    character.species = 'Elf';
    character.background = 'Sage';
    character.level = 5;
    character.ac = 15;
    character.hp = { current: 20, max: 30, temp: 4 };
    character.spellcastingAbility = 'int';
    character.savingThrowProficiencies = ['int', 'wis'];
    character.skillProficiencies = ['arcana'];
    character.skillExpertise = ['history'];
    character.armorProficiencies = 'Light armor, shields';
    character.weaponProficiencies = 'Simple weapons';
    character.toolProficiencies = 'Calligrapher tools';
    character.languages = 'Common, Elvish';
    character.actions = [{ id: 'a', name: 'Quarterstaff', notes: '1d6 bludgeoning' }];
    character.features = [
      { id: 'f', name: 'Arcane Recovery', notes: 'Once daily', source: '' },
    ];
    character.inventory = [{ id: 'i', name: 'Spellbook', notes: '', quantity: 1 }];
    character.notes = 'A travelling scholar.';

    const result = await fillCharacterSheetPdf(character, edition);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('application/pdf');
    expect(setText).toHaveBeenCalledWith('Aria');
    expect(check).toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
  });

  it('skips fields absent from a template', async () => {
    getTextField.mockImplementationOnce(() => {
      throw new Error('missing field');
    });
    await expect(
      fillCharacterSheetPdf(createCharacter(), '2024'),
    ).resolves.toBeInstanceOf(Blob);
  });

  it('reports a failed template request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false })),
    );
    await expect(fillCharacterSheetPdf(createCharacter(), '2014')).rejects.toThrow(
      'Could not load the 2014 sheet template.',
    );
  });
});
