import 'dotenv/config';
import {
  decodeTransferEvent,
  transferTopicFilter,
  addressTopicFilter,
} from './lib/stellar-events.js';
import {
  withClient,
  ensureSchema,
  getLastSyncedLedger,
  setLastSyncedLedger,
} from './lib/db.js';
import {
  drainEvents,
  safeCursorLedger,
  EVENTS_PAGE_LIMIT,
  type EventPage,
} from './lib/event-pager.js';

const RPC_URL = process.env.STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org';
const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS;

if (!MERCHANT_ADDRESS) {
  console.error("MERCHANT_ADDRESS is not configured");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured");
  process.exit(1);
}

const ASSET_CONTRACT_IDS = (
  process.env.ASSET_CONTRACT_IDS ??
  'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const COLD_START_LOOKBACK = 2_000;
const MAX_LOOKBACK = 100_000;
const PAGING_BUDGET_MS = 45_000;
const POLL_INTERVAL_MS = 5_000;

async function rpc<T>(method: string, params: unknown, maxAttempts = 3): Promise<T> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      if (!res.ok) throw new Error(`RPC ${method} failed: ${res.status}`);
      const body = await res.json();
      if (body.error) throw new Error(`RPC ${method}: ${body.error.message ?? 'unknown error'}`);
      return body.result as T;
    } catch (error) {
      if (attempt >= maxAttempts) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }
  throw new Error('Unreachable');
}

async function runSync(merchant: string) {
  return withClient(async (client) => {
    await ensureSchema(client);

    const { sequence: latestLedger } = await rpc<{ sequence: number }>('getLatestLedger', {});

    const cursor = await getLastSyncedLedger(client);
    const startLedger = Math.max(
      cursor !== null ? cursor + 1 : latestLedger - COLD_START_LOOKBACK,
      latestLedger - MAX_LOOKBACK,
      1,
    );

    if (startLedger > latestLedger) {
      return { syncedTo: startLedger - 1, inserted: 0 };
    }

    const toTopic = addressTopicFilter(merchant);
    const transfer = transferTopicFilter();
    const filters = [
      {
        type: 'contract',
        contractIds: ASSET_CONTRACT_IDS,
        topics: [
          [transfer, '*', toTopic, '*'],
          [transfer, '*', toTopic],
        ],
      },
    ];

    const deadline = Date.now() + PAGING_BUDGET_MS;
    const { events, drained } = await drainEvents(
      ({ startLedger: from, cursor: pageCursor }) =>
        rpc<EventPage>('getEvents', {
          ...(pageCursor ? {} : { startLedger: from }),
          filters,
          pagination: { limit: EVENTS_PAGE_LIMIT, ...(pageCursor ? { cursor: pageCursor } : {}) },
          xdrFormat: 'base64',
        }),
      { startLedger, withinBudget: () => Date.now() < deadline },
    );

    let inserted = 0;
    let maxLedger = startLedger - 1;

    for (const event of events) {
      const transferEvent = decodeTransferEvent(event);
      if (!transferEvent) continue;
      maxLedger = Math.max(maxLedger, transferEvent.ledger);
      if (transferEvent.to !== merchant) continue;

      const res = await client.query(
        `INSERT INTO payments (tx_hash, ledger, payer, amount, asset, ts)
        VALUES ($1, $2, $3, $4::numeric, $5, $6::timestamptz)
        ON CONFLICT (tx_hash) DO UPDATE
        SET ledger = EXCLUDED.ledger,
            payer = EXCLUDED.payer,
            amount = EXCLUDED.amount,
            asset = EXCLUDED.asset,
            ts = EXCLUDED.ts
        WHERE payments.ledger IS NULL RETURNING *`,
        [
          transferEvent.txHash,
          transferEvent.ledger,
          transferEvent.from,
          transferEvent.amount,
          transferEvent.asset,
          transferEvent.ledgerClosedAt,
        ],
      );

      if (res.rowCount && res.rowCount > 0 && process.env.WEBHOOK_URL) {
        const payment = res.rows[0];
        const timeoutMs = 2000;
        for (let i = 0; i < 3; i++) {
          try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeoutMs);
            const webhookRes = await fetch(process.env.WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payment),
              signal: controller.signal
            });
            clearTimeout(id);
            if (webhookRes.ok || webhookRes.status < 500) break;
          } catch (_e) {}
        }
      }
      inserted += res.rowCount ?? 0;
    }

    const syncedTo = safeCursorLedger(maxLedger, drained, startLedger);
    await setLastSyncedLedger(client, syncedTo);

    return { syncedTo, inserted };
  });
}

async function loop() {
  console.log(`Starting indexer loop for merchant ${MERCHANT_ADDRESS}...`);
  while (true) {
    try {
      const { inserted, syncedTo } = await runSync(MERCHANT_ADDRESS!);
      if (inserted > 0) {
        console.log(`Synced to ${syncedTo}, inserted ${inserted} payments`);
      }
    } catch (err) {
      console.error('Error during sync run:', err);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

loop();
