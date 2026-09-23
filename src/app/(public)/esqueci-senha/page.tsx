'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { requestPasswordReset } from '@/modules/identity/use-cases/auth-actions';

export default function EsqueciSenhaPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await requestPasswordReset(formData);

    setLoading(false);
    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else if (result.message) {
      setMessage({ type: 'success', text: result.message });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 selection:bg-green-600 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        
        <div className="flex justify-center">
          <img
            src="/logo.png"
            alt="ProPatch BR"
            className="h-28 w-auto md:h-36"
            style={{ background: 'transparent' }}
          />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">
            Recuperação de Senha
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Digite seu e-mail cadastrado para receber um link seguro de redefinição de acesso.
          </p>
        </div>

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

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div>
            <label htmlFor="reset_email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Seu E-mail Cadastrado
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                id="reset_email"
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-9 pr-3 py-2.5 text-sm text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3 px-4 text-center text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-green-900/30 transition hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Enviando link...</span>
              </>
            ) : (
              <span>Enviar Link de Recuperação</span>
            )}
          </button>
        </form>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar para a tela de login</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
