import {
 isConnected as freighterIsConnected,
 getAddress as freighterGetAddress,
 getNetwork as freighterGetNetwork,
 requestAccess as freighterRequestAccess,
 signTransaction as freighterSignTransaction,
} from '@stellar/freighter-api';

/**
 * Wallet access, over the official `@stellar/freighter-api`.
 *
 * This module previously read `window.freighterApi` directly, on the stated
 * reasoning that the npm package was only a wrapper over that global and
 * therefore an avoidable dependency. That was wrong, and it made every wallet
 * feature inert: Freighter injects `window.freighter` — a *boolean* — and
 * exposes no methods on the page at all. The real API is content-script
 * messaging, which is what this package wraps and what a page cannot
 * reasonably speak on its own. Reading `window.freighterApi` therefore found
 * `undefined` in every browser, so the navbar showed"Install Wallet"to
 * everyone including people who had Freighter installed, and refunds could
 * never be signed.
 *
 * The lesson worth keeping: a dependency is not automatically the expensive
 * choice. Reimplementing an undocumented, version-coupled message protocol is.
 *
 * Every call below returns an `{ ..., error? }` envelope rather than throwing,
 * so each one is checked. The `WalletStatus` union is unchanged, so components
 * that consume this module did not have to change with it.
 */

export type WalletStatus =
 /** No extension detected in this browser. */
 | { kind: 'unavailable' }
 /** Extension present, but the site has no approved address. */
 | { kind: 'disconnected' }
 /** Extension present and an address is approved for this site. */
 | { kind: 'connected'; address: string; network?: string }
 /** A call failed. Carries a message fit to render. */
 | { kind: 'error'; message: string };

/**
 * `GBXQ…4TQK` — enough of both ends to compare against an explorer, short
 * enough for a navbar.
 *
 * Addresses shorter than the two windows plus the ellipsis are returned whole:
 * truncating them would produce a longer string than the input.
 */
export function truncateAddress(address: string, lead = 4, tail = 4): string {
 if (lead < 0 || tail < 0) throw new RangeError('lead and tail must not be negative');
 if (address.length <= lead + tail + 1) return address;
 return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/**
 * Normalises anything the API or the runtime can hand back into a message fit
 * to put in front of a merchant.
 *
 * Freighter's errors arrive as `{ message, code }` in the envelope; a thrown
 * exception is still possible if the extension goes away mid-call.
 */
function message(error: unknown): string {
 if (error instanceof Error && error.message) return error.message;
 if (typeof error === 'string' && error) return error;
 if (error && typeof error === 'object') {
 const detail = (error as { message?: unknown }).message;
 if (typeof detail === 'string' && detail) return detail;
 }
 return 'Wallet request failed';
}

/** Reads the network name, treating its absence as"unknown"rather than a fault. */
async function readNetwork(): Promise<string | undefined> {
 try {
 const result = await freighterGetNetwork();
 if (result.error || !result.network) return undefined;
 return result.network;
 } catch {
 return undefined;
 }
}

/**
 * Reads current status without prompting the user.
 *
 * Safe to call on mount: `isConnected` and `getAddress` do not raise the
 * extension's approval dialog, so a visitor who has never connected sees no
 * popup just for loading the page. `getAddress` returns an empty address
 * rather than an error when the site has not been approved, which is what
 * distinguishes `disconnected` from `unavailable`.
 */
export async function readStatus(): Promise<WalletStatus> {
 try {
 const connection = await freighterIsConnected();
 if (connection.error) return { kind: 'error', message: message(connection.error) };
 if (!connection.isConnected) return { kind: 'unavailable' };

 const account = await freighterGetAddress();
 // Not an error worth showing: an unapproved site is the normal state for a
 // first-time visitor, and the extension reports it this way.
 if (account.error || !account.address) return { kind: 'disconnected' };

 return { kind: 'connected', address: account.address, network: await readNetwork() };
 } catch (error: unknown) {
 return { kind: 'error', message: message(error) };
 }
}

/**
 * Prompts the extension for access. Only call from a user gesture — Freighter
 * ignores or blocks approval dialogs raised without one.
 *
 * A declined prompt comes back as an error envelope, not a rejection, and is
 * reported as `disconnected`: the user made a choice, and showing them a red
 * error for having made it would be wrong.
 */
export async function connect(): Promise<WalletStatus> {
 try {
 const connection = await freighterIsConnected();
 if (!connection.isConnected) return { kind: 'unavailable' };

 const access = await freighterRequestAccess();
 if (access.error || !access.address) return { kind: 'disconnected' };

 return { kind: 'connected', address: access.address, network: await readNetwork() };
 } catch (error: unknown) {
 return { kind: 'error', message: message(error) };
 }
}

/**
 * Asks the extension to sign a transaction envelope.
 *
 * Throws rather than resolving null on refusal, because every caller is in the
 * middle of a money-moving flow where "no signature" must stop the flow rather
 * than fall through to a submit.
 */
export async function signTransaction(
 xdr: string,
 opts: { networkPassphrase: string; address?: string },
): Promise<string> {
 const result = await freighterSignTransaction(xdr, opts);
 if (result.error) throw new Error(message(result.error));
 if (!result.signedTxXdr) throw new Error('The wallet did not return a signed transaction');
 return result.signedTxXdr;
}

/** Where a merchant installs the extension, for the unavailable state. */
export const FREIGHTER_INSTALL_URL = 'https://freighter.app/';
