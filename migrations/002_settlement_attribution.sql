-- Route-level attribution reported by the merchant's x402 server.
--
-- A SAC transfer event carries payer, amount, and asset. It does not carry the
-- HTTP route that was paid for — that mapping exists only inside the seller's
-- process at settlement time, so it arrives via POST /api/hook/settle rather
-- than from the indexer.
--
-- hook_reported_at marks a row as carrying merchant-reported data. Keeping the
-- two provenances distinguishable matters: everything else in this table is an
-- observation of the ledger, and these fields are not.

BEGIN;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS hook_reported_at TIMESTAMPTZ;

-- Attribution is reported the instant x402 settles; the indexer runs on a
-- schedule. So a reported settlement almost always arrives before the transfer
-- has been indexed, and the staged row genuinely has no amount or payer yet.
--
-- These columns were NOT NULL, which forced a choice between dropping the
-- attribution or inventing a zero amount. Inventing one is precisely the
-- fabrication this schema is meant to prevent, so the constraint goes instead.
-- The chain remains the only writer of amount, asset, ledger, and ts.
ALTER TABLE payments ALTER COLUMN amount DROP NOT NULL;
ALTER TABLE payments ALTER COLUMN payer  DROP NOT NULL;

-- A settlement can be reported before the indexer reaches that ledger. Those
-- rows are staged with ledger, ts, amount, and asset all null, and completed on
-- a later sync run.
--
-- NOTE for future cleanup migrations: 001 deleted rows with a null ledger on
-- the grounds that they were fabricated by the old writers. That rule no longer
-- holds unconditionally. A staged row is identified by hook_reported_at being
-- set and ts being null; it is a pending observation, not a fabrication. The
-- dashboard already excludes it by filtering on ts IS NOT NULL, so it can never
-- be presented as revenue before the chain confirms it.
CREATE INDEX IF NOT EXISTS idx_payments_hook_reported ON payments(hook_reported_at)
  WHERE hook_reported_at IS NOT NULL;

COMMIT;
