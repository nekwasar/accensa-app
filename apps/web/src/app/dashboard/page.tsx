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
const explorerUrl = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`;

function truncate(value: string, head = 8, tail = 6) {
  return value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
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
        const res = await fetch('/api/payments', { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Error ${res.status}`);
        const data = await res.json();
        if (!controller.signal.aborted) setState({ status: 'ready', payments: data, fetchedAt: Date.now() });
      } catch (error) {
        if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof Error ? error.message : 'Failed' });
      }
    }
    void fetchPayments();
    const timer = setInterval(fetchPayments, POLL_INTERVAL_MS);
    return () => { controller.abort(); clearInterval(timer); };
  }, [reloadToken]);

  useEffect(() => {
    if (!selected) return;
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);

  const payments = state.status === 'ready' ? state.payments : [];
  const total = sumAmounts(payments.map((p) => p.amount));
  const assets = new Set(payments.map((p) => assetLabel(p.asset)));
  const totalAsset = assets.size === 1 ? [...assets][0] : '';

  return (
    <main className="min-h-screen text-slate-600 dark:text-slate-200 font-sans selection:bg-emerald-500/20 dark:selection:bg-emerald-500/30 transition-colors duration-300 p-6 md:p-12 lg:p-20">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header Grid */}
        <header className="grid lg:grid-cols-3 gap-8 items-end">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <p className="uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-3">Dashboard</p>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white transition-colors duration-300">Settled Volume</h1>
            </div>
          </div>
          
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-8 flex flex-col shadow-lg dark:shadow-2xl relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] dark:blur-[50px] pointer-events-none" />
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Settled</span>
            <span className="text-4xl sm:text-5xl font-black tracking-tighter mt-4 flex items-baseline gap-2 text-slate-900 dark:text-white transition-colors duration-300">
              {state.status === 'loading' ? (
                <span className="block h-12 w-32 rounded bg-slate-100 dark:bg-white/5 animate-pulse" />
              ) : (
                <>
                  {formatAmount(total)}
                  {totalAsset && <span className="text-2xl text-emerald-600 dark:text-emerald-400 font-bold">{totalAsset}</span>}
                </>
              )}
            </span>
          </div>
        </header>

        {/* Data Table Section */}
        <section className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl dark:shadow-2xl transition-colors duration-300">
          <div className="px-8 py-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/80 dark:bg-[#06111f] transition-colors duration-300">
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white transition-colors duration-300">Recent Settlements</h2>
            <StatusPill state={state} onRetry={reload} />
          </div>

          <div className="min-h-[400px]">
            {state.status === 'loading' && <TableSkeleton />}
            
            {state.status === 'error' && (
              <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4 px-6">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400 mb-2">✕</div>
                <p className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">Connection Error</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">{state.message}</p>
                <button onClick={reload} className="mt-4 px-6 py-3 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white text-sm font-bold hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 transition-colors shadow-sm dark:shadow-none">
                  Try Again
                </button>
              </div>
            )}

            {state.status === 'ready' && payments.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4 px-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2 animate-pulse">●</div>
                <p className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">Awaiting Data</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Payments settled to this merchant address will appear here automatically.</p>
              </div>
            )}

            {state.status === 'ready' && payments.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#04090f]/50 transition-colors duration-300">
                      <th className="px-4 py-3 md:px-8 md:py-5">Transaction</th>
                      <th className="px-4 py-3 md:px-8 md:py-5">Amount</th>
                      <th className="px-4 py-3 md:px-8 md:py-5">Payer</th>
                      <th className="px-4 py-3 md:px-8 md:py-5">Route</th>
                      <th className="px-4 py-3 md:px-8 md:py-5">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {payments.map((payment) => (
                      <tr
                        key={payment.tx_hash}
                        onClick={() => setSelected(payment)}
                        className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 md:px-8 md:py-5 font-mono text-emerald-600 dark:text-emerald-400 text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                          {truncate(payment.tx_hash)}
                        </td>
                        <td className="px-4 py-3 md:px-8 md:py-5">
                          <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white transition-colors duration-300">{formatAmount(payment.amount)}</span>
                          <span className="text-slate-400 dark:text-slate-500 ml-2 text-xs font-bold">{assetLabel(payment.asset)}</span>
                        </td>
                        <td className="px-4 py-3 md:px-8 md:py-5 font-mono text-slate-500 dark:text-slate-400 text-sm transition-colors duration-300">
                          {truncate(payment.payer, 4, 4)}
                        </td>
                        <td className="px-4 py-3 md:px-8 md:py-5">
                          {payment.route ? (
                            <div className="inline-flex items-center gap-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-2.5 py-1 rounded text-sm transition-colors duration-300">
                              {payment.method && <span className="text-emerald-600 dark:text-emerald-500/70 font-mono font-bold text-xs">{payment.method}</span>}
                              <span className="font-mono text-slate-600 dark:text-slate-300">{payment.route}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 md:px-8 md:py-5 text-slate-500 text-sm">
                          {new Date(payment.ts).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modal Dialog */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm transition-colors duration-300" onClick={() => setSelected(null)}>
          <div 
            className="bg-white dark:bg-[#06111f] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200 transition-colors duration-300 max-h-[90vh] flex flex-col" 
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 md:px-8 md:py-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-[#04090f] transition-colors duration-300 shrink-0">
              <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white transition-colors duration-300">Payment Details</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors">✕</button>
            </div>
            <div className="p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto">
              <Field label="Transaction Hash">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-4 py-3 rounded-xl font-mono text-xs text-emerald-700 dark:text-emerald-400 break-all transition-colors duration-300">
                  {selected.tx_hash}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-8">
                <Field label="Amount">
                  <span className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white transition-colors duration-300">
                    {formatAmount(selected.amount)}{' '}
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 transition-colors duration-300">{assetLabel(selected.asset)}</span>
                  </span>
                </Field>
                <Field label="Ledger">
                  <span className="font-mono text-slate-500 dark:text-slate-300 text-lg transition-colors duration-300">{selected.ledger ?? '-'}</span>
                </Field>
              </div>
              <Field label="Payer">
                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-3 rounded-xl font-mono text-xs text-slate-600 dark:text-slate-300 break-all transition-colors duration-300">
                  {selected.payer}
                </div>
              </Field>
              <Field label="Timestamp">
                <span className="text-slate-600 dark:text-slate-300 transition-colors duration-300">{new Date(selected.ts).toLocaleString()}</span>
              </Field>
              
              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-white/10 transition-colors duration-300">
                <a
                  href={explorerUrl(selected.tx_hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center w-full py-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-300 shadow-sm dark:shadow-none transition-all font-bold text-sm tracking-wide uppercase"
                >
                  View on Explorer ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors duration-300">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function StatusPill({ state, onRetry }: { state: LoadState; onRetry: () => void }) {
  if (state.status === 'loading') return <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 animate-pulse transition-colors duration-300">Syncing...</span>;
  if (state.status === 'error') return (
    <button onClick={onRetry} className="flex gap-2 items-center text-xs font-bold uppercase tracking-widest text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors">
      <span className="w-2 h-2 rounded-full bg-red-500" /> Retry Connection
    </button>
  );
  return (
    <span className="flex gap-2 items-center text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 transition-colors duration-300">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      Live · {new Date(state.fetchedAt).toLocaleTimeString()}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="p-8 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse transition-colors duration-300" />
      ))}
    </div>
  );
}
