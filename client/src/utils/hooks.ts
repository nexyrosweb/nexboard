import { useEffect, useState } from 'react';
import { translate } from '../i18n/translations';
import { getActiveLocale } from './formatLocale';

export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseApiError(err: unknown, fallback?: string): string {
  if (err instanceof Error) return err.message;
  return fallback ?? translate(getActiveLocale(), 'errors.generic');
}
