import Link from 'next/link';
import { CheckCircle2, Download, ArrowRight, Gamepad2, ShieldCheck, Sparkles } from 'lucide-react';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Pagamento Confirmado - Pro Patch BR',
  description: 'Seu pagamento foi confirmado com sucesso. Acesse seus downloads no painel do cliente.',
};

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-green-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-border/80 bg-zinc-950/40 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-primary transition-colors"
          >
            ← Voltar para o Início
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-green-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Compra Concluída
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16 text-center space-y-8 w-full">
        
        {/* Ícone de Sucesso */}
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-primary border border-green-500/30 shadow-2xl shadow-green-950/50">
          <div className="absolute inset-0 rounded-full bg-green-500/10 blur-xl animate-pulse" />
          <CheckCircle2 className="h-10 w-10 relative z-10" />
        </div>

        {/* Títulos */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-green-800 bg-green-950/40 px-3 py-1 text-xs font-semibold text-green-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Acesso Liberado Automaticamente</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">
            Pagamento Confirmado!
          </h1>
          <p className="text-sm sm:text-base text-zinc-300 max-w-lg mx-auto leading-relaxed">
            Parabéns! Sua licença do <strong className="text-foreground">Pro Patch BR</strong> foi ativada. O arquivo ISO já está disponível para download na sua conta.
          </p>
        </div>

        {/* Card de Ação Principal */}
        <div className="rounded-2xl border border-zinc-800 bg-card p-6 sm:p-8 shadow-xl space-y-6 text-left">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Como baixar e jogar agora:</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Acesse o painel do cliente, gere seu link exclusivo e transfira a ISO para seu pendrive do OPL.
              </p>
            </div>
          </div>

          <div className="border-t border-zinc-800/80 pt-4 space-y-3">
            <div className="flex items-center gap-3 text-xs text-zinc-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-primary">1</span>
              <span>Clique no botão abaixo para abrir a <strong>Área do Cliente</strong>.</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-primary">2</span>
              <span>Clique em <strong>Baixar ISO</strong> para receber o link seguro de alta velocidade.</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-primary">3</span>
              <span>Copie para a pasta <code>CD</code> ou <code>DVD</code> do seu pendrive/HD e divirta-se!</span>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="w-full rounded-xl bg-primary py-4 px-6 text-center text-sm font-black uppercase tracking-wider text-primary-foreground shadow-xl shadow-green-900/30 transition hover:bg-green-600 flex items-center justify-center gap-2"
          >
            <span>Ir para Meus Downloads</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Garantia */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" /> Download 100% Protegido
          </span>
          <span className="flex items-center gap-1.5">
            <Gamepad2 className="h-4 w-4 text-primary" /> Compatível com PS2 / OPL
          </span>
        </div>

      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
