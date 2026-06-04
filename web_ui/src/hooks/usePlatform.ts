'use client';

import { useMemo } from 'react';

type Platform = 'web' | 'app';

export function usePlatform() {
  const platform = useMemo<Platform>(() => {
    return typeof window !== 'undefined' && window.AndroidBridge ? 'app' : 'web';
  }, []);

  return { platform, isReady: true };
}
