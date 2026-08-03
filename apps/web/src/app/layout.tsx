import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bellavoir = localFont({
  src: "../../public/fonts/BellavoirSerif_PERSONAL_USE_ONLY.otf",
  variable: "--font-bellavoir",
});

const camiro = localFont({
  src: "../../public/fonts/Camiro.ttf",
  variable: "--font-camiro",
});

const harabara = localFont({
  src: "../../public/fonts/Harabara.ttf",
  variable: "--font-harabara",
});

const title = "Accensa - provable payments for x402 sellers on Stellar";
const description =
  "Agents prove they were charged correctly. Merchants refund without becoming custodians. Receipts anchored on Stellar, verifiable by anyone without an account.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://accensa-dashboard.vercel.app"),
  openGraph: { title, description, type: "website", siteName: "Accensa" },
  twitter: { card: "summary_large_image", title, description },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${bellavoir.variable} ${camiro.variable} ${harabara.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-[#04090f] transition-colors duration-300 relative">
        {/* Global Ambient Background Blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-300/40 dark:bg-emerald-600/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-teal-300/40 dark:bg-teal-600/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute top-[20%] left-[40%] w-[40%] h-[40%] rounded-full bg-sky-300/30 dark:bg-sky-600/15 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute bottom-[20%] left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-300/20 dark:bg-indigo-600/15 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
        </div>
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <Nav />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
