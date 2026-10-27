import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  LOCALE_OPTIONS,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  toBcp47,
  translate,
  type Locale,
  type TranslationKey,
} from '../i18n/translations';
import { setFormatLocale } from '../utils/formatLocale';

interface I18nContextValue {
  locale: Locale;
  /** BCP 47 tag for Intl (e.g. fr-FR) */
  bcp47: string;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  options: typeof LOCALE_OPTIONS;
}

export { LOCALE_STORAGE_KEY };
const I18nContext = createContext<I18nContextValue | null>(null);

function readInitialLocale(): Locale {
  const saved = normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  if (saved) return saved;
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
    setFormatLocale(next);
    document.documentElement.lang = toBcp47(next);
  }, []);

  useEffect(() => {
    setFormatLocale(locale);
    document.documentElement.lang = toBcp47(locale);
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      bcp47: toBcp47(locale),
      setLocale,
      t,
      options: LOCALE_OPTIONS,
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
