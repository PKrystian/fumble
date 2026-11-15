import { Fragment, type ReactNode, useContext, useId, useState } from 'react';
import type { Entry, EntryNode } from '@/data/compendium/entry';
import { imageUrl } from '@/data/compendium/images';
import { stripMarkup } from '@/data/transform/util';
import { useRollStore } from '@/features/dice/rollStore';
import { useLightbox } from '@/features/ui/lightboxStore';
import { StaticReading } from '@/features/ui/staticReading';
import { useLocale } from '@/i18n/pathUtils';
import type { Locale } from '@/i18n/locales';
import { translate } from '@/i18n/useT';
import { localizePlainText, markupLabel, parseMarkup } from './markup';
import { ReferenceLink } from './ReferenceLink';
import { bookAnchorName, bookEntryReference } from '@/features/books/readerAnchor';
import { EntryLanguage } from './entryLanguage';
import { PrivateArtwork } from '@/features/homebrew/artworkPolicy';
import { HomebrewArtwork } from '@/features/homebrew/HomebrewImage';

const STATBLOCK_CATEGORY: Record<string, string> = {
  creature: 'bestiary',
  item: 'items',
  spell: 'spells',
  object: 'objects',
  vehicle: 'vehicles',
  deity: 'deities',
  race: 'species',
  trap: 'hazards',
  hazard: 'hazards',
  variantrule: 'rules',
  condition: 'conditions',
  status: 'conditions',
  disease: 'conditions',
  sense: 'senses',
  skill: 'skills',
  action: 'actions',
  optfeature: 'optionalfeatures',
  feat: 'feats',
  background: 'backgrounds',
  class: 'classes',
  language: 'languages',
  reward: 'boons',
};

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function BookImage({ src, title }: { src: string; title?: string }) {
  const open = useLightbox((s) => s.open);
  const locale = useLocale();
  const plainTitle = title ? localizePlainText(stripMarkup(title), locale) : '';
  const privateArt = useContext(PrivateArtwork);
  const render = (url: string) => (
    <figure className="my-2 flex flex-col items-center gap-1">
      <a
        href={url}
        className="artwork-trigger"
        aria-label={plainTitle || translate(locale, 'common.imageViewer')}
        onClick={(event) => {
          event.preventDefault();
          open(url, plainTitle);
        }}
      >
        <img
          src={url}
          referrerPolicy={privateArt ? 'no-referrer' : undefined}
          alt={plainTitle}
          loading="lazy"

          onError={(e) => {
            e.currentTarget.closest('figure')!.style.display = 'none';
          }}
          className="h-auto max-h-[32rem] cursor-zoom-in rounded-lg border border-ink-700 object-contain"
        />
      </a>
      {title && (
        <figcaption className="text-xs text-ink-400">
          {parseMarkup(title, locale)}
        </figcaption>
      )}
    </figure>
  );
  return privateArt ? (
    <HomebrewArtwork src={src}>{render}</HomebrewArtwork>
  ) : (
    render(imageUrl(src))
  );
}

interface EntryRendererProps {
  entries: Entry[];
  headingLevel?: number;
}

export function EntryRenderer({ entries, headingLevel = 2 }: EntryRendererProps) {
  const routeLocale = useLocale();
  const locale = useContext(EntryLanguage) ?? routeLocale;
  return (
    <>{entries.map((entry, index) => renderEntry(entry, index, locale, headingLevel))}</>
  );
}

function renderEntry(
  entry: Entry,
  key: number,
  locale: Locale,
  headingLevel = 2,
): ReactNode {
  if (typeof entry === 'string') {
    return (
      <p key={key} className="leading-7 text-ink-200">
        {parseMarkup(entry, locale)}
      </p>
    );
  }
  return renderNode(entry, key, locale, headingLevel);
}

function renderNode(
  node: EntryNode,
  key: number,
  locale: Locale,
  headingLevel = 2,
): ReactNode {
  switch (node.type) {
    case 'tableGroup':
      return renderNode(
        {
          ...node,
          type: 'section',
          entries: Array.isArray(node.tables) ? (node.tables as Entry[]) : [],
        },
        key,
        locale,
        headingLevel,
      );

    case 'flowchart':
      return renderNode(
        {
          ...node,
          type: 'section',
          entries: Array.isArray(node.blocks) ? (node.blocks as Entry[]) : [],
        },
        key,
        locale,
        headingLevel,
      );

    case 'hr':
      return <hr key={key} />;

    case 'abilityGeneric':
      return typeof node.text === 'string' ? renderEntry(node.text, key, locale) : null;

    case 'cell':
      return renderListItem(node.entry ?? cellRollText(node), locale);

    case 'entries':
    case 'section':
    case 'flowBlock':
      return (
        <EntrySection key={key} node={node} headingLevel={headingLevel} locale={locale} />
      );

    case 'list':
      return (
        <ul key={key} className="ml-5 list-disc space-y-1 text-ink-200">
          {(node.items ?? []).map((item, index) =>
            typeof item !== 'string' && item.type === 'item' ? (
              renderNode(item, index, locale)
            ) : (
              <ListEntry key={index} item={item} locale={locale} />
            ),
          )}
        </ul>
      );

    case 'item':
      return (
        <li key={key} {...bookEntryAttributes(node)}>
          {node.name && (
            <span className="font-semibold text-ink-50">
              {parseMarkup(node.name, locale)}.{' '}
            </span>
          )}
          {renderListItem(node.entry ?? '', locale)}
          {node.entries && <EntryRenderer entries={node.entries} />}
        </li>
      );

    case 'attack': {
      const attackEntries = (node.attackEntries as Entry[] | undefined) ?? [];
      const hitEntries = (node.hitEntries as Entry[] | undefined) ?? [];
      return (
        <p key={key} className="leading-relaxed text-ink-200">
          {attackEntries.map((e, index) => (
            <Fragment key={`a${index}`}>
              {index > 0 ? ' ' : ''}
              {renderListItem(e, locale)}
            </Fragment>
          ))}
          {hitEntries.length > 0 && (
            <>
              {' '}
              <em className="text-ink-300">{markupLabel(locale, 'hit')}</em>{' '}
            </>
          )}
          {hitEntries.map((e, index) => (
            <Fragment key={`h${index}`}>
              {index > 0 ? ' ' : ''}
              {renderListItem(e, locale)}
            </Fragment>
          ))}
        </p>
      );
    }

    case 'image': {
      const href = node.href as
        { type?: string; path?: string; url?: string } | undefined;
      const src = href?.path ?? href?.url;
      if (!src) return null;
      const title = typeof node.title === 'string' ? node.title : undefined;
      return <BookImage key={key} src={src} {...(title ? { title } : {})} />;
    }

    case 'gallery': {
      const images = (node.images as EntryNode[] | undefined) ?? [];
      return (
        <div key={key} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {images.map((img, index) => renderNode(img, index, locale))}
        </div>
      );
    }

    case 'statblock': {
      const tag = typeof node.tag === 'string' ? node.tag : '';
      const rawName = typeof node.name === 'string' ? node.name : '';
      if (!rawName) return null;
      const name = localizePlainText(rawName, locale);
      const category = STATBLOCK_CATEGORY[tag];
      return (
        <p
          key={key}
          className="my-1"
          data-entry-name={slug(rawName)}
          {...bookEntryAttributes(node)}
        >
          {category ? (
            <ReferenceLink
              category={category}
              slug={slug(rawName)}
              label={name}
              {...(typeof node.source === 'string' ? { source: node.source } : {})}
            />
          ) : (
            <span className="font-semibold text-ink-50">{name}</span>
          )}{' '}
          <span className="text-xs text-ink-400">{markupLabel(locale, 'statBlock')}</span>
        </p>
      );
    }

    case 'table':
      return <RollableTable key={key} node={node} />;

    case 'inset':
    case 'insetReadaloud':
      return (
        <aside
          key={key}
          {...bookEntryAttributes(node)}
          className="rounded-lg border border-ink-700 bg-ink-800/60 p-4 text-ink-200"
        >
          {node.name && (
            <p className="mb-2 font-display font-semibold text-ink-50">
              {parseMarkup(node.name, locale)}
            </p>
          )}
          {node.entries && <EntryRenderer entries={node.entries} />}
        </aside>
      );

    case 'quote':
      return (
        <blockquote key={key} className="quote-block">
          {node.entries && <EntryRenderer entries={node.entries} />}
        </blockquote>
      );

    default:
      if (node.entries) return <EntryRenderer key={key} entries={node.entries} />;
      if (node.entry != null) return renderEntry(node.entry, key, locale);
      return null;
  }
}

function ListEntry({ item, locale }: { item: Entry; locale: Locale }) {
  const reference = bookEntryReference(item);
  return (
    <li data-entry-reference={reference ? bookAnchorName(reference) : undefined}>
      {renderListItem(item, locale)}
    </li>
  );
}

function bookEntryAttributes(node: EntryNode) {
  return {
    'data-entry-id': typeof node.id === 'string' ? node.id : undefined,
    'data-page': typeof node.page === 'number' ? node.page : undefined,
  };
}

function renderListItem(item: Entry, locale: Locale): ReactNode {
  if (typeof item === 'string') return parseMarkup(item, locale);
  return renderNode(item, 0, locale);
}

function EntrySection({
  node,
  headingLevel,
  locale,
}: {
  node: EntryNode;
  headingLevel: number;
  locale: Locale;
}) {
  const id = useId();
  const Heading = `h${Math.min(6, headingLevel)}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return (
    <div
      className="flex flex-col gap-2"
      {...bookEntryAttributes(node)}
      {...(typeof node.page === 'number' ? { id: `page-${node.page}-${id}` } : {})}
      {...(typeof node.name === 'string' ? { 'data-entry-name': slug(node.name) } : {})}
    >
      {node.name && (
        <Heading className="entry-heading font-display font-bold text-ink-50">
          {parseMarkup(node.name, locale)}
        </Heading>
      )}
      {node.entries && (
        <EntryRenderer entries={node.entries} headingLevel={headingLevel + 1} />
      )}
    </div>
  );
}

function diceHeader(label: string | undefined): string | null {
  if (typeof label !== 'string') return null;
  const cleaned = label
    .replace(/\{[@#](?:itemEntry|item|[^\s}]+)\s*([^|}]*)[^}]*\}/g, '$1')
    .trim()
    .replace(/(\d*)[kK](?=\d)/g, '$1d');
  return /^\d*d\d+$/i.test(cleaned) ? cleaned.replace(/^d/, '1d') : null;
}

function cellRollText(cell: EntryNode): string {
  const roll = cell.roll as { exact?: number; min?: number; max?: number } | undefined;
  if (typeof roll?.exact === 'number')
    return roll.exact === 0 ? '00' : String(roll.exact);
  return typeof roll?.min === 'number' && typeof roll.max === 'number'
    ? `${roll.min === 0 ? '00' : roll.min}-${roll.max === 0 ? '00' : roll.max}`
    : '';
}

function rowMatches(cell: Entry, value: number, percentile: boolean): boolean {
  const text = (
    typeof cell === 'string'
      ? cell
      : typeof cell.entry === 'string'
        ? cell.entry
        : cellRollText(cell)
  )
    .replace(/\{[@#](?:itemEntry|item|[^\s}]+)\s*([^|}]*)[^}]*\}/g, '$1')
    .trim();
  const range = text.match(/^(\d+)\s*[-\u2013]\s*(\d+)$/);
  const number = (text: string) =>
    percentile && Number(text) === 0 ? 100 : Number(text);
  if (range) return value >= number(range[1]!) && value <= number(range[2]!);
  return /^\d+$/.test(text) && number(text) === value;
}

function rowCells(row: Entry[] | EntryNode): { cells: Entry[]; indentFirst: boolean } {
  if (Array.isArray(row)) return { cells: row, indentFirst: false };
  return {
    cells: Array.isArray(row.row) ? (row.row as Entry[]) : [],
    indentFirst: row.style === 'row-indent-first',
  };
}

function RollableTable({ node }: { node: EntryNode }) {
  const roll = useRollStore((s) => s.roll);
  const locale = useLocale();
  const [rolled, setRolled] = useState<number | null>(null);
  const rows = node.rows ?? [];
  const dice = diceHeader(node.colLabels?.[0]);
  const staticReading = useContext(StaticReading);
  const captionId = useId();

  const doRoll = () => {
    const outcome = roll(
      dice!,
      'normal',
      node.caption || translate(locale, 'compendium.detail.tableRoll'),
    );
    setRolled(outcome ? outcome.total : null);
  };

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={translate(locale, 'common.tableScroll')}
      className="table-scroll"
    >
      {node.caption && (
        <p id={captionId} data-table-caption className="mb-1 font-semibold text-ink-50">
          {parseMarkup(node.caption, locale)}
        </p>
      )}
      {!staticReading && dice && (
        <p role="status" aria-atomic="true" className="mb-2 text-sm text-arcane-300">
          {rolled !== null &&
            translate(locale, 'compendium.catalog.tableResult', { result: rolled })}
        </p>
      )}
      <table
        className="data-table"
        {...(node.caption ? { 'aria-labelledby': captionId } : {})}
      >
        {node.colLabels && (
          <thead>
            <tr className="bg-ink-950/60">
              {node.colLabels.map((label, index) => {
                const content = parseMarkup(label, locale);
                return (
                  <th scope="col" key={index} className="font-semibold">
                    {!staticReading && index === 0 && dice ? (
                      <button
                        type="button"
                        onClick={doRoll}
                        title={translate(locale, 'compendium.detail.rollOnTable', {
                          dice,
                        })}
                        className="cursor-pointer text-arcane-300 underline decoration-dotted underline-offset-2 hover:text-arcane-500"
                      >
                        {localizePlainText(dice, locale).replace(/^1(?=[dk])/i, '')}
                      </button>
                    ) : (
                      content
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((rawRow, rowIndex) => {
            const { cells, indentFirst } = rowCells(rawRow);
            const hit =
              dice &&
              rolled != null &&
              rowMatches(cells[0] ?? '', rolled, /d100$/i.test(dice));
            const zebra = rowIndex % 2 === 1 ? 'bg-ink-800/60' : 'bg-ink-950';
            return (
              <tr key={rowIndex} className={hit ? 'bg-arcane-700/30' : zebra}>
                {cells.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={['', cellIndex === 0 && indentFirst ? 'pl-6' : ''].join(
                      ' ',
                    )}
                  >
                    {renderListItem(cell, locale)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
