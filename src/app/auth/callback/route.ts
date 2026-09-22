import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/infra/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // O perfil já foi criado automaticamente pelo Trigger do banco de dados!
      return NextResponse.redirect(new URL(redirect, request.url));
    }
  }

  return NextResponse.redirect(new URL('/login', request.url));
}