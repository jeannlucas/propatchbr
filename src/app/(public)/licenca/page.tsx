import Link from 'next/link';
import { ArrowLeft, Scale, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Licença MIT - Pro Patch BR',
  description: 'Termos da Licença MIT do software Pro Patch BR.',
};

export default function LicencaPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-green-600 selection:text-white">
      {/* Header Superior */}
      <header className="border-b border-border/80 bg-zinc-950/40 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para a Vitrine</span>
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Termos Legais
          </span>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 w-full space-y-10">
        
        {/* Título e Apresentação */}
        <div className="text-center space-y-3">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-green-800 bg-green-950/40 text-primary shadow-lg shadow-green-950/40 mb-2">
            <Scale className="h-7 w-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Licença MIT
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
            Este projeto é um software de código aberto distribuído sob os termos e condições da permissiva Licença MIT.
          </p>
        </div>

        {/* Resumo dos Direitos (Versão Simples em Português) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              O que você pode fazer:
            </h3>
            <ul className="text-xs text-zinc-400 space-y-1.5 leading-relaxed">
              <li>• Usar o software para fins comerciais ou privados.</li>
              <li>• Modificar o código-fonte livremente.</li>
              <li>• Distribuir cópias do código original ou modificado.</li>
              <li>• Sublicenciar e incorporar em outros projetos.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              Condições e Isenções:
            </h3>
            <ul className="text-xs text-zinc-400 space-y-1.5 leading-relaxed">
              <li>• Manter o aviso de direitos autorais (copyright) original.</li>
              <li>• O software é fornecido "no estado em que se encontra" (as is).</li>
              <li>• Sem qualquer garantia expressa ou implícita de funcionamento.</li>
              <li>• Os autores não são responsáveis por danos resultantes do uso.</li>
            </ul>
          </div>
        </div>

        {/* Texto Oficial da Licença (Inglês) */}
        <div className="rounded-2xl border border-border bg-zinc-950/80 p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              MIT License — Official Text
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Copyright (c) 2026
            </span>
          </div>

          <div className="font-mono text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-4 select-all bg-zinc-900/50 p-4 sm:p-6 rounded-xl border border-zinc-800/80">
            <p>MIT License</p>
            <p>Copyright (c) 2026 Jeann Lucas / ProPatch BR</p>
            
            <p>
              Permission is hereby granted, free of charge, to any person obtaining a copy
              of this software and associated documentation files (the &quot;Software&quot;), to deal
              in the Software without restriction, including without limitation the rights
              to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
              copies of the Software, and to permit persons to whom the Software is
              furnished to do so, subject to the following conditions:
            </p>
            
            <p>
              The above copyright notice and this permission notice shall be included in all
              copies or substantial portions of the Software.
            </p>
            
            <p>
              THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
              IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
              AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
              LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
              OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
              SOFTWARE.
            </p>
          </div>
        </div>

        {/* Aviso de Marca Registrada / Isenção Konami */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center">
          <p className="text-xs text-zinc-500 leading-relaxed">
            <strong>Aviso de Marca:</strong> Winning Eleven 10 e PlayStation 2 são marcas registradas de suas respectivas proprietárias (Konami Digital Entertainment e Sony Interactive Entertainment). Este projeto é uma iniciativa independente de modificação desenvolvida pela comunidade.
          </p>
        </div>

      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
