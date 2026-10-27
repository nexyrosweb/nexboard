import { useBranding } from '../context/BrandingContext';
import { useI18n } from '../context/I18nContext';
import type { Locale, TranslationKey } from '../i18n/translations';
import { resolveBcp47 } from './formatLocale';

export { setFormatLocale, getActiveBcp47 } from './formatLocale';

export function formatCurrency(
  value: number,
  currency = 'EUR',
  locale?: Locale | string,
): string {
  const tag = resolveBcp47(locale);
  try {
    return new Intl.NumberFormat(tag, {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function useFormatCurrency() {
  const { settings } = useBranding();
  const { bcp47 } = useI18n();
  const fallback = String(settings.currency || 'EUR');
  return (value: number, currency?: string | null) =>
    formatCurrency(value, currency || fallback, bcp47);
}

export function formatDate(value: string, locale?: Locale | string): string {
  const tag = resolveBcp47(locale);
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(tag, {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function useFormatDate() {
  const { bcp47 } = useI18n();
  return (value: string) => formatDate(value, bcp47);
}

export function formatNumber(
  value: number,
  locale?: Locale | string,
  options?: Intl.NumberFormatOptions,
): string {
  const tag = resolveBcp47(locale);
  return new Intl.NumberFormat(tag, options).format(value);
}

export function useFormatNumber() {
  const { bcp47 } = useI18n();
  return (value: number, options?: Intl.NumberFormatOptions) =>
    formatNumber(value, bcp47, options);
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'payee':
    case 'accepte':
    case 'termine':
    case 'actif':
    case 'done':
      return 'badge badge-success';
    case 'envoyee':
    case 'envoye':
    case 'en_cours':
    case 'prospect':
    case 'in_progress':
      return 'badge badge-info';
    case 'en_retard':
    case 'refuse':
    case 'annule':
    case 'annulee':
    case 'inactif':
    case 'cancelled':
      return 'badge badge-danger';
    case 'brouillon':
    case 'expire':
    case 'todo':
      return 'badge badge-warning';
    default:
      return 'badge';
  }
}

export function priorityBadgeClass(priority: string): string {
  return `badge priority-badge priority-${priority}`;
}

export function statusLabelKey(status: string): TranslationKey | string {
  return `status.${status}`;
}

export function useStatusLabel() {
  const { t } = useI18n();
  return (status: string) => {
    const key = `status.${status}` as TranslationKey;
    const label = t(key);
    return label.startsWith('status.') ? status.replace(/_/g, ' ') : label;
  };
}

export function usePriorityLabel() {
  const { t } = useI18n();
  return (priority: string) => {
    const key = `priority.${priority}` as TranslationKey;
    const label = t(key);
    return label.startsWith('priority.') ? priority : label;
  };
}
