import { DAMAGE_TYPES, MAX_DAMAGE_COMPONENTS } from './damage';
import {
  MAX_DICE,
  MAX_EXPRESSION_LENGTH,
  MAX_SIDES,
  parseExpression,
  type RollOutcome,
} from './engine';
import type { CustomRoll } from './customRollStore';
import type { RollLogEntry } from './rollStore';

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max;
const number = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value);
const mode = (value: unknown) =>
  typeof value === 'string' && ['normal', 'advantage', 'disadvantage'].includes(value);
const type = (value: unknown) =>
  DAMAGE_TYPES.includes(value as (typeof DAMAGE_TYPES)[number]);
const expression = (value: unknown) =>
  text(value, MAX_EXPRESSION_LENGTH) && Boolean(parseExpression(value));
export const isDamageComponent = (value: unknown) =>
  object(value) &&
  text(value.id, 200) &&
  text(value.name, 120) &&
  expression(value.expression) &&
  type(value.type);
const defense = (value: unknown) =>
  object(value) &&
  ['resistance', 'vulnerability', 'immunity'].every(
    (key) => typeof value[key] === 'boolean',
  );

export function isCustomRoll(value: unknown): value is CustomRoll {
  return (
    object(value) &&
    text(value.id, 200) &&
    text(value.name, 5000) &&
    (value.components === undefined
      ? expression(value.expression)
      : text(value.expression, (MAX_EXPRESSION_LENGTH + 5) * MAX_DAMAGE_COMPONENTS)) &&
    (value.mode === undefined || mode(value.mode)) &&
    (value.components === undefined ||
      (Array.isArray(value.components) &&
        value.components.length > 0 &&
        value.components.length <= MAX_DAMAGE_COMPONENTS &&
        value.components.every(isDamageComponent)))
  );
}

export function isRollOutcome(value: unknown, nested = false): value is RollOutcome {
  if (
    !object(value) ||
    !text(value.expression, (MAX_EXPRESSION_LENGTH + 5) * MAX_DAMAGE_COMPONENTS) ||
    !mode(value.mode) ||
    !number(value.total) ||
    !number(value.modifier) ||
    !Array.isArray(value.groups) ||
    value.groups.length > MAX_DICE
  )
    return false;
  if (
    !value.groups.every(
      (group) =>
        object(group) &&
        number(group.sides) &&
        group.sides > 0 &&
        group.sides <= MAX_SIDES &&
        Array.isArray(group.rolls) &&
        group.rolls.length <= MAX_DICE * 2 &&
        group.rolls.every(
          (face) => number(face) && face >= 1 && face <= (group.sides as number),
        ) &&
        Array.isArray(group.kept) &&
        group.kept.every(number) &&
        (group.keptIndices === undefined ||
          (Array.isArray(group.keptIndices) &&
            group.keptIndices.every(
              (index) =>
                number(index) && index >= 0 && index < (group.rolls as unknown[]).length,
            ))),
    )
  )
    return false;
  if (
    value.calculation !== undefined &&
    !text(value.calculation, MAX_DICE * 16 + MAX_EXPRESSION_LENGTH * 4)
  )
    return false;
  if (value.damage !== undefined) {
    if (
      nested ||
      !object(value.damage) ||
      !Array.isArray(value.damage.parts) ||
      !value.damage.parts.length ||
      value.damage.parts.length > MAX_DAMAGE_COMPONENTS ||
      !value.damage.parts.every(
        (part) =>
          object(part) &&
          isDamageComponent(part.component) &&
          isRollOutcome(part.outcome, true),
      ) ||
      !Array.isArray(value.damage.totals) ||
      value.damage.totals.length > DAMAGE_TYPES.length ||
      !value.damage.totals.every(
        (entry) =>
          object(entry) &&
          type(entry.type) &&
          number(entry.raw) &&
          number(entry.total) &&
          entry.raw >= 0 &&
          entry.total >= 0 &&
          defense(entry.defense),
      )
    )
      return false;
  }
  return true;
}

export function isRollLogEntry(value: unknown): value is RollLogEntry {
  return (
    object(value) &&
    text(value.id, 200) &&
    (value.label === undefined || text(value.label, 5000)) &&
    (value.createdAt === undefined ||
      (number(value.createdAt) &&
        value.createdAt >= 0 &&
        value.createdAt <= 8_640_000_000_000_000)) &&
    isRollOutcome(value.outcome)
  );
}
