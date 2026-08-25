# Security

## Authentication Model

The dashboard and the private API routes are authenticated via a Stellar Wallet (SEP-10-style) authentication.
Users prove they control `MERCHANT_ADDRESS` by signing a challenge.
Successful authentication yields an HTTP-only JWT session cookie (`accensa_session`), valid for 24 hours.

### Public Routes

- `/verify`
- `POST /api/verify`
- Landing pages and Docs

### Private Routes

- `/dashboard` (and all subpaths)
- `GET /api/payments`
- `GET /api/routes`
- `POST /api/refund/preflight`
- `POST /api/sync` (if called manually)

_Note:_ `GET /api/sync` uses a cron secret to allow automated invocation via GitHub Actions without needing a wallet signature.

If the session cookie is compromised, an attacker can only read payment aggregation data. They cannot execute refunds or move funds, as all on-chain actions still require the merchant's private key via their wallet.
