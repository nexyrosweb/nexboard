/**
 * NexBoard i18n — modular dictionaries under ./locales/{locale}/
 *
 * To add a language:
 * 1. Add the code to LOCALES / LOCALE_META in ./config.ts
 * 2. Create client/src/i18n/locales/{code}/ with the same modules as `en`
 * 3. Allow the code in server settings validation
 * 4. Update README
 */
import type { Locale } from './config.js';
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_META,
  LOCALE_OPTIONS,
  LOCALE_STORAGE_KEY,
  getLocaleMeta,
  isLocale,
  normalizeLocale,
  toBcp47,
} from './config.js';
import de from './locales/de/index.js';
import en from './locales/en/index.js';
import es from './locales/es/index.js';
import fr from './locales/fr/index.js';
import it from './locales/it/index.js';
import pt from './locales/pt/index.js';

export type { Locale };
export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_META,
  LOCALE_OPTIONS,
  LOCALE_STORAGE_KEY,
  getLocaleMeta,
  isLocale,
  normalizeLocale,
  toBcp47,
};

export type TranslationKey = keyof typeof en;

export const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
  fr: fr as Record<TranslationKey, string>,
  en: en as Record<TranslationKey, string>,
  es: es as Record<TranslationKey, string>,
  de: de as Record<TranslationKey, string>,
  it: it as Record<TranslationKey, string>,
  pt: pt as Record<TranslationKey, string>,
};

export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  let text = dict[key] ?? dictionaries.en[key] ?? dictionaries.fr[key] ?? String(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

/** Dev helper: keys present in EN but missing/empty in another locale. */
export function missingKeys(locale: Locale): TranslationKey[] {
  const dict = dictionaries[locale];
  return (Object.keys(dictionaries.en) as TranslationKey[]).filter((key) => {
    const value = dict[key];
    return value == null || value === '' || value === dictionaries.en[key] && locale !== 'en';
  });
}
