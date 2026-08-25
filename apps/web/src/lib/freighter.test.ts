import { describe, it, expect, vi, beforeEach } from 'vitest';
import { truncateAddress, readStatus, connect, signTransaction } from './freighter';
import {
  isConnected,
  getAddress,
  getNetwork,
  requestAccess,
  signTransaction as freighterSign,
} from '@stellar/freighter-api';

/**
 * The extension is mocked at the package boundary rather than by faking a
 * window global. That is the whole point of this suite: the previous version
 * installed a `window.freighterApi` object that Freighter has never provided,
 * so every test passed against a wallet that could not exist, while the real
 * integration was inert in every browser.
 */
vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(),
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
}));

const G = 'GCALKSGAZRJLSUEJT3M5W6LN4R7XQOLIRCOS6ZA6EDZVTZDBIIPPFKJ6';

/** The shape Freighter returns when a call succeeds with nothing to say. */
const NO_NETWORK = { network: '', networkPassphrase: '' };

beforeEach(() => {
  vi.mocked(isConnected).mockReset();
  vi.mocked(getAddress).mockReset();
  vi.mocked(getNetwork).mockReset();
  vi.mocked(requestAccess).mockReset();
  vi.mocked(freighterSign).mockReset();
});

describe('truncateAddress', () => {
  it('keeps both ends so it can be compared against an explorer', () => {
    expect(truncateAddress(G)).toBe('GCAL…FKJ6');
  });

  it('honours custom window sizes', () => {
    expect(truncateAddress(G, 6, 2)).toBe('GCALKS…J6');
  });

  it('returns short input whole rather than making it longer', () => {
    expect(truncateAddress('GABC')).toBe('GABC');
  });

  it('rejects negative windows', () => {
    expect(() => truncateAddress(G, -1)).toThrow(RangeError);
  });
});

describe('readStatus', () => {
  it('reports unavailable when the extension is not installed', async () => {
    vi.mocked(isConnected).mockResolvedValue({ isConnected: false });

    expect(await readStatus()).toEqual({ kind: 'unavailable' });
    // The whole bug in one assertion: an installed wallet must not be
    // mistaken for a missing one, so nothing else may be consulted first.
    expect(getAddress).not.toHaveBeenCalled();
  });

  it('reports disconnected when installed but the site is not approved', async () => {
    vi.mocked(isConnected).mockResolvedValue({ isConnected: true });
    // Freighter answers an unapproved site with an empty address, not an error.
    vi.mocked(getAddress).mockResolvedValue({ address: '' });

    expect(await readStatus()).toEqual({ kind: 'disconnected' });
  });

  it('treats an error from getAddress as disconnected, not as a fault', async () => {
    vi.mocked(isConnected).mockResolvedValue({ isConnected: true });
    vi.mocked(getAddress).mockResolvedValue({
      address: '',
      error: { code: -1, message: 'User declined access' },
    });

    expect(await readStatus()).toEqual({ kind: 'disconnected' });
  });

  it('reports the address and network when connected', async () => {
    vi.mocked(isConnected).mockResolvedValue({ isConnected: true });
    vi.mocked(getAddress).mockResolvedValue({ address: G });
    vi.mocked(getNetwork).mockResolvedValue({
      network: 'TESTNET',
      networkPassphrase: 'Test SDF Network ; September 2015',
    });

    expect(await readStatus()).toEqual({ kind: 'connected', address: G, network: 'TESTNET' });
  });

  it('still reports connected when the network cannot be read', async () => {
    vi.mocked(isConnected).mockResolvedValue({ isConnected: true });
    vi.mocked(getAddress).mockResolvedValue({ address: G });
    vi.mocked(getNetwork).mockRejectedValue(new Error('extension went away'));

    expect(await readStatus()).toEqual({ kind: 'connected', address: G, network: undefined });
  });

  it('surfaces an isConnected error as a renderable message', async () => {
    vi.mocked(isConnected).mockResolvedValue({
      isConnected: false,
      error: { code: -1, message: 'Extension is locked' },
    });

    expect(await readStatus()).toEqual({ kind: 'error', message: 'Extension is locked' });
  });

  it('does not reject when a call throws outright', async () => {
    vi.mocked(isConnected).mockRejectedValue(new Error('boom'));

    expect(await readStatus()).toEqual({ kind: 'error', message: 'boom' });
  });
});

describe('connect', () => {
  it('reports unavailable rather than prompting when nothing is installed', async () => {
    vi.mocked(isConnected).mockResolvedValue({ isConnected: false });

    expect(await connect()).toEqual({ kind: 'unavailable' });
    expect(requestAccess).not.toHaveBeenCalled();
  });

  it('reports disconnected when the user declines the prompt', async () => {
    vi.mocked(isConnected).mockResolvedValue({ isConnected: true });
    vi.mocked(requestAccess).mockResolvedValue({
      address: '',
      error: { code: -1, message: 'User declined access' },
    });

    // A declined prompt is a choice, not a fault - it must not render as an error.
    expect(await connect()).toEqual({ kind: 'disconnected' });
  });

  it('reports connected on approval', async () => {
    vi.mocked(isConnected).mockResolvedValue({ isConnected: true });
    vi.mocked(requestAccess).mockResolvedValue({ address: G });
    vi.mocked(getNetwork).mockResolvedValue(NO_NETWORK);

    expect(await connect()).toEqual({ kind: 'connected', address: G, network: undefined });
  });
});

describe('signTransaction', () => {
  it('returns the signed envelope', async () => {
    vi.mocked(freighterSign).mockResolvedValue({
      signedTxXdr: 'AAAA-signed',
      signerAddress: G,
    });

    expect(await signTransaction('AAAA-unsigned', { networkPassphrase: 'x' })).toBe('AAAA-signed');
  });

  it('throws when the user refuses, so a refund flow cannot continue unsigned', async () => {
    vi.mocked(freighterSign).mockResolvedValue({
      signedTxXdr: '',
      signerAddress: '',
      error: { code: -1, message: 'User declined to sign' },
    });

    await expect(signTransaction('AAAA', { networkPassphrase: 'x' })).rejects.toThrow(
      'User declined to sign',
    );
  });

  it('throws rather than returning an empty envelope', async () => {
    vi.mocked(freighterSign).mockResolvedValue({ signedTxXdr: '', signerAddress: G });

    await expect(signTransaction('AAAA', { networkPassphrase: 'x' })).rejects.toThrow(
      'did not return a signed transaction',
    );
  });
});
