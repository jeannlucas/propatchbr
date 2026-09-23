'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = searchParams.get('plan');
  
  const [status, setStatus] = useState<'checking_auth' | 'loading' | 'error'>('checking_auth');
  const [error, setError] = useState<string | null>(null);
  const checkoutInitiatedRef = useRef(false);

  const createCheckout = useCallback(async (currentPlanId: string) => {
    try {
      setStatus('loading');
      setError(null);

      const response = await fetch(`/api/checkout/create-payment?t=${Date.now()}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        body: JSON.stringify({ planId: currentPlanId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao criar sessão de pagamento.');
      }

      if (data.checkoutUrl) {
        window.location.replace(data.checkoutUrl);
      } else {
        throw new Error('URL de checkout não retornada pela gateway.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar checkout.');
      setStatus('error');
    }
  }, []);

  // Verificar autenticação e iniciar checkout
  useEffect(() => {
    let isMounted = true;

    async function initCheckout() {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      const user = authData?.user;

      if (!isMounted) return;

      if (!user) {
        const currentUrl = window.location.pathname + window.location.search;
        router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
        return;
      }

      if (!planId) {
        setError('Plano não especificado.');
        setStatus('error');
        return;
      }

      checkoutInitiatedRef.current = true;
      await createCheckout(planId);
    }

    initCheckout();

    return () => {
      isMounted = false;
    };
  }, [planId, router, createCheckout]);

  // Estado: carregando
  if (status === 'checking_auth' || status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-zinc-400">
            {status === 'checking_auth' ? 'Verificando autenticação...' : 'Criando checkout seguro via PIX...'}
          </p>
        </div>
      </div>
    );
  }

  // Estado: erro
  if (status === 'error' || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-2xl border border-red-800 bg-red-950/30 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-red-400 mb-2">Não foi possível iniciar o pagamento</h2>
            <p className="text-zinc-400 mb-6 text-sm">{error || 'Ocorreu um erro inesperado.'}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  checkoutInitiatedRef.current = false;
                  if (planId) createCheckout(planId);
                }}
                className="w-full sm:w-auto rounded-xl bg-primary px-6 py-2.5 font-semibold text-primary-foreground hover:bg-green-700 transition"
              >
                Tentar Novamente
              </button>
              <Link
                href="/produtos"
                className="w-full sm:w-auto rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-2.5 font-semibold text-foreground hover:bg-zinc-800 transition"
              >
                Voltar aos Planos
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-zinc-400">Redirecionando para a AbacatePay...</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-zinc-400">Carregando checkout...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}