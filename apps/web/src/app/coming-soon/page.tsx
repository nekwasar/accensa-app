import React from 'react';
import Link from 'next/link';

export default function ComingSoon() {
  return (
    <main className="min-h-screen text-slate-600 dark:text-slate-200 font-sans selection:bg-emerald-500/20 dark:selection:bg-emerald-500/30 flex flex-col items-center justify-center p-6 transition-colors duration-300 relative overflow-hidden">
      
      {/* Subtle radial glow matching emerald theme */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-100/50 dark:bg-emerald-500/5 rounded-full blur-[100px] dark:blur-[120px] pointer-events-none transition-colors duration-300" />
      
      <div className="max-w-2xl mx-auto text-center space-y-8 relative z-10">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold tracking-wide leading-[1.05] text-slate-900 dark:text-white transition-colors duration-300">
          Coming Soon
        </h1>

        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed font-medium transition-colors duration-300">
          Wallet connections and user accounts are currently under development. Check back later!
        </p>

        <div className="pt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white dark:bg-white/[0.02] dark:backdrop-blur-md text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-all hover:border-slate-300 dark:hover:border-white/20 shadow-sm dark:shadow-none"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
