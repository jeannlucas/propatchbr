'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { signIn, signUp } from '@/modules/identity/use-cases/auth-actions';

function LoginFormContent() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  const [formAction, setFormAction] = useState<'signIn' | 'signUp'>('signIn');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (formData: FormData) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    const result = await signIn(formData);
    setLoading(false);
    if (result?.error) {
      setErrorMsg(result.error);
    }
  };

  const handleSignUp = async (formData: FormData) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirm_password') as string;

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const result = await signUp(formData);
    setLoading(false);
    if (result?.error) {
      setErrorMsg(result.error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 selection:bg-green-600 selection:text-white">
      <div className="w-full max-w-md space-y-8">
        {/* LOGO */}
        <div className="flex justify-center">
          <img
            src="/logo.png"
            alt="ProPatch BR"
            className="h-32 w-auto md:h-40"
            style={{ background: 'transparent' }}
          />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-zinc-400">
            {redirectUrl.includes('/checkout') 
              ? 'Faça login para continuar com seu pagamento'
              : 'Acesse sua área do cliente para baixar suas atualizações.'}
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-800 bg-red-950/50 p-3.5 text-sm text-red-300 text-center animate-in fade-in duration-200">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-green-800 bg-green-950/70 p-3.5 text-sm text-green-300 text-center animate-in fade-in duration-200">
            {successMsg}
          </div>
        )}

        {/* Toggle Login/Cadastro */}
        <div className="flex rounded-lg border border-border bg-card p-1">
          <button
            onClick={() => setFormAction('signIn')}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
              formAction === 'signIn' ? 'bg-primary text-primary-foreground' : 'text-zinc-400 hover:text-foreground'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setFormAction('signUp')}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
              formAction === 'signUp' ? 'bg-primary text-primary-foreground' : 'text-zinc-400 hover:text-foreground'
            }`}
          >
            Cadastrar
          </button>
        </div>

        <div className="mt-8">
          {formAction === 'signIn' ? (
            /* Formulário de Login */
            <form action={handleSignIn} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
              <input type="hidden" name="redirect" value={redirectUrl} />
              
              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">E-mail</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="block w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Senha</label>
                  <Link
                    href="/esqueci-senha"
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center items-center gap-2 rounded-xl bg-primary py-3 px-4 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-green-900/30 hover:bg-green-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <span>Entrar</span>
                )}
              </button>
            </form>
          ) : (
            /* Formulário de Cadastro */
            <form action={handleSignUp} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
              <input type="hidden" name="redirect" value={redirectUrl} />
              
              <div>
                <label htmlFor="full_name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Nome Completo</label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  maxLength={100}
                  className="block w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none"
                  placeholder="Seu Nome"
                />
              </div>

              <div>
                <label htmlFor="signup_email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">E-mail</label>
                <input
                  id="signup_email"
                  name="email"
                  type="email"
                  required
                  maxLength={100}
                  className="block w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="signup_password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Senha (mín. 6 caracteres)</label>
                <input
                  id="signup_password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  maxLength={100}
                  className="block w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirm_password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Confirmar Senha</label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  minLength={6}
                  maxLength={100}
                  className="block w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center items-center gap-2 rounded-xl bg-primary py-3 px-4 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-green-900/30 hover:bg-green-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Cadastrando...</span>
                  </>
                ) : (
                  <span>Criar Conta</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-zinc-400">Carregando...</p>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}