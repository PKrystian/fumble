import { useEffect, useState } from 'react';
import type { WikiData } from './types';

interface WikiState {
  status: 'loading' | 'ready' | 'error';
  data: WikiData | null;
}

export function useWiki(retryKey = 0): WikiState {
  const [state, setState] = useState<WikiState>({ status: 'loading', data: null });

  useEffect(() => {
    let cancelled = false;
    import('@/data/generated/wiki.json')
      .then((mod) => {
        if (!cancelled) {
          setState({ status: 'ready', data: mod.default as unknown as WikiData });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  return state;
}
