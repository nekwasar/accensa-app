/**
 * Role-based access control for the merchant dashboard (#156).
 *
 * Merchants can grant staff read-only access to orders without handing over
 * the ability to change settings or move money. Two roles exist:
 *
 * - `admin` — the full dashboard: settings, webhook config, refunds.
 * - `viewer` — can view payments and revenue, but cannot reach developer
 *   settings, webhook configs, refunds, or any mutation endpoint.
 *
 * The role rides inside the signed session JWT (see `lib/auth.ts`) and is
 * forwarded to route handlers by `src/middleware.ts` as the
 * `x-accensa-role` header, exactly like the merchant address is forwarded
 * as `x-accensa-merchant`. Server routes re-read the header instead of
 * trusting anything a caller supplies.
 *
 * Legacy sessions minted before roles existed carry no role claim; they are
 * treated as `admin` so a 24-hour-old cookie cannot lock a merchant out of
 * their own dashboard mid-deployment. New sessions always carry an explicit
 * role.
 */

export type Role = 'admin' | 'viewer';

export const ROLES: readonly Role[] = ['admin', 'viewer'];

/** Parses a role claim, rejecting anything that is not a known role. */
export function parseRole(value: unknown): Role | null {
  return typeof value === 'string' && (value === 'admin' || value === 'viewer')
    ? value
    : null;
}

/**
 * The caller's role, from the middleware-set header.
 *
 * Missing or unknown values resolve to `admin` for backward compatibility
 * with pre-RBAC sessions (see the module comment). The header can only ever
 * be set by middleware after jwtVerify succeeds, so a request cannot forge
 * it.
 */
export function roleFromRequest(request: Request): Role {
  return parseRole(request.headers.get('x-accensa-role')) ?? 'admin';
}

/** True when the caller may perform admin-only actions. */
export function isAdmin(request: Request): boolean {
  return roleFromRequest(request) === 'admin';
}
