import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/infra/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { entitlementId, storagePath } = body;

    console.log('📥 Download request:', { 
      entitlementId, 
      storagePath, 
      user: user.email,
      bucket: 'patches'
    });

    if (!entitlementId || !storagePath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: entitlement, error: entitlementError } = await supabase
      .from('entitlements')
      .select('*, products(name)')
      .eq('id', entitlementId)
      .eq('user_id', user.id)
      .single();

    if (entitlementError || !entitlement) {
      console.error('❌ Entitlement not found:', entitlementError);
      return NextResponse.json({ error: 'Entitlement not found' }, { status: 404 });
    }

    if (entitlement.valid_until && new Date(entitlement.valid_until) < new Date()) {
      return NextResponse.json({ error: 'Entitlement expired' }, { status: 403 });
    }

    console.log(' Tentando gerar URL assinada para:', storagePath);
    console.log('📦 Bucket: patches');

    // Listar arquivos no bucket para debug
    const { data: files, error: listError } = await supabase
      .storage
      .from('patches')
      .list('', { limit: 10 });

    if (listError) {
      console.error('❌ Erro ao listar bucket:', listError);
    } else {
      console.log(' Arquivos no bucket:', files);
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('patches')
      .createSignedUrl(storagePath, 3600);

    if (signedUrlError) {
      console.error('❌ Erro ao criar URL assinada:', signedUrlError);
      console.error('Storage path tentado:', storagePath);
      
      return NextResponse.json({ 
        error: 'Failed to generate download URL',
        details: signedUrlError.message,
        attemptedPath: storagePath
      }, { status: 500 });
    }

    if (!signedUrlData?.signedUrl) {
      console.error('❌ URL assinada não retornada');
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
    }

    console.log('✅ URL assinada gerada com sucesso');

    await supabase
      .from('download_logs')
      .insert({
        user_id: user.id,
        entitlement_id: entitlementId,
        storage_path: storagePath,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      });

    return NextResponse.json({
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      fileName: storagePath.split('/').pop(),
    });

  } catch (error) {
    console.error('💥 Download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}