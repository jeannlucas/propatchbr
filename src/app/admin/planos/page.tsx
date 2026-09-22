'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  DollarSign,
  Calendar,
  Tag
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface PlanAdminItem {
  id: string;
  name: string;
  price_cents: number;
  duration: string;
  duration_days: number | null;
  is_active: boolean;
  badge?: string | null;
  description?: string | null;
  abacatepay_product_id?: string | null;
  products?: { name: string } | null;
}

export default function AdminPlanosPage() {
  const [plans, setPlans] = useState<PlanAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plans');
      const data = await res.json();
      if (data.plans) {
        setPlans(data.plans);
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Falha ao carregar planos.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleFieldChange = (id: string, field: keyof PlanAdminItem, value: any) => {
    setPlans((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSave = async (plan: PlanAdminItem) => {
    setSavingId(plan.id);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      setMessage({ text: `Plano "${plan.name}" salvo com sucesso!`, type: 'success' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setMessage({ text: err instanceof Error ? err.message : 'Erro ao atualizar plano.', type: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="border-b border-border bg-zinc-950/60 sticky top-0 z-30 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard"
              className="text-zinc-400 hover:text-primary transition flex items-center gap-1.5 text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Painel</span>
            </Link>
            <span className="text-zinc-600">/</span>
            <h1 className="text-base font-bold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Gerenciamento de Planos e Preços
            </h1>
          </div>
          <button
            onClick={fetchPlans}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
        
        {/* Banner Informativo */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary mb-1">
            Controle Dinâmico de Precificação
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Qualquer alteração feita aqui atualiza instantaneamente a vitrine, a página do produto e o cálculo de validade dos webhooks no banco de dados, sem necessidade de alterar o código.
          </p>
        </div>

        {/* Feedback de Notificação */}
        {message && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-in fade-in duration-200 ${
            message.type === 'success' 
              ? 'border-green-800 bg-green-950/70 text-green-200' 
              : 'border-red-800 bg-red-950/70 text-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Lista de Planos para Edição */}
        {loading ? (
          <div className="py-20 text-center text-zinc-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
            <p>Carregando planos cadastrados...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                  <div>
                    <span className="text-[11px] font-mono text-zinc-500 block">ID: {plan.id}</span>
                    <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                      {plan.name}
                      <span className="text-sm font-normal text-primary">({formatPrice(plan.price_cents)})</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.is_active}
                        onChange={(e) => handleFieldChange(plan.id, 'is_active', e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-800 text-primary focus:ring-primary"
                      />
                      <span>{plan.is_active ? 'Ativo no Catálogo' : 'Inativo'}</span>
                    </label>

                    <button
                      onClick={() => handleSave(plan)}
                      disabled={savingId === plan.id}
                      className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-green-600 transition shadow disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{savingId === plan.id ? 'Salvando...' : 'Salvar'}</span>
                    </button>
                  </div>
                </div>

                {/* Grid de Campos Editáveis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Nome do Plano */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Nome de Exibição
                    </label>
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => handleFieldChange(plan.id, 'name', e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  {/* Preço em Centavos */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5 flex items-center justify-between">
                      <span>Preço em Centavos (ex: 2490 = R$ 24,90)</span>
                      <span className="text-primary font-bold">{formatPrice(plan.price_cents)}</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <input
                        type="number"
                        value={plan.price_cents}
                        onChange={(e) => handleFieldChange(plan.id, 'price_cents', Number(e.target.value))}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Duração em Dias */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Duração (Dias) - Vazio = Vitalício/Avulsa
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <input
                        type="number"
                        placeholder="Ex: 30 ou 90 (vazio para avulsa)"
                        value={plan.duration_days ?? ''}
                        onChange={(e) => handleFieldChange(plan.id, 'duration_days', e.target.value === '' ? null : Number(e.target.value))}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Badge de Destaque */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      Badge de Destaque (opcional)
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Ex: Mais Popular, Melhor Oferta"
                        value={plan.badge || ''}
                        onChange={(e) => handleFieldChange(plan.id, 'badge', e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-9 pr-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* ID na AbacatePay */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                      AbacatePay Product ID (vinculado na gateway)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: prod_..."
                      value={plan.abacatepay_product_id || ''}
                      onChange={(e) => handleFieldChange(plan.id, 'abacatepay_product_id', e.target.value)}
                      className="w-full font-mono text-xs rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
