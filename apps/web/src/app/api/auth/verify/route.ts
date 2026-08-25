import { NextResponse } from 'next/server';
import { Transaction, Networks, Keypair } from '@stellar/stellar-sdk';
import { createSession } from '@/lib/auth';

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

    const tx = new Transaction(xdr, Networks.TESTNET);

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
    const isValid = tx.signatures.some((sig) => kp.verify(tx.hash(), sig.signature()));

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Signature is valid. Issue session.
    await createSession(merchantAddress);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
