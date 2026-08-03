"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import { Menu, X } from 'lucide-react';

export function Nav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="px-6 py-4 md:py-6 border-b border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-[#04090f]/40 backdrop-blur-2xl sticky top-0 z-50 transition-colors duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.2)]">
      <div className="max-w-6xl mx-auto flex items-center justify-between relative">
        <Link href="/" className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-3 transition-colors duration-300 z-50">
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
        <div className="flex md:hidden items-center gap-4 z-50">
          <ThemeToggle />
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-500 dark:text-slate-400 p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle Menu"
            type="button"
          >
            {isOpen ? <X className="w-6 h-6 pointer-events-none" /> : <Menu className="w-6 h-6 pointer-events-none" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Menu */}
      <div className={`md:hidden absolute top-full left-0 w-full bg-white/90 dark:bg-[#04090f]/90 backdrop-blur-3xl border-b border-slate-200/50 dark:border-white/10 shadow-2xl transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-96 py-6 border-b' : 'max-h-0 py-0 border-transparent border-none'}`}>
        <div className="px-6 flex flex-col gap-6 text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          <Link onClick={() => setIsOpen(false)} href="/verify" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors block">Verify</Link>
          <Link onClick={() => setIsOpen(false)} href="/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors block">Dashboard</Link>
          <a onClick={() => setIsOpen(false)} href="https://github.com/accensa" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors block">GitHub</a>
        </div>
      </div>
    </nav>
  );
}
