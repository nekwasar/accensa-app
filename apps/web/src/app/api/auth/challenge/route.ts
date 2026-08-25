import { NextResponse } from 'next/server';
import { TransactionBuilder, Account, Operation, Networks } from '@stellar/stellar-sdk';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const merchantAddress = process.env.MERCHANT_ADDRESS;
  if (!merchantAddress) {
    return NextResponse.json({ error: 'MERCHANT_ADDRESS not configured' }, { status: 500 });
  }

  // Create a 64-byte random nonce
  const nonce = randomBytes(32).toString('hex');

  // Create a SEP-10 style challenge transaction
  // The source account is the merchant, sequence is 0
  const now = Math.floor(Date.now() / 1000);
  const tx = new TransactionBuilder(new Account(merchantAddress, '0'), {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
    timebounds: { minTime: now - 60, maxTime: now + 300 },
  })
    .addOperation(Operation.manageData({ name: 'Accensa Auth', value: nonce.substring(0, 64) }))
    .build();

  return NextResponse.json({
    xdr: tx.toXDR(),
    networkPassphrase: Networks.TESTNET,
  });
}
