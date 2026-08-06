import Link from 'next/link';
import { PageContainer } from '@/components/page-container';

/**
 * Global site footer.
 *
 * Rendered from `layout.tsx` alongside `<Nav />` so the chrome is symmetric.
 * It previously lived inline in the landing page, which meant four of the five
 * routes ended abruptly at their last content block and the Docs and GitHub
 * links were unreachable from any of them.
 */
export function Footer() {
 return (
 <footer className="px-6 py-12 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#04090f] transition-colors duration-300">
 <PageContainer className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-6 text-center md:text-left">
 <Link
 href="/"
 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-300"
 >
 Accensa
 </Link>
 <div className="flex flex-wrap gap-8 justify-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
 <Link href="/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
 Dashboard
 </Link>
 <Link href="/verify" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
 Verify
 </Link>
 <a
 href="https://accensa-docs.vercel.app"
 className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
 >
 Docs
 </a>
 <a href="https://github.com/accensa" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
 GitHub
 </a>
 </div>
 </PageContainer>
 </footer>
 );
}
