import React from 'react';
import Link from 'next/link';
import { RECEIPT_ANCHOR_ID } from '@/lib/receipt-anchor';

const REFUND_VAULT_ID =
  process.env.NEXT_PUBLIC_REFUND_VAULT_ID ??
  'CCMBM44EJUGD52G4LSMGHSXMAH2KSAQZX7VOYY4TTBF5BK4D7M4IHRQA';

const explorer = (id: string) =>
  `https://stellar.expert/explorer/testnet/contract/${id}`;

export default function Landing() {
  return (
    <main className="min-h-screen text-white bg-[linear-gradient(160deg,#031207_0%,#010603_45%,#072813_160%)] font-sans">
      <Nav />

      {/* Hero */}
      <section className="px-6 pt-24 pb-32 md:pt-40 md:pb-40">
        <div className="max-w-4xl mx-auto text-center space-y-10">
          <p className="uppercase tracking-[0.25em] text-emerald-400 font-bold text-xs inline-flex items-center gap-2">
            Live on Stellar testnet
          </p>

          <h1 className="text-6xl md:text-7xl font-black tracking-tighter leading-[1.05] text-white">
            Prove every{' '}
            <span className="text-emerald-400">
              x402 payment.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed font-medium">
            Agents prove they were charged correctly. Merchants refund without
            becoming custodians. Receipts anchored on Stellar, verifiable by
            anyone — no account required.
          </p>

          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Link
              href="/verify"
              className="px-8 py-4 rounded-xl bg-emerald-500 text-[#010603] font-bold text-sm hover:bg-emerald-400 transition-colors tracking-wide"
            >
              Verify a receipt
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-4 rounded-xl border border-white/20 bg-white/5 text-white font-bold text-sm hover:bg-white/10 transition-colors tracking-wide"
            >
              View the dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Problem */}
      <Section title="The problem" eyebrow="Context">
        <p className="text-white/70 leading-relaxed mb-6 text-lg font-medium">
          x402 turns any HTTP endpoint into a paid resource: an agent hits your
          API, gets a <code className="text-emerald-400 font-bold">402 Payment Required</code>,
          pays, and retries. That works — but it leaves both sides without
          recourse.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <Card title="The agent cannot audit">
            Its receipt comes from the seller&rsquo;s own API, attesting to the
            seller&rsquo;s own behaviour. When an agent makes thousands of
            sub-cent calls a day across dozens of vendors, &ldquo;trust the
            seller&rsquo;s dashboard&rdquo; is not an auditing story.
          </Card>
          <Card title="The merchant cannot refund safely">
            Manual refunds don&rsquo;t scale to per-request payments, and an
            unbounded refund key over merchant float is exactly what a seller
            does not want sitting in a web backend.
          </Card>
        </div>
      </Section>

      {/* How it works */}
      <Section title="How it works" eyebrow="Architecture">
        <ol className="grid md:grid-cols-3 gap-6">
          <Step n={1} title="Agent pays">
            Payment settles on Stellar as a Stellar Asset Contract transfer.
          </Step>
          <Step n={2} title="Accensa indexes & anchors">
            The indexer decodes transfers to your address, then anchors a Merkle
            root of the batch on-chain.
          </Step>
          <Step n={3} title="Anyone verifies">
            An agent checks its receipt against the anchored root — locally and
            against the contract. No account, no trust in us.
          </Step>
        </ol>
      </Section>

      {/* Live proof */}
      <Section title="Live, not a mockup" eyebrow="Network">
        <p className="text-white/70 leading-relaxed mb-8 text-lg font-medium">
          Both contracts are deployed and initialized on Stellar testnet, and
          batch #1 is anchored. You can verify a receipt against it right now —
          and watch a forged one get rejected.
        </p>
        <div className="grid sm:grid-cols-2 gap-6">
          <ContractCard name="ReceiptAnchor" id={RECEIPT_ANCHOR_ID} />
          <ContractCard name="RefundVault" id={REFUND_VAULT_ID} />
        </div>
        <div className="mt-10">
          <Link
            href="/verify"
            className="inline-block text-xs font-bold tracking-[0.15em] uppercase text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Try the verifier with a sample receipt →
          </Link>
        </div>
      </Section>

      {/* Two audiences */}
      <Section title="Two sides, one ledger" eyebrow="Audiences">
        <div className="grid md:grid-cols-2 gap-6">
          <Card title="For merchants">
            See revenue reconstructed from chain data, attributed to the endpoint
            that earned it, with refunds bounded by an on-chain policy instead of
            a support inbox.
            <div className="pt-6 mt-auto">
              <Link
                href="/dashboard"
                className="inline-block text-emerald-400 font-bold uppercase tracking-[0.15em] text-xs hover:text-emerald-300 transition-colors"
              >
                Open the dashboard →
              </Link>
            </div>
          </Card>
          <Card title="For agent operators">
            Verify any receipt you were given, against the ledger, without an
            account or a wallet. If the proof doesn&rsquo;t lead to the anchored
            root, you know — and so does everyone else.
            <div className="pt-6 mt-auto">
              <Link
                href="/verify"
                className="inline-block text-emerald-400 font-bold uppercase tracking-[0.15em] text-xs hover:text-emerald-300 transition-colors"
              >
                Verify a receipt →
              </Link>
            </div>
          </Card>
        </div>
      </Section>

      {/* Why Stellar */}
      <Section title="Why Stellar" eyebrow="Protocol">
        <ul className="space-y-6 text-white/70 leading-relaxed text-lg">
          <Bullet label="Sub-cent fees">
            make per-request agent payments viable at all. On most chains the
            settlement fee exceeds the payment.
          </Bullet>
          <Bullet label="Batched anchoring">
            amortises to near zero — one call covers an entire billing period, so
            verifiability costs a fraction of a cent per receipt.
          </Bullet>
          <Bullet label="Native USDC">
            means float and refunds settle in the asset merchants actually price
            in, with no bridge.
          </Bullet>
          <Bullet label="Predictable fees">
            let a merchant bound the cost of their refund policy in advance
            rather than guessing at gas.
          </Bullet>
        </ul>
      </Section>

      {/* Get started */}
      <Section title="Verify a receipt in your own code" eyebrow="Integration">
        <p className="text-white/70 leading-relaxed mb-8 text-lg font-medium">
          The SDK mirrors the contract exactly — sorted-pair SHA-256, so proofs
          carry no position flags. Both implementations are pinned to the same
          conformance vectors.
        </p>
        <pre className="mt-2 overflow-x-auto rounded-3xl border border-white/10 bg-[#020804]/80 backdrop-blur-lg p-8 text-sm shadow-2xl">
          <code className="text-emerald-100 font-mono leading-relaxed">{`import { verifyReceipt } from '@accensa/sdk/merkle';

const ok = verifyReceipt(receiptHash, proof, anchoredRoot);
if (!ok) throw new Error('Receipt is not in the anchored batch');`}</code>
        </pre>
      </Section>

      <footer className="px-6 py-20 mt-24 border-t border-white/10">
        <div className="max-w-4xl mx-auto flex flex-wrap gap-x-10 gap-y-6 justify-center text-xs font-bold uppercase tracking-[0.2em] text-white/40">
          <Link href="/dashboard" className="hover:text-emerald-400 transition-colors">
            Dashboard
          </Link>
          <Link href="/verify" className="hover:text-emerald-400 transition-colors">
            Verify
          </Link>
          <a
            href="https://accensa-docs.vercel.app"
            className="hover:text-emerald-400 transition-colors"
          >
            Documentation
          </a>
          <a
            href="https://github.com/accensa"
            className="hover:text-emerald-400 transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}

function Nav() {
  return (
    <nav className="px-6 py-8 border-b border-white/5 bg-[#031207]/80 backdrop-blur-2xl sticky top-0 z-50">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <span className="text-2xl font-black tracking-tighter text-white">
          Accensa
        </span>
        <div className="flex items-center gap-10 text-xs font-bold uppercase tracking-[0.2em] text-white/60">
          <Link href="/verify" className="hover:text-emerald-400 transition-colors">
            Verify
          </Link>
          <Link href="/dashboard" className="hover:text-emerald-400 transition-colors">
            Dashboard
          </Link>
          <a
            href="https://github.com/accensa"
            className="hover:text-emerald-400 transition-colors hidden md:block"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="px-6 py-24 border-t border-white/5">
      <div className="max-w-4xl mx-auto space-y-10">
        <div>
          <p className="uppercase tracking-[0.25em] text-emerald-400 font-bold text-xs mb-4">
            {eyebrow}
          </p>
          <h2 className="text-5xl font-black tracking-tighter text-white">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#041108]/75 backdrop-blur-md p-10 flex flex-col">
      <p className="text-2xl font-black tracking-tighter text-white mb-4">{title}</p>
      <div className="text-white/70 leading-relaxed font-medium">{children}</div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-3xl border border-white/10 bg-[#041108]/75 backdrop-blur-md p-8 flex flex-col items-start">
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500 text-[#010603] text-xl font-black mb-8 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
        {n}
      </span>
      <p className="text-2xl font-black tracking-tighter text-white mb-3">{title}</p>
      <p className="text-white/70 leading-relaxed font-medium">{children}</p>
    </li>
  );
}

function ContractCard({ name, id }: { name: string; id: string }) {
  return (
    <a
      href={explorer(id)}
      target="_blank"
      rel="noreferrer"
      className="block rounded-3xl border border-white/10 bg-[#041108]/75 backdrop-blur-md p-8 hover:border-emerald-500/30 hover:bg-[#05160b]/90 transition-all group"
    >
      <p className="text-xl font-black tracking-tighter text-white group-hover:text-emerald-400 transition-colors">
        {name} ↗
      </p>
      <p className="font-mono text-sm text-white/50 break-all mt-3">{id}</p>
    </a>
  );
}

function Bullet({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-5">
      <span className="text-emerald-500 shrink-0 mt-1.5 text-sm">●</span>
      <span>
        <strong className="text-white font-black tracking-tight block mb-1">{label}</strong>
        <span className="font-medium text-white/60">{children}</span>
      </span>
    </li>
  );
}
