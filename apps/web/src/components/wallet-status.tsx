"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
 readStatus,
 connect,
 truncateAddress,
 FREIGHTER_INSTALL_URL,
 type WalletStatus as Status,
} from '@/lib/freighter';

/**
 * Wallet connection state in the navbar.
 *
 * Replaces the placeholder "Connect Wallet" link that pointed at
 * `/coming-soon`. Anchoring and refunds both need a signer, and the merchant
 * had no way to tell whether one was available before starting.
 *
 * Note there is no true "disconnect": Freighter has no API to revoke a site's
 * approval, so the control below only forgets the address locally and the
 * extension will re-approve without a prompt. Labelling that as "Disconnect"
 * would overstate it, so the connected state is a status readout rather than a
 * toggle.
 */
export function WalletStatus({ className = '' }: { className?: string }) {
 const [status, setStatus] = useState<Status | null>(null);
 const [busy, setBusy] = useState(false);

 useEffect(() => {
 let live = true;
 // The extension injects asynchronously, so a single read on mount races
 // it and reports `unavailable` for an installed wallet. Re-read shortly
 // after; this is the shape every Freighter integration ends up with.
 const read = () => {
 void readStatus().then((next) => {
 if (live) setStatus(next);
 });
 };
 read();
 const retry = setTimeout(read, 500);
 return () => {
 live = false;
 clearTimeout(retry);
 };
 }, []);

 const onConnect = useCallback(async () => {
 setBusy(true);
 try {
 setStatus(await connect());
 } finally {
 setBusy(false);
 }
 }, []);

 // Render nothing until the first read resolves, rather than flashing
 // "Connect Wallet" at someone who is already connected.
 if (status === null) {
 return <div className={`hidden md:block h-9 w-32 bg-slate-200/60 dark:bg-white/5 animate-pulse ${className}`} />;
 }

 const base =
 'px-4 py-2 border font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]';

 if (status.kind === 'connected') {
 const label = truncateAddress(status.address);
 return (
 <span
 className={`${base} inline-flex items-center gap-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 cursor-default ${className}`}
 title={`${status.address}${status.network ? ` on ${status.network}` : ''}`}
 >
 <span className="w-1.5 h-1.5 bg-emerald-500 shrink-0" aria-hidden />
 <span className="font-mono normal-case tracking-normal">{label}</span>
 {status.network && <span className="hidden lg:inline opacity-60">{status.network}</span>}
 </span>
 );
 }

 if (status.kind === 'unavailable') {
 return (
 <a
 href={FREIGHTER_INSTALL_URL}
 target="_blank"
 rel="noreferrer"
 className={`${base} border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 ${className}`}
 >
 Install Wallet
 </a>
 );
 }

 return (
 <button
 type="button"
 onClick={onConnect}
 disabled={busy}
 className={`${base} border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-60 disabled:cursor-wait cursor-pointer ${className}`}
 title={status.kind === 'error' ? status.message : undefined}
 >
 {busy ? 'Connecting…' : status.kind === 'error' ? 'Retry Connect' : 'Connect Wallet'}
 </button>
 );
}
