-- ==============================================================================
-- Migration 003: Correções de Schema, Tabela de Pagamentos e Integridade
-- ==============================================================================

-- 1. Garantir colunas adicionais na tabela plans
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS features TEXT[];

-- 2. Garantir coluna external_id e índices na tabela orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_external_id ON public.orders(external_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- 3. Criar tabela de pagamentos (payments)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  gateway TEXT NOT NULL,
  gateway_payment_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios podem ver seus pagamentos" ON public.payments;
CREATE POLICY "Usuarios podem ver seus pagamentos" ON public.payments
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM public.orders WHERE id = order_id)
  );

DROP POLICY IF EXISTS "Service role tem acesso total a pagamentos" ON public.payments;
CREATE POLICY "Service role tem acesso total a pagamentos" ON public.payments
  FOR ALL USING (true);

-- 4. Garantir colunas na tabela download_logs para auditoria completa
ALTER TABLE public.download_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.download_logs ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 5. Trigger para criação automática de perfil em public.profiles ao registrar novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Sincronizar usuários existentes que possam estar sem perfil
INSERT INTO public.profiles (id, full_name, created_at, updated_at)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email), NOW(), NOW()
FROM auth.users
ON CONFLICT (id) DO NOTHING;
