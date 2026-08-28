import { Fragment, type ReactNode } from 'react';
import { slugify } from '@/data/transform/util';
import { Link } from '@/i18n/path';
import { useLocale } from '@/i18n/pathUtils';
import { CLASS_REFERENCE_NAMES, classIdForName } from './classNames';
import { parseMarkup } from './markup';

const CLASS_NAMES = CLASS_REFERENCE_NAMES.map(escapeRegExp);

const CLASS_REFERENCE_PATTERN = new RegExp(
  `(?:^|[^\\p{L}])(${CLASS_NAMES.join('|')})(?![\\p{L}])`,
  'giu',
);

const LINK_CLASS =
  'text-arcane-300 underline decoration-dotted underline-offset-2 hover:text-arcane-500';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function classRouteId(name: string): string | undefined {
  return classIdForName(name);
}

function classHref(name: string, referenceName?: string): string | undefined {
  const id = classRouteId(referenceName ?? name) ?? classRouteId(name);
  return id ? `/compendium/classes/${id}` : undefined;
}

function classTextNodes(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastEnd = 0;
  let index = 0;
  for (const match of text.matchAll(CLASS_REFERENCE_PATTERN)) {
    const full = match[0]!;
    const alias = match[1]!;
    const matchStart = match.index ?? 0;
    const aliasStart = matchStart + full.length - alias.length;
    if (aliasStart > lastEnd) nodes.push(text.slice(lastEnd, aliasStart));
    const id = classRouteId(alias);
    if (!id) {
      nodes.push(alias);
    } else {
      nodes.push(
        <Link
          key={`class-${index}`}
          to={`/compendium/classes/${id}`}
          className={LINK_CLASS}
        >
          {alias}
        </Link>,
      );
    }
    index += 1;
    lastEnd = aliasStart + alias.length;
  }
  if (lastEnd < text.length) nodes.push(text.slice(lastEnd));
  return nodes;
}

function textNodes(text: string, locale: ReturnType<typeof useLocale>): ReactNode[] {
  return text
    .split(/(\{[@#][^{}]+\})/g)
    .map((part, index) => (
      <Fragment key={`part-${index}`}>
        {part.startsWith('{@') || part.startsWith('{#')
          ? parseMarkup(part, locale)
          : classTextNodes(part)}
      </Fragment>
    ));
}

export function ClassReferenceText({ text }: { text: string }) {
  const locale = useLocale();
  return <>{textNodes(text, locale)}</>;
}

export function ClassReferenceList({
  values,
  referenceValues,
}: {
  values: string[];
  referenceValues?: string[];
}) {
  return (
    <>
      {values.map((value, index) => {
        const href = classHref(value, referenceValues?.[index]);
        return (
          <Fragment key={`${value}-${index}`}>
            {index > 0 && ', '}
            {href ? (
              <Link to={href} className={LINK_CLASS}>
                {value}
              </Link>
            ) : (
              <ClassReferenceText text={value} />
            )}
          </Fragment>
        );
      })}
    </>
  );
}

function splitSubclass(value: string): { className: string; subclassName: string } {
  const separator = value.indexOf(':');
  if (separator < 0) return { className: '', subclassName: value.trim() };
  return {
    className: value.slice(0, separator).trim(),
    subclassName: value.slice(separator + 1).trim(),
  };
}

function subclassHref(
  value: string,
  referenceValue: string | undefined,
): string | undefined {
  const local = splitSubclass(value);
  const reference = splitSubclass(referenceValue ?? value);
  const classId = classRouteId(reference.className) ?? classRouteId(local.className);
  if (!classId) return undefined;
  if (!reference.subclassName && !local.subclassName)
    return `/compendium/classes/${classId}`;
  return `/compendium/classes/${classId}/${slugify(reference.subclassName || local.subclassName)}`;
}

export function SubclassReferenceList({
  values,
  referenceValues,
}: {
  values: string[];
  referenceValues?: string[];
}) {
  return (
    <>
      {values.map((value, index) => {
        const href = subclassHref(value, referenceValues?.[index]);
        return (
          <Fragment key={`${value}-${index}`}>
            {index > 0 && ', '}
            {href ? (
              <Link to={href} className={LINK_CLASS}>
                {value}
              </Link>
            ) : (
              <ClassReferenceText text={value} />
            )}
          </Fragment>
        );
      })}
    </>
  );
}
