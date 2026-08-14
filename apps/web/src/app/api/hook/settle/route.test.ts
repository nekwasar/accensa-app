import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import * as crypto from 'node:crypto';

vi.mock('@/lib/db', () => ({
  withClient: vi.fn(async (_cb) => {
    return { matchedExistingPayment: false };
  }),
  ensureSchema: vi.fn(),
  recordSettlement: vi.fn(),
}));

describe('POST /api/hook/settle', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://dummy';
    process.env.MERCHANT_PUBLIC_KEY = 'dfac12734284a3fd741b1392f7f545496462efa5ad0fb45f5d5ce79a09d46b2f';
  });

  const sign = (payload: string) => {
    const keyBuffer = Buffer.from('49df29e01fc8c973ea614aabdaed9041a9bc99c43e49e01c5188bfcc65bb33a1', 'hex');
    const privateKey = crypto.createPrivateKey({
      key: Buffer.concat([
        Buffer.from('302e020100300506032b657004220420', 'hex'),
        keyBuffer
      ]),
      format: 'der',
      type: 'pkcs8'
    });
    return crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('hex');
  };

  it('verifies a payload with non-ASCII and float', async () => {
    const rawBody = `{"tx_hash":"${'a'.repeat(64)}","route":"/café","method":"GET","amount":1.0}`;
    const req = new Request('http://localhost/api/hook/settle', {
      method: 'POST',
      headers: {
        'x-signature': sign(rawBody),
      },
      body: rawBody,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('rejects tampered body', async () => {
    const rawBody = `{"tx_hash":"${'a'.repeat(64)}","route":"/café","method":"GET","amount":1.0}`;
    const tamperedBody = `{"tx_hash":"${'a'.repeat(64)}","route":"/cafe","method":"GET","amount":1.0}`;
    const req = new Request('http://localhost/api/hook/settle', {
      method: 'POST',
      headers: {
        'x-signature': sign(rawBody),
      },
      body: tamperedBody,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 for unparseable body that passes signature', async () => {
    const rawBody = `not json`;
    const req = new Request('http://localhost/api/hook/settle', {
      method: 'POST',
      headers: {
        'x-signature': sign(rawBody),
      },
      body: rawBody,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
