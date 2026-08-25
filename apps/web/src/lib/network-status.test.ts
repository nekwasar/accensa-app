import { describe, it, expect } from 'vitest';
import {
  classifyFailure,
  describeFailure,
  isAbortError,
  isTransportError,
  OFFLINE_MESSAGE,
} from './network-status';

/** What `fetch` rejects with when no response is received. */
const transportError = (message: string) => new TypeError(message);

/** What `AbortController.abort()` produces in a browser. */
const abortError = () => {
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
};

describe('isAbortError', () => {
  it('recognises an aborted request by name, not message', () => {
    expect(isAbortError(abortError())).toBe(true);
    expect(isAbortError(new Error('The operation was aborted.'))).toBe(false);
  });

  it('ignores non-errors', () => {
    expect(isAbortError('aborted')).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});

describe('isTransportError', () => {
  it('matches the per-engine wording of a failed fetch', () => {
    expect(isTransportError(transportError('Failed to fetch'))).toBe(true);
    expect(
      isTransportError(transportError('NetworkError when attempting to fetch resource.')),
    ).toBe(true);
    expect(isTransportError(transportError('Load failed'))).toBe(true);
  });

  it('does not match an error we built from a response we did receive', () => {
    expect(isTransportError(new Error('Error 500'))).toBe(false);
  });

  it('does not treat an abort as a transport failure', () => {
    const aborted = new TypeError('The operation was aborted.');
    aborted.name = 'AbortError';
    expect(isTransportError(aborted)).toBe(false);
  });
});

describe('classifyFailure', () => {
  it('trusts navigator.onLine when it says offline, whatever the error was', () => {
    expect(classifyFailure(transportError('Failed to fetch'), false)).toBe('offline');
    expect(classifyFailure(new Error('Error 502'), false)).toBe('offline');
  });

  it('blames the service, not the connection, when a fetch dies while online', () => {
    expect(classifyFailure(transportError('Failed to fetch'), true)).toBe('unreachable');
  });

  it('treats an error carrying a server response as a server failure', () => {
    expect(classifyFailure(new Error('Error 500'), true)).toBe('server');
  });
});

describe('describeFailure', () => {
  it('gives the offline message the banner uses, so the two agree', () => {
    expect(describeFailure(transportError('Failed to fetch'), false)).toBe(OFFLINE_MESSAGE);
  });

  it('names the RPC as a possible cause when the API cannot be reached', () => {
    expect(describeFailure(transportError('Load failed'), true)).toMatch(/Stellar RPC/);
  });

  it('passes a server message straight through - it is the useful part', () => {
    expect(describeFailure(new Error('merchant address not configured'), true)).toBe(
      'merchant address not configured',
    );
  });

  it('never surfaces the raw engine wording of a transport failure', () => {
    expect(describeFailure(transportError('Load failed'), true)).not.toMatch(/Load failed/);
  });

  it('falls back when a server failure carries no message', () => {
    expect(describeFailure(new Error('   '), true)).toBe(
      'The request failed for an unknown reason.',
    );
    expect(describeFailure({ nope: true }, true)).toBe('The request failed for an unknown reason.');
  });
});
