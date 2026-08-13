## Description

This PR implements authentication for the dashboard and private API routes, addressing the critical lack of access control identified in #87. It introduces a Stellar Wallet (SEP-10-style) authentication model and secures the endpoints using Next.js edge middleware.

Fixes #87.

## Changes Included

*   **Authentication Model & Documentation**:
    *   Authored `DESIGN.md` detailing the choice of Stellar Wallet Auth over conventional sessions.
    *   Authored `SECURITY.md` detailing the scope of the JWT session cookie and route protection.
    *   Updated `README.md` with a security section.
*   **API Routes**:
    *   `GET /api/auth/challenge`: Generates a time-bounded Stellar `manageData` transaction containing a random nonce to serve as a challenge for the merchant.
    *   `POST /api/auth/verify`: Verifies the submitted transaction signature against the configured `MERCHANT_ADDRESS`. If valid, issues an HTTP-only JWT `accensa_session` cookie valid for 24 hours.
    *   `POST /api/auth/logout`: Clears the session cookie.
*   **Middleware**:
    *   Added `src/middleware.ts` to enforce authentication on `/dashboard`, `/api/payments`, `/api/routes`, and `/api/refund/preflight`.
    *   Deliberately keeps `/verify` and `POST /api/verify` public.
    *   Maintains the existing `CRON_SECRET` check for `GET /api/sync` so automated indexing workflows continue running undisturbed.
*   **Login Interface**:
    *   Created `src/app/login/page.tsx`, providing a secure UI that seamlessly triggers Freighter's `signTransaction` to complete the authentication loop.
*   **Code Quality**:
    *   Fixed strict `any` typing errors and unused variables throughout the codebase (e.g. `lib/auth.ts`, `api/hook/settle/route.ts`) so that CI passes flawlessly.

## Testing Strategy
- Verified all ESLint rules pass.
- Verified Vitest suite continues to pass (193 tests).
- Verified `GET /api/sync` remains accessible via `CRON_SECRET`.
