'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/I18nProvider';

export default function SettingsPage() {
  const router = useRouter();
  const t = useI18n();
  const [locale, setLocale] = useState('ko');

  useEffect(() => {
    // Read current cookie
    const cookies = document.cookie.split(';');
    const localeCookie = cookies.find((c) => c.trim().startsWith('NEXT_LOCALE='));
    if (localeCookie) {
      setLocale(localeCookie.split('=')[1]);
    }
  }, []);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    setLocale(newLocale);
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`; // 1 year expiration
    router.refresh(); // Tell Next.js to re-fetch Server Components
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.settings}</h1>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* 언어 설정 항목 */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <label htmlFor="language" className="text-base font-medium text-gray-900">
              {t.language}
            </label>
            <select
              id="language"
              value={locale}
              onChange={handleLanguageChange}
              className="text-right bg-transparent text-gray-500 font-medium focus:outline-none cursor-pointer appearance-none pr-4 relative"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right center',
                backgroundSize: '16px',
              }}
            >
              <option value="ko">한국어 (Korean)</option>
              <option value="en">English (영어)</option>
              <option value="vi">Tiếng Việt (베트남어)</option>
            </select>
          </div>
          
          <div className="p-4 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              * 언어를 변경하면 즉시 앱 전체에 적용됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
