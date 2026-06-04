'use client';

import React, { createContext, useContext } from 'react';
import { dictionaries } from './dictionaries';

export type Dictionary = Record<string, string>;

const I18nContext = createContext<{t: Dictionary, locale: string}>({ t: dictionaries.ko, locale: 'ko' });

export function I18nProvider({ children, dictionary, locale }: { children: React.ReactNode; dictionary: Dictionary; locale: string }) {
  return <I18nContext.Provider value={{ t: dictionary, locale }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext).t;
}

export function useLocale() {
  return useContext(I18nContext).locale;
}
