import React from 'react';
import { ScrollReveal } from "@/components/scroll-reveal";
import Link from 'next/link';
import { RECEIPT_ANCHOR_ID } from '@/lib/receipt-anchor';

const REFUND_VAULT_ID =
  process.env.NEXT_PUBLIC_REFUND_VAULT_ID ??
  'CCMBM44EJUGD52G4LSMGHSXMAH2KSAQZX7VOYY4TTBF5BK4D7M4IHRQA';

const explorer = (id: string) =>
  `https://stellar.expert/explorer/testnet/contract/${id}`;

export default function Landing() {
  return (
    <main className="min-h-screen text-slate-600 dark:text-slate-200 font-sans selection:bg-slate-200 dark:selection:bg-white/10 transition-colors duration-300 bg-white dark:bg-[#04090f] bg-grid">

      {/* Hero Section */}
      <section className="relative px-6 pt-32 pb-24 md:pt-48 md:pb-32 overflow-hidden flex flex-col items-center justify-center min-h-[85vh] relative">
        <div className="absolute inset-0 bg-noise opacity-10 dark:opacity-20 pointer-events-none mix-blend-overlay z-0" />
        {/* Subtle radial glow matching emerald theme */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-transparent dark:bg-emerald-500/5 rounded-full blur-[100px] dark:blur-[120px] pointer-events-none transition-colors duration-300" />
        
        <div className="max-w-5xl mx-auto text-left md:text-center space-y-8 relative z-10">
          <div className="inline-flex items-center mb-4 transition-colors duration-300">
            <span className="text-sm font-camiro font-bold tracking-[0.35em] text-emerald-600 dark:text-emerald-400 uppercase">— Live on Stellar Testnet —</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-harabara font-bold tracking-wide leading-[1.05] text-slate-900 dark:text-white transition-colors duration-300">
            Trustless payments, <br className="hidden md:block" />
            <span className="text-slate-400 dark:text-slate-500 italic font-normal">
              for AI agents.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium transition-colors duration-300">
            Agents cryptographically prove they were charged correctly. Merchants refund without
            custodian risk. Verifiable by anyone, anchored on Stellar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-start md:justify-center pt-8">
            <Link
              href="/verify"
              className="px-8 py-4 rounded-xl bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-slate-200/50 dark:border-white/20 text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wider hover:bg-white/60 dark:hover:bg-white/20 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm dark:shadow-none"
            >
              Verify a Receipt
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 rounded-xl bg-white dark:bg-white/[0.02] dark:backdrop-blur-md text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-all hover:border-slate-300 dark:hover:border-white/20 shadow-sm dark:shadow-none"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Bento Grid Architecture */}
      <section className="px-6 py-24 md:py-32 relative">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 text-left md:text-center">
            <p className="uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-4">Architecture</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white transition-colors duration-300">How it works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <BentoCard className="md:col-span-2 transition-all duration-300" title="1. The Agent Pays">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium mt-2 transition-colors duration-300">
                Every request acts as an isolated transaction. The payment settles natively on Stellar as a Stellar Asset Contract transfer, leaving an immutable footprint.
              </p>
            </BentoCard>
            <BentoCard className="md:row-span-2" title="2. Accensa Indexes">
              <div className="space-y-4 mt-4">
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium transition-colors duration-300">
                  The indexer decodes transfers to your address in real-time, grouping them into cryptographically secure batches.
                </p>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/5 font-mono text-xs text-emerald-700 dark:text-emerald-400 break-all transition-colors duration-300">
                  root: 7ca64ee60e2b975f59f2a1f1cc1526d5b001a5c29f70291f316ba1c012a01bd1
                </div>
              </div>
            </BentoCard>
            <BentoCard className="md:col-span-2" title="3. Anyone Verifies">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium mt-2 transition-colors duration-300">
                Agents check their receipt against the anchored root - locally and directly against the smart contract. Zero trust required.
              </p>
              <div className="mt-8">
                <Link href="/verify" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                  Try the Verifier →
                </Link>
              </div>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* The Protocol Benefits */}
      <section className="px-6 py-24 md:py-32 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.01] transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-10 mb-16">
            <div className="max-w-2xl">
              <p className="uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-4">Protocol</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white transition-colors duration-300">Why Stellar?</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium max-w-md text-lg transition-colors duration-300">Built on a ledger designed specifically for high-throughput, low-latency financial settlement.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard title="Sub-cent Fees" desc="Make per-request agent payments viable at all. On most chains the settlement fee exceeds the payment." />
            <FeatureCard title="Batched Anchoring" desc="Amortizes to near zero - one call covers an entire billing period. Verifiability costs a fraction of a cent." />
            <FeatureCard title="Native USDC" desc="Means float and refunds settle in the asset merchants actually price in, with absolutely no bridging." />
            <FeatureCard title="Predictable Gas" desc="Lets a merchant definitively bound the cost of their refund policy in advance rather than guessing." />
          </div>
        </div>
      </section>

      {/* Contracts Live */}
      <section className="px-6 py-24 md:py-32 border-t border-slate-200 dark:border-white/5 transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
          <div className="text-left md:text-center mb-16">
            <p className="uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-4">Network</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white transition-colors duration-300">Live Contracts</h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-6 text-lg font-medium max-w-2xl mx-auto transition-colors duration-300">
              Both contracts are deployed and initialized on Stellar testnet, and batch #1 is anchored. Verify receipts against it right now.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <ContractCard name="ReceiptAnchor" id={RECEIPT_ANCHOR_ID} />
            <ContractCard name="RefundVault" id={REFUND_VAULT_ID} />
          </div>
        </div>
      </section>

      {/* Integration Code block */}
      <section className="px-6 py-24 md:py-32 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-[#020508] transition-colors duration-300">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <p className="uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-4">Integration</p>
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white transition-colors duration-300">SDK Drop-in</h2>
          </div>
          <div className="rounded-2xl border border-slate-200/60 dark:border-white/20 bg-white/40 dark:bg-black/20 backdrop-blur-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] relative group transition-colors duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80 dark:opacity-50" />
            <div className="px-6 py-4 border-b border-slate-200/50 dark:border-white/10 flex gap-2 transition-colors duration-300 bg-white/20 dark:bg-white/5">
              <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-white/20" />
              <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-white/20" />
              <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-white/20" />
            </div>
            <pre className="p-4 md:p-8 overflow-x-auto text-xs md:text-sm">
              <code className="block text-slate-700 dark:text-slate-300 font-mono leading-loose transition-colors duration-300 whitespace-pre-wrap break-words md:whitespace-pre md:break-normal">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold dark:font-normal">import</span> {'{ verifyReceipt }'} <span className="text-emerald-700 dark:text-emerald-400 font-bold dark:font-normal">from</span> &apos;@accensa/sdk/merkle&apos;;<br/><br/>
                <span className="text-slate-400 dark:text-slate-500 italic dark:not-italic">{'// Verify locally or on-chain'}</span><br/>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold dark:font-normal">const</span> ok = verifyReceipt(receiptHash, proof, anchoredRoot);<br/>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold dark:font-normal">if</span> (!ok) <span className="text-emerald-700 dark:text-emerald-400 font-bold dark:font-normal">throw new</span> Error(&apos;Receipt is not in the anchored batch&apos;);
              </code>
            </pre>
          </div>
        </div>
      </section>

      <footer className="px-6 py-12 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#04090f] transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-center gap-8 md:gap-6 text-center md:text-left">
          <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white transition-colors duration-300">
            Accensa
          </span>
          <div className="flex flex-wrap gap-8 justify-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            <Link href="/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Dashboard</Link>
            <Link href="/verify" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Verify</Link>
            <a href="https://accensa-docs.vercel.app" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Docs</a>
            <a href="https://github.com/accensa" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function BentoCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-slate-200/60 dark:border-white/20 bg-white/50 dark:bg-white/5 backdrop-blur-2xl p-8 md:p-10 flex flex-col hover:shadow-2xl dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:bg-white/70 dark:hover:bg-white/10 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] ${className}`}>
      <h3 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white transition-colors duration-300">{title}</h3>
      {children}
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-white/20 bg-white/50 dark:bg-white/5 backdrop-blur-2xl p-8 hover:bg-white/70 dark:hover:bg-white/10 hover:shadow-2xl dark:hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-300 group shadow-[0_4px_15px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm dark:shadow-none">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white mb-3 transition-colors duration-300">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed transition-colors duration-300">{desc}</p>
    </div>
  );
}

function ContractCard({ name, id }: { name: string; id: string }) {
  return (
    <a
      href={explorer(id)}
      target="_blank"
      rel="noreferrer"
      className="block rounded-2xl border border-slate-200/60 dark:border-white/20 bg-white/50 dark:bg-white/5 backdrop-blur-2xl p-8 hover:border-emerald-400 dark:hover:border-emerald-500/40 hover:shadow-2xl dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] dark:hover:bg-white/10 hover:-translate-y-1 transition-all group shadow-[0_4px_20px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
    >
      <div className="flex justify-between items-center mb-4">
        <p className="text-xl font-black tracking-tighter text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {name}
        </p>
        <span className="text-emerald-600 dark:text-emerald-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all font-bold">↗</span>
      </div>
      <div className="inline-block bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/5 rounded-lg px-3 py-2 font-mono text-xs text-slate-500 dark:text-slate-400 break-all transition-colors duration-300">
        {id}
      </div>
    </a>
  );
}
