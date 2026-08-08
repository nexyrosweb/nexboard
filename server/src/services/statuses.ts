import { BUILTIN_STATUSES, type StatusEntity } from '../db/defaults.js';
import { getSetting, setSetting } from './app.js';

function parseList(raw: string, fallback: readonly string[]): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...fallback];
    const cleaned = parsed
      .map((v) => String(v).trim().toLowerCase().replace(/\s+/g, '_'))
      .filter((v) => /^[a-z0-9_]{2,32}$/.test(v));
    return cleaned.length ? Array.from(new Set(cleaned)) : [...fallback];
  } catch {
    return [...fallback];
  }
}

export function getStatuses(entity: StatusEntity): string[] {
  const key = `statuses_${entity}` as const;
  const fallback = BUILTIN_STATUSES[entity];
  return parseList(getSetting(key, JSON.stringify(fallback)), fallback);
}

export function setStatuses(entity: StatusEntity, values: string[]): string[] {
  const fallback = BUILTIN_STATUSES[entity];
  const merged = parseList(JSON.stringify(values), fallback);
  // Keep at least builtins so core flows never break
  const withBuiltins = Array.from(new Set([...fallback, ...merged]));
  setSetting(`statuses_${entity}`, JSON.stringify(withBuiltins));
  return withBuiltins;
}

export function isValidStatus(entity: StatusEntity, status: string | undefined): boolean {
  if (!status) return true;
  return getStatuses(entity).includes(status);
}

export function getAllowedCurrencies(): string[] {
  const raw = getSetting('currencies', 'EUR,USD,GBP,CHF,CAD,JPY');
  return raw
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{3}$/.test(c));
}

export function getDefaultCurrency(): string {
  const cur = getSetting('currency', 'EUR').toUpperCase();
  const allowed = getAllowedCurrencies();
  return allowed.includes(cur) ? cur : allowed[0] || 'EUR';
}

export function isValidCurrency(code: string | undefined | null): boolean {
  if (!code) return true;
  return getAllowedCurrencies().includes(code.toUpperCase());
}
