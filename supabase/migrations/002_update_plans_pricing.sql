-- ==============================================================================
-- Migration 002: Atualização de Preços, Planos e Associação de Produtos
-- ==============================================================================

-- 1. Garantir que a tabela plans possui os campos necessários para UI e integrações
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS features TEXT[];

-- 2. Atualizar ou inserir os 3 planos oficiais com os novos valores:
--    - Versão Avulsa: R$ 24,90 (2490 centavos)
--    - Atualizações por 30 dias: R$ 34,90 (3490 centavos)
--    - Atualizações por 90 dias: R$ 49,90 (4990 centavos)

INSERT INTO public.plans (
  id,
  product_id,
  name,
  price_cents,
  duration,
  duration_days,
  is_active,
  abacatepay_product_id,
  badge,
  description,
  features
) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000001',
    'Versão Avulsa',
    2490,
    'lifetime',
    NULL,
    true,
    'prod_yWU55P30nx5TrnNSyahRKPSd',
    'Mais Econômico',
    'Acesso permanente à versão atual do patch (v1.0), sem período adicional de atualizações.',
    ARRAY['Download imediato da ISO (v1.0)', 'Acesso permanente à versão adquirida', 'Suporte à instalação no OPL/PS2', 'Sem atualizações futuras inclusas']
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000001',
    'Atualizações por 30 dias',
    3490,
    'days_30',
    30,
    true,
    'prod_GXgheq6t5qYjU2NzUGhqR3JX',
    'Mais Popular',
    'Tudo da versão atual + acesso garantido a todas as atualizações de elencos e transferências lançadas em 30 dias.',
    ARRAY['Download imediato da ISO mais recente', 'Todas as novas versões por 30 dias', 'Transferências do mercado da bola', 'Hotfixes e correções com prioridade', 'Suporte VIP via e-mail e comunidade']
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '00000000-0000-0000-0000-000000000001',
    'Atualizações por 90 dias',
    4990,
    'days_90',
    90,
    true,
    'prod_GeCaB1FMgEacUHPuwHqBXfJT',
    'Melhor Custo-Benefício',
    'A melhor opção para a temporada: 3 meses completos de atualizações e suporte para seu PS2.',
    ARRAY['Tudo do plano de 30 dias', 'Atualizações por 90 dias ininterruptos', 'Economia de mais de 50% comparado ao mensal', 'Todas as janelas de transferências cobertas', 'Suporte prioritário']
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  duration = EXCLUDED.duration,
  duration_days = EXCLUDED.duration_days,
  is_active = EXCLUDED.is_active,
  abacatepay_product_id = EXCLUDED.abacatepay_product_id,
  badge = EXCLUDED.badge,
  description = EXCLUDED.description,
  features = EXCLUDED.features;

-- 3. Habilitar leitura pública para tabela plans e products
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Planos ativos sao publicos" ON public.plans;
CREATE POLICY "Planos ativos sao publicos" ON public.plans
  FOR SELECT USING (is_active = true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Produtos ativos sao publicos" ON public.products;
CREATE POLICY "Produtos ativos sao publicos" ON public.products
  FOR SELECT USING (is_active = true);

ALTER TABLE public.product_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Versoes de produtos sao publicas" ON public.product_versions;
CREATE POLICY "Versoes de produtos sao publicas" ON public.product_versions
  FOR SELECT USING (true);
