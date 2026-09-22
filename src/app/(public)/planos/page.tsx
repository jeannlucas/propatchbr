import Link from 'next/link';
import { Check } from 'lucide-react';

const plans = [
  { 
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    name: 'Versão Avulsa', 
    price: 'R$ 25', 
    period: 'pagamento único', 
    features: [
      'Acesso vitalício à versão 1.0', 
      'Suporte por e-mail', 
      'Download da ISO (1 uso autorizado)'
    ], 
    highlight: false 
  },
  { 
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
    name: 'Atualização 30 dias', 
    price: 'R$ 25', 
    period: 'por 30 dias', 
    features: [
      'Tudo da versão avulsa', 
      'Todas as atualizações lançadas em 30 dias', 
      'Acesso prioritário a hotfixes'
    ], 
    highlight: true 
  },
  { 
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', 
    name: 'Atualização 90 dias', 
    price: 'R$ 60', 
    period: 'por 90 dias', 
    features: [
      'Tudo do plano 30 dias', 
      'Economia de R$ 15', 
      'Melhor custo-benefício para a temporada'
    ], 
    highlight: false 
  },
];

export default function PlanosPage() {
  return (
    <div className="min-h-screen bg-background py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <Link href="/" className="text-sm text-zinc-400 hover:text-primary transition-colors">
            ← Voltar para a Home
          </Link>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Escolha seu plano</h1>
          <p className="mt-4 text-lg text-zinc-400">
            Pagamento seguro via Pix. Liberação imediata na sua área do cliente.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border p-8 transition-all ${
                plan.highlight 
                  ? 'border-primary bg-card shadow-xl shadow-green-900/20 scale-105' 
                  : 'border-border bg-card hover:border-zinc-600'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                  Mais Popular
                </span>
              )}
              
              <h3 className="mb-2 text-xl font-semibold">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                <span className="text-sm text-zinc-400"> / {plan.period}</span>
              </div>
              
              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((f, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              
              <Link
                href={`/checkout?plan=${plan.id}`}
                className={`block w-full rounded-lg px-4 py-3 text-center font-semibold transition-all ${
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

        <div className="mt-16 rounded-lg border border-border bg-card p-6 text-center">
          <h3 className="mb-2 font-semibold">Dúvidas sobre qual escolher?</h3>
          <p className="text-sm text-zinc-400">
            Se você quer apenas testar o patch, comece com a <strong>Versão Avulsa</strong>. 
            Se quer acompanhar a temporada e as transferências, o plano de <strong>90 dias</strong> é o mais recomendado pela comunidade.
          </p>
        </div>
      </div>
    </div>
  );
}