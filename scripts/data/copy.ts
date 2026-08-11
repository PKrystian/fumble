type CopyObject = Record<string, unknown>;

export type CopyKey = (value: CopyObject) => string | undefined;

function asObject(value: unknown): CopyObject | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as CopyObject)
    : undefined;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function copyMetadata(value: CopyObject): CopyObject | undefined {
  return asObject(value._copy);
}

export const copyKey: CopyKey = (value) => {
  const name = typeof value.name === 'string' ? value.name.trim().toLowerCase() : '';
  const source =
    typeof value.source === 'string' ? value.source.trim().toLowerCase() : '';
  return name && source ? `${name}|${source}` : undefined;
};

export const classCopyKey: CopyKey = (value) => {
  const base = copyKey(value);
  if (!base) return undefined;
  const subclassName = value.shortName ?? value.subclassShortName;
  const parts = [
    base,
    typeof value.className === 'string' ? value.className : '',
    typeof value.classSource === 'string' ? value.classSource : '',
    typeof subclassName === 'string' ? subclassName : '',
    typeof value.subclassSource === 'string' ? value.subclassSource : '',
    typeof value.level === 'number' ? `${value.level}` : '',
  ];
  return parts.join('|').toLowerCase();
};

function withoutCopyMetadata(value: CopyObject): CopyObject {
  const result = clone(value);
  delete result._copy;
  delete result._preserve;
  return result;
}

function operationList(value: unknown): CopyObject[] | string[] {
  if (Array.isArray(value)) return value as CopyObject[];
  return [value as CopyObject];
}

function valueList(value: unknown): unknown[] {
  return value === undefined
    ? []
    : Array.isArray(value)
      ? value.map(clone)
      : [clone(value)];
}

function equalValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function replaceText(
  value: unknown,
  search: string,
  replacement: string,
  flags: string,
): unknown {
  if (typeof value === 'string') {
    return value.replace(new RegExp(search, flags), replacement);
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      value[index] = replaceText(value[index], search, replacement, flags);
    }
    return value;
  }
  const object = asObject(value);
  if (object) {
    for (const key of Object.keys(object)) {
      object[key] = replaceText(object[key], search, replacement, flags);
    }
  }
  return value;
}

function applyTextMod(target: CopyObject, field: string, operation: CopyObject): void {
  const search = typeof operation.replace === 'string' ? operation.replace : undefined;
  const replacement = typeof operation.with === 'string' ? operation.with : undefined;
  if (search === undefined || replacement === undefined) return;
  const flags = typeof operation.flags === 'string' ? operation.flags : '';
  const props = Array.isArray(operation.props)
    ? operation.props.filter((prop): prop is string => typeof prop === 'string')
    : [field];
  const fields =
    field === '*' && !Array.isArray(operation.props) ? Object.keys(target) : props;
  for (const prop of fields) {
    if (prop in target)
      target[prop] = replaceText(target[prop], search, replacement, flags);
  }
}

function itemName(value: unknown): string | undefined {
  const object = asObject(value);
  return typeof object?.name === 'string' ? object.name : undefined;
}

function arrayIndex(values: unknown[], replace: unknown): number {
  const replaceObject = asObject(replace);
  if (typeof replaceObject?.index === 'number') return replaceObject.index;
  if (typeof replace === 'string') {
    return values.findIndex((value) => itemName(value) === replace);
  }
  return values.findIndex((value) => equalValue(value, replace));
}

function applyArrayMod(target: CopyObject, field: string, operation: CopyObject): void {
  const mode = operation.mode;
  if (mode === 'remove') {
    delete target[field];
    return;
  }
  const current = Array.isArray(target[field]) ? target[field] : [];
  const items = valueList(operation.items);

  if (mode === 'appendArr') {
    target[field] = [...current, ...items];
    return;
  }
  if (mode === 'prependArr') {
    target[field] = [...items, ...current];
    return;
  }
  if (mode === 'appendIfNotExistsArr') {
    const result = [...current];
    for (const item of items) {
      if (!result.some((existing) => equalValue(existing, item))) result.push(item);
    }
    target[field] = result;
    return;
  }
  if (mode === 'insertArr') {
    const result = [...current];
    const index = typeof operation.index === 'number' ? operation.index : result.length;
    result.splice(index, 0, ...items);
    target[field] = result;
    return;
  }
  if (mode === 'replaceArr') {
    const result = [...current];
    const index = arrayIndex(result, operation.replace);
    if (index >= 0) result.splice(index, 1, ...items);
    target[field] = result;
    return;
  }
  if (mode === 'removeArr') {
    const names = valueList(operation.names).filter(
      (value): value is string => typeof value === 'string',
    );
    const removals = valueList(operation.items);
    target[field] = current.filter(
      (value) =>
        !names.includes(itemName(value) ?? '') &&
        !removals.some((removal) => equalValue(value, removal)),
    );
  }
}

function numericBonus(value: unknown, amount: unknown): unknown {
  if (typeof amount !== 'number') return value;
  const current = value == null ? 0 : Number(value);
  if (!Number.isFinite(current)) return value;
  const result = current + amount;
  return typeof value === 'number' ? result : `${result >= 0 ? '+' : ''}${result}`;
}

function applySkillMod(target: CopyObject, operation: CopyObject): void {
  const skills = asObject(operation.skills);
  if (!skills) return;
  const current = asObject(target.skill) ?? {};
  for (const [skill, amount] of Object.entries(skills)) {
    current[skill] = numericBonus(current[skill], amount);
  }
  target.skill = current;
}

function spellcastingSections(target: CopyObject): CopyObject[] {
  if (Array.isArray(target.spellcasting)) return target.spellcasting as CopyObject[];
  const section = asObject(target.spellcasting);
  if (section) {
    target.spellcasting = [section];
    return [section];
  }
  const sectionResult: CopyObject = {};
  target.spellcasting = [sectionResult];
  return [sectionResult];
}

function appendSpellValues(section: CopyObject, field: string, values: unknown): void {
  const incoming = asObject(values);
  if (field === 'will') {
    const current = Array.isArray(section.will) ? section.will : [];
    section.will = [...current, ...valueList(values)];
    return;
  }
  if (!incoming) return;
  const current = asObject(section[field]) ?? {};
  for (const [level, value] of Object.entries(incoming)) {
    if (field === 'spells') {
      const incomingLevel = asObject(value) ?? {};
      const currentLevel = asObject(current[level]) ?? {};
      const currentSpells = Array.isArray(currentLevel.spells) ? currentLevel.spells : [];
      current[level] = {
        ...currentLevel,
        ...clone(incomingLevel),
        ...(Array.isArray(incomingLevel.spells)
          ? { spells: [...currentSpells, ...incomingLevel.spells.map(clone)] }
          : {}),
      };
    } else {
      const currentSpells = Array.isArray(current[level]) ? current[level] : [];
      current[level] = [...currentSpells, ...valueList(value)];
    }
  }
  section[field] = current;
}

function changeSpellValues(
  section: CopyObject,
  field: string,
  changes: unknown,
  mode: 'replace' | 'remove',
): void {
  const changeMap = asObject(changes);
  if (!changeMap) return;
  const currentMap = asObject(section[field]);
  if (!currentMap) return;
  for (const [level, value] of Object.entries(changeMap)) {
    const current = Array.isArray(currentMap[level])
      ? currentMap[level]
      : asObject(currentMap[level])?.spells;
    if (!Array.isArray(current)) continue;
    if (mode === 'remove') {
      const removals = valueList(value);
      const next = current.filter(
        (spell) => !removals.some((removal) => equalValue(spell, removal)),
      );
      if (asObject(currentMap[level])) {
        (currentMap[level] as CopyObject).spells = next;
      } else {
        currentMap[level] = next;
      }
      continue;
    }
    const replacements = valueList(value)
      .map(asObject)
      .filter((change): change is CopyObject => change !== undefined);
    const next = current.map((spell) => {
      if (typeof spell !== 'string') return spell;
      let result = spell;
      for (const replacement of replacements) {
        if (
          typeof replacement.replace === 'string' &&
          typeof replacement.with === 'string'
        ) {
          result = result.replace(replacement.replace, replacement.with);
        }
      }
      return result;
    });
    if (asObject(currentMap[level])) {
      (currentMap[level] as CopyObject).spells = next;
    } else {
      currentMap[level] = next;
    }
  }
}

function applySpellMod(target: CopyObject, operation: CopyObject): void {
  const mode = operation.mode;
  const sections = spellcastingSections(target);
  if (mode === 'addSpells') {
    for (const field of ['will', 'daily', 'spells']) {
      if (operation[field] !== undefined) {
        for (const section of sections)
          appendSpellValues(section, field, operation[field]);
      }
    }
    return;
  }
  if (mode === 'replaceSpells' || mode === 'removeSpells') {
    const operationMode = mode === 'replaceSpells' ? 'replace' : 'remove';
    for (const field of ['will', 'daily', 'spells']) {
      if (operation[field] !== undefined) {
        for (const section of sections) {
          changeSpellValues(section, field, operation[field], operationMode);
        }
      }
    }
  }
}

function setPath(target: CopyObject, path: string, value: unknown): void {
  const parts = path.split('.').filter(Boolean);
  if (!parts.length) return;
  let current: CopyObject = target;
  for (const part of parts.slice(0, -1)) {
    const next = asObject(current[part]) ?? {};
    current[part] = next;
    current = next;
  }
  current[parts.at(-1)!] = value;
}

function applySpecialMod(target: CopyObject, operation: CopyObject): void {
  if (operation.mode === 'addSkills') {
    applySkillMod(target, operation);
    return;
  }
  if (operation.mode === 'addSpells') {
    applySpellMod(target, operation);
    return;
  }
  if (operation.mode === 'replaceSpells') {
    applySpellMod(target, operation);
    return;
  }
  if (operation.mode === 'removeSpells') {
    applySpellMod(target, operation);
    return;
  }
  if (operation.mode === 'setProp' && typeof operation.prop === 'string') {
    setPath(target, operation.prop, clone(operation.value));
  }
}

function applyMods(target: CopyObject, mods: CopyObject): void {
  for (const [field, rawOperations] of Object.entries(mods)) {
    for (const rawOperation of operationList(rawOperations)) {
      const operation = asObject(rawOperation);
      if (!operation) {
        if (rawOperation === 'remove') delete target[field];
        continue;
      }
      if (operation.mode === 'replaceTxt') {
        applyTextMod(target, field, operation);
      } else if (field === '_') {
        applySpecialMod(target, operation);
      } else {
        applyArrayMod(target, field, operation);
      }
    }
  }
}

export function resolveCopies<T extends object>(
  records: readonly T[],
  getKey: CopyKey = copyKey,
): T[] {
  const sourceRecords = records.map((record) => record as CopyObject);
  const lookup = new Map<string, CopyObject>();
  for (const record of sourceRecords) {
    const key = getKey(record);
    if (!key) continue;
    const current = lookup.get(key);
    if (!current || (copyMetadata(current) && !copyMetadata(record))) {
      lookup.set(key, record);
    }
  }

  const resolving = new Set<CopyObject>();
  const resolve = (record: CopyObject): CopyObject => {
    const metadata = copyMetadata(record);
    if (!metadata) return clone(record);
    if (resolving.has(record)) return withoutCopyMetadata(record);
    resolving.add(record);
    const targetKey = getKey(metadata);
    const baseRecord = targetKey ? lookup.get(targetKey) : undefined;
    const result = baseRecord && baseRecord !== record ? resolve(baseRecord) : {};
    const resolved = clone(result);
    const mods = asObject(metadata._mod);
    if (mods) applyMods(resolved, mods);
    for (const [key, value] of Object.entries(record)) {
      if (key !== '_copy' && key !== '_preserve') resolved[key] = clone(value);
    }
    resolving.delete(record);
    return resolved;
  };

  return sourceRecords.map((record) => resolve(record) as T);
}
