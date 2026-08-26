import { describe, it, expect } from 'vitest';
import {
  CSV_BOM,
  escapeCsvField,
  paymentsCsvFilename,
  paymentsToCsv,
  toCsvRow,
  type CsvPayment,
} from './payments-csv';

const payment = (over: Partial<CsvPayment> = {}): CsvPayment => ({
  tx_hash: '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
  ledger: 12_847_294,
  payer: 'GD4C3LWGIXNDWC3G2UTIKXA4TN2KCBOCP5G6R6YT6WBHVDEP4D4GRMK4',
  amount: '8.2500000',
  asset: 'native',
  ts: '2026-07-13T10:00:00.000Z',
  route: '/api/data',
  method: 'GET',
  ...over,
});

/** Splits on record separators, dropping the trailing empty line. */
const lines = (csv: string) => csv.split('\r\n').slice(0, -1);

describe('escapeCsvField', () => {
  it('leaves a plain value alone', () => {
    expect(escapeCsvField('/api/data')).toBe('/api/data');
  });

  it('quotes a value containing the delimiter', () => {
    expect(escapeCsvField('/api/a,b')).toBe('"/api/a,b"');
  });

  it('doubles embedded quotes', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes newlines so one field cannot become two records', () => {
    expect(escapeCsvField('/api\nnext')).toBe('"/api\nnext"');
    expect(escapeCsvField('/api\r\nnext')).toBe('"/api\r\nnext"');
  });

  it('quotes surrounding whitespace a reader would otherwise strip', () => {
    expect(escapeCsvField(' padded ')).toBe('" padded "');
  });

  it('passes an empty string through unquoted', () => {
    expect(escapeCsvField('')).toBe('');
  });
});

describe('toCsvRow', () => {
  it('escapes each cell independently', () => {
    expect(toCsvRow(['a', 'b,c', 'd"e'])).toBe('a,"b,c","d""e"');
  });
});

describe('paymentsToCsv', () => {
  it('emits the header even for an empty set', () => {
    const csv = paymentsToCsv([]);
    expect(lines(csv)).toEqual([
      'Transaction Hash,Timestamp,Amount,Asset,Asset Identifier,Payer,Route,Method,Ledger,Refunded',
    ]);
  });

  it('terminates every record, including the last', () => {
    expect(paymentsToCsv([payment()]).endsWith('\r\n')).toBe(true);
  });

  it('writes the amount verbatim, with no grouping or rounding', () => {
    const csv = paymentsToCsv([payment({ amount: '1234567.8900000' })]);
    expect(lines(csv)[1].split(',')[2]).toBe('1234567.8900000');
  });

  it('preserves a single stroop, which a float round trip would not', () => {
    const csv = paymentsToCsv([payment({ amount: '0.0000001' })]);
    expect(lines(csv)[1].split(',')[2]).toBe('0.0000001');
  });

  it('preserves amounts beyond Number.MAX_SAFE_INTEGER', () => {
    const huge = '9007199254740993.0000000';
    const csv = paymentsToCsv([payment({ amount: huge })]);
    expect(lines(csv)[1].split(',')[2]).toBe(huge);
    // The value a Number round trip would have written instead.
    expect(String(Number(huge))).not.toBe(huge);
  });

  it('keeps a negative amount numeric rather than defusing it as a formula', () => {
    const csv = paymentsToCsv([payment({ amount: '-2.5000000' })]);
    expect(lines(csv)[1].split(',')[2]).toBe('-2.5000000');
  });

  it('escapes a route containing commas, quotes and newlines', () => {
    const csv = paymentsToCsv([payment({ route: '/api/a,b "c"\nd' })]);
    expect(lines(csv)[1]).toContain('"/api/a,b ""c""\nd"');
    // Still two logical records: header plus one payment.
    expect(lines(csv)).toHaveLength(2);
  });

  it('defuses a route that a spreadsheet would evaluate as a formula', () => {
    const csv = paymentsToCsv([payment({ route: '=HYPERLINK("http://evil","x")' })]);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"",""x"")"`);
  });

  it('preserves unicode routes untouched', () => {
    const csv = paymentsToCsv([payment({ route: '/api/데이터/日本語/émoji-🚀' })]);
    expect(csv).toContain('/api/데이터/日本語/émoji-🚀');
  });

  it('labels the asset and keeps the full identifier alongside it', () => {
    const usdc = 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
    const cells = lines(paymentsToCsv([payment({ asset: usdc })]))[1].split(',');
    expect(cells[3]).toBe('USDC');
    expect(cells[4]).toBe(usdc);
  });

  it('reports a null asset as native XLM', () => {
    const cells = lines(paymentsToCsv([payment({ asset: null })]))[1].split(',');
    expect(cells[3]).toBe('XLM');
    expect(cells[4]).toBe('native');
  });

  it('writes unattributed and unindexed fields as empty cells, not "null"', () => {
    const cells = lines(
      paymentsToCsv([payment({ route: null, method: null, ledger: null })]),
    )[1].split(',');
    expect(cells[6]).toBe('');
    expect(cells[7]).toBe('');
    expect(cells[8]).toBe('');
  });

  it('keeps row order and count for a realistic ledger', () => {
    const csv = paymentsToCsv([
      payment({ tx_hash: 'aaa', amount: '8.2500000' }),
      payment({ tx_hash: 'bbb', amount: '3.7500000' }),
    ]);
    const rows = lines(csv);
    expect(rows).toHaveLength(3);
    expect(rows[1].startsWith('aaa,')).toBe(true);
    expect(rows[2].startsWith('bbb,')).toBe(true);
  });
});

describe('CSV_BOM', () => {
  it('is the single UTF-8 BOM code point Excel looks for', () => {
    expect(CSV_BOM).toBe('﻿');
    expect(CSV_BOM).toHaveLength(1);
  });
});

describe('paymentsCsvFilename', () => {
  it('dates the file from the local calendar day', () => {
    // Constructed from local parts so the assertion holds in any timezone.
    expect(paymentsCsvFilename(new Date(2026, 7, 6, 12, 0, 0))).toBe(
      'accensa_payments_2026-08-06.csv',
    );
  });

  it('zero-pads single-digit months and days', () => {
    expect(paymentsCsvFilename(new Date(2026, 0, 9, 12, 0, 0))).toBe(
      'accensa_payments_2026-01-09.csv',
    );
  });
});
