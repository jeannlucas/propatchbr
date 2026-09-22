import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/infra/supabase/server';
import { randomUUID } from 'crypto';

const ABACATEPAY_API_KEY = process.env.ABACATEPAY_API_KEY;
const ABACATEPAY_BASE_URL = process.env.ABACATEPAY_BASE_URL || 'https://api.abacatepay.com/v2';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Obter dados do plano
    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // 3. Buscar informações do plano
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      console.error('Plan not found:', { planId, planError });
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // 4. Verificar se tem ID do produto na AbacatePay
    if (!plan.abacatepay_product_id) {
      console.error('Plan missing abacatepay_product_id:', plan.id);
      return NextResponse.json({ 
        error: 'Produto não configurado na AbacatePay' 
      }, { status: 500 });
    }

    // 5. Gerar externalId único para cada checkout
    const uniqueExternalId = `${plan.id}_${randomUUID().split('-')[0]}`;

    // 5. Criar checkout na AbacatePay
    const checkoutData = {
      items: [
        {
          id: plan.abacatepay_product_id,
          quantity: 1
        }
      ],
      externalId: uniqueExternalId, // ✅ ID único para cada checkout
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success`,
      completionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
      methods: ['PIX'],
      metadata: {
        plan_id: plan.id,
        user_id: user.id,
        plan_name: plan.name,
        customer_email: user.email
      }
    };

    console.log('Creating AbacatePay checkout:', checkoutData);

    const response = await fetch(`${ABACATEPAY_BASE_URL}/checkouts/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ABACATEPAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutData),
    });

    const responseBody = await response.json();
    console.log('AbacatePay checkout response:', responseBody);

    if (!response.ok || !responseBody.success) {
      console.error('AbacatePay error:', responseBody);
      return NextResponse.json({ 
        error: responseBody.error || 'Failed to create checkout' 
      }, { status: 400 });
    }

    // 6. Criar pedido no banco (status pendente)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        total_cents: plan.price_cents,
        status: 'pending',
        external_id: responseBody.data?.id, // ID do checkout da AbacatePay
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Failed to create order:', orderError);
    }

    // 7. Retornar URL do checkout para redirecionamento
    return NextResponse.json({
      success: true,
      checkoutUrl: responseBody.data?.url,
      orderId: order?.id,
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}