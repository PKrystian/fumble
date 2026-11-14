import { useEffect, useState } from 'react';
import {
  BookOpen,
  Calculator,
  Mic,
  ScrollText,
  Swords,
  type LucideIcon,
} from 'lucide-react';
import {
  compendiumNavItem,
  navAccentText,
  navSections,
  type NavItem,
} from '@/app/navigation';
import { GlobalSearch } from '@/features/search/GlobalSearch';
import { buttonClass } from '@/features/ui/styles';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { BackupReminder } from './BackupReminder';
import { loadBookTitle } from './bookTitle';
import { readLocalActivity, recentBookPath, type RecentItem } from './recentActivity';

type BookItem = Extract<RecentItem, { kind: 'book' }>;

interface ContinueCard {
  key: string;
  to: string;
  icon: LucideIcon;
  title: string;
  text: string;
}

function useLocalActivity() {
  const [activity, setActivity] = useState(() => readLocalActivity());
  useEffect(() => {
    const refresh = () => setActivity(readLocalActivity());
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  return activity;
}

function useBookTitle(book: BookItem | undefined) {
  const { locale } = useT();
  const id = book?.id;
  const chapter = book?.chapter;
  const [title, setTitle] = useState<{ id: string; name: string | null }>();
  useEffect(() => {
    if (id === undefined || chapter === undefined) return;
    let cancelled = false;
    void loadBookTitle(id, chapter, locale)
      .catch(() => null)
      .then((name) => {
        if (!cancelled) setTitle({ id, name });
      });
    return () => {
      cancelled = true;
    };
  }, [id, chapter, locale]);
  return title && title.id === id ? title.name : undefined;
}

export function HomePage() {
  const { t } = useT();
  useSeo(t('seo.homeTitle'), t('seo.homeDescription'));
  const { items, hasData, dataSince } = useLocalActivity();
  const bookTitle = useBookTitle(
    items.find((item): item is BookItem => item.kind === 'book'),
  );

  const cards = items.flatMap((item): ContinueCard[] => {
    if (item.kind === 'character')
      return [
        {
          key: `character-${item.id}`,
          to: `/character/${item.id}`,
          icon: ScrollText,
          title: item.name || t('character.unnamed'),
          text: t('home.continue.character', { level: item.level }),
        },
      ];
    if (item.kind === 'book')
      return bookTitle === null
        ? []
        : [
            {
              key: 'book',
              to: recentBookPath(item),
              icon: BookOpen,
              title: bookTitle ?? t('nav.books'),
              text: t('home.continue.book'),
            },
          ];
    if (item.kind === 'session')
      return [
        {
          key: 'session',
          to: '/session-log',
          icon: Mic,
          title: item.title || t('home.continue.untitledSession'),
          text: t('home.continue.session'),
        },
      ];
    if (item.kind === 'initiative')
      return [
        {
          key: 'initiative',
          to: '/dm/initiative',
          icon: Swords,
          title: t('nav.initiative'),
          text: t(
            item.round > 0
              ? 'home.continue.initiativeRound'
              : 'home.continue.initiativeIdle',
            { round: item.round, count: item.count },
          ),
        },
      ];
    return [
      {
        key: 'encounter',
        to: '/dm/encounter',
        icon: Calculator,
        title: item.name || t('home.continue.encounterDraft'),
        text: t('home.continue.encounter', { count: item.count }),
      },
    ];
  });

  const sectionItems = (titleKey: string, links: NavItem[]) =>
    titleKey === 'nav.sectionRules' ? [compendiumNavItem, ...links] : links;

  return (
    <div className="page-shell page-shell-wide">
      <h1 className="page-title">Fumble</h1>
      <p className="page-description">{t('home.summary')}</p>
      <div className="mt-4 mb-8 max-w-xl">
        <GlobalSearch placeholder={t('home.searchPlaceholder')} />
      </div>
      <div className="space-y-10">
        {cards.length > 0 ? (
          <section aria-labelledby="home-continue">
            <h2 id="home-continue" className="section-title mb-4">
              {t('home.continue.title')}
            </h2>
            <ul className="grid grid-cols-1 gap-2 min-[380px]:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <li key={card.key} className="min-w-0">
                  <Link to={card.to} className="nav-card">
                    <card.icon
                      size={24}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className="shrink-0 text-arcane-300"
                    />
                    <span className="min-w-0">
                      <span className="nav-card-title">{card.title}</span>{' '}
                      <span className="nav-card-text">{card.text}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section aria-labelledby="home-start">
            <h2 id="home-start" className="section-title mb-2">
              {t('home.start.title')}
            </h2>
            <p className="mb-4 text-sm leading-6 text-ink-300">{t('home.start.text')}</p>
            <div className="flex flex-col gap-2 min-[380px]:flex-row min-[380px]:flex-wrap">
              <Link to="/character" className={buttonClass({ variant: 'primary' })}>
                {t('home.start.character')}
              </Link>
              <Link to="/compendium" className={buttonClass()}>
                {t('home.start.compendium')}
              </Link>
              <Link to="/dice" className={buttonClass()}>
                {t('home.start.dice')}
              </Link>
            </div>
          </section>
        )}
        {navSections.map((section, index) => (
          <section key={section.titleKey} aria-labelledby={`home-section-${index}`}>
            <h2
              id={`home-section-${index}`}
              className={`section-title mb-4 ${navAccentText[section.accent]}`}
            >
              {t(section.titleKey)}
            </h2>
            <ul className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 min-[380px]:gap-4 lg:grid-cols-3">
              {sectionItems(section.titleKey, section.items).map((item) => (
                <li key={item.to} className="min-w-0">
                  <Link to={item.to} className="nav-card lg:items-start">
                    <item.icon
                      size={24}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className={`shrink-0 ${navAccentText[section.accent]}`}
                    />
                    <span className="min-w-0">
                      <span className="nav-card-title">{t(item.labelKey)}</span>{' '}
                      <span className="nav-card-text hidden lg:block">
                        {t(item.descriptionKey)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <BackupReminder hasData={hasData} dataSince={dataSince} />
    </div>
  );
}
