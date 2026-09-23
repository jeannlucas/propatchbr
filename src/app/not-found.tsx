import Link from 'next/link';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-green-600 selection:text-white">
      <header className="border-b border-border/80 bg-zinc-950/40 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para a Página Inicial</span>
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono">
            Erro 404
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-16 text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900/80 text-primary shadow-xl">
          <Gamepad2 className="h-10 w-10 text-primary animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black uppercase tracking-tight text-foreground">
            Bola Fora!
          </h1>
          <p className="text-sm text-zinc-400">
            A página ou recurso que você tentou acessar não existe ou foi movido para outro endereço.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-green-900/30 hover:bg-green-600 transition"
          >
            Ir para a Vitrine
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
