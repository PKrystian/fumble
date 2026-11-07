import { StaticShell } from './StaticShell';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { Entry } from '@/data/compendium/entry';
import type { MonsterEntry } from '@/data/compendium/types';
import { MonsterDetail } from '@/features/compendium/details';
import { EntryRenderer } from '@/features/compendium/EntryRenderer';
import { FumbleDetail } from '@/features/homebrew/FumbleDetail';
import { isFumbleHomebrew } from '@/features/homebrew/fumbleHomebrew';
import { StaticReading } from '@/features/ui/staticReading';
import type { ReactNode } from 'react';

export function renderStaticShell(content: string, path: string): string {
  return renderReading(<StaticShell content={content} />, path);
}

function renderReading(content: ReactNode, path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <StaticReading value>{content}</StaticReading>
    </MemoryRouter>,
  );
}

export function renderBookChapter(entry: Entry, path: string): string {
  return renderReading(
    <article className="prerendered-chapter">
      <EntryRenderer entries={[entry]} />
    </article>,
    path,
  );
}

export function renderMonster(monster: MonsterEntry, path: string): string {
  return renderReading(
    isFumbleHomebrew(monster) ? (
      <FumbleDetail item={monster} />
    ) : (
      <MonsterDetail monster={monster} />
    ),
    path,
  );
}
