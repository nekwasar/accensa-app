'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { signTransaction, readStatus, connect } from '@/lib/freighter';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // Ensure wallet is connected
      let status = await readStatus();
      if (status.kind === 'unavailable') {
        throw new Error('Stellar wallet not found. Please install Freighter.');
      }
      if (status.kind !== 'connected') {
        status = await connect();
        if (status.kind !== 'connected') {
          throw new Error(status.kind === 'error' ? status.message : 'Could not connect wallet.');
        }
      }

      // Fetch challenge
      const res = await fetch('/api/auth/challenge');
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to fetch auth challenge');
      }
      const { xdr, networkPassphrase } = await res.json();

      // Sign challenge
      const signedXdr = await signTransaction(xdr, { networkPassphrase, address: status.address });

      // Verify signature
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xdr: signedXdr }),
      });

      if (!verifyRes.ok) {
        const { error } = await verifyRes.json();
        throw new Error(error || 'Verification failed');
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-card border rounded-lg shadow-sm">
        <div className="flex justify-center">
          <div className="p-3 bg-secondary rounded-full">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Merchant Login</h1>
          <p className="text-sm text-muted-foreground">
            Authenticate with your Stellar wallet to access the Accensa dashboard.
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Connect Wallet'
          )}
        </button>
      </div>
    </div>
  );
}
