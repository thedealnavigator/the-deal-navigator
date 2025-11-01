// @ts-nocheck
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: any) {
  const raw = ctx?.params;
  const params = raw && typeof raw.then === 'function' ? await raw : raw;
  const id = params?.id;

  const sb = supabaseAdmin(); // service key: bypasses RLS for testing
  const { data: product, error: pErr } = await sb
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  const { data: offers, error: oErr } = await sb
    .from('product_offers')
    .select('*')
    .eq('product_id', id)
    .order('price', { ascending: true });

  const { data: best, error: bErr } = await sb
    .from('product_best_offer')
    .select('*')
    .eq('product_id', id)
    .maybeSingle();

  return new Response(
    JSON.stringify({ product, offers, best, errors: { pErr, oErr, bErr } }, null, 2),
    { headers: { 'content-type': 'application/json' } }
  );
}
