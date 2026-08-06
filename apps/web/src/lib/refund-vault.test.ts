import { describe, it, expect } from 'vitest';
import {
 REFUND_ERRORS,
 describeRefundError,
 parseContractErrorCode,
 paymentRef,
} from './refund-vault';

const HASH = 'a'.repeat(64);

describe('paymentRef', () => {
 it('accepts a 32-byte hex hash and normalises case', () => {
 expect(paymentRef('AB'.repeat(32))).toBe('ab'.repeat(32));
 });

 it('tolerates surrounding whitespace from a paste', () => {
 expect(paymentRef(`  ${HASH}\n`)).toBe(HASH);
 });

 it('rejects anything that is not exactly 32 bytes', () => {
 expect(() => paymentRef('abc')).toThrow();
 expect(() => paymentRef('a'.repeat(63))).toThrow();
 expect(() => paymentRef('a'.repeat(65))).toThrow();
 expect(() => paymentRef('')).toThrow();
 });

 it('rejects non-hex characters rather than truncating them', () => {
 // A silently truncated reference would refund against the wrong record.
 expect(() => paymentRef('z'.repeat(64))).toThrow();
 expect(() => paymentRef(`0x${'a'.repeat(62)}`)).toThrow();
 });
});

describe('parseContractErrorCode', () => {
 it('reads the discriminant out of a Soroban contract error', () => {
 expect(parseContractErrorCode('HostError: Error(Contract, #4)')).toBe(4);
 expect(parseContractErrorCode('Error(Contract, #6)')).toBe(6);
 });

 it('tolerates spacing differences', () => {
 expect(parseContractErrorCode('Error(Contract,#5)')).toBe(5);
 });

 it('reads the alternate ContractError shape', () => {
 expect(parseContractErrorCode('ContractError(8)')).toBe(8);
 });

 it('returns null for failures that are not contract errors', () => {
 // An RPC outage is not a verdict on the refund, and reporting it as one
 // would tell the merchant something false about their payment.
 expect(parseContractErrorCode('fetch failed')).toBeNull();
 expect(parseContractErrorCode('Error(WasmVm, InvalidAction)')).toBeNull();
 expect(parseContractErrorCode('')).toBeNull();
 });
});

describe('describeRefundError', () => {
 it('has a message for every code the contract can return', () => {
 for (const code of Object.keys(REFUND_ERRORS).map(Number)) {
 const message = describeRefundError(code);
 expect(message.length).toBeGreaterThan(0);
 expect(message).not.toContain('error code');
 }
 });

 it('names the three states a merchant actually hits', () => {
 expect(describeRefundError(4)).toMatch(/already been refunded/i);
 expect(describeRefundError(5)).toMatch(/window/i);
 expect(describeRefundError(6)).toMatch(/float/i);
 });

 it('falls back without pretending to know an unmapped code', () => {
 expect(describeRefundError(99)).toContain('99');
 });
});
