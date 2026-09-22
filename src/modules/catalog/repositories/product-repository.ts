import { createClient } from '@/infra/supabase/server';
import { Product, Plan } from '../types';

export async function getProductWithPlans(productId?: string): Promise<Product | null> {
  const supabase = await createClient();

  // Se não foi passado um ID específico, busca o primeiro produto ativo
  let query = supabase
    .from('products')
    .select('*, product_versions(*)')
    .eq('is_active', true);

  if (productId) {
    query = query.eq('id', productId);
  }

  const { data: product, error: productError } = await query.order('created_at', { ascending: true }).limit(1).maybeSingle();

  if (productError || !product) {
    console.error('Error fetching product:', productError);
    return null;
  }

  // Buscar planos ativos associados ao produto, ordenados pelo menor preço
  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('*')
    .eq('product_id', product.id)
    .eq('is_active', true)
    .order('price_cents', { ascending: true });

  if (plansError) {
    console.error('Error fetching plans for product:', plansError);
  }

  return {
    ...product,
    plans: plans || [],
  };
}

export async function getAllProductsWithPlans(): Promise<Product[]> {
  const supabase = await createClient();

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*, product_versions(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (productsError || !products) {
    console.error('Error fetching products:', productsError);
    return [];
  }

  const { data: allPlans, error: plansError } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('price_cents', { ascending: true });

  if (plansError) {
    console.error('Error fetching plans:', plansError);
  }

  const plansByProduct = (allPlans || []).reduce<Record<string, Plan[]>>((acc, plan) => {
    if (!acc[plan.product_id]) acc[plan.product_id] = [];
    acc[plan.product_id].push(plan);
    return acc;
  }, {});

  return products.map((prod) => ({
    ...prod,
    plans: plansByProduct[prod.id] || [],
  }));
}
