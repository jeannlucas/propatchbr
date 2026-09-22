'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from '@/modules/identity/use-cases/auth-actions';
import { Download, Package, Shield, Loader2, X, AlertCircle } from 'lucide-react';

interface Entitlement {
  id: string;
  valid_until: string | null;
  metadata: any;
  product_id: string;
  products: {
    name: string;
    product_versions: {
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
      
      const storagePath = entitlement.products?.product_versions?.[0]?.storage_path;
      
      if (!storagePath) {
        showToast('Arquivo ainda não está disponível para download. Tente novamente mais tarde.');
        return;
      }

      const response = await fetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entitlementId: entitlement.id,
          storagePath: storagePath,
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <img
            src="/logo.png"
            alt="ProPatch BR"
            className="h-28 w-auto"
            style={{ background: 'transparent' }}
          />
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">{userEmail}</span>
            <form action={signOut}>
              <button className="rounded-md bg-red-600/10 px-3 py-1.5 text-sm text-red-500 hover:bg-red-600/20">Sair</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Olá, {profile?.full_name || 'Jogador'} </h1>
          <p className="mt-1 text-zinc-400">Bem-vindo à sua área do cliente.</p>
        </div>

        {/* Stats */}
        <div className="mb-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-6">
            <Package className="mb-2 h-6 w-6 text-primary" />
            <p className="text-sm text-zinc-400">Patches ativos</p>
            <p className="text-2xl font-bold">{entitlements?.length || 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <Download className="mb-2 h-6 w-6 text-primary" />
            <p className="text-sm text-zinc-400">Downloads disponíveis</p>
            <p className="text-2xl font-bold">{entitlements?.length || 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <Shield className="mb-2 h-6 w-6 text-primary" />
            <p className="text-sm text-zinc-400">Status</p>
            <p className="text-2xl font-bold text-green-500">Ativo</p>
          </div>
        </div>

        {/* Entitlements */}
        <h2 className="mb-4 text-xl font-semibold">Meus Patches</h2>
        {entitlements && entitlements.length > 0 ? (
          <div className="grid gap-4">
            {entitlements.map((e) => {
              const version = e.products?.product_versions?.[0]?.version_name || '1.0';
              const productName = e.products?.name || 'Pro Patch BR';
              const isDownloading = downloading === e.id;
              const hasFile = !!e.products?.product_versions?.[0]?.storage_path;
              
              return (
                <div key={e.id} className="rounded-lg border border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{productName} — v{version}</h3>
                      <p className="text-sm text-zinc-400">
                        {e.valid_until 
                          ? `Acesso até ${new Date(e.valid_until).toLocaleDateString('pt-BR')}`
                          : 'Acesso vitalício à versão'}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDownload(e)}
                      disabled={isDownloading || !hasFile}
                      className={`rounded-md px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-all ${
                        !hasFile
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          : isDownloading
                          ? 'bg-zinc-700 text-zinc-300 cursor-wait'
                          : 'bg-primary text-primary-foreground hover:bg-green-700'
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