// app/go/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { buildAffiliateUrl } from '@/lib/affiliates';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // avoid prerender/caching issues

type ParamsObj = { id: string };
function isPromiseLike<T>(v: unknown): v is Promise<T> {
  return !!v && typeof (v as any).then === 'function';
}

export async function GET(
  req: NextRequest,
  context: { params: unknown } // accept ANY; we'll normalize below
): Promise<Response> {
  // Normalize params: supports both { id } and Promise<{ id }>
  const rawParams = context?.params as unknown;
  const params: ParamsObj = isPromiseLike<ParamsObj>(rawParams)
    ? await rawParams
    : (rawParams as ParamsObj);

  const id = params?.id;
  if (!id) return NextResponse.redirect('/', { status: 302 });

  const sb = supabaseAdmin();
  const url = new URL(req.url);
  const mParam = url.searchParams.get('m'); // merchant_id
  const channel = (url.searchParams.get('ch') || 'web') as 'web' | 'email' | 'sms';

  // Try product id first
  let productId: string | null = null;
  const { data: productRow } = await sb
    .from('products')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (productRow?.id) {
    productId = productRow.id;
  } else {
    // Fallback: treat as legacy deal id
    const { data: deal } = await sb
      .from('deals')
      .select('id, product_id, url')
      .eq('id', id)
      .maybeSingle();

    if (!deal) return NextResponse.redirect('/', { status: 302 });

    if (deal.product_id) {
      productId = deal.product_id;
    } else {
      // No product yet — log minimal click and bounce to raw URL
      const clickId = crypto.randomBytes(8).toString('hex');
      await sb.from('clicks').insert({
        deal_id: id,
        channel,
        click_id: clickId,
        ip: (req.headers.get('x-forwarded-for') || '').split(',')[0] || null,
        ua: req.headers.get('user-agent') || null,
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

  // Load merchant to build affiliate URL
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
    ip: (req.headers.get('x-forwarded-for') || '').split(',')[0] || null,
    ua: req.headers.get('user-agent') || null,
  });

  return NextResponse.redirect(affiliateUrl, { status: 302 });
}
