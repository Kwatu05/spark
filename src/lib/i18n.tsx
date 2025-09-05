import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type SupportedLocale = 'en' | 'ar';

type I18nContextValue = {
  locale: SupportedLocale;
  direction: 'ltr' | 'rtl';
  timezone: string;
  setLocale: (l: SupportedLocale) => void;
  setTimezone: (tz: string) => void;
  t: (key: string, fallback?: string) => string;
  formatDate: (d: Date | number | string, opts?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (n: number, opts?: Intl.NumberFormatOptions) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const DEFAULT_LOCALE: SupportedLocale = ((): SupportedLocale => {
  try {
    const saved = localStorage.getItem('app_locale') as SupportedLocale | null;
    if (saved === 'en' || saved === 'ar') return saved;
  } catch {}
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'en';
  return nav.startsWith('ar') ? 'ar' : 'en';
})();

const DEFAULT_TZ: string = ((): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
})();

const MESSAGES: Record<SupportedLocale, Record<string, string>> = {
  en: {
    'app.skip': 'Skip to main content',
    'settings.language': 'Language',
    'settings.timezone': 'Time zone',
    'language.en': 'English',
    'language.ar': 'Arabic (RTL)',
  },
  ar: {
    'app.skip': 'تخطى إلى المحتوى الرئيسي',
    'settings.language': 'اللغة',
    'settings.timezone': 'المنطقة الزمنية',
    'language.en': 'الإنجليزية',
    'language.ar': 'العربية (من اليمين إلى اليسار)',
  }
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);
  const [timezone, setTimezoneState] = useState<string>(() => {
    try { return localStorage.getItem('app_timezone') || DEFAULT_TZ; } catch { return DEFAULT_TZ; }
  });

  const direction: 'ltr' | 'rtl' = locale === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    try { localStorage.setItem('app_locale', locale); } catch {}
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', locale);
        document.documentElement.setAttribute('dir', direction);
      }
    } catch {}
  }, [locale, direction]);

  useEffect(() => {
    try { localStorage.setItem('app_timezone', timezone); } catch {}
  }, [timezone]);

  const setLocale = (l: SupportedLocale) => setLocaleState(l);
  const setTimezone = (tz: string) => setTimezoneState(tz);

  const t = useMemo(() => {
    return (key: string, fallback?: string) => {
      const table = MESSAGES[locale] || MESSAGES.en;
      return table[key] ?? fallback ?? key;
    };
  }, [locale]);

  const formatDate = (d: Date | number | string, opts?: Intl.DateTimeFormatOptions) => {
    const date = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    try {
      return new Intl.DateTimeFormat(locale, { timeZone: timezone, ...opts }).format(date);
    } catch {
      return new Intl.DateTimeFormat('en', { timeZone: 'UTC', ...opts }).format(date);
    }
  };

  const formatNumber = (n: number, opts?: Intl.NumberFormatOptions) => {
    try { return new Intl.NumberFormat(locale, opts).format(n); } catch { return String(n); }
  };

  const value: I18nContextValue = {
    locale,
    direction,
    timezone,
    setLocale,
    setTimezone,
    t,
    formatDate,
    formatNumber,
  };

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};


