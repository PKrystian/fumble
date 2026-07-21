import { useEffect } from 'react';
import { Search } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { useSearchStore } from './searchStore';

interface GlobalSearchProps {
  compact?: boolean;
}

export function GlobalSearch({ compact = false }: GlobalSearchProps) {
  const { t } = useT();
  const setOpen = useSearchStore((s) => s.setOpen);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('search.title')}
        title={t('search.title')}
        className="flex items-center justify-center rounded-md border border-ink-700 p-2 text-ink-200 transition-colors hover:border-arcane-500 hover:text-ink-50"
      >
        <Search size={16} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t('search.title')}
      className="flex w-full items-center gap-2 rounded-md border border-ink-700 px-3 py-1.5 text-sm text-ink-400 transition-colors hover:border-arcane-500 hover:text-ink-100"
    >
      <Search size={16} aria-hidden="true" />
      <span className="flex-1 text-left">{t('search.placeholder')}</span>
      <kbd className="rounded border border-ink-600 px-1.5 py-0.5 text-[0.65rem] font-medium text-ink-400">
        {t('search.shortcut')}
      </kbd>
    </button>
  );
}
