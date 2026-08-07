import { useMemo } from 'react';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translations';
import type { Option } from '../types';

const CLIENT = ['actif', 'prospect', 'inactif'] as const;
const PROJECT = ['brouillon', 'en_cours', 'termine', 'annule'] as const;
const QUOTE = ['brouillon', 'envoye', 'accepte', 'refuse', 'expire'] as const;
const INVOICE = ['brouillon', 'envoyee', 'payee', 'en_retard', 'annulee'] as const;

function toOptions(
  values: readonly string[],
  t: (key: TranslationKey) => string,
): Option[] {
  return values.map((value) => ({
    value,
    label: t(`status.${value}` as TranslationKey),
  }));
}

export function useStatusOptions() {
  const { t } = useI18n();
  return useMemo(
    () => ({
      clients: toOptions(CLIENT, t),
      projects: toOptions(PROJECT, t),
      quotes: toOptions(QUOTE, t),
      invoices: toOptions(INVOICE, t),
    }),
    [t],
  );
}

export const CLIENT_STATUSES = CLIENT;
export const PROJECT_STATUSES = PROJECT;
export const QUOTE_STATUSES = QUOTE;
export const INVOICE_STATUSES = INVOICE;
