import { ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';

type LegalSection = {
  heading: string;
  body: string;
};

function Page({
  title,
  description,
  updated,
  sections,
}: {
  title: string;
  description: string;
  updated: string;
  sections: LegalSection[];
}) {
  const { t } = useT();
  useSeo(title, description);

  return (
    <article className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
      <Link to="/legal" className="text-sm text-arcane-300 hover:text-arcane-200">
        {t('legal.overview.title')}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-black text-ink-50 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-ink-300">{description}</p>
      <p className="mt-2 text-xs text-ink-500">{updated}</p>
      <div className="mt-10 space-y-9">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-xl font-bold text-ink-100">
              {section.heading}
            </h2>
            <div className="mt-3 space-y-3 leading-7 text-ink-300">
              {section.body.split('\n\n').map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

export function LegalOverviewPage() {
  const { t } = useT();
  useSeo(t('legal.overview.title'), t('legal.overview.description'));

  const pages = [
    ['privacy', '/legal/privacy'],
    ['connections', '/legal/connections'],
    ['terms', '/legal/terms'],
    ['licenses', '/legal/licenses'],
  ] as const;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
      <h1 className="font-display text-3xl font-black text-ink-50 sm:text-4xl">
        {t('legal.overview.title')}
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-ink-300">
        {t('legal.overview.description')}
      </p>
      <p className="mt-2 text-xs text-ink-500">{t('legal.updated')}</p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {pages.map(([key, to]) => (
          <li key={key}>
            <Link
              to={to}
              className="block h-full rounded-lg border border-ink-700 bg-ink-900 p-5 hover:border-arcane-500"
            >
              <h2 className="font-display text-lg font-bold text-ink-50">
                {t(`legal.${key}.title`)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-300">
                {t(`legal.${key}.description`)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PrivacyPage() {
  const { t } = useT();
  return (
    <Page
      title={t('legal.privacy.title')}
      description={t('legal.privacy.description')}
      updated={t('legal.updated')}
      sections={[
        {
          heading: t('legal.privacy.controllerHeading'),
          body: t('legal.privacy.controllerBody'),
        },
        { heading: t('legal.privacy.localHeading'), body: t('legal.privacy.localBody') },
        {
          heading: t('legal.privacy.permissionsHeading'),
          body: t('legal.privacy.permissionsBody'),
        },
        {
          heading: t('legal.privacy.cookiesHeading'),
          body: t('legal.privacy.cookiesBody'),
        },
        {
          heading: t('legal.privacy.retentionHeading'),
          body: t('legal.privacy.retentionBody'),
        },
        {
          heading: t('legal.privacy.rightsHeading'),
          body: t('legal.privacy.rightsBody'),
        },
        {
          heading: t('legal.privacy.childrenHeading'),
          body: t('legal.privacy.childrenBody'),
        },
        {
          heading: t('legal.privacy.changesHeading'),
          body: t('legal.privacy.changesBody'),
        },
        {
          heading: t('legal.privacy.contactHeading'),
          body: t('legal.privacy.contactBody'),
        },
      ]}
    />
  );
}

export function ConnectionsPage() {
  const { t } = useT();
  useSeo(t('legal.connections.title'), t('legal.connections.description'));
  const services = [
    'hosting',
    'fiveTools',
    'huggingFace',
    'youtube',
    'remoteMedia',
  ] as const;

  return (
    <article className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
      <Link to="/legal" className="text-sm text-arcane-300 hover:text-arcane-200">
        {t('legal.overview.title')}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-black text-ink-50 sm:text-4xl">
        {t('legal.connections.title')}
      </h1>
      <p className="mt-3 leading-7 text-ink-300">{t('legal.connections.description')}</p>
      <p className="mt-2 text-xs text-ink-500">{t('legal.updated')}</p>
      <div className="mt-10 space-y-5">
        {services.map((service) => (
          <section
            key={service}
            className="rounded-lg border border-ink-700 bg-ink-900 p-5"
          >
            <h2 className="font-display text-xl font-bold text-ink-50">
              {t(`legal.connections.${service}Title`)}
            </h2>
            <p className="mt-3 leading-7 text-ink-300">
              {t(`legal.connections.${service}Body`)}
            </p>
          </section>
        ))}
      </div>
      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-ink-100">
          {t('legal.connections.controlHeading')}
        </h2>
        <p className="mt-3 leading-7 text-ink-300">
          {t('legal.connections.controlBody')}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <a
            className="inline-flex items-center gap-1 text-arcane-300 hover:text-arcane-200"
            href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
            rel="noreferrer"
            target="_blank"
          >
            {t('legal.connections.githubPolicy')}{' '}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
          <a
            className="inline-flex items-center gap-1 text-arcane-300 hover:text-arcane-200"
            href="https://huggingface.co/privacy"
            rel="noreferrer"
            target="_blank"
          >
            {t('legal.connections.huggingFacePolicy')}{' '}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
          <a
            className="inline-flex items-center gap-1 text-arcane-300 hover:text-arcane-200"
            href="https://policies.google.com/privacy"
            rel="noreferrer"
            target="_blank"
          >
            {t('legal.connections.googlePolicy')}{' '}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      </section>
    </article>
  );
}

export function TermsPage() {
  const { t } = useT();
  return (
    <Page
      title={t('legal.terms.title')}
      description={t('legal.terms.description')}
      updated={t('legal.updated')}
      sections={[
        { heading: t('legal.terms.serviceHeading'), body: t('legal.terms.serviceBody') },
        { heading: t('legal.terms.contentHeading'), body: t('legal.terms.contentBody') },
        { heading: t('legal.terms.userHeading'), body: t('legal.terms.userBody') },
        {
          heading: t('legal.terms.noWarrantyHeading'),
          body: t('legal.terms.noWarrantyBody'),
        },
        {
          heading: t('legal.terms.selfHostHeading'),
          body: t('legal.terms.selfHostBody'),
        },
        { heading: t('legal.terms.contactHeading'), body: t('legal.terms.contactBody') },
      ]}
    />
  );
}

export function LicensesPage() {
  const { t } = useT();
  return (
    <Page
      title={t('legal.licenses.title')}
      description={t('legal.licenses.description')}
      updated={t('legal.updated')}
      sections={[
        { heading: t('legal.licenses.codeHeading'), body: t('legal.licenses.codeBody') },
        { heading: t('legal.licenses.dataHeading'), body: t('legal.licenses.dataBody') },
        {
          heading: t('legal.licenses.trademarksHeading'),
          body: t('legal.licenses.trademarksBody'),
        },
        {
          heading: t('legal.licenses.reportHeading'),
          body: t('legal.licenses.reportBody'),
        },
      ]}
    />
  );
}
