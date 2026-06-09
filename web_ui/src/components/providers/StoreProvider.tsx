'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { StoreSummary } from '@/types/store-management';

type StoreContextValue = {
  stores: StoreSummary[];
  loading: boolean;
  hasStore: boolean;
  refreshStores: () => Promise<void>;
};

const StoreContext = createContext<StoreContextValue | null>(null);
const STORE_CACHE_PREFIX = 'worklink_store_cache';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const cacheKey = session?.user?.id ? `${STORE_CACHE_PREFIX}_${session.user.id}` : '';

  useEffect(() => {
    if (!cacheKey) return;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setStores(JSON.parse(cached) as StoreSummary[]);
        setLoading(false);
      }
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }, [cacheKey]);

  const refreshStores = useCallback(async () => {
    if (status === 'loading') return;
    if (status !== 'authenticated' || !cacheKey) {
      setStores([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/store');
      if (!res.ok) {
        setStores([]);
        return;
      }

      const data = (await res.json()) as StoreSummary[];
      setStores(data);
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, status]);

  useEffect(() => {
    void refreshStores();
  }, [refreshStores]);

  const value = useMemo<StoreContextValue>(() => ({
    stores,
    loading,
    hasStore: stores.length > 0,
    refreshStores,
  }), [loading, refreshStores, stores]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStores() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStores must be used within StoreProvider');
  }
  return context;
}
