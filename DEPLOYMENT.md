# Deployment topology

How the deployed pieces fit together, and the traps that have actually cost time
here. No credentials appear in this file, and none should be added to it.

## The shape of it

```
                    GitHub Actions (sync.yml)
                    scheduled every 5 min
                             │
                             │ POST /api/sync
                             │ Authorization: CRON_SECRET
                             ▼
  browser ──────▶  Vercel project `web`  ──────▶  Supabase Postgres
                   (Next.js, apps/web)     pooler   payments, sync_state
                             │
                             │ Soroban RPC (read-only)
                             ▼
                   Stellar testnet
                   ReceiptAnchor · RefundVault
```

Three moving parts, and only one of them is Vercel's:

- **`web`** — the Next.js app in `apps/web`. Serves the dashboard, the verifier,
  and the API routes. Aliased to `accensa-dashboard.vercel.app`.
- **Supabase Postgres** — holds `payments` (indexed chain data) and `sync_state`
  (the indexer's ledger cursor). Schema is created on first request; see
  `db-setup.md`.
- **GitHub Actions** — the real indexing cadence. Explained below, because the
  `vercel.json` cron is misleading on its own.

There is a second Vercel project, `docs`, serving `accensa-docs.vercel.app` from
`apps/docs`. It shares nothing with `web` but the repo.

## Indexing cadence — read this before trusting `vercel.json`

`apps/web/vercel.json` declares a **daily** cron. That is not the real cadence,
and it is not a design choice:

> On the Vercel Hobby plan, declaring more than one cron run per day is a **hard
> deploy failure**, not a silent clamp. The deploy is rejected.

So the schedule that matters lives in `.github/workflows/sync.yml`, which hits
`/api/sync` every 5 minutes. GitHub throttles high-frequency scheduled workflows,
so in practice it lands **every one to three hours**. `apps/web/src/lib/sync-status.ts`
sets its staleness thresholds from that observed behaviour rather than from the
declared schedule, so a normal gap is not reported to the merchant as a fault.

If you move off Hobby, raise the `vercel.json` cron and retire the Actions
workflow — do not run both, or the cursor gets contention from two writers.

**The cadence is not cosmetic.** Soroban RPC serves `getEvents` for roughly the
last 121,000 ledgers, about a week of testnet. If the cursor stops advancing for
longer than that it falls outside the retained window, and the ledgers in between
are unrecoverable — no later run can reach them. A sync that skipped ledgers this
way reports `skippedLedgers` in its response and `sync.yml` raises a warning; it
is the one failure here that cannot be fixed by running the job again.

## Reading a sync response

```json
{ "success": true, "latestLedger": 4067288, "startLedger": 3967288,
  "syncedTo": 4067288, "skippedLedgers": 0, "drained": true,
  "pages": 11, "windows": 11, "scanned": 1, "decoded": 1, "inserted": 1 }
```

| Field | Meaning |
|---|---|
| `syncedTo` | Where the cursor now stands. A reply without this field is not the indexer — `sync.yml` fails the run on it. |
| `drained` | False when paging stopped against the time budget. Not a fault; the next run resumes from `syncedTo`. |
| `windows` | `getEvents` calls made. Requests are bounded to 10,000 ledgers because the RPC silently truncates wider ranges. |
| `skippedLedgers` | Ledgers lost to the retention window. Should always be 0. |
| `scanned` / `decoded` / `inserted` | Events matched, decoded as transfers, and written. |

## Database connection

Use the **Session pooler** connection string, not Direct.

Direct is IPv6-only. Vercel Functions have no IPv6 route, so a Direct URL
produces connection timeouts that look like a database outage and are not.

The pooler host looks like `aws-1-<region>.pooler.supabase.com`.

## Environment variables

| Variable | Where | What it does |
|---|---|---|
| `DATABASE_URL` | Vercel (`web`) | Supabase **session pooler** connection string. |
| `CRON_SECRET` | Vercel (`web`) + GitHub secret | Shared by `/api/sync` and `sync.yml`. Anonymous callers get `{"error":"Unauthorized"}`. |
| `SYNC_URL` | GitHub secret | The `/api/sync` endpoint the workflow posts to. |
| `HOOK_API_KEY` | Vercel (`web`) | Gates `/api/hook/settle`. **Absent means the endpoint fails closed**, not open. |
| `NEXT_PUBLIC_REFUND_VAULT_ID` | Vercel (`web`), optional | Overrides the built-in RefundVault contract id. |

Set them per environment (`production`, `preview`, `development`) — Vercel does
not share values across them.

### `vercel env add` will silently store an empty value

Agent and CI shells default to `--non-interactive`, and piping to stdin in that
mode stores **nothing** without erroring:

```bash
vercel env add DATABASE_URL production --value "$CONNECTION_STRING"   # correct
echo "$CONNECTION_STRING" | vercel env add DATABASE_URL production    # stores empty
```

`vercel env ls` listing the key proves the key exists. It proves nothing about
its contents.

Vercel also marks new variables **sensitive** by default, and `vercel env pull`
returns sensitive values blank *by design* — a blank in your local pull is not
evidence the remote value is blank. Use `--no-sensitive` for non-secrets if you
want to read them back.

## Deploying

Two steps, not one:

```bash
git checkout main && git pull
vercel deploy --prod
vercel alias set <new-deployment-url> accensa-dashboard.vercel.app
```

**`--prod` alone does not move the alias.** `accensa-dashboard.vercel.app` is
assigned manually, so a production deploy leaves it pointing at the previous
build and the live site looks unchanged. This has caught people more than once.

Environment variables apply to **new builds only**. Changing one requires a
redeploy before it takes effect.

The repo root `.vercel/project.json` is linked to project `web`; that link is
what makes monorepo deploys resolve correctly from the root.

## Verifying a deploy

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://accensa-dashboard.vercel.app/
curl -s -o /dev/null -w "%{http_code}\n" https://accensa-dashboard.vercel.app/dashboard
curl -s -o /dev/null -w "%{http_code}\n" https://accensa-dashboard.vercel.app/verify
curl -s -o /dev/null -w "%{http_code}\n" https://accensa-dashboard.vercel.app/batches/1
curl -s -o /dev/null -w "%{http_code}\n" https://accensa-dashboard.vercel.app/batches/999  # expect 404
curl -s https://accensa-dashboard.vercel.app/api/sync                                      # expect Unauthorized
```

The `/batches/999` 404 and the `/api/sync` rejection are the two that catch a
half-configured deploy — a 200 from either means something is wrong.

## Rotating the database password

```
Supabase → Settings → Database → Reset database password
```

Then update `DATABASE_URL` in every Vercel environment that uses it and
redeploy, since env changes only reach new builds. Take the **session pooler**
string, per the IPv6 note above.
