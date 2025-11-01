// app/go/[id]/route.ts
// No Next.js types on purpose to avoid version typing conflicts.

import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { buildAffiliateUrl } from '@/lib/affiliates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Small helper to support Next variants where params might be a Promise
function isPromiseLike(v: any): v is Promise<any> {
  return v && typeof v.then === 'function';
}

export async function GET(req: Request, ctx: any): Promise<Response> {
  const raw = ctx?.params;
  const params = isPromiseLike(raw) ? await raw : raw;
  const id: string | undefined = params?.id;
  if (!id) return new Response(null, { status: 302, headers: { Location: '/' } });

  const url = new URL(req.url);
  const mParam = url.searchParams.get('m'); // merchant_id
  const channel = (url.searchParams.get('ch') || 'web') as 'web' | 'email' | 'sms';

  const sb = supabaseAdmin();

  // Resolve productId (try product first, then legacy deal)
  let productId: string | null = null;

  const { data: productRow } = await sb.from('products').select('id').eq('id', id).maybeSingle();
  if (productRow?.id) {
    productId = productRow.id;
  } else {
    const { data: deal } = await sb
      .from('deals')
      .select('id, product_id, url')
      .eq('id', id)
      .maybeSingle();

    if (!deal) return new Response(null, { status: 302, headers: { Location: '/' } });

    if (deal.product_id) {
      productId = deal.product_id;
    } else {
      // Legacy: no product mapping yet — just log minimal click and bounce
      const clickId = crypto.randomBytes(8).toString('hex');
      await sb.from('clicks').insert({
        deal_id: id,
        channel,
        click_id: clickId,
      });
      return new Response(null, { status: 302, headers: { Location: deal.url } });
    }
  }

  // Pick offer (specific merchant or best)
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

  if (!offer) return new Response(null, { status: 302, headers: { Location: '/' } });

  // Get merchant info for affiliate params
  const { data: merchant } = await sb
    .from('merchants')
    .select('id, domain, network, program_id')
    .eq('id', offer.merchant_id)
    .single();

  const clickId = crypto.randomBytes(8).toString('hex');
  const affiliateUrl = buildAffiliateUrl({
    merchant: {
      network: merchant?.network || undefined,
      program_id: merchant?.program_id || undefined,
      domain: merchant?.domain || '',
    },
    rawUrl: offer.url,
    clickId,
    channel,
  });

  // Log click
  await sb.from('clicks').insert({
    deal_id: null,
    product_id: productId,
    merchant_id: merchant?.id ?? null,
    channel,
    click_id: clickId,
  });

  return new Response(null, { status: 302, headers: { Location: affiliateUrl } });
}
