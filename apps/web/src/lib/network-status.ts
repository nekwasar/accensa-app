/**
 * Why a request failed, from the browser's point of view.
 *
 * `offline` - the browser has no network at all. Retrying is pointless until
 * connectivity returns, so the UI says so instead of offering a retry.
 * `unreachable` - the request never got a response even though the browser
 * believes it is online: the API or the Stellar RPC behind it is down, DNS is
 * failing, or a captive portal is swallowing the request.
 * `server` - a response came back and it was an error. The network is fine;
 * the message from the server is the useful thing to show.
 */
export type FailureKind = 'offline' | 'unreachable' | 'server';

/**
 * An aborted request is not a failure - the component unmounted or the poll
 * was superseded. Callers generally drop these before classifying, but the
 * check lives here so no caller has to remember the DOMException name.
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * True when `fetch` rejected instead of resolving, i.e. no response was ever
 * received.
 *
 * `fetch` signals this with a plain `TypeError`, but the message differs per
 * engine ("Failed to fetch" on Chrome, "NetworkError when attempting to fetch
 * resource" on Firefox, "Load failed" on Safari), so the type is what we match
 * on rather than the text. Errors we construct ourselves from a non-ok
 * response are ordinary `Error`s and fall through as server failures.
 */
export function isTransportError(error: unknown): boolean {
  return !isAbortError(error) && error instanceof TypeError;
}

/**
 * `online` is `navigator.onLine`, which is only trustworthy when false: a
 * browser reports online for any working link, including one that cannot reach
 * the internet. So being offline is taken at its word, and being "online" with
 * a transport error is reported as the service being unreachable rather than
 * as a connection the user can fix.
 */
export function classifyFailure(error: unknown, online: boolean): FailureKind {
  if (!online) return 'offline';
  return isTransportError(error) ? 'unreachable' : 'server';
}

/** What we say when the browser has no connection. Shared with the banner. */
export const OFFLINE_MESSAGE = 'No internet connection. Data shown may be out of date.';

/**
 * A sentence for the user, given a rejected request.
 *
 * The raw error text is only surfaced for server failures, where it came from
 * our own API and describes something real. Transport rejections carry engine
 * specific strings ("Load failed") that tell a merchant nothing.
 */
export function describeFailure(error: unknown, online: boolean): string {
  switch (classifyFailure(error, online)) {
    case 'offline':
      return OFFLINE_MESSAGE;
    case 'unreachable':
      return 'Could not reach the Accensa API. It may be down, or the Stellar RPC behind it is not responding.';
    case 'server': {
      const message = error instanceof Error ? error.message.trim() : '';
      return message || 'The request failed for an unknown reason.';
    }
  }
}
