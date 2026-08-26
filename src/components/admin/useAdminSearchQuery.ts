'use client';

import { useDeferredValue, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const SEARCH_PARAM = 'q';
const URL_UPDATE_DELAY = 250;

export function useAdminSearchQuery() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get(SEARCH_PARAM) ?? '';
  const [query, setQuery] = useState(urlQuery);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const normalizedQuery = query.trim();

      if (normalizedQuery) {
        params.set(SEARCH_PARAM, normalizedQuery);
      } else {
        params.delete(SEARCH_PARAM);
      }

      const queryString = params.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
      const currentUrl = `${window.location.pathname}${window.location.search}`;

      if (nextUrl !== currentUrl) {
        router.replace(nextUrl, { scroll: false });
      }
    }, URL_UPDATE_DELAY);

    return () => window.clearTimeout(timeoutId);
  }, [pathname, query, router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setQuery(urlQuery), 0);
    return () => window.clearTimeout(timeoutId);
  }, [urlQuery]);

  return {
    clearQuery: () => setQuery(''),
    deferredQuery,
    query,
    setQuery,
  };
}
