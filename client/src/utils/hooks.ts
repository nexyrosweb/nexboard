import { useEffect, useState } from 'react';

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

export function parseApiError(err: unknown): string {
  return err instanceof Error ? err.message : 'Une erreur est survenue';
}
