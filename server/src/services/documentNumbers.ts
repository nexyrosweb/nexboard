import { getDb } from '../db/index.js';
import { getSetting } from './app.js';

export const DEFAULT_QUOTE_NUMBER_FORMAT = 'DEV-{YYYY}-{###}';
export const DEFAULT_INVOICE_NUMBER_FORMAT = 'FAC - {YYYY} - {###}';

/** Build a concrete number from a template and sequence. */
export function applyNumberFormat(
  template: string,
  seq: number,
  year = new Date().getFullYear(),
): string {
  return template
    .replaceAll('{YYYY}', String(year))
    .replaceAll('{YY}', String(year).slice(-2))
    .replaceAll('{####}', String(seq).padStart(4, '0'))
    .replaceAll('{###}', String(seq).padStart(3, '0'));
}

/** Escape SQL LIKE wildcards in a literal fragment. */
function likeEscape(value: string): string {
  return value.replace(/([%_\\])/g, '\\$1');
}

/**
 * Turn a format template into a LIKE pattern for a given year,
 * replacing the sequence token with `%`.
 */
function likePatternForYear(template: string, year: number): string {
  const withYear = template
    .replaceAll('{YYYY}', String(year))
    .replaceAll('{YY}', String(year).slice(-2));
  // Sequence token → wildcard
  const withSeq = withYear.replaceAll('{####}', '%').replaceAll('{###}', '%');
  return likeEscape(withSeq);
}

function extractSeq(number: string): number {
  const match = number.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : 0;
}

function nextSeq(table: 'quotes' | 'invoices', template: string, year: number): number {
  const pattern = likePatternForYear(template, year);
  const rows = getDb()
    .prepare(`SELECT number FROM ${table} WHERE number LIKE ? ESCAPE '\\'`)
    .all(pattern) as Array<{ number: string }>;

  let max = 0;
  for (const row of rows) {
    max = Math.max(max, extractSeq(row.number));
  }

  // Also recognize legacy compact FAC-YYYY-NNN / DEV-YYYY-NNN when template differs
  const compactPrefix = table === 'quotes' ? 'DEV' : 'FAC';
  const legacy = getDb()
    .prepare(`SELECT number FROM ${table} WHERE number LIKE ?`)
    .all(`${compactPrefix}-${year}-%`) as Array<{ number: string }>;
  for (const row of legacy) {
    max = Math.max(max, extractSeq(row.number));
  }

  return max + 1;
}

export function nextQuoteNumber(year = new Date().getFullYear()): string {
  const template = getSetting('quote_number_format', DEFAULT_QUOTE_NUMBER_FORMAT);
  return applyNumberFormat(template, nextSeq('quotes', template, year), year);
}

export function nextInvoiceNumber(year = new Date().getFullYear()): string {
  const template = getSetting('invoice_number_format', DEFAULT_INVOICE_NUMBER_FORMAT);
  return applyNumberFormat(template, nextSeq('invoices', template, year), year);
}

/** Safe filename from a document number (spaces → underscores). */
export function numberAsFilename(number: string, ext = 'pdf'): string {
  const base = number.trim().replace(/\s+/g, '_').replace(/[^\w.-]+/g, '-');
  return `${base}.${ext}`;
}
