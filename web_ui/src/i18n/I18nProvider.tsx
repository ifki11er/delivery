'use client';

import React, { createContext, useContext } from 'react';
import { dictionaries, Locale } from './dictionaries';

type Dictionary = typeof dictionaries['ko'];

const I18nContext = createContext<Dictionary>(dictionaries.ko);

export function I18nProvider({ children, dictionary }: { children: React.ReactNode; dictionary: Dictionary }) {
  return <I18nContext.Provider value={dictionary}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
