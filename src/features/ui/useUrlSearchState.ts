import { useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

type QueryValue = string | string[] | null;

export function useUrlSearchState() {
  const [params, setSearchParams] = useSearchParams();
  const currentRef = useRef(params);
  currentRef.current = params;

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
          currentRef.current = next;
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  const current = useCallback(() => currentRef.current, []);

  return { params, update, current };
}
