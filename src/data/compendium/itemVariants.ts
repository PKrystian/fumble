import type { Entry } from './entry';
import type { ItemVariantBaseItem, JsonObject } from './types';

export interface ItemVariantCandidate {
  name: string;
  source: string;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requirementList(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (typeof entry === 'string') return [{ type: entry }];
      return isRecord(entry) ? [entry] : [];
    });
  }
  if (typeof value === 'string') return [{ type: value }];
  return isRecord(value) ? [value] : [];
}

function matchesValue(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(expected))
    return expected.some((value) => matchesValue(actual, value));
  if (Array.isArray(actual)) return actual.some((value) => matchesValue(value, expected));
  if (
    isRecord(actual) &&
    typeof actual.uid === 'string' &&
    typeof expected === 'string'
  ) {
    return actual.uid.toLowerCase() === expected.toLowerCase();
  }
  if (typeof expected === 'string') {
    return typeof actual === 'string' && actual.toLowerCase() === expected.toLowerCase();
  }
  if (typeof expected === 'boolean') return Boolean(actual) === expected;
  return Object.is(actual, expected);
}

function matchesRequirement(
  candidate: ItemVariantCandidate,
  requirement: Record<string, unknown>,
): boolean {
  return Object.entries(requirement).every(([key, expected]) =>
    matchesValue(candidate[key], expected),
  );
}

export function resolveVariantBaseItems(
  requires: unknown,
  excludes: unknown,
  candidates: ItemVariantCandidate[],
): ItemVariantBaseItem[] {
  const requirements = requirementList(requires);
  const exclusions = requirementList(excludes);
  if (requirements.length === 0) return [];

  const seen = new Set<string>();
  return candidates
    .filter((candidate) =>
      requirements.some((requirement) => matchesRequirement(candidate, requirement)),
    )
    .filter(
      (candidate) =>
        !exclusions.some((exclusion) => matchesRequirement(candidate, exclusion)),
    )
    .filter((candidate) => {
      const key = `${candidate.name.toLowerCase()}|${candidate.source.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ name, source }) => ({ name, source }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source));
}

export function variantInherits(
  variant: JsonObject | undefined,
): Record<string, unknown> {
  if (!variant) return {};
  return isRecord(variant.inherits)
    ? variant.inherits
    : (variant as Record<string, unknown>);
}

function replaceVariantVariables(
  value: unknown,
  variables: Record<string, unknown>,
): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{=(\w+)[^}]*\}/g, (_, key: string) => {
      const replacement = variables[key];
      return replacement == null ? '' : String(replacement);
    });
  }
  if (Array.isArray(value))
    return value.map((entry) => replaceVariantVariables(entry, variables));
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        replaceVariantVariables(entry, variables),
      ]),
    );
  }
  return value;
}

export function interpolateVariantEntries(
  entries: Entry[] | undefined,
  variables: Record<string, unknown>,
): Entry[] {
  return (entries ?? []).map(
    (entry) => replaceVariantVariables(entry, variables) as Entry,
  );
}

export function variantBaseItems(variant: JsonObject | undefined): ItemVariantBaseItem[] {
  const value = variant?.baseItems;
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.name !== 'string' ||
      typeof entry.source !== 'string'
    ) {
      return [];
    }
    return [{ name: entry.name, source: entry.source }];
  });
}

export function variantInheritedString(
  variant: JsonObject | undefined,
  key: string,
): string | undefined {
  const value = variantInherits(variant)[key];
  return typeof value === 'string' ? value : undefined;
}

export function variantInheritedStrings(
  variant: JsonObject | undefined,
  key: string,
): string[] {
  const value = variantInherits(variant)[key];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}
