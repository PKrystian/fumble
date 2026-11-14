import { Fragment } from 'react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import markdown from '../../../CHANGELOG.md?raw';
import packageInfo from '../../../package.json';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { parseChangelog, releaseAnchor } from './changelog';
import { REPOSITORY_URL } from './links';

export function ChangelogPage({ source = markdown }: { source?: string }) {
  const { t, locale } = useT();
  const { hash } = useLocation();
  const releases = parseChangelog(source);
  useSeo(t('changelog.title'), t('changelog.description'));
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);
  return (
    <article className="page-shell page-shell-reading">
      <header>
        <h1 className="page-title">{t('changelog.title')}</h1>
        <p className="page-description">{t('changelog.description')}</p>
        <p className="mt-3 text-sm text-ink-400">
          {t('changelog.current', { version: packageInfo.version })}
        </p>
      </header>
      <a
        href={`${REPOSITORY_URL}/blob/main/CHANGELOG.md`}
        className="document-link mt-3"
        target="_blank"
        rel="noreferrer"
      >
        {t('changelog.repository')}
      </a>
      {locale === 'pl' && (
        <p className="mt-3 text-sm text-ink-400">{t('changelog.originalLanguage')}</p>
      )}
      {releases.length > 0 ? (
        <div className="reading-content mt-8 space-y-8">
          {releases.map((release) => (
            <section
              key={release.version}
              aria-labelledby={releaseAnchor(release.version)}
            >
              <h2
                id={releaseAnchor(release.version)}
                className="section-title scroll-mt-4"
              >
                {release.version}
              </h2>
              <time className="text-sm text-ink-400" dateTime={release.date}>
                {new Intl.DateTimeFormat(locale === 'pl' ? 'pl-PL' : 'en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'UTC',
                }).format(new Date(release.date))}
              </time>
              <ul>
                {release.notes.map((note, index) => (
                  <li key={index}>
                    {note.split(/(`[^`]+`)/g).map((part, index) => (
                      <Fragment key={index}>
                        {part.startsWith('`') ? <code>{part.slice(1, -1)}</code> : part}
                      </Fragment>
                    ))}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="empty-state mt-8">{t('changelog.empty')}</p>
      )}
    </article>
  );
}
