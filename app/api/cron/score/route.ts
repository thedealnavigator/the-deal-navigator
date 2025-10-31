// =========================================
// NEW: app/api/cron/score/route.ts — compute daily deal scores
// =========================================
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';


export const runtime = 'nodejs';


/**
* Simple scoring model: score = 0.6*percent_off + 0.3*clicks7d + 0.1*recencyBoost
* - clicks7d: number of clicks in last 7 days (capped at 50)
* - recencyBoost: 100 for last 24h, 50 for last 72h, else 0
*/
export async function GET() {
const sb = supabaseAdmin();


// Pull recent clicks counts by deal (7d)
const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
const { data: clickRows, error: clickErr } = await sb
.rpc('count_clicks_since', { since_ts: since })
.select();


// If RPC not present, fall back to a manual aggregate via SQL (requires DATABASE_URL and serverless function w/ SQL access)
// For Supabase RPC, create the function:
// create or replace function public.count_clicks_since(since_ts timestamptz)
// returns table(deal_id uuid, clicks bigint) as $$
// select deal_id, count(*)::bigint from public.clicks where created_at >= since_ts group by deal_id;
// $$ language sql stable;


if (clickErr && clickErr.code) {
console.warn('RPC count_clicks_since not available; skipping click-based scoring');
}


const clickMap = new Map<string, number>();
for (const row of (clickRows as any[] | null) || []) {
clickMap.set(row.deal_id, Number(row.clicks || 0));
}


// Fetch deals to score
const { data: deals, error: dealsErr } = await sb
.from('deals')
.select('id, percent_off, published_at')
.is('deleted_at', null)
.not('published_at', 'is', null)
.limit(2000);
if (dealsErr) return NextResponse.json({ error: dealsErr.message }, { status: 500 });


// Compute scores
const updates = (deals || []).map((d) => {
const off = Number(d.percent_off || 0);
const clicks = Math.min(50, Number(clickMap.get(d.id) || 0));
const ageHours = d.published_at ? (Date.now() - new Date(d.published_at).getTime()) / 3600000 : 9999;
const recency = ageHours <= 24 ? 100 : ageHours <= 72 ? 50 : 0;
const score = 0.6 * off + 0.3 * clicks + 0.1 * recency;
return { id: d.id, score };
});


// Batch update (Supabase upsert by primary key)
if (updates.length) {
const { error: upErr } = await sb.from('deals').upsert(updates, { onConflict: 'id' });
if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
}


return NextResponse.json({ message: 'Scores updated', updated: updates.length });
}