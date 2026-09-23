'use client';

import { useState, useTransition, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { resetPasswordAction } from '@/modules/identity/use-cases/auth-actions';
import { Lock, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!token) {
    return (
      <div className="text-center py-6">
        <p className="text-red-400 mb-4">Token de recuperação não fornecido ou inválido.</p>
        <Link
          href="/esqueci-senha"
          className="inline-flex items-center text-sm font-semibold text-emerald-400 hover:text-emerald-300"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Solicitar novo link
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const res = await resetPasswordAction(token, formData);
      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        setSuccess(res.message);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    });
  }

  return (
    <div>
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {success ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400 mb-3" />
          <p className="text-emerald-300 font-medium mb-2">{success}</p>
          <p className="text-xs text-zinc-400 mb-4">Você será redirecionado para o login em instantes...</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
          >
            Ir para o Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Nova Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 pl-12 pr-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                name="password_confirm"
                type="password"
                required
                minLength={6}
                placeholder="Repita a nova senha"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 pl-12 pr-4 py-3.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 py-4 text-sm font-bold uppercase tracking-wider text-zinc-950 shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:opacity-50 flex items-center justify-center cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Nova Senha'
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Link
          href="/login"
          className="inline-flex items-center text-sm font-semibold text-zinc-400 hover:text-zinc-200 mb-6 transition"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao login
        </Link>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Redefinir Senha</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Crie uma nova senha de acesso para sua conta no ProPatch BR.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 py-8 px-4 shadow-2xl rounded-2xl sm:px-10">
          <Suspense fallback={<div className="text-center py-8 text-zinc-500">Carregando...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
