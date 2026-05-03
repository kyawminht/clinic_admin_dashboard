import { dehydrate, hydrate } from '@tanstack/react-query';

const STORAGE_KEY = 'clinicdashboard_rq_cache_v1';

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function restoreQueryCache(queryClient) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state = safeParse(raw);
    if (!state) return;
    hydrate(queryClient, state);
  } catch {
    // ignore
  }
}

export function persistQueryCache(queryClient) {
  try {
    const dehydrated = dehydrate(queryClient, {
      shouldDehydrateQuery: (query) => query.state.status === 'success',
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dehydrated));
  } catch {
    // ignore
  }
}

export function setupQueryCachePersistence(queryClient) {
  restoreQueryCache(queryClient);

  let persistTimer = null;
  const schedulePersist = () => {
    if (persistTimer) return;
    persistTimer = window.setTimeout(() => {
      persistTimer = null;
      persistQueryCache(queryClient);
    }, 750);
  };

  const unsubscribe = queryClient.getQueryCache().subscribe(schedulePersist);
  window.addEventListener('beforeunload', () => persistQueryCache(queryClient));

  return () => {
    unsubscribe?.();
    if (persistTimer) window.clearTimeout(persistTimer);
  };
}

