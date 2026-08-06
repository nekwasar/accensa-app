import { describe, it, expect } from 'vitest';
import { withClient, ensureSchema, setLastSyncedLedger, getLastSyncedLedger } from './db';

describe('Database Integration', () => {
  it('should ensure schema and perform basic operations', async () => {
    if (!process.env.DATABASE_URL) {
      console.warn('Skipping integration test as DATABASE_URL is missing');
      return;
    }
    await withClient(async (client) => {
      await ensureSchema(client);
      await setLastSyncedLedger(client, 42);
      const ledger = await getLastSyncedLedger(client);
      expect(ledger).toBe(42);
    });
  });
});
