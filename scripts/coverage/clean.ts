import { rmSync } from 'node:fs';

rmSync('coverage', { recursive: true, force: true });
