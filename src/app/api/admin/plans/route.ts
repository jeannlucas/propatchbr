import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/infra/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .order('price_cents', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ plans });
  } catch (err) {
    console.error('Admin plans GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id, name, price_cents, duration_days, duration, is_active, badge, description, abacatepay_product_id } = body;

    if (!id || typeof price_cents !== 'number') {
      return NextResponse.json({ error: 'ID e price_cents são obrigatórios' }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from('plans')
      .update({
        name,
        price_cents,
        duration_days: duration_days === '' || duration_days === null ? null : Number(duration_days),
        duration: duration || (duration_days ? `days_${duration_days}` : 'lifetime'),
        is_active: is_active ?? true,
        badge: badge || null,
        description: description || null,
        abacatepay_product_id: abacatepay_product_id || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating plan:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan: updated });
  } catch (err) {
    console.error('Admin plans PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
