'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { formatAmount, sumAmounts, assetLabel } from '@/lib/money';

interface Payment {
  tx_hash: string;
  ledger: number | null;
  payer: string;
  amount: string;
  asset: string | null;
  ts: string;
  route: string | null;
  method: string | null;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; payments: Payment[]; fetchedAt: number }
  | { status: 'error'; message: string };

const POLL_INTERVAL_MS = 15_000;

const explorerUrl = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;

function truncate(value: string, head = 8, tail = 6) {
  return value.length <= head + tail + 1
    ? value
    : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export default function Dashboard() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [selected, setSelected] = useState<Payment | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPayments() {
      try {
        const res = await fetch('/api/payments', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Indexer responded ${res.status}`);
        }
        const data: Payment[] = await res.json();
        if (controller.signal.aborted) return;
        setState({ status: 'ready', payments: data, fetchedAt: Date.now() });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Unable to reach the indexer',
        });
      }
    }

    void fetchPayments();
    const timer = setInterval(fetchPayments, POLL_INTERVAL_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [reloadToken]);

  useEffect(() => {
    if (!selected) return;
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);

  const payments = state.status === 'ready' ? state.payments : [];
  const total = sumAmounts(payments.map((p) => p.amount));
  const assets = new Set(payments.map((p) => assetLabel(p.asset)));
  const totalAsset = assets.size === 1 ? [...assets][0] : '';

  return (
    <main className="min-h-screen text-white bg-[linear-gradient(160deg,#031207_0%,#010603_45%,#072813_160%)] font-sans p-6 md:p-20">
      <div className="max-w-6xl mx-auto space-y-16">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div>
            <p className="uppercase tracking-[0.25em] text-emerald-400 font-bold text-xs mb-4">
              Dashboard
            </p>
            <h1 className="text-5xl font-black tracking-tighter text-white">
              Settled Volume
            </h1>
            <p className="text-white/60 mt-4 text-lg font-medium">
              Payments settled on Stellar, indexed from the ledger.
            </p>
          </div>

          <div className="bg-[#041108]/75 border border-white/10 backdrop-blur-md rounded-3xl p-8 flex flex-col min-w-[300px] shadow-2xl">
            <span className="text-xs font-bold text-white/50 uppercase tracking-[0.2em]">
              Total settled
            </span>
            <span className="text-5xl font-black tracking-tighter mt-4 flex items-baseline gap-3">
              {state.status === 'loading' ? (
                <span className="inline-block h-12 w-48 rounded-xl bg-white/10 animate-pulse" />
              ) : (
                <>
                  {formatAmount(total)}
                  {totalAsset && (
                    <span className="text-2xl text-white/40 font-bold">{totalAsset}</span>
                  )}
                </>
              )}
            </span>
          </div>
        </header>

        <section className="bg-[#041108]/75 border border-white/10 backdrop-blur-lg rounded-3xl overflow-hidden shadow-2xl">
          <div className="px-10 py-8 border-b border-white/10 flex justify-between items-center gap-4 flex-wrap bg-white/5">
            <h2 className="text-2xl font-black tracking-tighter">Settlements</h2>
            <StatusPill state={state} onRetry={reload} />
          </div>

          {state.status === 'loading' && <TableSkeleton />}

          {state.status === 'error' && (
            <div className="px-10 py-32 text-center space-y-5">
              <p className="uppercase tracking-[0.25em] text-emerald-400 font-bold text-xs">Error</p>
              <p className="text-3xl font-black tracking-tighter text-white">Could not load payments</p>
              <p className="text-white/60 text-lg max-w-md mx-auto font-medium">
                {state.message}
              </p>
              <button
                onClick={reload}
                className="mt-8 px-8 py-4 rounded-xl bg-white/5 border border-white/20 text-white font-bold hover:bg-white/10 transition-colors tracking-wide"
              >
                Retry Connection
              </button>
            </div>
          )}

          {state.status === 'ready' && payments.length === 0 && (
            <div className="px-10 py-32 text-center space-y-5">
              <p className="uppercase tracking-[0.25em] text-emerald-400 font-bold text-xs">Awaiting Data</p>
              <p className="text-3xl font-black tracking-tighter text-white">No payments yet</p>
              <p className="text-white/60 text-lg max-w-md mx-auto font-medium">
                Once a payment settles to this merchant address, the indexer picks
                it up from the ledger and it appears here.
              </p>
            </div>
          )}

          {state.status === 'ready' && payments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] border-b border-white/10">
                    <th className="px-10 py-6">Transaction</th>
                    <th className="px-10 py-6">Amount</th>
                    <th className="px-10 py-6">Payer</th>
                    <th className="px-10 py-6">Route</th>
                    <th className="px-10 py-6">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payments.map((payment) => (
                    <tr
                      key={payment.tx_hash}
                      onClick={() => setSelected(payment)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      <td className="px-10 py-6 font-mono text-emerald-400 text-sm group-hover:text-emerald-300">
                        {truncate(payment.tx_hash)}
                      </td>
                      <td className="px-10 py-6">
                        <span className="font-black text-xl tracking-tighter">
                          {formatAmount(payment.amount)}
                        </span>
                        <span className="text-white/40 ml-2 text-sm font-bold">
                          {assetLabel(payment.asset)}
                        </span>
                      </td>
                      <td className="px-10 py-6 font-mono text-white/60 text-sm">
                        {truncate(payment.payer, 4, 4)}
                      </td>
                      <td className="px-10 py-6 text-white/80 font-medium">
                        {payment.route ? (
                          <span className="font-mono text-sm bg-white/5 px-2 py-1 rounded">
                            {payment.method && (
                              <span className="text-white/40 mr-2">
                                {payment.method}
                              </span>
                            )}
                            {payment.route}
                          </span>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                      <td className="px-10 py-6 text-white/50 text-sm font-medium">
                        {new Date(payment.ts).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#010603]/90 backdrop-blur-xl"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-details-title"
            className="bg-[#031207] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3
                id="payment-details-title"
                className="text-xl font-black tracking-tighter text-white"
              >
                Payment details
              </h3>
              <button
                ref={closeButtonRef}
                onClick={() => setSelected(null)}
                aria-label="Close payment details"
                className="text-white/50 hover:text-white transition-colors rounded-lg p-2 hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <div className="p-8 space-y-8">
              <Field label="Transaction hash">
                <span className="font-mono text-sm text-emerald-400 break-all bg-emerald-400/10 px-3 py-2 rounded-lg block">
                  {selected.tx_hash}
                </span>
              </Field>
              <div className="grid grid-cols-2 gap-8">
                <Field label="Amount">
                  <span className="text-4xl font-black tracking-tighter text-white">
                    {formatAmount(selected.amount)}{' '}
                    <span className="text-xl font-bold text-white/40">
                      {assetLabel(selected.asset)}
                    </span>
                  </span>
                </Field>
                <Field label="Ledger">
                  <span className="font-mono text-white/80 text-lg">{selected.ledger ?? '—'}</span>
                </Field>
              </div>
              <Field label="Payer">
                <span className="font-mono text-sm text-white/80 break-all block bg-white/5 px-3 py-2 rounded-lg">
                  {selected.payer}
                </span>
              </Field>
              {selected.route && (
                <Field label="Route">
                  <span className="font-mono text-sm text-white/80 bg-white/5 px-3 py-2 rounded-lg border border-white/10 block">
                    <span className="text-white/40 mr-2">{selected.method}</span>
                    {selected.route}
                  </span>
                </Field>
              )}
              <Field label="Settled at">
                <span className="text-white/80 font-medium block">
                  {new Date(selected.ts).toLocaleString()}
                </span>
              </Field>
              <div className="pt-8 mt-6 border-t border-white/10">
                <a
                  href={explorerUrl(selected.tx_hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full text-center py-4 rounded-xl bg-emerald-500 text-[#010603] hover:bg-emerald-400 transition-colors font-black tracking-wide text-lg shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                >
                  View on Stellar Expert ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="block text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-3">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

function StatusPill({
  state,
  onRetry,
}: {
  state: LoadState;
  onRetry: () => void;
}) {
  if (state.status === 'loading') {
    return <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Loading…</span>;
  }
  if (state.status === 'error') {
    return (
      <button
        onClick={onRetry}
        className="flex gap-3 items-center text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        Indexer unreachable — retry
      </button>
    );
  }
  return (
    <span className="flex gap-3 items-center text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      Live · updated {new Date(state.fetchedAt).toLocaleTimeString()}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="px-10 py-8 space-y-6" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-14 rounded-2xl bg-white/5 animate-pulse" />
      ))}
    </div>
  );
}
