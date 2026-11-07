import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, it } from 'vitest';

it('parses every shipped JSON asset, including Polish books and adventures', () => {
  const errors: string[] = [];
  const root = process.cwd();
  for (const directory of ['src/data', 'public']) {
    for (const entry of readdirSync(join(root, directory), {
      recursive: true,
      withFileTypes: true,
    })) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const file = join(entry.parentPath, entry.name);
      try {
        JSON.parse(readFileSync(file, 'utf8'));
      } catch (error) {
        errors.push(`${relative(root, file)}: ${String(error)}`);
      }
    }
  }
  expect(errors).toEqual([]);
});
