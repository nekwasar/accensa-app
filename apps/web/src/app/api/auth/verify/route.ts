import { NextResponse } from 'next/server';
import { Transaction, Networks, Keypair } from '@stellar/stellar-sdk';
import { createSession } from '@/lib/auth';
import { withClient, ensureSchema, consumeNonce } from '@/lib/db';

function networkPassphrase(): string {
  return process.env.STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET;
}

export async function POST(request: Request) {
  const merchantAddress = process.env.MERCHANT_ADDRESS;
  if (!merchantAddress) {
    return NextResponse.json({ error: 'MERCHANT_ADDRESS not configured' }, { status: 500 });
  }

  try {
    const { xdr } = await request.json();
    if (!xdr) {
      return NextResponse.json({ error: 'Missing xdr' }, { status: 400 });
    }

    const tx = new Transaction(xdr, networkPassphrase());

    // Validate timebounds
    const now = Math.floor(Date.now() / 1000);
    const minTime = tx.timeBounds?.minTime ? parseInt(tx.timeBounds.minTime, 10) : 0;
    const maxTime = tx.timeBounds?.maxTime ? parseInt(tx.timeBounds.maxTime, 10) : 0;

    if (now < minTime || now > maxTime) {
      return NextResponse.json({ error: 'Challenge expired or invalid' }, { status: 401 });
    }

    // Validate source account
    if (tx.source !== merchantAddress) {
      return NextResponse.json({ error: 'Invalid source account' }, { status: 401 });
    }

    // Verify the signature
    const kp = Keypair.fromPublicKey(merchantAddress);
    const isValid = tx.signatures.some(sig => kp.verify(tx.hash(), sig.signature()));

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Verify the transaction contains exactly one manageData operation
    // with key "Accensa Auth" and a nonce this server issued.
    if (tx.operations.length !== 1) {
      return NextResponse.json({ error: 'Invalid challenge structure' }, { status: 401 });
    }

    const op = tx.operations[0];
    if (op.type !== 'manageData') {
      return NextResponse.json({ error: 'Invalid challenge structure' }, { status: 401 });
    }

    if (op.name !== 'Accensa Auth' || !op.value) {
      return NextResponse.json({ error: 'Invalid challenge structure' }, { status: 401 });
    }

    const nonce = typeof op.value === 'string'
      ? op.value
      : Buffer.from(op.value).toString('utf8');

    // Confirm the nonce was issued by this server and consume it
    const consumed = await withClient(async (client) => {
      await ensureSchema(client);
      return consumeNonce(client, nonce);
    });

    if (!consumed) {
      return NextResponse.json({ error: 'Invalid or reused nonce' }, { status: 401 });
    }

    // Signature is valid, challenge structure is correct, nonce is consumed. Issue session.
    await createSession(merchantAddress);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
