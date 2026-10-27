export const LOCALES = ['fr', 'en', 'es', 'de', 'it', 'pt'] as const;
export type Locale = (typeof LOCALES)[number];

export type LocaleMeta = {
  value: Locale;
  /** BCP 47 tag for Intl */
  bcp47: string;
  /** Short code shown in the switcher */
  code: string;
  /** Native language name */
  label: string;
  /** Flag emoji */
  flag: string;
};

/** UI locales — French is the product default for new installs. */
export const LOCALE_META: LocaleMeta[] = [
  { value: 'fr', bcp47: 'fr-FR', code: 'FR', label: 'Français', flag: '🇫🇷' },
  { value: 'en', bcp47: 'en-GB', code: 'EN', label: 'English', flag: '🇬🇧' },
  { value: 'es', bcp47: 'es-ES', code: 'ES', label: 'Español', flag: '🇪🇸' },
  { value: 'de', bcp47: 'de-DE', code: 'DE', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'it', bcp47: 'it-IT', code: 'IT', label: 'Italiano', flag: '🇮🇹' },
  { value: 'pt', bcp47: 'pt-PT', code: 'PT', label: 'Português', flag: '🇵🇹' },
];

export const LOCALE_OPTIONS = LOCALE_META.map(({ value, label, flag, code }) => ({
  value,
  label: `${flag} ${label}`,
  shortLabel: label,
  flag,
  code,
}));

export const DEFAULT_LOCALE: Locale = 'fr';

/** localStorage key for the active UI locale */
export const LOCALE_STORAGE_KEY = 'nexboard-locale';

const ALIASES: Record<string, Locale> = {
  fr: 'fr',
  'fr-fr': 'fr',
  'fr-ca': 'fr',
  en: 'en',
  'en-gb': 'en',
  'en-us': 'en',
  es: 'es',
  'es-es': 'es',
  'es-mx': 'es',
  de: 'de',
  'de-de': 'de',
  it: 'it',
  'it-it': 'it',
  pt: 'pt',
  'pt-pt': 'pt',
  'pt-br': 'pt',
  // Legacy Japanese installs → English
  ja: 'en',
  'ja-jp': 'en',
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Normalize stored / API locale values (incl. legacy `ja`). */
export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const mapped = ALIASES[value.trim().toLowerCase()];
  return mapped ?? null;
}

export function toBcp47(locale: Locale): string {
  return LOCALE_META.find((m) => m.value === locale)?.bcp47 ?? 'fr-FR';
}

export function getLocaleMeta(locale: Locale): LocaleMeta {
  return LOCALE_META.find((m) => m.value === locale) ?? LOCALE_META[0]!;
}
