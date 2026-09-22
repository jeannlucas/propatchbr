import { redirect } from 'next/navigation';
import { getProductWithPlans } from '@/modules/catalog/repositories/product-repository';

export default async function ProdutosIndexPage() {
  const product = await getProductWithPlans();
  if (product) {
    redirect(`/produtos/${product.id}`);
  }
  redirect('/');
}
