// app/go/[id]/route.ts
// @ts-nocheck
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { buildAffiliateUrl } from '@/lib/affiliates';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper to normalize params whether it's a plain object or a Promise
function isPromiseLike(v: any): v is Promise<any> {
  return v && typeof v.then === 'function';
}

export async function GET(req: Request, context: any): Promise<Response> {
  const raw = context?.params;
  const params = isPromiseLike(raw) ? await raw : raw;
  const id: string | undefined = params?.id;
  if (!id) return NextResponse.redirect('/', { status: 302 });

  const sb = supabaseAdmin();
  const url = new URL(req.url);
  const mParam = url.searchParams.get('m'); // merchant_id
  const channel = (url.searchParams.get('ch') || 'web') as 'web' | 'email' | 'sms';

  // Try product id first
  let productId: string | null = null;
  const { data: productRow } = await sb.from('products').select('id').eq('id', id).maybeSingle();
  if (productRow?.id) {
    productId = productRow.id;
  } else {
    // Fallback: legacy deal id
    const { data: deal } = await sb
      .from('deals')
      .select('id, product_id, url')
      .eq('id', id)
      .maybeSingle();

    if (!deal) return NextResponse.redirect('/', { status: 302 });

    if (deal.product_id) {
      productId = deal.product_id;
    } else {
      const clickId = crypto.randomBytes(8).toString('hex');
      await sb.from('clicks').insert({
        deal_id: id,
        channel,
        click_id: clickId,
        ip: (url.searchParams.get('ip') || ''), // optional; usually use x-forwarded-for header in middleware
      });
      return NextResponse.redirect(deal.url, { status: 302 });
    }
  }

  // Resolve offer (specific merchant or best)
  let offer: { merchant_id: number; url: string } | null = null;

  if (mParam) {
    const mId = Number(mParam);
    const { data } = await sb
      .from('product_offers')
      .select('merchant_id, url')
      .eq('product_id', productId)
      .eq('merchant_id', mId)
      .maybeSingle();
    if (data) offer = data;
  }

  if (!offer) {
    const { data } = await sb
      .from('product_best_offer')
      .select('merchant_id, url')
      .eq('product_id', productId)
      .maybeSingle();
    if (data) offer = data;
  }

  if (!offer) return NextResponse.redirect('/', { status: 302 });

  // Load merchant for affiliate params
  const { data: merchant } = await sb
    .from('merchants')
    .select('id, domain, network, program_id')
    .eq('id', offer.merchant_id)
    .single();

  const clickId = crypto.randomBytes(8).toString('hex');
  const affiliateUrl = buildAffiliateUrl({
    merchant: {
      network: merchant.network || undefined,
      program_id: merchant.program_id || undefined,
      domain: merchant.domain,
    },
    rawUrl: offer.url,
    clickId,
    channel,
  });

  // Log click
  await sb.from('clicks').insert({
    deal_id: null,
    product_id: productId,
    merchant_id: merchant.id,
    channel,
    click_id: clickId,
  });

  return NextResponse.redirect(affiliateUrl, { status: 302 });
}
