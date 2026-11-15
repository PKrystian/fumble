import { Fragment } from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { LEGAL_LINKS } from './links';

export function LegalReference({
  reference,
  action = false,
}: {
  reference: string;
  action?: boolean;
}) {
  const { t } = useT();
  const target = LEGAL_LINKS[reference]!;
  const className = action
    ? 'document-link'
    : 'text-arcane-300 underline underline-offset-4 hover:text-arcane-200';
  return target.to.startsWith('/') ? (
    <Link to={target.to} className={className}>
      {t(target.label)}
    </Link>
  ) : (
    <a href={target.to} className={className} rel="noreferrer" target="_blank">
      {t(target.label)}
      <ExternalLink size={14} aria-hidden="true" className="ml-1 inline" />
    </a>
  );
}

export function LegalText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[\[[a-zA-Z]+\]\])/g).map((part, index) => {
        const reference = /^\[\[([a-zA-Z]+)\]\]$/.exec(part)?.[1];
        return (
          <Fragment key={index}>
            {reference && LEGAL_LINKS[reference] ? (
              <LegalReference reference={reference} />
            ) : (
              part
            )}
          </Fragment>
        );
      })}
    </>
  );
}
