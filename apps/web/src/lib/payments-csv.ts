/**
 * CSV serialization for the payment history export.
 *
 * Merchants take this straight into a spreadsheet or a bookkeeping import, so
 * two things matter more than anything else here:
 *
 * 1. Amounts are written as the exact decimal string the API returned. They are
 *    never parsed, rounded, or grouped - see lib/money.ts. `formatAmount` is for
 *    display only: its thousands separators would break a numeric column, and a
 *    round trip through Number would lose stroops.
 * 2. Nothing here trusts field contents. Routes arrive from merchant middleware
 *    via /api/hook/settle, so they can hold commas, quotes, newlines, or a
 *    leading `=` that a spreadsheet would evaluate as a formula.
 *
 * Pure string work, no DOM - the browser-side download lives in the dashboard.
 */

import { assetLabel } from './money';

export interface CsvPayment {
  tx_hash: string;
  ledger: number | null;
  payer: string;
  /** Decimal string. Written through verbatim. */
  amount: string;
  asset: string | null;
  ts: string;
  route: string | null;
  method: string | null;
  /** Whether this payment was refunded in this session. */
  refunded?: boolean;
}

/** RFC 4180 says CRLF; Excel is the consumer that actually cares. */
const ROW_SEPARATOR = '\r\n';

/**
 * Byte order mark.
 *
 * Excel on Windows reads a BOM-less file as the system codepage, which turns
 * every non-ASCII route into mojibake. Callers writing a file should prepend it.
 */
export const CSV_BOM = '﻿';

const HEADERS = [
  'Transaction Hash',
  'Timestamp',
  'Amount',
  'Asset',
  'Asset Identifier',
  'Payer',
  'Route',
  'Method',
  'Ledger',
  'Refunded',
];

/** Characters that make a spreadsheet treat a cell as a formula. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Defuses a cell that a spreadsheet would evaluate.
 *
 * Only applied to free-text fields. Numeric columns are left alone, because a
 * negative amount legitimately starts with `-` and has to stay a number.
 */
function neutralizeFormula(value: string): string {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

/**
 * Quotes a field per RFC 4180.
 *
 * Quoted when the value contains a delimiter, a quote, or a line break, and
 * also when it carries surrounding whitespace a reader would be free to strip.
 */
export function escapeCsvField(value: string): string {
  const needsQuotes = /[",\r\n]/.test(value) || value !== value.trim();
  if (!needsQuotes) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

/** Joins one row of already-stringified cells. */
export function toCsvRow(cells: string[]): string {
  return cells.map(escapeCsvField).join(',');
}

/**
 * Serializes payments to CSV text, header row included.
 *
 * An empty set still returns the header, so the download is a valid CSV with
 * named columns rather than a zero-byte file that reads as a failure.
 */
export function paymentsToCsv(payments: readonly CsvPayment[]): string {
  const rows = payments.map((payment) =>
    toCsvRow([
      neutralizeFormula(payment.tx_hash),
      payment.ts,
      // Verbatim. No Number, no formatAmount.
      payment.amount,
      assetLabel(payment.asset),
      neutralizeFormula(payment.asset ?? 'native'),
      neutralizeFormula(payment.payer),
      neutralizeFormula(payment.route ?? ''),
      neutralizeFormula(payment.method ?? ''),
      payment.ledger === null ? '' : String(payment.ledger),
      payment.refunded ? 'Yes' : '',
    ]),
  );

  // Trailing separator so appending to the file cannot merge two records.
  return [toCsvRow(HEADERS), ...rows].join(ROW_SEPARATOR) + ROW_SEPARATOR;
}

/**
 * `accensa_payments_2026-08-06.csv`.
 *
 * Dated in the viewer's own timezone, because the merchant filing the export
 * thinks in their local day, not UTC.
 */
export function paymentsCsvFilename(now: Date = new Date()): string {
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `accensa_payments_${year}-${month}-${day}.csv`;
}
