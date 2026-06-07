'use client';

import { useEffect, useState } from 'react';

type PullToRefreshOptions = {
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  minRefreshMs?: number;
  threshold?: number;
};

export function usePullToRefresh({
  onRefresh,
  disabled = false,
  minRefreshMs = 500,
  threshold = 72,
}: PullToRefreshOptions) {
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (disabled) return undefined;

    let startY = 0;
    let pulling = false;

    const getScrollableParent = (element: Element | null) => {
      let current: Element | null = element;
      while (current) {
        const style = window.getComputedStyle(current);
        const canScroll = /(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight;
        if (canScroll) return current;
        current = current.parentElement;
      }
      return document.scrollingElement || document.documentElement;
    };

    const isAtTop = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return window.scrollY <= 0;
      const scrollable = getScrollableParent(target);
      return scrollable.scrollTop <= 0;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (refreshing || !isAtTop(event.target)) return;
      startY = event.touches[0]?.clientY ?? 0;
      pulling = true;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!pulling || refreshing) return;
      const currentY = event.touches[0]?.clientY ?? 0;
      if (currentY - startY >= threshold && isAtTop(event.target)) {
        pulling = false;
        setRefreshing(true);
        const startedAt = Date.now();
        void Promise.resolve(onRefresh()).finally(() => {
          const remaining = Math.max(0, minRefreshMs - (Date.now() - startedAt));
          window.setTimeout(() => setRefreshing(false), remaining);
        });
      }
    };

    const handleTouchEnd = () => {
      pulling = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, minRefreshMs, onRefresh, refreshing, threshold]);

  return { refreshing };
}
