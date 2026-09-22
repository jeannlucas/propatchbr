import Link from 'next/link';
import { Check, Download, Trophy, Users, Gamepad2 } from 'lucide-react';

const features = [
  { icon: Trophy, title: 'Brasileirão Completo', desc: 'Séries A, B e C com times reais e atualizados.' },
  { icon: Users, title: 'Dados Reais', desc: 'Idade, altura, peso e pé dominante atualizados.' },
  { icon: Download, title: 'Transferências', desc: 'Atualizações frequentes com as últimas contratações.' },
];

// IDs REAIS do banco de dados
const plans = [
  { 
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    name: 'Versão Avulsa', 
    price: 'R$ 25', 
    period: 'pagamento único', 
    features: ['Acesso vitalício à versão 1.0', 'Suporte por e-mail', 'Downloads ilimitados da versão adquirida'], 
    highlight: false 
  },
  { 
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
    name: 'Atualização 30 dias', 
    price: 'R$ 25', 
    period: 'por 30 dias', 
    features: ['Tudo da versão avulsa', 'Todas as atualizações por 30 dias', 'Acesso prioritário a hotfixes'], 
    highlight: true 
  },
  { 
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', 
    name: 'Atualização 90 dias', 
    price: 'R$ 60', 
    period: 'por 90 dias', 
    features: ['Tudo do plano 30 dias', 'Economia de R$ 15', 'Melhor custo-benefício'], 
    highlight: false 
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/20 via-background to-background" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 text-center">
          {/* LOGO */}
          <div className="mb-6 sm:mb-8 flex justify-center">
            <img
              src="/logo.png"
              alt="ProPatch BR"
              className="h-32 w-auto sm:h-48 md:h-64"
              style={{ background: 'transparent' }}
            />
          </div>
          
          {/* Badge de Status */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-800 bg-green-950/30 px-3 py-1.5 text-xs sm:text-sm text-green-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            Pro Patch BR 1.0 — Disponível agora
          </div>

          {/* NOVA HEADLINE PRINCIPAL */}
          <h1 className="mb-4 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight uppercase italic">
            Nosso patch, <br className="hidden sm:block" />
            <span className="text-primary">sua diversão.</span>
          </h1>

          {/* SUBTÍTULO DE APOIO (Nostalgia) */}
          <p className="mx-auto mb-6 sm:mb-8 max-w-2xl text-lg sm:text-xl text-zinc-300 font-medium">
            O Winning Eleven 10 como ele deveria ser hoje.
          </p>

          {/* DESCRIÇÃO TÉCNICA */}
          <p className="mx-auto mb-8 sm:mb-10 max-w-2xl text-sm sm:text-base text-zinc-400 px-4">
            Elencos atualizados, narração exclusiva do Fernando Fefux (ESPN), Brasileirão A/B/C completo e muito mais. 
            Jogue no seu PS2 via OPL, Matrix ou DVD gravado.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto px-4">
            <Link href="/planos" className="w-full sm:w-auto rounded-lg bg-primary px-6 sm:px-8 py-3 font-semibold text-primary-foreground shadow-lg shadow-green-900/30 transition hover:bg-green-700 text-center">
              Adquirir agora — R$ 25
            </Link>
            <Link href="#como-funciona" className="w-full sm:w-auto rounded-lg border border-border bg-card px-6 sm:px-8 py-3 font-semibold text-foreground transition hover:bg-zinc-800 text-center">
              Como funciona
            </Link>
          </div>
        </div>
      </section>

      {/* CAPA DO JOGO + PRODUTO */}
      <section className="border-b border-border bg-zinc-950/30 py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-8 sm:gap-12 md:grid-cols-2">
            {/* Imagem da Capa */}
            <div className="flex justify-center order-2 md:order-1">
              <div className="relative">
                <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-green-600/20 to-transparent blur-2xl" />
                <img
                  src="/capa-we10.png"
                  alt="Winning Eleven 10 - Capa Oficial"
                  className="relative rounded-xl shadow-2xl shadow-black/50 w-full max-w-xs sm:max-w-sm md:max-w-md"
                  style={{ background: 'transparent' }}
                />
              </div>
            </div>

            {/* Informações do Produto */}
            <div className="space-y-4 sm:space-y-6 order-1 md:order-2 text-center md:text-left">
              <div>
                <h2 className="mb-3 sm:mb-4 text-2xl sm:text-3xl font-bold">Pro Patch BR 1.0</h2>
                <p className="text-base sm:text-lg text-zinc-400">
                  Baseado no clássico <strong className="text-foreground">Winning Eleven 10</strong> da Konami, 
                  nosso patch traz toda a nostalgia do PS2 com dados atualizados para a temporada atual.
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3">
                  <Gamepad2 className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                  <div className="text-left">
                    <h3 className="font-semibold">Compatibilidade Total</h3>
                    <p className="text-sm text-zinc-400">Funciona em PS2 desbloqueado via OPL, Matrix, Memory Card/Fortuna ou DVD gravado.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Download className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                  <div className="text-left">
                    <h3 className="font-semibold">ISO Completa de ~1GB</h3>
                    <p className="text-sm text-zinc-400">Arquivo pronto para gravar em pendrive ou DVD. Sem complicações.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Trophy className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                  <div className="text-left">
                    <h3 className="font-semibold">Conteúdo Premium</h3>
                    <p className="text-sm text-zinc-400">Narração exclusiva Fernando Fefux (ESPN), Brasileirão A/B/C, dados reais dos jogadores.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-20">
        <h2 className="mb-8 sm:mb-12 text-center text-2xl sm:text-3xl font-bold px-4">Diferenciais que fazem a diferença</h2>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col h-full rounded-lg border border-border bg-card p-5 sm:p-6 transition hover:border-primary/50">
              <f.icon className="mb-3 sm:mb-4 h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              <h3 className="mb-2 font-semibold text-base sm:text-lg">{f.title}</h3>
              <p className="text-sm text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="border-y border-border bg-zinc-950/50 py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="mb-8 sm:mb-12 text-center text-2xl sm:text-3xl font-bold px-4">Como funciona</h2>
          <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
            {[
              { n: 1, t: 'Adquira', d: 'Escolha seu plano e pague via Pix. Aprovação instantânea.' },
              { n: 2, t: 'Baixe a ISO', d: 'Receba o arquivo de ~1GB diretamente na sua área do cliente.' },
              { n: 3, t: 'Jogue', d: 'Coloque no pendrive (pasta DVD), execute via OPL no PS2 e divirta-se.' },
            ].map((step) => (
              <div key={step.n} className="rounded-lg border border-border bg-card p-5 sm:p-6">
                <div className="mb-3 sm:mb-4 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-sm sm:text-base">
                  {step.n}
                </div>
                <h3 className="mb-2 font-semibold text-base sm:text-lg">{step.t}</h3>
                <p className="text-sm text-zinc-400">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-20">
        <h2 className="mb-3 sm:mb-4 text-center text-2xl sm:text-3xl font-bold px-4">Escolha seu plano</h2>
        <p className="mb-8 sm:mb-12 text-center text-sm sm:text-base text-zinc-400 px-4">Pagamento único via Pix. Sem recorrência surpresa.</p>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border p-5 sm:p-6 ${
                plan.highlight ? 'border-primary bg-card shadow-lg shadow-green-900/20' : 'border-border bg-card'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  MAIS POPULAR
                </span>
              )}
              <h3 className="mb-2 text-base sm:text-lg font-semibold">{plan.name}</h3>
              <div className="mb-4 sm:mb-6">
                <span className="text-3xl sm:text-4xl font-bold">{plan.price}</span>
                <span className="text-xs sm:text-sm text-zinc-400"> {plan.period}</span>
              </div>
              <ul className="mb-5 sm:mb-6 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/checkout?plan=${plan.id}`}
                className={`block w-full rounded-lg px-4 py-2.5 sm:py-3 text-center text-sm sm:text-base font-semibold transition-all ${
                  plan.highlight 
                    ? 'bg-primary text-primary-foreground hover:bg-green-700 shadow-lg shadow-green-900/30' 
                    : 'border-2 border-zinc-600 bg-transparent text-foreground hover:bg-zinc-800 hover:border-zinc-500'
                }`}
              >
                Escolher Plano
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-6 sm:py-8 text-center text-xs sm:text-sm text-zinc-500 px-4">
        <p>© 2026 ProPatch BR. Todos os direitos reservados.</p>
        <p className="mt-2">Não afiliado à Konami. Projeto independente de modding.</p>
      </footer>
    </div>
  );
}