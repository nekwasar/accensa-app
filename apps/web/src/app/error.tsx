'use client'; // Error boundaries must be Client Components.

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RotateCw, TriangleAlert } from 'lucide-react';
import { useOnline } from '@/components/network-status';
import { PageContainer } from '@/components/page-container';

/**
 * Catches render-time exceptions anywhere under the root layout.
 *
 * Sits at the app segment rather than in each route so a crash on any page -
 * a malformed API payload, a bad date, an RPC shape we did not expect - lands
 * on something readable instead of a blank screen. The root layout (and so the
 * nav) survives, because `error.tsx` wraps its siblings but not the layout
 * above it; a failure in the layout itself falls through to `global-error.tsx`.
 */
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const online = useOnline();

  useEffect(() => {
    // No error reporting service is wired up yet, so the console is the only
    // place a digest can be matched against the server logs.
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen text-slate-600 dark:text-slate-200 font-sans transition-colors duration-300 bg-grid p-6 md:p-12 lg:p-20 pt-28 md:pt-32 lg:pt-32">
      <PageContainer width="narrow" className="text-center space-y-6">
        <div className="w-12 h-12 mx-auto bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
          <TriangleAlert className="w-5 h-5" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 dark:text-white transition-colors duration-300">
          Something went wrong
        </h1>

        <p className="text-slate-600 dark:text-slate-400 leading-relaxed transition-colors duration-300">
          {online
            ? 'This page hit an error it could not recover from on its own. Nothing you did caused it, and no payment data was changed.'
            : 'This page hit an error while your browser was offline. Reconnect and try again - the data it needs could not be fetched.'}
        </p>

        {/* Production strips the message from server-thrown errors and leaves
            only the digest, which is what support would ask for. */}
        {error.digest && (
          <p className="font-mono text-xs text-slate-400 dark:text-slate-500 break-all">
            Reference: {error.digest}
          </p>
        )}

        <div className="flex flex-wrap gap-4 justify-center pt-2">
          <button
            type="button"
            onClick={() => unstable_retry()}
            disabled={!online}
            title={online ? undefined : 'Retrying needs a connection.'}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black font-black text-sm uppercase tracking-wider hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all shadow-md dark:shadow-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-600 dark:disabled:hover:bg-emerald-500"
          >
            <RotateCw className="w-4 h-4" /> Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 border border-slate-200 dark:border-white/15 bg-white dark:bg-transparent text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-sm dark:shadow-none"
          >
            Back to Accensa
          </Link>
        </div>
      </PageContainer>
    </main>
  );
}
