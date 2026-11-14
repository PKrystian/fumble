import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { useT } from '@/i18n/useT';

export function DetailContents({ children }: { children: ReactNode }) {
  const { t } = useT();
  const prefix = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);
  useEffect(() => {
    const content = contentRef.current!;
    let nextId = 0;
    const collect = () => {
      const next = [
        ...content.querySelectorAll<HTMLElement>('h2, h3, [data-table-caption]'),
      ]
        .map((heading) => {
          if (!heading.id) heading.id = `${prefix}-section-${nextId++}`;
          heading.tabIndex = -1;
          return { id: heading.id, text: heading.textContent?.trim() ?? '' };
        })
        .filter((heading) => heading.text);
      setHeadings((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    };
    collect();
    const observer = new MutationObserver(collect);
    observer.observe(content, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [prefix]);
  return (
    <>
      {headings.length >= 6 && (
        <details className="mb-4 rounded-lg border border-ink-700 bg-ink-950 p-3">
          <summary className="cursor-pointer font-semibold text-ink-200">
            {t('compendium.catalog.contents')}
          </summary>
          <nav
            aria-label={t('compendium.catalog.contents')}
            className="mt-3 max-h-64 overflow-y-auto"
          >
            <ul className="flex flex-col gap-2">
              {headings.map((heading) => (
                <li key={heading.id}>
                  <a
                    className="text-sm text-arcane-300 underline"
                    href={`#${heading.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      const target = document.getElementById(heading.id)!;
                      target.scrollIntoView({ block: 'start' });
                      target.focus({ preventScroll: true });
                    }}
                  >
                    {heading.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      )}
      <div ref={contentRef}>{children}</div>
    </>
  );
}
