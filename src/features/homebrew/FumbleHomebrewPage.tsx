import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { FumbleLibrary } from './FumbleLibrary';

export function FumbleHomebrewPage() {
  const { t } = useT();
  useSeo(t('seo.pageTitles.fumbleHomebrew'), t('seo.pageDescriptions.fumbleHomebrew'));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <FumbleLibrary page />
    </div>
  );
}
