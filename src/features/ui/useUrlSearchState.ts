import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

type QueryValue = string | string[] | null;

export function useUrlSearchState() {
  const [params, setSearchParams] = useSearchParams();

  const update = useCallback(
    (values: Record<string, QueryValue>, replace = false) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(values)) {
            next.delete(key);
            if (Array.isArray(value)) {
              for (const item of value) {
                if (item) next.append(key, item);
              }
            } else if (value) {
              next.set(key, value);
            }
          }
          next.sort();
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  return { params, update };
}
