import { describe, it, expect, afterEach } from 'vitest';
import {
 readAddress,
 readBoolean,
 readNetwork,
 truncateAddress,
 readStatus,
 connect,
} from './freighter';

const G = 'GCALKSGAZRJLSUEJT3M5W6LN4R7XQOLIRCOS6ZA6EDZVTZDBIIPPFKJ6';

afterEach(() => {
 delete (globalThis as { window?: unknown }).window;
});

/** Installs a fake extension on a fake window for one test. */
function install(api: Record<string, unknown> | undefined) {
 (globalThis as { window?: unknown }).window = api === undefined ? {} : { freighterApi: api };
}

describe('readAddress', () => {
 it('accepts the legacy bare-string shape', () => {
 expect(readAddress(G)).toBe(G);
 });

 it('accepts the current envelope shape', () => {
 expect(readAddress({ address: G })).toBe(G);
 });

 it('returns null when the envelope carries an error', () => {
 expect(readAddress({ address: G, error: 'User declined access' })).toBeNull();
 });

 it('returns null rather than guessing at an unknown shape', () => {
 expect(readAddress({ publicKey: G })).toBeNull();
 expect(readAddress(42)).toBeNull();
 expect(readAddress(null)).toBeNull();
 expect(readAddress(undefined)).toBeNull();
 });

 it('treats an empty string as no address', () => {
 expect(readAddress('')).toBeNull();
 expect(readAddress({ address: '' })).toBeNull();
 });
});

describe('readBoolean', () => {
 it('accepts both shapes', () => {
 expect(readBoolean(true)).toBe(true);
 expect(readBoolean({ isConnected: true })).toBe(true);
 expect(readBoolean({ isAllowed: true })).toBe(true);
 });

 it('defaults to false on anything unrecognised', () => {
 expect(readBoolean({ connected: true })).toBe(false);
 expect(readBoolean('yes')).toBe(false);
 expect(readBoolean(undefined)).toBe(false);
 });
});

describe('readNetwork', () => {
 it('accepts both shapes and rejects the rest', () => {
 expect(readNetwork('TESTNET')).toBe('TESTNET');
 expect(readNetwork({ network: 'PUBLIC' })).toBe('PUBLIC');
 expect(readNetwork({ net: 'PUBLIC' })).toBeUndefined();
 expect(readNetwork('')).toBeUndefined();
 });
});

describe('truncateAddress', () => {
 it('keeps both ends so it can be compared against an explorer', () => {
 expect(truncateAddress(G)).toBe('GCAL…FKJ6');
 });

 it('honours custom window sizes', () => {
 expect(truncateAddress(G, 6, 6)).toBe('GCALKS…PPFKJ6');
 });

 it('returns short input whole rather than making it longer', () => {
 expect(truncateAddress('GABC')).toBe('GABC');
 expect(truncateAddress('')).toBe('');
 });

 it('rejects negative windows', () => {
 expect(() => truncateAddress(G, -1)).toThrow(RangeError);
 });
});

describe('readStatus', () => {
 it('reports unavailable when no extension is injected', async () => {
 install(undefined);
 expect(await readStatus()).toEqual({ kind: 'unavailable' });
 });

 it('reports unavailable when the extension says it is not connected', async () => {
 install({ isConnected: async () => false, getAddress: async () => G });
 expect(await readStatus()).toEqual({ kind: 'unavailable' });
 });

 it('reports disconnected when present but no address is approved', async () => {
 install({ isConnected: async () => true, getAddress: async () => ({ address: '' }) });
 expect(await readStatus()).toEqual({ kind: 'disconnected' });
 });

 it('reports the address and network when connected', async () => {
 install({
 isConnected: async () => ({ isConnected: true }),
 getAddress: async () => ({ address: G }),
 getNetwork: async () => ({ network: 'TESTNET' }),
 });
 expect(await readStatus()).toEqual({ kind: 'connected', address: G, network: 'TESTNET' });
 });

 it('surfaces a thrown error as a renderable message instead of rejecting', async () => {
 install({
 isConnected: async () => true,
 getAddress: async () => {
 throw new Error('extension locked');
 },
 });
 expect(await readStatus()).toEqual({ kind: 'error', message: 'extension locked' });
 });
});

describe('connect', () => {
 it('reports unavailable when the extension cannot be asked', async () => {
 install(undefined);
 expect(await connect()).toEqual({ kind: 'unavailable' });
 });

 it('reports disconnected when the user declines', async () => {
 install({ requestAccess: async () => ({ error: 'User declined access' }) });
 expect(await connect()).toEqual({ kind: 'disconnected' });
 });

 it('reports connected on approval', async () => {
 install({
 requestAccess: async () => ({ address: G }),
 getNetwork: async () => 'TESTNET',
 });
 expect(await connect()).toEqual({ kind: 'connected', address: G, network: 'TESTNET' });
 });
});
