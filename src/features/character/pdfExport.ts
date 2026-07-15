import { PDFDocument } from 'pdf-lib';
import {
  ABILITY_KEYS,
  ABILITY_NAMES,
  SKILLS,
  type AbilityKey,
  type Character,
  abilityModifier,
  formatModifier,
  initiativeBonus,
  passiveScore,
  proficiencyBonus,
  savingThrowBonus,
  skillBonus,
  spellAttackBonus,
  spellSaveDc,
} from './model';

export type SheetEdition = '2024' | '2014';

type FieldMap = Record<string, string | boolean>;

function isProficientSkill(character: Character, skillId: string): boolean {
  return (
    character.skillProficiencies.includes(skillId) ||
    character.skillExpertise.includes(skillId)
  );
}

function formatNamedList(items: Array<{ name: string; notes: string }>): string {
  return items
    .filter((i) => i.name.trim())
    .map((i) => (i.notes.trim() ? `${i.name} - ${i.notes}` : i.name))
    .join('\n');
}

const SCORE_FIELD_2024: Record<AbilityKey, string> = {
  str: 'Text21',
  dex: 'Text22',
  con: 'Text24',
  int: 'Text20',
  wis: 'Text23',
  cha: 'Text25',
};

const MOD_FIELD_2024: Record<AbilityKey, string> = {
  str: 'Text64',
  dex: 'Text66',
  con: 'Text67',
  int: 'Text63',
  wis: 'Text65',
  cha: 'Text68',
};

const SAVE_FIELD_2024: Record<AbilityKey, { text: string; box: string }> = {
  str: { text: 'Text91', box: 'Check Box37' },
  dex: { text: 'Text87', box: 'Check Box33' },
  con: { text: 'Text86', box: 'Check Box32' },
  int: { text: 'Text69', box: 'Check Box4' },
  wis: { text: 'Text75', box: 'Check Box21' },
  cha: { text: 'Text81', box: 'Check Box26' },
};

const SKILL_FIELD_2024: Record<string, { text: string; box: string }> = {
  athletics: { text: 'Text92', box: 'Check Box38' },
  acrobatics: { text: 'Text88', box: 'Check Box34' },
  'sleight-of-hand': { text: 'Text89', box: 'Check Box35' },
  stealth: { text: 'Text90', box: 'Check Box36' },
  arcana: { text: 'Text70', box: 'Check Box16' },
  history: { text: 'Text71', box: 'Check Box17' },
  investigation: { text: 'Text72', box: 'Check Box19' },
  nature: { text: 'Text73', box: 'Check Box20' },
  religion: { text: 'Text74', box: 'Check Box18' },
  'animal-handling': { text: 'Text76', box: 'Check Box22' },
  insight: { text: 'Text77', box: 'Check Box23' },
  medicine: { text: 'Text78', box: 'Check Box25' },
  perception: { text: 'Text79', box: 'Check Box31' },
  survival: { text: 'Text80', box: 'Check Box24' },
  deception: { text: 'Text82', box: 'Check Box27' },
  intimidation: { text: 'Text83', box: 'Check Box28' },
  performance: { text: 'Text84', box: 'Check Box30' },
  persuasion: { text: 'Text85', box: 'Check Box29' },
};

const ARMOR_BOX_2024: Record<string, string> = {
  light: 'Check Box14',
  medium: 'Check Box15',
  heavy: 'Check Box12',
  shield: 'Check Box13',
};

const ATTACK_NAME_FIELDS_2024 = ['Text30', 'Text34', 'Text38', 'Text42'];
const ATTACK_NOTES_FIELDS_2024 = ['Text33', 'Text37', 'Text41', 'Text45'];

function build2024Fields(character: Character): FieldMap {
  const fields: FieldMap = {
    Text1: character.name,
    Text6: character.species,
    Text7: [character.className, character.subclass].filter(Boolean).join(' / '),
    Text8: character.background,
    Text11: String(character.level),
    Text19: formatModifier(proficiencyBonus(character)),
    Text13: String(character.ac),
    Text26: formatModifier(initiativeBonus(character)),
    Text27: `${character.speed.walk} ft.`,
    Text29: String(passiveScore(character, 'perception')),
    Text14: String(character.hp.current),
    Text15: String(character.hp.max),
    Text16: String(character.hp.temp),
    Text18: character.hitDice,
    Text59: character.weaponProficiencies,
    Text60: character.toolProficiencies,
    Text55: formatNamedList(character.features),
    Text99: formatNamedList(character.inventory),
    Text97: character.notes,
  };

  for (const key of ABILITY_KEYS) {
    fields[SCORE_FIELD_2024[key]] = String(character.abilities[key]);
    fields[MOD_FIELD_2024[key]] = formatModifier(
      abilityModifier(character.abilities[key]),
    );
    fields[SAVE_FIELD_2024[key].text] = formatModifier(savingThrowBonus(character, key));
    fields[SAVE_FIELD_2024[key].box] = character.savingThrowProficiencies.includes(key);
  }

  for (const skill of SKILLS) {
    const mapping = SKILL_FIELD_2024[skill.id];
    if (!mapping) continue;
    fields[mapping.text] = formatModifier(skillBonus(character, skill));
    fields[mapping.box] = isProficientSkill(character, skill.id);
  }

  const armorProf = character.armorProficiencies.toLowerCase();
  for (const [keyword, box] of Object.entries(ARMOR_BOX_2024)) {
    if (armorProf.includes(keyword) || armorProf.includes('all armor'))
      fields[box] = true;
  }

  character.actions.slice(0, 4).forEach((action, i) => {
    fields[ATTACK_NAME_FIELDS_2024[i]!] = action.name;
    fields[ATTACK_NOTES_FIELDS_2024[i]!] = action.notes;
  });

  if (character.spellcastingAbility) {
    fields.Text93 = ABILITY_NAMES[character.spellcastingAbility];
    fields.Text94 = String(spellSaveDc(character) ?? '');
    fields.Text95 = formatModifier(spellAttackBonus(character) ?? 0);
  }

  return fields;
}

const SCORE_FIELD_2014: Record<AbilityKey, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

const MOD_FIELD_2014: Record<AbilityKey, string> = {
  str: 'STRmod',
  dex: 'DEXmod ',
  con: 'CONmod',
  int: 'INTmod',
  wis: 'WISmod',
  cha: 'CHamod',
};

const SAVE_FIELD_2014: Record<AbilityKey, { text: string; box: string }> = {
  str: { text: 'ST Strength', box: 'Check Box 11' },
  dex: { text: 'ST Dexterity', box: 'Check Box 18' },
  con: { text: 'ST Constitution', box: 'Check Box 19' },
  int: { text: 'ST Intelligence', box: 'Check Box 20' },
  wis: { text: 'ST Wisdom', box: 'Check Box 21' },
  cha: { text: 'ST Charisma', box: 'Check Box 22' },
};

const SKILL_FIELD_2014: Record<string, { text: string; box: string }> = {
  acrobatics: { text: 'Acrobatics', box: 'Check Box 23' },
  'animal-handling': { text: 'Animal', box: 'Check Box 24' },
  arcana: { text: 'Arcana', box: 'Check Box 25' },
  athletics: { text: 'Athletics', box: 'Check Box 26' },
  deception: { text: 'Deception ', box: 'Check Box 27' },
  history: { text: 'History ', box: 'Check Box 28' },
  insight: { text: 'Insight', box: 'Check Box 29' },
  intimidation: { text: 'Intimidation', box: 'Check Box 30' },
  investigation: { text: 'Investigation ', box: 'Check Box 31' },
  medicine: { text: 'Medicine', box: 'Check Box 32' },
  nature: { text: 'Nature', box: 'Check Box 33' },
  perception: { text: 'Perception ', box: 'Check Box 34' },
  performance: { text: 'Performance', box: 'Check Box 35' },
  persuasion: { text: 'Persuasion', box: 'Check Box 36' },
  religion: { text: 'Religion', box: 'Check Box 37' },
  'sleight-of-hand': { text: 'SleightofHand', box: 'Check Box 38' },
  stealth: { text: 'Stealth ', box: 'Check Box 39' },
  survival: { text: 'Survival', box: 'Check Box 40' },
};

function build2014Fields(character: Character): FieldMap {
  const fields: FieldMap = {
    CharacterName: character.name,
    'CharacterName 2': character.name,
    ClassLevel: [character.className, character.subclass, `${character.level}`]
      .filter(Boolean)
      .join(' '),
    Background: character.background,
    'Race ': character.species,
    ProfBonus: formatModifier(proficiencyBonus(character)),
    AC: String(character.ac),
    Initiative: formatModifier(initiativeBonus(character)),
    Speed: `${character.speed.walk} ft.`,
    HPMax: String(character.hp.max),
    HPCurrent: String(character.hp.current),
    HPTemp: String(character.hp.temp),
    HD: character.hitDice,
    Passive: String(passiveScore(character, 'perception')),
    ProficienciesLang: [
      character.armorProficiencies && `Armor: ${character.armorProficiencies}`,
      character.weaponProficiencies && `Weapons: ${character.weaponProficiencies}`,
      character.toolProficiencies && `Tools: ${character.toolProficiencies}`,
      character.languages && `Languages: ${character.languages}`,
    ]
      .filter(Boolean)
      .join('\n'),
    Equipment: formatNamedList(character.inventory),
    'Features and Traits': formatNamedList(character.features),
    Backstory: character.notes,
    AttacksSpellcasting: formatNamedList(character.actions),
  };

  for (const key of ABILITY_KEYS) {
    fields[SCORE_FIELD_2014[key]] = String(character.abilities[key]);
    fields[MOD_FIELD_2014[key]] = formatModifier(
      abilityModifier(character.abilities[key]),
    );
    fields[SAVE_FIELD_2014[key].text] = formatModifier(savingThrowBonus(character, key));
    fields[SAVE_FIELD_2014[key].box] = character.savingThrowProficiencies.includes(key);
  }

  for (const skill of SKILLS) {
    const mapping = SKILL_FIELD_2014[skill.id];
    if (!mapping) continue;
    fields[mapping.text] = formatModifier(skillBonus(character, skill));
    fields[mapping.box] = isProficientSkill(character, skill.id);
  }

  const weapons = character.actions.slice(0, 3);
  const nameFields = ['Wpn Name', 'Wpn Name 2', 'Wpn Name 3'];
  weapons.forEach((action, i) => {
    fields[nameFields[i]!] = action.name;
  });

  return fields;
}

function buildFields(character: Character, edition: SheetEdition): FieldMap {
  return edition === '2024' ? build2024Fields(character) : build2014Fields(character);
}

export async function fillCharacterSheetPdf(
  character: Character,
  edition: SheetEdition,
): Promise<Blob> {
  const url = `${import.meta.env.BASE_URL}character-sheets/dnd${edition}.pdf`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load the ${edition} sheet template.`);
  const bytes = await response.arrayBuffer();

  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();

  for (const [name, value] of Object.entries(buildFields(character, edition))) {
    try {
      if (typeof value === 'boolean') {
        const checkbox = form.getCheckBox(name);
        if (value) checkbox.check();
      } else if (value) {
        form.getTextField(name).setText(value);
      }
    } catch {
      // skip fields the template doesn't define
    }
  }

  const filled = await doc.save();
  return new Blob([filled], { type: 'application/pdf' });
}
