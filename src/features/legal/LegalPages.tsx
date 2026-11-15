import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { LEGAL_DATES, LEGAL_PAGES, legalPath, type LegalPageId } from './links';
import { LegalText, LegalReference } from './LegalText';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';

type LegalSection = {
  heading: string;
  body: string;
};

function LegalDocument({
  title,
  description,
  children,
  page,
  overview = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  page: LegalPageId;
  overview?: boolean;
}) {
  const { t, locale } = useT();
  const updated = LEGAL_DATES[page];
  const date = new Intl.DateTimeFormat(locale === 'pl' ? 'pl-PL' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(updated));
  useSeo(title, description);
  return (
    <article className="page-shell page-shell-reading">
      {!overview && (
        <Link to="/legal" className="back-link">
          {t('legal.overview.title')}
        </Link>
      )}
      <header>
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
        <p className="mt-2 text-xs text-ink-400">
          {t('legal.updatedLabel')} <time dateTime={updated}>{date}</time>
        </p>
      </header>
      <div className="reading-content mt-8 space-y-8">{children}</div>
    </article>
  );
}

function Page({
  title,
  description,
  page,
  sections,
}: {
  title: string;
  description: string;
  page: LegalPageId;
  sections: LegalSection[];
}) {
  return (
    <LegalDocument title={title} description={description} page={page}>
      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-ink-100 section-title">{section.heading}</h2>
            <div className="mt-3 space-y-3 leading-7 text-ink-300">
              {section.body.split('\n\n').map((paragraph) => (
                <p key={paragraph}>
                  <LegalText text={paragraph} />
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </LegalDocument>
  );
}

export function LegalOverviewPage() {
  const { t } = useT();

  const pages = LEGAL_PAGES.filter((page) => page !== 'overview');

  return (
    <LegalDocument
      title={t('legal.overview.title')}
      description={t('legal.overview.description')}
      page="overview"
      overview
    >
      <p>{t('legal.overview.summary')}</p>
      <ul className="space-y-4">
        {pages.map((key) => (
          <li key={key}>
            <Link to={legalPath(key)} className="catalog-card">
              <h2 className="section-title">{t(`legal.${key}.title`)}</h2>
              <p className="mt-2 leading-7 text-ink-300">
                {t(`legal.${key}.description`)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </LegalDocument>
  );
}

export function PrivacyPage() {
  const { t } = useT();
  return (
    <Page
      title={t('legal.privacy.title')}
      description={t('legal.privacy.description')}
      page="privacy"
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
  const services = [
    'hosting',
    'fiveTools',
    'browserSpeech',
    'huggingFace',
    'youtube',
    'remoteMedia',
  ] as const;

  return (
    <LegalDocument
      title={t('legal.connections.title')}
      description={t('legal.connections.description')}
      page="connections"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {services.map((service) => (
          <section
            key={service}
            className="rounded-xl border border-ink-700 bg-ink-900 p-4"
          >
            <h2 className="section-title text-ink-100">
              {t('legal.connections.' + service + 'Title')}
            </h2>
            <dl className="mt-3 space-y-3">
              {['trigger', 'recipient', 'data', 'control'].map((field) => (
                <div key={field}>
                  <dt className="field-label">
                    {t('legal.connections.fields.' + field)}
                  </dt>
                  <dd className="mt-1 text-sm leading-6 text-ink-300">
                    {t('legal.connections.details.' + service + '.' + field)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <section className="mt-10">
        <h2 className="text-ink-100 section-title">
          {t('legal.connections.controlHeading')}
        </h2>
        <p className="mt-3 leading-7 text-ink-300">
          {t('legal.connections.controlBody')}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <a
            className="document-link"
            href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
            rel="noreferrer"
            target="_blank"
          >
            {t('legal.connections.githubPolicy')}{' '}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
          <a
            className="document-link"
            href="https://huggingface.co/privacy"
            rel="noreferrer"
            target="_blank"
          >
            {t('legal.connections.huggingFacePolicy')}{' '}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
          <a
            className="document-link"
            href="https://policies.google.com/privacy"
            rel="noreferrer"
            target="_blank"
          >
            {t('legal.connections.googlePolicy')}{' '}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      </section>
    </LegalDocument>
  );
}

export function TermsPage() {
  const { t } = useT();
  return (
    <Page
      title={t('legal.terms.title')}
      description={t('legal.terms.description')}
      page="terms"
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
      page="licenses"
      sections={[
        { heading: t('legal.licenses.codeHeading'), body: t('legal.licenses.codeBody') },
        { heading: t('legal.licenses.dataHeading'), body: t('legal.licenses.dataBody') },
        { heading: t('legal.licenses.srdHeading'), body: t('legal.licenses.srdBody') },
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

export function AccessibilityPage() {
  const { t } = useT();
  return (
    <Page
      title={t('legal.accessibility.title')}
      description={t('legal.accessibility.description')}
      page="accessibility"
      sections={[
        {
          heading: t('legal.accessibility.commitmentHeading'),
          body: t('legal.accessibility.commitmentBody'),
        },
        {
          heading: t('legal.accessibility.limitsHeading'),
          body: t('legal.accessibility.limitsBody'),
        },
        {
          heading: t('legal.accessibility.reportHeading'),
          body: t('legal.accessibility.reportBody'),
        },
      ]}
    />
  );
}

export function ContactPage() {
  const { t } = useT();
  return (
    <LegalDocument
      title={t('legal.contact.title')}
      description={t('legal.contact.description')}
      page="contact"
    >
      <section>
        <h2 className="text-ink-100 section-title">{t('legal.contact.ownerHeading')}</h2>
        <p className="mt-3 leading-7 text-ink-300">{t('legal.contact.ownerBody')}</p>
        <p className="mt-3 text-sm text-ink-400">{t('legal.contact.githubSignIn')}</p>
        <ul className="mt-5 space-y-2">
          {['bug', 'accessibility', 'content', 'security', 'profile', 'repository'].map(
            (reference) => (
              <li key={reference}>
                <LegalReference reference={reference} action />
              </li>
            ),
          )}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="text-ink-100 section-title">{t('legal.contact.safetyHeading')}</h2>
        <p className="mt-3 leading-7 text-ink-300">
          <LegalText text={t('legal.contact.safetyBody')} />
        </p>
      </section>
    </LegalDocument>
  );
}
