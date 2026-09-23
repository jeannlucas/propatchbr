import { redirect } from 'next/navigation';
import { getProductWithPlans } from '@/modules/catalog/repositories/product-repository';

export const dynamic = 'force-dynamic';

export default async function PlanosRedirectPage() {
  const product = await getProductWithPlans();
  if (product) {
    redirect(`/produtos/${product.slug || product.id}`);
  }
  redirect('/');
}