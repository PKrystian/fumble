import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { FumbleLibrary } from './FumbleLibrary';

export function FumbleHomebrewPage() {
  const { t } = useT();
  useSeo(t('seo.pageTitles.fumbleHomebrew'), t('seo.pageDescriptions.fumbleHomebrew'));

  return (
    <div className="page-shell page-shell-wide">
      <FumbleLibrary page />
    </div>
  );
}
