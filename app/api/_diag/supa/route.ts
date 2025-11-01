// @ts-nocheck
import { supabaseAdmin, supabaseAnon } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ok(v:any){ return v && typeof v === 'object' && !v.error; }

export async function GET() {
  try {
    const hasSrv = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sb = hasSrv ? supabaseAdmin() : supabaseAnon();

    // 1) Quick ping: select NOW() via a cheap table you have (products). Falls back if empty.
    const { data: one, error: e1 } = await sb
      .from('products')
      .select('id')
      .limit(1);

    // 2) If that worked, try the view (product_best_offer)
    const { data: two, error: e2 } = await sb
      .from('product_best_offer')
      .select('*')
      .limit(1);

    return new Response(JSON.stringify({
      mode: hasSrv ? 'admin' : 'anon',
      products_ok: ok({ error: e1 }),
      products_err: e1?.message || null,
      best_offer_ok: ok({ error: e2 }),
      best_offer_err: e2?.message || null,
    }, null, 2), { headers: { 'content-type': 'application/json' }});
  } catch (e:any) {
    return new Response(JSON.stringify({ fatal: e?.message || String(e) }, null, 2), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
}
