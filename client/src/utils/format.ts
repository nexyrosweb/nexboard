import { useBranding } from '../context/BrandingContext';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';

const dateShort = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
});

export function formatCurrency(value: number, currency = 'EUR'): string {
  try {
    return new Intl.NumberFormat(undefined, {
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
  const fallback = String(settings.currency || 'EUR');
  return (value: number, currency?: string | null) =>
    formatCurrency(value, currency || fallback);
}

export function formatDate(value: string): string {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return dateShort.format(date);
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
    // If missing translation, t returns the key — fall back to raw status
    return label.startsWith('status.') ? status.replace(/_/g, ' ') : label;
  };
}
