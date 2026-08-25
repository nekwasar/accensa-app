import { expect, test, vi, describe, beforeEach } from 'vitest';
import { GET } from './route';

vi.mock('@/lib/db', () => ({
  withClient: vi.fn(),
  ensureSchema: vi.fn(),
}));

describe('/api/routes GET', () => {
  const mockRequest = (url: string) => {
    return new Request(url);
  };

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://dummy';
  });

  describe('from/to validation', () => {
    test('rejects non-timestamp from (e.g. banana)', async () => {
      const res = await GET(mockRequest('http://localhost/api/routes?from=banana'));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('from must be a valid ISO 8601 timestamp');
    });

    test('rejects non-timestamp to', async () => {
      const res = await GET(mockRequest('http://localhost/api/routes?to=banana'));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('to must be a valid ISO 8601 timestamp');
    });

    test('rejects from > to', async () => {
      const res = await GET(
        mockRequest(
          'http://localhost/api/routes?from=2026-01-02T00:00:00Z&to=2026-01-01T00:00:00Z',
        ),
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('from must not be later than to');
    });

    test('accepts valid timestamps', async () => {
      const { withClient } = await import('@/lib/db');
      vi.mocked(withClient).mockResolvedValue([]);
      const res = await GET(
        mockRequest(
          'http://localhost/api/routes?from=2026-01-01T00:00:00Z&to=2026-01-02T00:00:00Z',
        ),
      );
      expect(res.status).toBe(200);
    });
  });

  describe('error handling', () => {
    test('returns fixed error string on database failure', async () => {
      const { withClient } = await import('@/lib/db');
      vi.mocked(withClient).mockRejectedValue(
        new Error('connection refused on host db.example.com:5432'),
      );
      const res = await GET(mockRequest('http://localhost/api/routes'));
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Internal Server Error');
    });
  });
});
