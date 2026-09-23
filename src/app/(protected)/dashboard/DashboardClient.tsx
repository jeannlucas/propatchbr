'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from '@/modules/identity/use-cases/auth-actions';
import { Download, Package, Shield, Loader2, X, AlertCircle } from 'lucide-react';

interface Entitlement {
  id: string;
  valid_until: string | null;
  metadata: Record<string, unknown> | null;
  product_id: string;
  products: {
    name: string;
    product_versions: {
      id?: string;
      version_name: string;
      storage_path: string;
    }[];
  } | null;
}

interface DashboardClientProps {
  entitlements: Entitlement[];
  profile: { full_name: string } | null;
  userEmail: string;
}

export default function DashboardClient({ 
  entitlements, 
  profile, 
  userEmail 
}: DashboardClientProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  function showToast(message: string, type: 'error' | 'success' = 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleDownload(entitlement: Entitlement) {
    try {
      setDownloading(entitlement.id);
      
      const versionId = entitlement.products?.product_versions?.[0]?.id || entitlement.id;

      const response = await fetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId: versionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao gerar link de download');
      }

      window.open(data.downloadUrl, '_blank');
      showToast('Download iniciado com sucesso!', 'success');
      
    } catch (error) {
      console.error('Download error:', error);
      showToast(error instanceof Error ? error.message : 'Erro ao iniciar download. Tente novamente.');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm ${
            toast.type === 'error' 
              ? 'border-red-800 bg-red-950/90 text-red-100' 
              : 'border-green-800 bg-green-950/90 text-green-100'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <Download className="h-5 w-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{toast.message}</p>
            <button 
              onClick={() => setToast(null)}
              className="ml-2 rounded p-1 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-2.5">
          <Link href="/">
            <img
              src="/logo.png"
              alt="ProPatch BR"
              className="h-14 sm:h-20 w-auto"
              style={{ background: 'transparent' }}
            />
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-xs sm:text-sm text-zinc-400 max-w-[130px] sm:max-w-xs truncate" title={userEmail}>
              {userEmail}
            </span>
            <form action={signOut}>
              <button className="rounded-xl border border-red-900/40 bg-red-950/20 px-3 py-1.5 text-xs sm:text-sm font-semibold text-red-400 hover:bg-red-900/40 transition">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black">Olá, {profile?.full_name || 'Jogador'} </h1>
          <p className="mt-1 text-sm text-zinc-400">Bem-vindo à sua área do cliente.</p>
        </div>

        {/* Stats */}
        <div className="mb-10 grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
            <Package className="mb-2 h-6 w-6 text-primary" />
            <p className="text-xs sm:text-sm text-zinc-400 font-medium">Patches ativos</p>
            <p className="text-2xl font-bold">{entitlements?.length || 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
            <Download className="mb-2 h-6 w-6 text-primary" />
            <p className="text-xs sm:text-sm text-zinc-400 font-medium">Downloads disponíveis</p>
            <p className="text-2xl font-bold">{entitlements?.length || 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
            <Shield className="mb-2 h-6 w-6 text-primary" />
            <p className="text-xs sm:text-sm text-zinc-400 font-medium">Status</p>
            <p className="text-2xl font-bold text-green-500">Ativo</p>
          </div>
        </div>

        {/* Entitlements */}
        <h2 className="mb-4 text-xl font-bold">Meus Patches</h2>
        {entitlements && entitlements.length > 0 ? (
          <div className="grid gap-4">
            {entitlements.map((e) => {
              const version = e.products?.product_versions?.[0]?.version_name || '1.0';
              const productName = e.products?.name || 'Pro Patch BR';
              const isDownloading = downloading === e.id;
              const hasFile = !!e.products?.product_versions?.[0]?.storage_path;
              
              return (
                <div key={e.id} className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-foreground">{productName} — v{version}</h3>
                      <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                        {e.valid_until 
                          ? `Acesso a novas versões até ${new Date(e.valid_until).toLocaleDateString('pt-BR')}`
                          : 'Acesso permanente à versão adquirida'}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDownload(e)}
                      disabled={isDownloading || !hasFile}
                      className={`w-full sm:w-auto rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        !hasFile
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          : isDownloading
                          ? 'bg-zinc-700 text-zinc-300 cursor-wait'
                          : 'bg-primary text-primary-foreground hover:bg-green-600 shadow-md shadow-green-900/30'
                      }`}
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Preparando...
                        </>
                      ) : !hasFile ? (
                        <>
                          <Download className="h-4 w-4" />
                          Em breve
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Baixar ISO
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
            <h3 className="mb-2 font-semibold">Nenhum patch adquirido ainda</h3>
            <p className="mb-6 text-sm text-zinc-400">Escolha um plano e comece a jogar hoje mesmo.</p>
            <Link href="/planos" className="inline-block rounded-md bg-primary px-6 py-2 font-semibold text-primary-foreground hover:bg-green-700">
              Ver planos
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}