import { expect, test, vi, describe, beforeEach } from 'vitest';
import { GET } from './route';

vi.mock('@/lib/db', () => ({
  withClient: vi.fn(),
  ensureSchema: vi.fn(),
  getSyncState: vi.fn(),
}));

describe('/api/payments GET', () => {
  const mockRequest = (url: string) => {
    return new Request(url);
  };

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://dummy';
  });

  describe('limit validation', () => {
    test('rejects non-numeric limit (e.g. abc)', async () => {
      const res = await GET(mockRequest('http://localhost/api/payments?limit=abc'));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('limit must be an integer between 1 and 1000');
    });

    test('rejects negative limit (-1)', async () => {
      const res = await GET(mockRequest('http://localhost/api/payments?limit=-1'));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('limit must be an integer between 1 and 1000');
    });

    test('rejects 0 limit', async () => {
      const res = await GET(mockRequest('http://localhost/api/payments?limit=0'));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('limit must be an integer between 1 and 1000');
    });

    test('rejects limit > 1000', async () => {
      const res = await GET(mockRequest('http://localhost/api/payments?limit=1001'));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('limit must be an integer between 1 and 1000');
    });

    test('rejects float limit', async () => {
      const res = await GET(mockRequest('http://localhost/api/payments?limit=10.5'));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('limit must be an integer between 1 and 1000');
    });
  });

  describe('cursor validation', () => {
    test('rejects non-base64 cursor', async () => {
      const res = await GET(mockRequest('http://localhost/api/payments?cursor=not-base64-!@#$'));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('invalid_cursor');
    });

    test('rejects cursor without |', async () => {
      const cursor = Buffer.from('invalidcursor').toString('base64');
      const res = await GET(mockRequest(`http://localhost/api/payments?cursor=${cursor}`));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('invalid_cursor');
    });

    test('rejects cursor with invalid timestamp', async () => {
      const cursor = Buffer.from('not-a-date|a'.repeat(64)).toString('base64');
      const res = await GET(mockRequest(`http://localhost/api/payments?cursor=${cursor}`));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('invalid_cursor');
    });

    test('rejects cursor with invalid hash length', async () => {
      const cursor = Buffer.from(`${new Date().toISOString()}|tooshort`).toString('base64');
      const res = await GET(mockRequest(`http://localhost/api/payments?cursor=${cursor}`));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('invalid_cursor');
    });
  });
});
