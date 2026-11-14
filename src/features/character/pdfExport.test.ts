import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter } from './model';
import { fillCharacterSheetPdf } from './pdfExport';

const setText = vi.fn();
const check = vi.fn();
const getTextField = vi.fn(() => ({ setText }));
const getCheckBox = vi.fn(() => ({ check }));
const save = vi.fn(async () => new Uint8Array([1, 2, 3]));
const updateFieldAppearances = vi.fn();
const registerFontkit = vi.fn();
const embedFont = vi.fn(async () => ({ name: 'font' }));

vi.mock('@pdf-lib/fontkit', () => ({ default: { name: 'fontkit' } }));

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn(async () => ({
      getForm: () => ({ getTextField, getCheckBox, updateFieldAppearances }),
      registerFontkit,
      embedFont,
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
    character.subclass = 'Evoker|XPHB';
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
    expect(save).toHaveBeenCalledWith({ updateFieldAppearances: false });
    expect(registerFontkit).toHaveBeenCalled();
    expect(updateFieldAppearances).toHaveBeenCalledWith({ name: 'font' });
    expect(setText).toHaveBeenCalledWith(
      edition === '2024' ? 'Evoker' : 'Wizard Evoker 5',
    );
  });

  it('uses localized display names and the selected hit dice', async () => {
    const character = createCharacter('Żółć');
    character.className = 'barbarian';
    character.subclass = 'Ścieżka Berserkera|XPHB';
    character.hitDice = '3d12';
    character.hitDiceUsed = 1;
    await fillCharacterSheetPdf(character, '2024', {
      className: 'Barbarzyńca',
      subclass: 'Ścieżka Berserkera',
      species: 'Krasnolud',
      background: 'Akolita',
    });
    expect(setText).toHaveBeenCalledWith('Barbarzyńca');
    expect(setText).toHaveBeenCalledWith('Ścieżka Berserkera');
    expect(setText).toHaveBeenCalledWith('Krasnolud');
    expect(setText).toHaveBeenCalledWith('Akolita');
    expect(setText).toHaveBeenCalledWith('3d12');
    expect(setText).toHaveBeenCalledWith('1');
    expect(setText).not.toHaveBeenCalledWith('barbarian');
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

it('reports a missing sheet font', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.endsWith('.ttf')
        ? { ok: false }
        : { ok: true, arrayBuffer: async () => new ArrayBuffer(4) },
    ),
  );
  await expect(fillCharacterSheetPdf(createCharacter(), '2024')).rejects.toThrow(
    'Could not load the character sheet font.',
  );
});
