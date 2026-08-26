import { expect, test, vi, describe, beforeEach } from 'vitest';
import { Keypair, TransactionBuilder, Account, Operation, Networks } from '@stellar/stellar-sdk';
import { POST } from './route';

const MERCHANT_KEYPAIR = Keypair.random();
const MERCHANT_ADDRESS = MERCHANT_KEYPAIR.publicKey();

const { mockConsumeNonce, mockCreateSession, mockWithClient, mockEnsureSchema } = vi.hoisted(
  () => ({
    mockConsumeNonce: vi.fn(),
    mockCreateSession: vi.fn().mockResolvedValue(undefined),
    mockWithClient: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => {
      return fn({});
    }),
    mockEnsureSchema: vi.fn().mockResolvedValue(undefined),
  }),
);

vi.mock('@/lib/auth', () => ({
  createSession: mockCreateSession,
}));

vi.mock('@/lib/db', () => ({
  withClient: mockWithClient,
  ensureSchema: mockEnsureSchema,
  consumeNonce: mockConsumeNonce,
}));

function buildChallenge(nonce: string, passphrase = Networks.TESTNET) {
  const now = Math.floor(Date.now() / 1000);
  return new TransactionBuilder(new Account(MERCHANT_ADDRESS, '0'), {
    fee: '100',
    networkPassphrase: passphrase,
    timebounds: { minTime: now - 60, maxTime: now + 300 },
  })
    .addOperation(Operation.manageData({ name: 'Accensa Auth', value: nonce }))
    .build();
}

function buildNonChallengeTransaction(passphrase = Networks.TESTNET) {
  const now = Math.floor(Date.now() / 1000);
  return new TransactionBuilder(new Account(MERCHANT_ADDRESS, '0'), {
    fee: '100',
    networkPassphrase: passphrase,
    timebounds: { minTime: now - 60, maxTime: now + 300 },
  })
    .addOperation(Operation.manageData({ name: 'SomeOtherKey', value: 'somevalue' }))
    .build();
}

function buildMultiOpTransaction(nonce: string, passphrase = Networks.TESTNET) {
  const now = Math.floor(Date.now() / 1000);
  return new TransactionBuilder(new Account(MERCHANT_ADDRESS, '0'), {
    fee: '100',
    networkPassphrase: passphrase,
    timebounds: { minTime: now - 60, maxTime: now + 300 },
  })
    .addOperation(Operation.manageData({ name: 'Accensa Auth', value: nonce }))
    .addOperation(Operation.manageData({ name: 'Extra', value: 'data' }))
    .build();
}

describe('/api/auth/verify POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCHANT_ADDRESS = MERCHANT_ADDRESS;
    process.env.STELLAR_NETWORK_PASSPHRASE = Networks.TESTNET;
    mockConsumeNonce.mockResolvedValue(true);
  });

  const makeRequest = (body: unknown) =>
    new Request('http://localhost/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  test('accepts a valid challenge and issues a session', async () => {
    const nonce = 'a'.repeat(64);
    const tx = buildChallenge(nonce);
    tx.sign(MERCHANT_KEYPAIR);

    const res = await POST(makeRequest({ xdr: tx.toXDR() }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockConsumeNonce).toHaveBeenCalledWith(expect.anything(), nonce);
    expect(mockCreateSession).toHaveBeenCalledWith(MERCHANT_ADDRESS);
  });

  test('rejects a transaction with no manageData operation', async () => {
    const tx = buildNonChallengeTransaction();
    tx.sign(MERCHANT_KEYPAIR);

    const res = await POST(makeRequest({ xdr: tx.toXDR() }));

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid challenge structure');
    expect(mockConsumeNonce).not.toHaveBeenCalled();
  });

  test('rejects a transaction with multiple operations', async () => {
    const nonce = 'b'.repeat(64);
    const tx = buildMultiOpTransaction(nonce);
    tx.sign(MERCHANT_KEYPAIR);

    const res = await POST(makeRequest({ xdr: tx.toXDR() }));

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid challenge structure');
  });

  test('rejects a challenge with a nonce the server never issued', async () => {
    const nonce = 'c'.repeat(64);
    mockConsumeNonce.mockResolvedValue(false);

    const tx = buildChallenge(nonce);
    tx.sign(MERCHANT_KEYPAIR);

    const res = await POST(makeRequest({ xdr: tx.toXDR() }));

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid or reused nonce');
  });

  test('rejects the same valid challenge twice (replay protection)', async () => {
    const nonce = 'd'.repeat(64);
    const tx = buildChallenge(nonce);
    tx.sign(MERCHANT_KEYPAIR);
    const xdr = tx.toXDR();

    // First attempt succeeds
    mockConsumeNonce.mockResolvedValueOnce(true);
    const res1 = await POST(makeRequest({ xdr }));
    expect(res1.status).toBe(200);

    // Second attempt fails because the nonce is already consumed
    mockConsumeNonce.mockResolvedValueOnce(false);
    const res2 = await POST(makeRequest({ xdr }));
    expect(res2.status).toBe(401);
    expect(await res2.json()).toMatchObject({
      error: 'Invalid or reused nonce',
    });
  });

  test('rejects a challenge after maxTime has passed', async () => {
    const now = Math.floor(Date.now() / 1000);
    const tx = new TransactionBuilder(new Account(MERCHANT_ADDRESS, '0'), {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
      timebounds: { minTime: now - 120, maxTime: now - 60 },
    })
      .addOperation(Operation.manageData({ name: 'Accensa Auth', value: 'e'.repeat(64) }))
      .build();
    tx.sign(MERCHANT_KEYPAIR);

    const res = await POST(makeRequest({ xdr: tx.toXDR() }));

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Challenge expired or invalid');
  });

  test('returns 500 when MERCHANT_ADDRESS is not configured', async () => {
    delete process.env.MERCHANT_ADDRESS;
    const res = await POST(makeRequest({ xdr: 'anything' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('MERCHANT_ADDRESS not configured');
  });

  test('returns 400 when xdr is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing xdr');
  });

  test('uses the configured network passphrase for parsing', async () => {
    process.env.STELLAR_NETWORK_PASSPHRASE = Networks.PUBLIC;
    const nonce = 'f'.repeat(64);
    const tx = buildChallenge(nonce, Networks.PUBLIC);
    tx.sign(MERCHANT_KEYPAIR);

    const res = await POST(makeRequest({ xdr: tx.toXDR() }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
