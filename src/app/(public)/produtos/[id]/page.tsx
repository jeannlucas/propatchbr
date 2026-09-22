import { notFound } from 'next/navigation';
import { getProductWithPlans } from '@/modules/catalog/repositories/product-repository';
import ProductDetailClient from './ProductDetailClient';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params;

  // Busca o produto pelo ID fornecido ou o primeiro produto ativo do catálogo
  let product = await getProductWithPlans(id);

  // Se o ID for um alias como "pro-patch-br" ou não encontrar por UUID, busca o produto principal ativo
  if (!product) {
    product = await getProductWithPlans();
  }

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
