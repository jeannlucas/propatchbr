'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn, signUp, signInWithGoogle } from '@/modules/identity/use-cases/auth-actions';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  const [formAction, setFormAction] = useState<'signIn' | 'signUp'>('signIn');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
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

        {/* Botão Google */}
        <form action={signInWithGoogle} className="space-y-4">
          <input type="hidden" name="redirect" value={redirectUrl} />
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm hover:bg-zinc-800 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar com Google
          </button>
        </form>

        {/* Divisor */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background px-2 text-zinc-500">ou continue com e-mail</span>
          </div>
        </div>

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
            <form action={signIn} className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
              <input type="hidden" name="redirect" value={redirectUrl} />
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-300">E-mail</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-zinc-300">Senha</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors"
              >
                Entrar
              </button>
            </form>
          ) : (
            /* Formulário de Cadastro */
            <form action={signUp} className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
              <input type="hidden" name="redirect" value={redirectUrl} />
              
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-zinc-300">Nome Completo</label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Seu Nome"
                />
              </div>

              <div>
                <label htmlFor="signup_email" className="block text-sm font-medium text-zinc-300">E-mail</label>
                <input
                  id="signup_email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="signup_password" className="block text-sm font-medium text-zinc-300">Senha (mín. 6 caracteres)</label>
                <input
                  id="signup_password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-foreground placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="flex w-full justify-center rounded-md border border-zinc-600 bg-transparent px-3 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 transition-colors"
              >
                Cadastrar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}