-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE plan_duration AS ENUM ('lifetime', 'days_30', 'days_90');
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'canceled', 'refunded');
CREATE TYPE download_status AS ENUM ('success', 'failed', 'pending');

-- Tabela de Perfis de Usuário (Vinculada ao auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  cpf TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Produtos
CREATE TABLE public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_game TEXT NOT NULL DEFAULT 'Winning Eleven 10',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Versões do Produto
CREATE TABLE public.product_versions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL,
  release_date DATE NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  changelog TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Planos
CREATE TABLE public.plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  duration plan_duration NOT NULL,
  duration_days INTEGER,
  is_active BOOLEAN DEFAULT true
);

-- Tabela de Pedidos
CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id),
  total_cents INTEGER NOT NULL,
  status order_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Entitlements (O CORAÇÃO DO SISTEMA)
CREATE TABLE public.entitlements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id),
  granted_version_id UUID REFERENCES public.product_versions(id),
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Logs de Download (Auditoria e Quota)
CREATE TABLE public.download_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entitlement_id UUID REFERENCES public.entitlements(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.product_versions(id),
  ip_address INET,
  status download_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Concessões Administrativas (Overrides de Download)
CREATE TABLE public.download_grants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.product_versions(id),
  granted_by UUID REFERENCES public.profiles(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_grants ENABLE ROW LEVEL SECURITY;

-- Regras de Perfil
CREATE POLICY "Usuarios podem ver seu proprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Regras de Pedidos
CREATE POLICY "Usuarios podem ver seus proprios pedidos" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

-- Regras de Entitlements (CRÍTICO)
CREATE POLICY "Usuarios podem ver seus proprios entitlements" ON public.entitlements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Apenas backend (service role) pode inserir/atualizar entitlements" ON public.entitlements
  FOR ALL USING (false);

-- Regras de Download Logs
CREATE POLICY "Usuarios podem inserir seus proprios logs de download" ON public.download_logs
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.entitlements WHERE id = entitlement_id)
  );
CREATE POLICY "Usuarios podem ver seus proprios logs" ON public.download_logs
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM public.entitlements WHERE id = entitlement_id)
  );

-- Regras de Download Grants
CREATE POLICY "Apenas admins podem gerenciar grants" ON public.download_grants
  FOR ALL USING (false);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();