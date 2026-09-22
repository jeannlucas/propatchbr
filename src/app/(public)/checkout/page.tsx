'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/infra/supabase/client';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = searchParams.get('plan');
  
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Verificar autenticação
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        const currentUrl = window.location.pathname + window.location.search;
        router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
        return;
      }
      
      setCheckingAuth(false);
    }
    
    checkAuth();
  }, [router]);

  // Criar checkout SEMPRE que o planId mudar (evita cache)
  useEffect(() => {
    if (checkingAuth) return;
    
    if (!planId) {
      setError('Plano não especificado');
      setLoading(false);
      return;
    }

    // Limpar estado anterior para evitar cache
    setCheckoutUrl(null);
    setError(null);
    setLoading(true);

    createCheckout(planId);
  }, [planId, checkingAuth]);

  async function createCheckout(currentPlanId: string) {
    try {
      // Adicionar timestamp para evitar cache do navegador
      const response = await fetch(`/api/checkout/create-payment?t=${Date.now()}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        body: JSON.stringify({ planId: currentPlanId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      if (data.checkoutUrl) {
        // Redirecionar IMEDIATAMENTE (sem esperar 2s)
        window.location.replace(data.checkoutUrl);
      } else {
        setError('URL de checkout não retornada');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar checkout');
    } finally {
      setLoading(false);
    }
  }

  // Estado: carregando
  if (checkingAuth || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
          <p className="text-zinc-400">
            {checkingAuth ? 'Verificando autenticação...' : 'Criando checkout seguro...'}
          </p>
        </div>
      </div>
    );
  }

  // Estado: erro
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-lg border border-red-800 bg-red-950/30 p-6">
            <h2 className="text-xl font-bold text-red-400 mb-2">Erro no pagamento</h2>
            <p className="text-zinc-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-block rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground hover:bg-green-700 mr-2"
            >
              Tentar Novamente
            </button>
            <Link
              href="/planos"
              className="inline-block rounded-lg border border-zinc-600 px-6 py-2 font-semibold text-foreground hover:bg-zinc-800"
            >
              Voltar para os planos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fallback (não deve acontecer)
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-zinc-400">Redirecionando...</p>
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