// app/go/[id]/route.js
// Plain Web API handler (JS) to avoid Next.js typing conflicts.

import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { buildAffiliateUrl } from '@/lib/affiliates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Normalize params whether it's an object or a Promise
function isPromiseLike(v) {
  return v && typeof v.then === 'function';
}

export async function GET(req, ctx) {
  try {
    const raw = ctx?.params;
    const p = isPromiseLike(raw) ? await raw : raw;
    const id = p?.id;
    if (!id) return new Response(null, { status: 302, headers: { Location: '/' } });

    const url = new URL(req.url);
    const mParam = url.searchParams.get('m'); // merchant_id
    const channel = (url.searchParams.get('ch') || 'web');

    const sb = supabaseAdmin();

    // Resolve productId (try product first; else legacy deal)
    let productId = null;

    const { data: productRow, error: prodErr } = await sb
      .from('products').select('id').eq('id', id).maybeSingle();
    if (prodErr) console.error('products maybeSingle err', prodErr);

    if (productRow?.id) {
      productId = productRow.id;
    } else {
      const { data: deal, error: dealErr } = await sb
        .from('deals').select('id, product_id, url').eq('id', id).maybeSingle();
      if (dealErr) console.error('deals maybeSingle err', dealErr);

      if (!deal) return new Response(null, { status: 302, headers: { Location: '/' } });

      if (deal.product_id) {
        productId = deal.product_id;
      } else {
        // Legacy: log minimal click and bounce to raw URL
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
    let offer = null;

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

    // Merchant for affiliate URL
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
  } catch (e) {
    console.error('GET /go error', e);
    return new Response(null, { status: 302, headers: { Location: '/' } });
  }
}
