"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';
import { LayoutDashboard, Home as HomeIcon, CheckCircle2, BookOpen, Code2, Wallet, ArrowUpRight } from 'lucide-react';

export function Nav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <nav className="px-6 py-4 md:py-6 fixed w-full top-0 z-50 bg-white/50 dark:bg-white/5 backdrop-blur-3xl border-b border-slate-200/50 dark:border-white/10 dark:shadow-[0_4px_30px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between relative z-50">
          <Link href="/" className="text-xl md:text-2xl font-harabara font-bold tracking-wider text-slate-900 dark:text-white flex items-center gap-3 transition-colors duration-300">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/accensa-logo-no-bg.png" alt="Accensa Logo" className="w-6 h-6 md:w-8 md:h-8 rounded-lg shadow-sm invert hue-rotate-180 dark:invert-0 dark:hue-rotate-0" />
            <span>Accensa<span className="text-emerald-600 dark:text-emerald-400 text-[1.3em] inline-block -ml-[0.05em] leading-none">.</span></span>
          </Link>
          
          {/* Desktop Nav (Centered) */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {pathname !== "/" && <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Home</Link>}
            {pathname !== "/verify" && <Link href="/verify" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Verify</Link>}
            {pathname !== "/dashboard" && <Link href="/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Dashboard</Link>}
            <a href="https://accensa-docs.vercel.app" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Docs</a>
            <a href="https://github.com/accensa" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">GitHub</a>
          </div>

          {/* Right Nav (Theme Toggle & Connect Wallet) */}
          <div className="flex items-center gap-4">
            <Link 
              href="/coming-soon"
              className="hidden md:inline-flex px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-emerald-500/20 dark:hover:bg-emerald-400/20 transition-all hover:scale-[1.02] active:scale-[0.98] hover:bg-slate-50 dark:hover:bg-white/5"
            >
              Connect Wallet
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Floating Thumb-Friendly Mobile Menu Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`md:hidden fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full backdrop-blur-2xl border transition-all duration-300 active:scale-90 hover:scale-105 cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
          isOpen 
            ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_8px_30px_rgba(16,185,129,0.3)]' 
            : 'bg-white/80 dark:bg-[#04090f]/80 border-slate-200/80 dark:border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.6)]'
        }`}
        aria-label="Toggle Menu"
        type="button"
      >
        <span className={`w-6 h-0.5 rounded-full transition-all duration-300 ${isOpen ? 'bg-white rotate-45 translate-y-1' : 'bg-slate-800 dark:bg-slate-100'}`} />
        <span className={`w-6 h-0.5 rounded-full transition-all duration-300 ${isOpen ? 'bg-white -rotate-45 -translate-y-1' : 'bg-slate-800 dark:bg-slate-100'}`} />
      </button>

      {/* Full-Screen Frosted Glass Overlay */}
      <div 
        className={`md:hidden fixed inset-0 z-50 bg-white/90 dark:bg-[#04090f]/95 backdrop-blur-3xl flex flex-col justify-between p-6 pb-28 transition-all duration-500 ease-out ${
          isOpen 
            ? 'opacity-100 scale-100 pointer-events-auto' 
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {/* Top Header inside Overlay */}
        <div className="flex items-center justify-between pt-4">
          <Link 
            href="/" 
            onClick={() => setIsOpen(false)}
            className="text-xl font-harabara font-bold tracking-wider text-slate-900 dark:text-white flex items-center gap-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/accensa-logo-no-bg.png" alt="Accensa Logo" className="w-7 h-7 rounded-lg shadow-sm invert hue-rotate-180 dark:invert-0 dark:hue-rotate-0" />
            <span>Accensa<span className="text-emerald-600 dark:text-emerald-400 text-[1.3em] inline-block -ml-[0.05em] leading-none">.</span></span>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Testnet Live
          </span>
        </div>

        {/* Centered Bento Grid Navigation */}
        <div className="my-auto py-6">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mb-4">Navigation</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Dashboard - Full Width Card */}
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className={`col-span-2 p-4 rounded-2xl border backdrop-blur-xl transition-all active:scale-[0.98] flex items-center justify-between group ${
                pathname === '/dashboard'
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-white/60 dark:bg-white/5 border-slate-200/60 dark:border-white/10 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Dashboard</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Live Network Analytics</p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
            </Link>

            {/* Home Card */}
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className={`p-4 rounded-2xl border backdrop-blur-xl transition-all active:scale-[0.98] flex flex-col justify-between gap-3 group ${
                pathname === '/'
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-white/60 dark:bg-white/5 border-slate-200/60 dark:border-white/10 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <HomeIcon className="w-4 h-4" />
                </div>
                {pathname === '/' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </div>
              <div>
                <p className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Home</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Overview</p>
              </div>
            </Link>

            {/* Verify Card */}
            <Link
              href="/verify"
              onClick={() => setIsOpen(false)}
              className={`p-4 rounded-2xl border backdrop-blur-xl transition-all active:scale-[0.98] flex flex-col justify-between gap-3 group ${
                pathname === '/verify'
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-white/60 dark:bg-white/5 border-slate-200/60 dark:border-white/10 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                {pathname === '/verify' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </div>
              <div>
                <p className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Verify</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Check Receipt</p>
              </div>
            </Link>

            {/* Docs External Card */}
            <a
              href="https://accensa-docs.vercel.app"
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsOpen(false)}
              className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:border-emerald-500/40 backdrop-blur-xl transition-all active:scale-[0.98] flex flex-col justify-between gap-3 group"
            >
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <BookOpen className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Docs</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Documentation</p>
              </div>
            </a>

            {/* GitHub External Card */}
            <a
              href="https://github.com/accensa"
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsOpen(false)}
              className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:border-emerald-500/40 backdrop-blur-xl transition-all active:scale-[0.98] flex flex-col justify-between gap-3 group"
            >
              <div className="flex justify-between items-start">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <Code2 className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight text-slate-900 dark:text-white">GitHub</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Source Code</p>
              </div>
            </a>
          </div>
        </div>

        {/* Bottom CTA & Footer */}
        <div className="space-y-4">
          <Link
            href="/coming-soon"
            onClick={() => setIsOpen(false)}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-95 transition-all active:scale-[0.99] shadow-lg shadow-emerald-500/20"
          >
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </Link>
          <p className="text-center text-[11px] font-mono text-slate-400 dark:text-slate-600">
            Decentralized Agent Micro-Payments • Stellar
          </p>
        </div>
      </div>
    </>
  );
}

