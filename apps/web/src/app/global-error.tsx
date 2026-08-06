'use client'; // Error boundaries must be Client Components.

import './globals.css';

/**
 * Last-resort boundary for errors thrown by the root layout itself, which
 * `error.tsx` cannot catch because it is rendered inside that layout.
 *
 * It replaces the layout, so it has to supply its own <html> and <body>, and it
 * gets neither the fonts nor the ThemeProvider. That also means the `.dark`
 * class is never on <html> here, so `dark:` variants would never fire - this
 * screen is deliberately written in one palette that reads on any display
 * rather than a dark variant that silently does nothing.
 *
 * It stays dependency-free (no icon package, no hooks) because whatever took
 * out the root layout may well have taken out a shared chunk with it.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex items-center justify-center bg-slate-50 text-slate-600 font-sans p-6">
        <div className="max-w-md text-center space-y-6">
          <div className="w-12 h-12 mx-auto bg-red-100 flex items-center justify-center text-red-600 text-xl">
            !
          </div>

          <h1 className="text-3xl font-black tracking-tighter text-slate-900">
            Accensa could not load
          </h1>

          <p className="leading-relaxed">
            The application failed to start. If you are offline, reconnect and try again; otherwise
            this is a fault on our side and no payment data was changed.
          </p>

          {error.digest && (
            <p className="font-mono text-xs text-slate-400 break-all">Reference: {error.digest}</p>
          )}

          <button
            type="button"
            onClick={() => unstable_retry()}
            className="px-6 py-3 bg-emerald-600 text-white font-black text-sm uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-md cursor-pointer"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
