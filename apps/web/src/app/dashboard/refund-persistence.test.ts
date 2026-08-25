import { describe, it, expect, beforeEach } from 'vitest';

const REFUNDED_STORAGE_KEY = 'accensa-refunded-txs';

// Mock localStorage for Node.js test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Ensure window is defined for the functions to use localStorage
if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: globalThis,
    writable: true,
  });
}

function loadRefundedFromStorage(): ReadonlySet<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(REFUNDED_STORAGE_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveRefundedToStorage(refunded: ReadonlySet<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REFUNDED_STORAGE_KEY, JSON.stringify([...refunded]));
  } catch {
    // localStorage may be full or unavailable; silently degrade.
  }
}

describe('Refunded localStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads an empty set when localStorage is empty', () => {
    const result = loadRefundedFromStorage();
    expect(result.size).toBe(0);
  });

  it('saves and loads a single refunded tx hash', () => {
    const refunded = new Set(['tx_hash_1']);
    saveRefundedToStorage(refunded);
    const loaded = loadRefundedFromStorage();
    expect(loaded.size).toBe(1);
    expect(loaded.has('tx_hash_1')).toBe(true);
  });

  it('saves and loads multiple refunded tx hashes', () => {
    const refunded = new Set(['tx_hash_1', 'tx_hash_2', 'tx_hash_3']);
    saveRefundedToStorage(refunded);
    const loaded = loadRefundedFromStorage();
    expect(loaded.size).toBe(3);
    expect(loaded.has('tx_hash_1')).toBe(true);
    expect(loaded.has('tx_hash_2')).toBe(true);
    expect(loaded.has('tx_hash_3')).toBe(true);
  });

  it('handles corrupted JSON in localStorage gracefully', () => {
    localStorage.setItem(REFUNDED_STORAGE_KEY, 'not-valid-json');
    const result = loadRefundedFromStorage();
    expect(result.size).toBe(0);
  });

  it('handles non-array JSON in localStorage gracefully', () => {
    localStorage.setItem(REFUNDED_STORAGE_KEY, JSON.stringify({ not: 'an array' }));
    const result = loadRefundedFromStorage();
    expect(result.size).toBe(0);
  });

  it('overwrites previous state when saving', () => {
    saveRefundedToStorage(new Set(['old_hash']));
    saveRefundedToStorage(new Set(['new_hash']));
    const loaded = loadRefundedFromStorage();
    expect(loaded.size).toBe(1);
    expect(loaded.has('new_hash')).toBe(true);
  });

  it('returns a new Set instance on each load', () => {
    saveRefundedToStorage(new Set(['hash']));
    const first = loadRefundedFromStorage();
    const second = loadRefundedFromStorage();
    expect(first).not.toBe(second);
    expect([...first]).toEqual([...second]);
  });

  it('preserves Set semantics after round-trip', () => {
    const original = new Set(['a', 'b', 'c']);
    saveRefundedToStorage(original);
    const loaded = loadRefundedFromStorage();
    expect(loaded instanceof Set).toBe(true);
    expect([...loaded].sort()).toEqual(['a', 'b', 'c']);
  });
});
