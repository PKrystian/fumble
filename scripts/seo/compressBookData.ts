import {
  existsSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const DATA_DIR = join(ROOT, 'dist', 'data');

function compressDirectory(directory: string): number {
  let count = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      count += compressDirectory(path);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    writeFileSync(`${path}.gz`, gzipSync(readFileSync(path), { level: 9 }));
    unlinkSync(path);
    count += 1;
  }
  return count;
}

if (!existsSync(DATA_DIR)) throw new Error(`Missing Pages data directory: ${DATA_DIR}`);

console.log(`Compressed ${compressDirectory(DATA_DIR)} book data files for Pages.`);
