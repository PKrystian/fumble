import { ArrowUpRight } from 'lucide-react';
import { navSections } from '@/app/navigation';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';

const sections = navSections.map((section) => ({
  ...section,
  items: section.items.filter((item) => item.to !== '/'),
}));

export function HomePage() {
  const { t } = useT();
  useSeo(t('seo.homeTitle'), t('seo.homeDescription'));
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <header className="mb-12 animate-fade-in-up">
        <h1 className="font-display text-4xl font-black tracking-tight text-ink-50 sm:text-5xl">
          {t('home.heroTitlePrefix')} <span className="text-ember-400">Fumble</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-200 sm:text-lg">
          {t('home.heroSubtitle')}
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {sections.map((section, sectionIndex) => (
          <section
            key={section.titleKey}
            className="animate-fade-in-up"
            style={{ animationDelay: `${(sectionIndex + 1) * 0.08}s` }}
          >
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-400">
              {t(section.titleKey)}
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="group flex items-center gap-3 rounded-lg border border-ink-700 bg-ink-900 p-4 transition-all hover:-translate-y-0.5 hover:border-arcane-500 hover:bg-ink-800"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink-800 text-ink-200 transition-colors group-hover:bg-arcane-700 group-hover:text-white">
                      <item.icon size={20} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 font-medium text-ink-50">
                      {t(item.labelKey)}
                    </span>
                    <ArrowUpRight
                      size={16}
                      aria-hidden="true"
                      className="text-ink-600 transition-colors group-hover:text-arcane-300"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
