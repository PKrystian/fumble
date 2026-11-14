import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const directory = mkdtempSync(join(tmpdir(), 'fumble-wiki-'));
const vault = join(directory, 'vault');
const campaign = join(vault, 'Campaign');
mkdirSync(campaign, { recursive: true });
const cli = resolve('node_modules/tsx/dist/cli.mjs');
const script = resolve('scripts/wiki/build.ts');
const build = () =>
  execFileSync(process.execPath, [cli, script, '--input', vault], {
    cwd: directory,
    env: { ...process.env, WIKI_VAULT: '' },
    encoding: 'utf8',
  });

afterAll(() => {
  if (!directory.startsWith(`${resolve(tmpdir())}${sep}fumble-wiki-`))
    throw new Error('Invalid test directory');
  rmSync(directory, { recursive: true });
});

describe('wiki publication', () => {
  it('publishes only visible referenced assets and stops before changing output on invalid secrets', () => {
    for (const name of ['public.svg', 'secret.svg', 'old.svg'])
      writeFileSync(join(campaign, name), '<svg width="40" height="20"></svg>');
    writeFileSync(
      join(campaign, 'Home.md'),
      '---\ntitle: Start\n---\n![Public](public.svg)\n:::secret\n![[secret.svg]]\n:::',
    );
    writeFileSync(
      join(campaign, 'Private.md'),
      '---\nvisibility: dm\nimage: secret.svg\n---\nPrivate',
    );
    mkdirSync(join(directory, 'public/wiki-assets/campaign'), { recursive: true });
    writeFileSync(join(directory, 'public/wiki-assets/campaign/old.svg'), 'old');
    build();
    const output = join(directory, 'src/data/generated/wiki.json');
    const published = readFileSync(output, 'utf8');
    expect(JSON.parse(published).meta).not.toHaveProperty('source');
    expect(published).not.toContain('secret.svg');
    expect(existsSync(join(directory, 'public/wiki-assets/campaign/public.svg'))).toBe(
      true,
    );
    expect(existsSync(join(directory, 'public/wiki-assets/campaign/secret.svg'))).toBe(
      false,
    );
    expect(existsSync(join(directory, 'public/wiki-assets/campaign/old.svg'))).toBe(
      false,
    );
    expect(build()).toContain('1 reused');
    const cachedPublication = readFileSync(output, 'utf8');
    const unknown = spawnSync(
      process.execPath,
      [cli, script, '--input', vault, '--campaign', 'missing'],
      { cwd: directory, encoding: 'utf8' },
    );
    expect(unknown.status).not.toBe(0);
    expect(unknown.stderr).toContain('Unknown selected campaign');
    expect(readFileSync(output, 'utf8')).toBe(cachedPublication);
    writeFileSync(join(campaign, 'Home.md'), 'Public\n:::secret\nPrivate');
    const failed = spawnSync(process.execPath, [cli, script, '--input', vault], {
      cwd: directory,
      encoding: 'utf8',
    });
    expect(failed.status).not.toBe(0);
    expect(failed.stderr).toContain('Invalid private blocks');
    expect(readFileSync(output, 'utf8')).toBe(cachedPublication);
    expect(readFileSync(join(campaign, 'secret.svg'), 'utf8')).toContain('<svg');
  }, 30000);
});
