'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { VerifyResponse } from '../api/verify/route';

const SAMPLE = {
  batchId: '1',
  leaf: 'c476fc0553303ec4275bd4cb50ab7fa8182e343dbc4c721d7e2076fd77a5b56c',
  proof:
    '7ca64ee60e2b975f59f2a1f1cc1526d5b001a5c29f70291f316ba1c012a01bd1\n1733fad16ada0c23d8cdaff52bea66bea308dddddcb79348842acef0065c9615',
};

const FORGED_LEAF = '16b138aabc889c21114436424e13132bd8928d2c21b4ac5a9ac5198104efb42c';

type State =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'done'; result: VerifyResponse }
  | { status: 'error'; message: string };

export default function VerifyPage() {
  const [batchId, setBatchId] = useState('');
  const [leaf, setLeaf] = useState('');
  const [proof, setProof] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: 'checking' });
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: Number(batchId),
          leaf: leaf.trim(),
          proof: proof
            .split(/[\s,]+/)
            .map((p) => p.trim())
            .filter(Boolean),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setState({ status: 'error', message: body.error ?? `Request failed (${res.status})` });
        return;
      }
      setState({ status: 'done', result: body as VerifyResponse });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Request failed',
      });
    }
  }

  function loadSample(forged = false) {
    setBatchId(SAMPLE.batchId);
    setLeaf(forged ? FORGED_LEAF : SAMPLE.leaf);
    setProof(SAMPLE.proof);
    setState({ status: 'idle' });
  }

  return (
    <main className="min-h-screen text-white bg-[linear-gradient(160deg,#031207_0%,#010603_45%,#072813_160%)] font-sans px-6 py-20 md:py-32">
      <div className="max-w-3xl mx-auto space-y-16">
        <header className="space-y-6">
          <Link href="/" className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 hover:text-emerald-400 transition-colors">
            ← Back to Accensa
          </Link>
          <h1 className="text-5xl font-black tracking-tighter text-white">
            Verify a receipt
          </h1>
          <p className="text-white/70 leading-relaxed text-lg font-medium">
            Check that a payment receipt really belongs to a batch anchored on
            Stellar. Your receipt is checked <strong className="text-white font-black tracking-tight block sm:inline mt-2 sm:mt-0">twice</strong>:
            recomputed here from the proof, and independently by the{' '}
            <code className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded">ReceiptAnchor</code> contract on
            the ledger. They must agree.
          </p>
          <p className="text-white/50 text-sm font-bold uppercase tracking-widest border-l-2 border-white/20 pl-4">
            No account, no wallet, no signature. Both checks are read-only and
            cost nothing.
          </p>
        </header>

        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => loadSample(false)}
            className="px-6 py-4 rounded-xl bg-[#041108] border border-emerald-500/30 text-emerald-400 font-bold text-xs uppercase tracking-[0.1em] hover:bg-emerald-500/10 transition-colors"
          >
            Load a valid sample
          </button>
          <button
            type="button"
            onClick={() => loadSample(true)}
            className="px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-[0.1em] hover:bg-white/10 transition-colors"
          >
            Load a forged receipt
          </button>
        </div>

        <form onSubmit={submit} className="space-y-10 bg-[#041108]/75 backdrop-blur-md border border-white/10 rounded-3xl p-10 shadow-2xl">
          <Field label="Batch ID" hint="The anchored batch this receipt belongs to.">
            <input
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              inputMode="numeric"
              placeholder="1"
              required
              className="w-full bg-[#010603] border border-white/10 rounded-2xl px-6 py-5 font-mono text-white text-lg focus:outline-none focus:border-emerald-500/50 transition-colors shadow-inner"
            />
          </Field>

          <Field label="Receipt hash (leaf)" hint="Hex-encoded 32-byte hash of your receipt.">
            <input
              value={leaf}
              onChange={(e) => setLeaf(e.target.value)}
              placeholder="c476fc05…"
              required
              className="w-full bg-[#010603] border border-white/10 rounded-2xl px-6 py-5 font-mono text-emerald-100 text-lg focus:outline-none focus:border-emerald-500/50 transition-colors shadow-inner"
            />
          </Field>

          <Field
            label="Merkle proof"
            hint="One sibling hash per line, ordered leaf to root. A single-receipt batch has an empty proof."
          >
            <textarea
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              rows={4}
              placeholder={'7ca64ee6…\n1733fad1…'}
              className="w-full bg-[#010603] border border-white/10 rounded-2xl px-6 py-5 font-mono text-white/80 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors shadow-inner resize-y leading-relaxed"
            />
          </Field>

          <button
            type="submit"
            disabled={state.status === 'checking'}
            className="w-full px-8 py-6 rounded-2xl bg-emerald-500 text-[#010603] font-black text-xl hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors tracking-tight shadow-[0_0_30px_rgba(16,185,129,0.2)]"
          >
            {state.status === 'checking' ? 'Checking both sources…' : 'Verify receipt'}
          </button>
        </form>

        {state.status === 'error' && (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 space-y-3">
            <p className="text-emerald-400 font-black text-2xl tracking-tighter">Could not verify</p>
            <p className="text-white/70 font-medium">{state.message}</p>
          </div>
        )}

        {state.status === 'done' && <Result result={state.result} />}
      </div>
    </main>
  );
}

function Result({ result }: { result: VerifyResponse }) {
  const { local, onchain, verified, disagreement, batch } = result;

  return (
    <div className="space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div
        className={`rounded-3xl border p-10 ${
          verified
            ? 'border-emerald-500/40 bg-[#041108]/90 shadow-[0_0_50px_-10px_rgba(16,185,129,0.2)]'
            : 'border-white/20 bg-white/5'
        }`}
      >
        <p className={`text-4xl font-black tracking-tighter ${verified ? 'text-emerald-400' : 'text-white'}`}>
          {verified ? 'Receipt verified.' : 'Receipt not verified.'}
        </p>
        <p className="text-white/70 text-lg mt-6 leading-relaxed font-medium">
          {verified
            ? 'Both an independent local recomputation and the on-chain contract agree this receipt is in the anchored batch.'
            : 'This receipt is not part of the anchored batch. Nothing was charged incorrectly by checking — the proof simply does not lead to the anchored root.'}
        </p>
      </div>

      {disagreement && (
        <div className="rounded-3xl border border-emerald-400/40 bg-emerald-400/10 p-8">
          <p className="text-emerald-400 font-black text-2xl tracking-tighter">The two checks disagree</p>
          <p className="text-white/70 mt-3 font-medium">
            This should never happen. The local implementation and the contract
            are pinned to the same conformance vectors. Please report it.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <CheckCard
          title="Local recomputation"
          subtitle="Recomputed from your proof, in this process."
          result={local}
        />
        <CheckCard
          title="On-chain contract"
          subtitle="ReceiptAnchor.verify_receipt, read from the ledger."
          result={onchain}
        />
      </div>

      {batch && (
        <div className="rounded-3xl border border-white/10 bg-[#041108]/75 backdrop-blur-md p-10 space-y-8">
          <p className="uppercase tracking-[0.2em] font-bold text-xs">
            <Link
              href={`/batches/${batch.id}`}
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Anchored batch #{batch.id} →
            </Link>
          </p>
          <dl className="grid sm:grid-cols-2 gap-8 text-sm">
            <Detail label="Merkle root" mono>
              {batch.root}
            </Detail>
            <Detail label="Receipts in batch">{batch.count}</Detail>
            <Detail label="Period start">
              {new Date(batch.periodStart * 1000).toLocaleString()}
            </Detail>
            <Detail label="Period end">
              {new Date(batch.periodEnd * 1000).toLocaleString()}
            </Detail>
          </dl>
          <div className="pt-8 border-t border-white/10">
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${result.contract}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs font-bold uppercase tracking-[0.15em] text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              View contract on Stellar Expert ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckCard({
  title,
  subtitle,
  result,
}: {
  title: string;
  subtitle: string;
  result: { ok: boolean | null; error?: string };
}) {
  const tone =
    result.ok === true
      ? 'text-emerald-400'
      : result.ok === false
        ? 'text-white'
        : 'text-white/50';
  const label =
    result.ok === true ? 'Valid' : result.ok === false ? 'Not in batch' : 'Unavailable';

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 space-y-3">
      <p className="uppercase tracking-[0.2em] font-bold text-xs text-white/50">{title}</p>
      <p className={`text-3xl font-black tracking-tighter ${tone}`}>{label}</p>
      <p className="text-sm font-medium text-white/60 leading-relaxed pt-3">{subtitle}</p>
      {result.error && <p className="text-sm text-emerald-400/80 pt-3 font-mono">{result.error}</p>}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-3">
      <span className="block text-xs font-bold uppercase tracking-[0.2em] text-white/80">{label}</span>
      {children}
      <span className="block text-sm font-medium text-white/40">{hint}</span>
    </label>
  );
}

function Detail({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <dt className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">{label}</dt>
      <dd className={`text-white break-all text-xl font-black tracking-tighter ${mono ? 'font-mono text-[0.9rem] font-medium tracking-normal text-emerald-100' : ''}`}>
        {children}
      </dd>
    </div>
  );
}
