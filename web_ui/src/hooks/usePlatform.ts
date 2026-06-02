'use client';

import { useState, useEffect } from 'react';

type Platform = 'web' | 'app';

export function usePlatform() {
  const [platform, setPlatform] = useState<Platform>('web');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Android 앱의 WebView에서 주입한 JavascriptInterface인 AndroidBridge의 존재 유무 확인
    if (typeof window !== 'undefined' && (window as any).AndroidBridge) {
      setPlatform('app');
    } else {
      setPlatform('web');
    }
    setIsReady(true);
  }, []);

  return { platform, isReady };
}
