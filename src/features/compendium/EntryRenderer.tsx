import { Fragment, type ReactNode, useState } from 'react';
import type { Entry, EntryNode } from '@/data/compendium/entry';
import { imageUrl, optimizedImageUrl } from '@/data/compendium/images';
import { stripMarkup } from '@/data/transform/util';
import { useRollStore } from '@/features/dice/rollStore';
import { useLightbox } from '@/features/ui/lightboxStore';
import { Link, useLocale } from '@/i18n/path';
import type { Locale } from '@/i18n/locales';
import { translate } from '@/i18n/useT';
import { markupLabel, parseMarkup } from './markup';

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
  const plainTitle = title ? stripMarkup(title) : '';
  return (
    <figure className="my-2 flex flex-col items-center gap-1">
      <img
        src={optimizedImageUrl(src, import.meta.env.VITE_IMAGE_TRANSFORM_ORIGIN)}
        alt={plainTitle}
        loading="lazy"
        onClick={() => open(src, plainTitle)}
        onError={(e) => {
          e.currentTarget.closest('figure')!.style.display = 'none';
        }}
        className="h-auto max-h-[32rem] cursor-zoom-in rounded-lg border border-ink-700 object-contain"
      />
      {title && (
        <figcaption className="text-xs text-ink-400">
          {parseMarkup(title, locale)}
        </figcaption>
      )}
    </figure>
  );
}

interface EntryRendererProps {
  entries: Entry[];
}

export function EntryRenderer({ entries }: EntryRendererProps) {
  const locale = useLocale();
  return <>{entries.map((entry, index) => renderEntry(entry, index, locale))}</>;
}

function renderEntry(entry: Entry, key: number, locale: Locale): ReactNode {
  if (typeof entry === 'string') {
    return (
      <p key={key} className="leading-relaxed text-ink-200">
        {parseMarkup(entry, locale)}
      </p>
    );
  }
  return renderNode(entry, key, locale);
}

function renderNode(node: EntryNode, key: number, locale: Locale): ReactNode {
  switch (node.type) {
    case 'entries':
    case 'section':
      return (
        <div
          key={key}
          className="flex flex-col gap-2"
          {...(typeof node.page === 'number'
            ? { id: `page-${node.page}`, 'data-page': node.page }
            : {})}
          {...(typeof node.name === 'string'
            ? { 'data-entry-name': slug(node.name) }
            : {})}
        >
          {node.name && (
            <h4 className="font-display text-lg font-semibold text-ink-50">
              {parseMarkup(node.name, locale)}
            </h4>
          )}
          {node.entries && <EntryRenderer entries={node.entries} />}
        </div>
      );

    case 'list':
      return (
        <ul key={key} className="ml-5 list-disc space-y-1 text-ink-200">
          {(node.items ?? []).map((item, index) =>
            typeof item !== 'string' && item.type === 'item' ? (
              renderNode(item, index, locale)
            ) : (
              <li key={index}>{renderListItem(item, locale)}</li>
            ),
          )}
        </ul>
      );

    case 'item':
      return (
        <li key={key}>
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
      const src = href?.path ? imageUrl(href.path) : href?.url;
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
      const name = typeof node.name === 'string' ? node.name : '';
      if (!name) return null;
      const category = STATBLOCK_CATEGORY[tag];
      return (
        <p key={key} className="my-1" data-entry-name={slug(name)}>
          {category ? (
            <Link
              to={`/compendium/${category}/${slug(name)}`}
              className="text-arcane-300 underline decoration-dotted underline-offset-2 hover:text-arcane-500"
            >
              {name}
            </Link>
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
        <blockquote
          key={key}
          className="border-l-2 border-arcane-500 pl-4 italic text-ink-200"
        >
          {node.entries && <EntryRenderer entries={node.entries} />}
        </blockquote>
      );

    default:
      if (node.entries) return <EntryRenderer key={key} entries={node.entries} />;
      if (node.entry != null) return renderEntry(node.entry, key, locale);
      return null;
  }
}

function renderListItem(item: Entry, locale: Locale): ReactNode {
  if (typeof item === 'string') return parseMarkup(item, locale);
  return renderNode(item, 0, locale);
}

function diceHeader(label: string | undefined): string | null {
  if (typeof label !== 'string') return null;
  const cleaned = label
    .replace(/\{@\w+\s*([^|}]*)[^}]*\}/g, '$1')
    .trim()
    .replace(/(\d*)[kK](?=\d)/g, '$1d');
  return /^\d*d\d+$/i.test(cleaned) ? cleaned.replace(/^d/, '1d') : null;
}

function rowMatches(cell: Entry, value: number): boolean {
  const text = (typeof cell === 'string' ? cell : '')
    .replace(/\{@\w+\s*([^|}]*)[^}]*\}/g, '$1')
    .trim();
  const range = text.match(/^(\d+)\s*[-\u2013]\s*(\d+)$/);
  if (range) return value >= Number(range[1]) && value <= Number(range[2]);
  return Number(text) === value;
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

  const doRoll = () => {
    const outcome = roll(
      dice!,
      'normal',
      node.caption || translate(locale, 'compendium.detail.tableRoll'),
    );
    setRolled(outcome ? outcome.total : null);
  };

  return (
    <div className="overflow-x-auto">
      {node.caption && (
        <p className="mb-1 font-semibold text-ink-50">
          {parseMarkup(node.caption, locale)}
        </p>
      )}
      <table className="w-full border-collapse text-left text-sm text-ink-200">
        {node.colLabels && (
          <thead>
            <tr className="bg-ink-950/60">
              {node.colLabels.map((label, index) => {
                const content = parseMarkup(label, locale);
                return (
                  <th
                    key={index}
                    className="border-b border-ink-700 px-2 py-1 font-semibold text-ink-50"
                  >
                    {index === 0 && dice && !label.includes('{@') ? (
                      <button
                        type="button"
                        onClick={doRoll}
                        title={translate(locale, 'compendium.detail.rollOnTable', {
                          dice,
                        })}
                        className="cursor-pointer text-arcane-300 underline decoration-dotted underline-offset-2 hover:text-arcane-500"
                      >
                        {content}
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
            const hit = dice && rolled != null && rowMatches(cells[0] ?? '', rolled);
            const zebra = rowIndex % 2 === 1 ? 'bg-ink-800/60' : 'bg-ink-950';
            return (
              <tr key={rowIndex} className={hit ? 'bg-arcane-700/30' : zebra}>
                {cells.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={[
                      'border-b border-ink-800 px-2 py-1',
                      cellIndex === 0 && indentFirst ? 'pl-6' : '',
                    ].join(' ')}
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
