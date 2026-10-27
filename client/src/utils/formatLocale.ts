import { DEFAULT_LOCALE, toBcp47, type Locale } from '../i18n/config';

/** Active locale — synced by I18nProvider for non-hook formatters. */
let activeLocale: Locale = DEFAULT_LOCALE;
let activeBcp47 = toBcp47(DEFAULT_LOCALE);

export function setFormatLocale(locale: Locale): void {
  activeLocale = locale;
  activeBcp47 = toBcp47(locale);
}

export function getActiveLocale(): Locale {
  return activeLocale;
}

export function getActiveBcp47(): string {
  return activeBcp47;
}

export function resolveBcp47(locale?: Locale | string): string {
  if (!locale) return activeBcp47;
  if (typeof locale === 'string' && locale.includes('-')) return locale;
  return toBcp47(locale as Locale);
}
