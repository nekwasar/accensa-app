import { expect, test, vi, describe, beforeEach } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { GET } from './route';

const MERCHANT_KEYPAIR = Keypair.random();

const { mockStoreNonce, mockSweepExpiredNonces, mockEnsureSchema, mockWithClient } = vi.hoisted(
  () => ({
    mockStoreNonce: vi.fn().mockResolvedValue(undefined),
    mockSweepExpiredNonces: vi.fn().mockResolvedValue(undefined),
    mockEnsureSchema: vi.fn().mockResolvedValue(undefined),
    mockWithClient: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => {
      return fn({});
    }),
  }),
);

vi.mock('@/lib/db', () => ({
  withClient: mockWithClient,
  ensureSchema: mockEnsureSchema,
  storeNonce: mockStoreNonce,
  sweepExpiredNonces: mockSweepExpiredNonces,
}));

vi.mock('@/lib/db', () => ({
  withClient: mockWithClient,
  ensureSchema: mockEnsureSchema,
  storeNonce: mockStoreNonce,
  sweepExpiredNonces: mockSweepExpiredNonces,
}));

describe('/api/auth/challenge GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCHANT_ADDRESS = MERCHANT_KEYPAIR.publicKey();
  });

  test('returns xdr and configured network passphrase', async () => {
    process.env.STELLAR_NETWORK_PASSPHRASE =
      'Public Global Stellar Network ; September 2015';
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.xdr).toBeDefined();
    expect(typeof data.xdr).toBe('string');
    expect(data.networkPassphrase).toBe(
      'Public Global Stellar Network ; September 2015',
    );
  });

  test('defaults to Networks.TESTNET when STELLAR_NETWORK_PASSPHRASE is unset', async () => {
    delete process.env.STELLAR_NETWORK_PASSPHRASE;
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.networkPassphrase).toBe('Test SDF Network ; September 2015');
  });

  test('persists the nonce to the database', async () => {
    delete process.env.STELLAR_NETWORK_PASSPHRASE;
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockStoreNonce).toHaveBeenCalledTimes(1);
    const nonceArg = mockStoreNonce.mock.calls[0][1] as string;
    expect(nonceArg).toMatch(/^[0-9a-f]{64}$/);
    expect(mockSweepExpiredNonces).toHaveBeenCalledTimes(1);
  });

  test('returns 500 when MERCHANT_ADDRESS is not configured', async () => {
    delete process.env.MERCHANT_ADDRESS;
    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('MERCHANT_ADDRESS not configured');
  });
});
