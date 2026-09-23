'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 selection:bg-green-600 selection:text-white">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-800 bg-red-950/40 text-red-400 shadow-xl">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">
            Algo Inesperado Aconteceu
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Nossa equipe foi notificada e já estamos verificando. Você pode tentar recarregar a página.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-green-900/30 hover:bg-green-600 transition cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Tentar Novamente</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-2.5 text-xs sm:text-sm font-semibold text-foreground hover:bg-zinc-800 transition"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
}
