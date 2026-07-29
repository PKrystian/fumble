import { navSections, type NavAccent } from '@/app/navigation';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';

const accentStyles: Record<NavAccent, { heading: string; border: string; icon: string }> =
  {
    arcane: {
      heading: 'text-arcane-300',
      border: 'hover:border-arcane-500',
      icon: 'text-arcane-300',
    },
    teal: {
      heading: 'text-cyan-300',
      border: 'hover:border-cyan-500',
      icon: 'text-cyan-300',
    },
    violet: {
      heading: 'text-violet-300',
      border: 'hover:border-violet-500',
      icon: 'text-violet-300',
    },
    ember: {
      heading: 'text-ember-400',
      border: 'hover:border-ember-500',
      icon: 'text-ember-400',
    },
    slate: {
      heading: 'text-ink-200',
      border: 'hover:border-ink-500',
      icon: 'text-ink-300',
    },
  };

export function HomePage() {
  const { t } = useT();
  useSeo(t('seo.homeTitle'), t('seo.homeDescription'));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <h1 className="sr-only">Fumble</h1>
      <p className="mb-8 text-lg leading-7 text-ink-200 sm:text-xl">
        {t('home.summary')}
      </p>
      <div className="space-y-10">
        {navSections.map((section) => {
          const styles = accentStyles[section.accent];
          return (
            <section key={section.titleKey}>
              <h2 className={`mb-4 font-display text-xl font-bold ${styles.heading}`}>
                {t(section.titleKey)}
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`flex min-h-28 items-center gap-4 rounded-lg border border-ink-700 bg-ink-900 p-4 transition-colors hover:bg-ink-800 ${styles.border}`}
                    >
                      <item.icon
                        size={28}
                        strokeWidth={1.75}
                        aria-hidden="true"
                        className={`shrink-0 ${styles.icon}`}
                      />
                      <span className="font-display font-bold text-ink-50">
                        {t(item.labelKey)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
