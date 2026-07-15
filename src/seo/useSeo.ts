import { useEffect } from 'react';
import { setDocumentTitle, setMetaDescription } from './head';

const SITE_NAME = 'Fumble';

export function useSeo(title: string, description?: string): void {
  useEffect(() => {
    setDocumentTitle(`${title} - ${SITE_NAME}`);
    if (description) setMetaDescription(description);
  }, [title, description]);
}
