import { createClient } from '@/infra/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect('/login');

  // Buscar perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  // Buscar entitlements com product_id
  const { data: entitlements } = await supabase
    .from('entitlements')
    .select('id, valid_until, metadata, product_id')
    .eq('user_id', user.id);

  console.log('=== DASHBOARD DEBUG ===');
  console.log('User:', user.email);
  console.log('Entitlements:', entitlements);

  // Buscar product_versions diretamente
  let entitlementsWithVersions = [];
  
  if (entitlements && entitlements.length > 0) {
    for (const ent of entitlements) {
      // Buscar a versão do produto associada
      const { data: versions } = await supabase
        .from('product_versions')
        .select('version_name, storage_path, product_id')
        .eq('product_id', ent.product_id);

      console.log(`Versions for product ${ent.product_id}:`, versions);

      // Buscar o nome do produto
      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', ent.product_id)
        .single();

      entitlementsWithVersions.push({
        ...ent,
        products: product ? {
          name: product.name,
          product_versions: versions || []
        } : null
      });
    }
  }

  console.log('Final entitlements:', entitlementsWithVersions);

  return (
    <DashboardClient 
      entitlements={entitlementsWithVersions} 
      profile={profile}
      userEmail={user.email || ''}
    />
  );
}