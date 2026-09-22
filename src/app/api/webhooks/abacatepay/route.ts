import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/infra/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let body: any;
    
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error('Failed to parse webhook body as JSON');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Event:', body.event);

    const supabase = await createClient();

    if (body.event === 'checkout.completed' && body.data?.checkout) {
      const checkout = body.data.checkout;
      const checkoutId = checkout.id;
      const metadata = checkout.metadata || {};
      const amount = checkout.amount;

      console.log('Processing completed payment:', { checkoutId, metadata });

      // Buscar pedido pelo external_id
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('external_id', checkoutId)
        .single();

      if (orderError || !order) {
        console.error('Order not found for checkout:', checkoutId, orderError);
        return NextResponse.json({ received: false, error: 'Order not found' }, { status: 404 });
      }

      // Buscar o product_id e duration_days do plano
      const { data: plan } = await supabase
        .from('plans')
        .select('product_id, duration_days, duration, name')
        .eq('id', order.plan_id)
        .single();

      if (!plan?.product_id) {
        console.error('Product ID not found for plan:', order.plan_id);
        return NextResponse.json({ received: false, error: 'Product not found' }, { status: 404 });
      }

      // Atualizar status do pedido
      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', order.id);

      // Criar registro de pagamento
      await supabase
        .from('payments')
        .upsert({
          order_id: order.id,
          gateway: 'abacatepay',
          gateway_payment_id: checkoutId,
          status: 'paid',
          amount_cents: amount,
          metadata: metadata,
        }, { onConflict: 'gateway_payment_id' });

      // Calcular validade de forma dinâmica com base em duration_days
      let validUntil: string | null = null;
      if (plan.duration_days && plan.duration_days > 0) {
        validUntil = new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString();
      } else if (metadata.plan_name?.includes('30 dias')) {
        validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (metadata.plan_name?.includes('90 dias')) {
        validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      }

      // Criar entitlement com o product_id CORRETO
      const { error: entitlementError } = await supabase
        .from('entitlements')
        .insert({
          user_id: order.user_id,
          product_id: plan.product_id,  // ✅ Agora usa o product_id real
          valid_until: validUntil,
          metadata: {
            order_id: order.id,
            checkout_id: checkoutId,
            plan_name: metadata.plan_name,
          },
        });

      if (entitlementError) {
        console.error('Failed to create entitlement:', entitlementError);
      } else {
        console.log('✅ Entitlement created successfully for user:', order.user_id);
      }
    } else {
      console.log('Unhandled event type:', body.event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ received: false, error: 'Internal server error' }, { status: 500 });
  }
}