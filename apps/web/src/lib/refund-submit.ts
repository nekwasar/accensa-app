import {
  Address,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  xdr,
} from '@stellar/stellar-sdk';
import { signTransaction } from './freighter';
import { REFUND_VAULT_ID, paymentRef } from './refund-vault';

/**
 * Builds, signs, and submits a refund from the browser.
 *
 * The merchant's key never leaves their wallet: this assembles the envelope,
 * hands the XDR to Freighter, and submits whatever comes back. The server is
 * not in the signing path at all, which is the point — Accensa is not a
 * custodian, and a refund it could sign on its own would make it one.
 *
 * Callers are expected to have run the preflight first, so the common contract
 * rejections are already reported before a signing prompt appears.
 */

const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET;

/** How long to wait for the network to make up its mind. */
const CONFIRM_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 1_000;

export interface RefundInput {
  txHash: string;
  recipient: string;
  /** Stroops, decimal string. Never a float. */
  amount: string;
  paidAtLedger: number;
  merchant: string;
}

export type RefundOutcome =
  | { status: 'confirmed'; hash: string }
  /** Accepted by the network but still pending when we stopped waiting. */
  | { status: 'pending'; hash: string }
  | { status: 'failed'; message: string; hash?: string };

export async function submitRefund(input: RefundInput): Promise<RefundOutcome> {
  const server = new rpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith('http://') });

  try {
    // The real sequence number matters here, unlike in the read-only
    // simulations elsewhere: this transaction is actually submitted.
    const account = await server.getAccount(input.merchant);

    const operation = new Contract(REFUND_VAULT_ID).call(
      'refund',
      xdr.ScVal.scvBytes(Buffer.from(paymentRef(input.txHash), 'hex')),
      new Address(input.recipient).toScVal(),
      nativeToScVal(BigInt(input.amount), { type: 'i128' }),
      nativeToScVal(input.paidAtLedger, { type: 'u32' }),
    );

    const built = new TransactionBuilder(account, {
      fee: '1000000',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(180)
      .build();

    // prepareTransaction re-simulates and attaches the resource footprint and
    // fees the contract call needs. Submitting without it is rejected.
    const prepared = await server.prepareTransaction(built);

    const signedXdr = await signTransaction(prepared.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
      address: input.merchant,
    });

    const signed = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const sent = await server.sendTransaction(signed);

    if (sent.status === 'ERROR') {
      return {
        status: 'failed',
        message: 'The network rejected the transaction.',
        hash: sent.hash,
      };
    }

    return await waitForConfirmation(server, sent.hash);
  } catch (error) {
    return { status: 'failed', message: describe(error) };
  }
}

async function waitForConfirmation(server: rpc.Server, hash: string): Promise<RefundOutcome> {
  const deadline = Date.now() + CONFIRM_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const result = await server.getTransaction(hash);

    if (result.status === 'SUCCESS') return { status: 'confirmed', hash };
    if (result.status === 'FAILED') {
      return { status: 'failed', message: 'The refund failed on-chain.', hash };
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  // Not a failure: the transaction is in the network's hands and may still
  // succeed. Saying "failed" here could prompt a second refund of the same
  // payment, which the contract would reject but the merchant would not
  // understand.
  return { status: 'pending', hash };
}

function describe(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'The refund could not be submitted.';
}
