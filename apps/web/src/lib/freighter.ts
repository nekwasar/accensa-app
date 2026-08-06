/**
 * Thin wrapper over the Freighter browser extension's injected API.
 *
 * Deliberately dependency-free. The obvious alternative is `@stellar/freighter-api`
 * or Stellar Wallets Kit, but both are npm additions and this reads the same
 * `window.freighterApi` object those packages wrap. If a second wallet is ever
 * supported, replace this module rather than spreading `window` access through
 * components.
 *
 * Freighter has changed its return shapes across versions: older builds resolve
 * bare values (`string`, `boolean`), newer ones resolve `{ address, error }`
 * envelopes. Every reader below accepts both, because a merchant's installed
 * extension version is not something the app controls.
 */

/** What the extension exposes. Every method is optional — versions differ. */
interface InjectedFreighter {
 isConnected?: () => Promise<unknown>;
 getAddress?: () => Promise<unknown>;
 requestAccess?: () => Promise<unknown>;
 getNetwork?: () => Promise<unknown>;
 signTransaction?: (
 xdr: string,
 opts?: { networkPassphrase?: string; address?: string },
 ) => Promise<unknown>;
}

declare global {
 interface Window {
 freighterApi?: InjectedFreighter;
 }
}

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
 * Pulls an address out of whatever shape the extension returned.
 *
 * Returns null rather than guessing: an unrecognised shape means "we do not
 * know the address", and rendering a wrong or truncated-from-garbage address
 * next to a payment UI would be worse than rendering none.
 */
export function readAddress(value: unknown): string | null {
 if (typeof value === 'string') return value.length > 0 ? value : null;
 if (value && typeof value === 'object') {
 const envelope = value as { address?: unknown; error?: unknown };
 if (typeof envelope.error === 'string' && envelope.error.length > 0) return null;
 if (typeof envelope.address === 'string' && envelope.address.length > 0) {
 return envelope.address;
 }
 }
 return null;
}

/** Same tolerance for the boolean-ish `isConnected` / `isAllowed` results. */
export function readBoolean(value: unknown): boolean {
 if (typeof value === 'boolean') return value;
 if (value && typeof value === 'object') {
 const envelope = value as { isConnected?: unknown; isAllowed?: unknown };
 if (typeof envelope.isConnected === 'boolean') return envelope.isConnected;
 if (typeof envelope.isAllowed === 'boolean') return envelope.isAllowed;
 }
 return false;
}

/** Same tolerance for `getNetwork`. */
export function readNetwork(value: unknown): string | undefined {
 if (typeof value === 'string' && value.length > 0) return value;
 if (value && typeof value === 'object') {
 const envelope = value as { network?: unknown };
 if (typeof envelope.network === 'string' && envelope.network.length > 0) {
 return envelope.network;
 }
 }
 return undefined;
}

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

function message(error: unknown): string {
 if (error instanceof Error && error.message) return error.message;
 if (typeof error === 'string' && error) return error;
 return 'Wallet request failed';
}

/**
 * Reads current status without prompting the user.
 *
 * Safe to call on mount: `isConnected` and `getAddress` do not raise the
 * extension's approval dialog, so a visitor who has never connected sees no
 * popup just for loading the page.
 */
export async function readStatus(): Promise<WalletStatus> {
 const api = typeof window === 'undefined' ? undefined : window.freighterApi;
 if (!api) return { kind: 'unavailable' };

 try {
 if (api.isConnected && !readBoolean(await api.isConnected())) {
 return { kind: 'unavailable' };
 }
 const address = api.getAddress ? readAddress(await api.getAddress()) : null;
 if (!address) return { kind: 'disconnected' };
 const network = api.getNetwork ? readNetwork(await api.getNetwork()) : undefined;
 return { kind: 'connected', address, network };
 } catch (error) {
 return { kind: 'error', message: message(error) };
 }
}

/**
 * Prompts the extension for access. Only call from a user gesture — Freighter
 * ignores or blocks approval dialogs raised without one.
 */
export async function connect(): Promise<WalletStatus> {
 const api = typeof window === 'undefined' ? undefined : window.freighterApi;
 if (!api?.requestAccess) return { kind: 'unavailable' };

 try {
 const address = readAddress(await api.requestAccess());
 if (!address) return { kind: 'disconnected' };
 const network = api.getNetwork ? readNetwork(await api.getNetwork()) : undefined;
 return { kind: 'connected', address, network };
 } catch (error) {
 return { kind: 'error', message: message(error) };
 }
}

/**
 * Reads a signed envelope out of whatever shape the extension returned.
 *
 * Same tolerance as {@link readAddress}, and the same refusal to guess: a
 * malformed envelope here would be submitted to the network as a transaction,
 * so an unrecognised shape must be an error, never a best effort.
 */
export function readSignedXdr(value: unknown): string | null {
 if (typeof value === 'string') return value.length > 0 ? value : null;
 if (value && typeof value === 'object') {
 const envelope = value as { signedTxXdr?: unknown; error?: unknown };
 if (typeof envelope.error === 'string' && envelope.error.length > 0) return null;
 if (typeof envelope.signedTxXdr === 'string' && envelope.signedTxXdr.length > 0) {
 return envelope.signedTxXdr;
 }
 }
 return null;
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
 const api = typeof window === 'undefined' ? undefined : window.freighterApi;
 if (!api?.signTransaction) throw new Error('No Stellar wallet available to sign with');

 const signed = readSignedXdr(await api.signTransaction(xdr, opts));
 if (!signed) throw new Error('The wallet did not return a signed transaction');
 return signed;
}

/** Where a merchant installs the extension, for the unavailable state. */
export const FREIGHTER_INSTALL_URL = 'https://www.freighter.app/';
