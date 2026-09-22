import Link from 'next/link';
import { Download, Trophy, Users, Gamepad2, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { getProductWithPlans } from '@/modules/catalog/repositories/product-repository';
import { formatPrice } from '@/lib/utils';
import { Footer } from '@/components/Footer';

const features = [
  { icon: Trophy, title: 'Brasileirão Completo', desc: 'Séries A, B e C com uniformes e elencos fiéis.' },
  { icon: Users, title: 'Dados e Faces Reais', desc: 'Idade, altura, peso, atributos e pé dominante calibrados.' },
  { icon: Download, title: 'Transferências Atualizadas', desc: 'As contratações mais recentes do mercado da bola.' },
];

export default async function HomePage() {
  const product = await getProductWithPlans();

  // Calcular o menor preço disponível
  const plans = product?.plans || [];
  const minPriceCents = plans.length > 0 
    ? Math.min(...plans.map((p) => p.price_cents)) 
    : 2490;

  const minPriceFormatted = formatPrice(minPriceCents);
  const productUrl = product ? `/produtos/${product.id}` : '/produtos';

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-green-600 selection:text-white">
      {/* ========================================================================= */}
      {/* HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/20 via-background to-background" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 text-center">
          
          {/* Logo */}
          <div className="mb-6 sm:mb-8 flex justify-center">
            <img
              src="/logo.png"
              alt="ProPatch BR"
              className="h-32 w-auto sm:h-48 md:h-64 drop-shadow-[0_10px_25px_rgba(34,197,94,0.15)]"
              style={{ background: 'transparent' }}
            />
          </div>
          
          {/* Badge de Status */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-800 bg-green-950/40 px-3.5 py-1.5 text-xs sm:text-sm text-green-400 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            Pro Patch BR 1.0 — Temporada Atual para PS2
          </div>

          {/* Headline Principal */}
          <h1 className="mb-4 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight uppercase italic">
            Nosso patch, <br className="hidden sm:block" />
            <span className="text-primary">sua diversão.</span>
          </h1>

          {/* Subtítulo de Apoio */}
          <p className="mx-auto mb-6 sm:mb-8 max-w-2xl text-lg sm:text-xl text-zinc-300 font-medium">
            O Winning Eleven 10 como ele deveria ser hoje.
          </p>

          {/* Descrição Técnica */}
          <p className="mx-auto mb-8 sm:mb-10 max-w-2xl text-sm sm:text-base text-zinc-400 px-4">
            Elencos atualizados, narração exclusiva do Fernando Fefux (ESPN), Brasileirão Séries A, B e C completo. 
            Jogue no seu PlayStation 2 via OPL, Pen drive, Matrix ou DVD gravado.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto px-4">
            <Link 
              href={productUrl} 
              className="w-full sm:w-auto rounded-xl bg-primary px-8 py-3.5 font-bold text-primary-foreground shadow-xl shadow-green-900/30 transition hover:bg-green-600 text-center flex items-center justify-center gap-2"
            >
              <span>Ver Produto — A partir de {minPriceFormatted}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link 
              href="#vitrine" 
              className="w-full sm:w-auto rounded-xl border border-border bg-card px-8 py-3.5 font-semibold text-foreground transition hover:bg-zinc-800 text-center"
            >
              Conhecer os Detalhes
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* VITRINE DO PRODUTO (Menor preço na listagem) */}
      {/* ========================================================================= */}
      <section id="vitrine" className="border-b border-border bg-zinc-950/40 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Catálogo Oficial</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black">Nossa Vitrine de Patches</h2>
            <p className="mt-2 text-zinc-400 text-sm sm:text-base">
              Selecione o produto para ver todas as opções e escolher o seu plano ideal.
            </p>
          </div>

          {/* CARD DE DESTAQUE DO PRODUTO */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition hover:border-zinc-700">
            <div className="grid gap-8 lg:grid-cols-12 items-center p-6 sm:p-10">
              
              {/* Imagem / Capa do Jogo */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative group max-w-xs sm:max-w-sm">
                  <div className="absolute -inset-2 rounded-2xl bg-gradient-to-tr from-green-600/30 via-emerald-600/20 to-transparent blur-xl transition duration-500 group-hover:scale-105" />
                  <img
                    src="/capa-we10.png"
                    alt="Capa Oficial Winning Eleven 10 Pro Patch BR"
                    className="relative rounded-xl shadow-2xl shadow-black/80 w-full transition duration-300 group-hover:scale-[1.02]"
                    style={{ background: 'transparent' }}
                  />
                  <div className="absolute top-3 left-3 rounded-full bg-black/70 backdrop-blur px-3 py-1 text-xs font-bold text-green-400 border border-green-800/80">
                    PS2 / OPL
                  </div>
                </div>
              </div>

              {/* Informações Resumidas e Preço */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Lançamento Oficial 2026/2027</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black">
                    {product?.name || 'Pro Patch BR 1.0'}
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-zinc-400 leading-relaxed">
                    Baseado no lendário <strong>Winning Eleven 10</strong> da Konami. Elencos 100% atualizados, 
                    narração exclusiva Fernando Fefux (ESPN), novos uniformes, chuteiras, bolas e faces realistas.
                  </p>
                </div>

                {/* Diferenciais em Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-zinc-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Compatível com OPL via Pendrive/HD</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Arquivo ISO leve (~1GB) pronto para jogar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Séries A, B e C do Brasileirão</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Entrega e download imediato via Pix</span>
                  </div>
                </div>

                {/* Box de Preço e CTA conforme solicitado */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs uppercase font-medium tracking-wide text-zinc-400 block">
                      Valor na vitrine
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-zinc-400">A partir de</span>
                      <span className="text-3xl font-black text-foreground text-primary">
                        {minPriceFormatted}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      Diversas opções de planos e atualizações na página do produto
                    </span>
                  </div>

                  <Link
                    href={productUrl}
                    className="rounded-xl bg-primary px-6 py-3.5 text-center font-bold text-primary-foreground shadow-lg shadow-green-900/30 transition hover:bg-green-600 flex items-center justify-center gap-2 shrink-0"
                  >
                    <span>Ver Opções e Comprar</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FEATURES / DIFERENCIAIS */}
      {/* ========================================================================= */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
        <h2 className="mb-8 sm:mb-12 text-center text-2xl sm:text-3xl font-bold px-4">
          Diferenciais que fazem a diferença
        </h2>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col h-full rounded-xl border border-border bg-card p-6 transition hover:border-primary/50">
              <f.icon className="mb-4 h-8 w-8 text-primary" />
              <h3 className="mb-2 font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* COMO FUNCIONA */}
      {/* ========================================================================= */}
      <section id="como-funciona" className="border-y border-border bg-zinc-950/50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mb-4 text-center text-2xl sm:text-3xl font-bold px-4">Como funciona o fluxo</h2>
          <p className="mb-10 text-center text-zinc-400 text-sm sm:text-base">
            Simples, rápido e 100% automatizado direto na sua conta
          </p>

          <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
            {[
              { 
                n: 1, 
                t: 'Escolha seu plano', 
                d: 'Acesse o produto e selecione entre a versão avulsa ou planos com 30 a 90 dias de atualizações.' 
              },
              { 
                n: 2, 
                t: 'Pague com Pix', 
                d: 'Checkout seguro com liberação automática instantânea após a confirmação do pagamento.' 
              },
              { 
                n: 3, 
                t: 'Baixe e jogue no PS2', 
                d: 'Gere sua URL de download exclusiva no dashboard, copie para o pendrive do OPL e jogue imediatamente.' 
              },
            ].map((step) => (
              <div key={step.n} className="rounded-xl border border-border bg-card p-6 relative">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary font-black text-primary-foreground text-base shadow-md shadow-green-900/40">
                  {step.n}
                </div>
                <h3 className="mb-2 font-semibold text-lg">{step.t}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href={productUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-bold text-primary-foreground shadow-lg shadow-green-900/30 transition hover:bg-green-600"
            >
              <span>Ir para a Página do Produto</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FOOTER */}
      {/* ========================================================================= */}
      <Footer />
    </div>
  );
}