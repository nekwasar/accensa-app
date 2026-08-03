"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';

export function Nav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="px-6 py-4 md:py-6 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#04090f]/80 backdrop-blur-xl sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-3 transition-colors duration-300">
          <div className="w-5 h-5 md:w-6 md:h-6 rounded bg-emerald-500 shadow-sm dark:shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
          Accensa
        </Link>
        
        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          <Link href="/verify" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Verify</Link>
          <Link href="/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Dashboard</Link>
          <a href="https://github.com/accensa" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">GitHub</a>
          <ThemeToggle />
        </div>

        {/* Mobile Nav Toggle */}
        <div className="flex md:hidden items-center gap-4">
          <ThemeToggle />
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-500 dark:text-slate-400 p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Toggle Menu"
          >
            {isOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-[#04090f] border-b border-slate-200 dark:border-white/5 shadow-xl py-6 px-6 flex flex-col gap-6 text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 animate-in slide-in-from-top-2 fade-in">
          <Link onClick={() => setIsOpen(false)} href="/verify" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors block">Verify</Link>
          <Link onClick={() => setIsOpen(false)} href="/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors block">Dashboard</Link>
          <a onClick={() => setIsOpen(false)} href="https://github.com/accensa" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors block">GitHub</a>
        </div>
      )}
    </nav>
  );
}
