'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Check, 
  Gamepad2, 
  Download, 
  Trophy, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  ArrowRight,
  MessageCircle,
  HelpCircle,
  FileCheck2,
  Tv
} from 'lucide-react';
import { Product, Plan } from '@/modules/catalog/types';
import { formatPrice } from '@/lib/utils';
import { Footer } from '@/components/Footer';

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const plans = product.plans || [];

  // Plano padrão: segundo plano (30 dias) ou o primeiro caso só exista um
  const defaultPlan = plans.length > 1 ? plans[1] : plans[0];
  const [selectedPlanId, setSelectedPlanId] = useState<string>(defaultPlan?.id || '');

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || defaultPlan;

  const handleBuy = () => {
    if (!selectedPlan) return;
    router.push(`/checkout?plan=${selectedPlan.id}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-green-600 selection:text-white">
      {/* Barra de Navegação Superior / Breadcrumb */}
      <header className="border-b border-border/80 bg-zinc-950/40 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-primary transition-colors"
          >
            ← Voltar para a Vitrine
          </Link>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-800 bg-green-950/40 px-3 py-1 text-xs font-medium text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Pronta Entrega via Pix
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14 items-start">
          
          {/* ========================================================================= */}
          {/* COLUNA ESQUERDA: Capa, Imagens, Especificações e Prova Social */}
          {/* ========================================================================= */}
          <div className="lg:col-span-6 space-y-6">
            {/* Box da Capa do Jogo */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-zinc-900/60 to-zinc-950 p-6 sm:p-10 flex flex-col items-center text-center shadow-2xl">
              <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-green-600/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

              <div className="relative group max-w-xs sm:max-w-sm">
                <div className="absolute -inset-2 rounded-2xl bg-gradient-to-tr from-green-500/30 via-emerald-600/20 to-transparent blur-xl transition duration-500 group-hover:scale-105" />
                <img
                  src="/capa-we10.png"
                  alt={`${product.name} - Capa Oficial PS2`}
                  className="relative rounded-xl shadow-2xl shadow-black/80 transition duration-300 group-hover:scale-[1.02] w-full"
                />
              </div>

              {/* Badges de Destaque Técnico */}
              <div className="mt-8 flex flex-wrap justify-center gap-2 sm:gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-zinc-300">
                  <Gamepad2 className="h-3.5 w-3.5 text-primary" />
                  PS2 / OPL / Matrix
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-zinc-300">
                  <Download className="h-3.5 w-3.5 text-primary" />
                  Mídia Digital (ISO ~1GB)
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-zinc-300">
                  <Tv className="h-3.5 w-3.5 text-primary" />
                  Formatos NTSC / 480p
                </span>
              </div>
            </div>

            {/* Diferenciais e Conteúdo do Patch */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                O que você vai receber:
              </h3>
              <ul className="space-y-3 text-sm text-zinc-300">
                <li className="flex items-start gap-3">
                  <Trophy className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Brasileirão Completo (Séries A, B e C):</strong> Clubes com uniformes fiéis, patrocinadores atualizados e escalações precisas.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Tv className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Narração Exclusiva:</strong> Fernando Fefux (ESPN) com comentários vibrantes e chamadas de gols nostálgicas.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <FileCheck2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Dados Reais:</strong> Idades, alturas, posições secundárias e pés dominantes calibrados com precisão.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Gamepad2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Fácil Instalação:</strong> Compatível com OPL via Pendrive/HD, Memory Card (Fortuna/OpenTuna) ou gravador de DVD.
                  </span>
                </li>
              </ul>
            </div>

            {/* Suporte via WhatsApp */}
            <div className="rounded-xl border border-green-900/40 bg-green-950/20 p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Dúvidas sobre o jogo ou OPL?</p>
                  <p className="text-xs text-zinc-400">Nosso time te orienta no processo de gravação e pendrive.</p>
                </div>
              </div>
              <a
                href="https://wa.me/?text=Ol%C3%A1,%20gostaria%20de%20tirar%20uma%20d%C3%BAvida%20sobre%20o%20Pro%20Patch%20BR"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg border border-green-700 bg-green-900/40 px-3.5 py-2 text-xs font-semibold text-green-300 hover:bg-green-800/60 transition"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* COLUNA DIREITA: Informações do Produto, Seletor de Planos e CTA de Compra */}
          {/* ========================================================================= */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Cabeçalho do Produto */}
            <div className="space-y-2 border-b border-border/70 pb-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <span>PlayStation 2</span>
                <span>•</span>
                <span>Mídia Digital (ISO)</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                {product.name}
              </h1>
              <p className="text-base text-zinc-400">
                O clássico Winning Eleven 10 remasterizado com a temporada atual para o seu PS2.
              </p>

              {/* Prova Social inspirada na referência */}
              <div className="pt-2 flex items-center gap-2 text-xs text-amber-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                </span>
                <span>🔥 Mais de 180 jogadores adquiriram este patch nos últimos dias</span>
              </div>
            </div>

            {/* SELETOR DE PLANOS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold uppercase tracking-wide text-zinc-300">
                  Escolha o seu plano de acesso:
                </label>
                <span className="text-xs text-zinc-400">Selecione uma opção</span>
              </div>

              {/* Lista de Opções em Cards */}
              <div className="space-y-3" role="radiogroup" aria-label="Escolha seu plano">
                {plans.map((plan) => {
                  const isSelected = plan.id === selectedPlanId;
                  const isAvulsa = !plan.duration_days || plan.duration === 'lifetime';

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 sm:p-5 cursor-pointer transition-all duration-200 select-none ${
                        isSelected
                          ? 'border-primary bg-green-950/20 shadow-lg shadow-green-950/40 ring-2 ring-primary/40'
                          : 'border-border bg-card hover:border-zinc-700 hover:bg-zinc-900/60'
                      }`}
                    >
                      {/* Badge Superior */}
                      {plan.badge && (
                        <span className={`absolute -top-2.5 right-4 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase shadow ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        }`}>
                          {plan.badge}
                        </span>
                      )}

                      {/* Lado Esquerdo: Radio + Detalhes do Plano */}
                      <div className="flex items-start gap-3.5">
                        <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                          isSelected ? 'border-primary bg-primary' : 'border-zinc-600 bg-transparent'
                        }">
                          {isSelected && <div className="h-2 w-2 rounded-full bg-black" />}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-foreground">
                              {plan.name}
                            </h4>
                          </div>

                          <p className="text-xs text-zinc-400 leading-relaxed">
                            {isAvulsa
                              ? 'Download da versão atual (v1.0) • Sem atualizações futuras'
                              : `Acesso à versão atual + todas as atualizações por ${plan.duration_days} dias`}
                          </p>
                        </div>
                      </div>

                      {/* Lado Direito: Preço */}
                      <div className="sm:text-right shrink-0 pl-8 sm:pl-0">
                        <div className="text-2xl font-black text-foreground">
                          {formatPrice(plan.price_cents)}
                        </div>
                        <span className="text-[11px] text-zinc-400">
                          {isAvulsa ? 'Pagamento único' : `por ${plan.duration_days} dias`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* QUADRO EXPLICATIVO DA OPÇÃO SELECIONADA */}
            {selectedPlan && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2 text-sm text-zinc-300 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 font-semibold text-foreground text-xs uppercase tracking-wide">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Você está contratando: <strong>{selectedPlan.name}</strong></span>
                </div>
                <p className="text-xs text-zinc-400">
                  {(!selectedPlan.duration_days || selectedPlan.duration === 'lifetime') ? (
                    <>
                      Você terá direito a <strong>baixar permanentemente a versão 1.0</strong> do Pro Patch BR. 
                      Esta modalidade <em>não inclui</em> novas atualizações de transferências ou correções que forem lançadas futuramente.
                    </>
                  ) : (
                    <>
                      Você terá acesso imediato à versão atual e <strong>todas as novas ISOs e atualizações</strong> de elencos 
                      lançadas durante os próximos <strong>{selectedPlan.duration_days} dias</strong> diretamente no seu painel de cliente.
                    </>
                  )}
                </p>
              </div>
            )}

            {/* BOTÃO DE CTA PRINCIPAL */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleBuy}
                className="w-full rounded-xl bg-primary py-4 px-6 text-center text-lg font-black uppercase tracking-wider text-primary-foreground shadow-xl shadow-green-900/30 transition-all hover:bg-green-600 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 cursor-pointer"
              >
                <span>COMPRE AGORA — {selectedPlan ? formatPrice(selectedPlan.price_cents) : ''}</span>
                <ArrowRight className="h-5 w-5" />
              </button>

              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" /> Pagamento 100% via PIX
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Liberação Automática
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Sem assinaturas surpresa
                </span>
              </div>
            </div>

            {/* FAQ Rápido / Como Funciona */}
            <div className="border-t border-border pt-6 space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                Como recebo após o pagamento?
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Assim que o PIX for confirmado (leva cerca de 3 segundos), sua conta recebe a licença de acesso automaticamente. 
                Basta entrar no seu <strong>Painel do Cliente</strong> para gerar o link do download direto e seguro do arquivo ISO.
              </p>
            </div>

          </div>

        </div>
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
