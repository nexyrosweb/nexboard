import { useMemo } from 'react';
import { useBranding } from '../context/BrandingContext';
import type { TranslationKey } from '../i18n/translations';
import type { Option } from '../types';
import { useStatusLabel } from '../utils/format';

const FALLBACK = {
  clients: ['actif', 'prospect', 'inactif'],
  projects: ['brouillon', 'en_cours', 'termine', 'annule'],
  quotes: ['brouillon', 'envoye', 'accepte', 'refuse', 'expire'],
  invoices: ['brouillon', 'envoyee', 'payee', 'en_retard', 'annulee'],
} as const;

function parseStatuses(raw: unknown, fallback: readonly string[]): string[] {
  if (typeof raw !== 'string' || !raw.trim()) return [...fallback];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...fallback];
    const cleaned = parsed.map((v) => String(v).trim()).filter(Boolean);
    return cleaned.length ? cleaned : [...fallback];
  } catch {
    return [...fallback];
  }
}

function toOptions(values: string[], labelOf: (s: string) => string): Option[] {
  return values.map((value) => ({ value, label: labelOf(value) }));
}

export function useStatusOptions() {
  const { settings } = useBranding();
  const labelOf = useStatusLabel();

  return useMemo(() => {
    const clients = parseStatuses(settings.statuses_clients, FALLBACK.clients);
    const projects = parseStatuses(settings.statuses_projects, FALLBACK.projects);
    const quotes = parseStatuses(settings.statuses_quotes, FALLBACK.quotes);
    const invoices = parseStatuses(settings.statuses_invoices, FALLBACK.invoices);
    return {
      clients: toOptions(clients, labelOf),
      projects: toOptions(projects, labelOf),
      quotes: toOptions(quotes, labelOf),
      invoices: toOptions(invoices, labelOf),
      clientValues: clients,
      projectValues: projects,
      quoteValues: quotes,
      invoiceValues: invoices,
    };
  }, [settings, labelOf]);
}

export function useCurrencyOptions(): Option[] {
  const { settings } = useBranding();
  return useMemo(() => {
    const list = String(settings.currencies || 'EUR,USD,GBP,CHF,CAD,JPY')
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter((c) => /^[A-Z]{3}$/.test(c));
    const unique = Array.from(new Set(list.length ? list : ['EUR']));
    return unique.map((value) => ({ value, label: value }));
  }, [settings.currencies]);
}

export function useDefaultCurrency(): string {
  const { settings } = useBranding();
  return String(settings.currency || 'EUR').toUpperCase();
}

/** @deprecated use useStatusOptions().*Values */
export const CLIENT_STATUSES = FALLBACK.clients;
export const PROJECT_STATUSES = FALLBACK.projects;
export const QUOTE_STATUSES = FALLBACK.quotes;
export const INVOICE_STATUSES = FALLBACK.invoices;

// Keep TranslationKey import used for potential external typing
export type StatusTranslationKey = TranslationKey;
