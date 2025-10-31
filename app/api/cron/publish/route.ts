import { NextResponse } from 'next/server';
import { adminClient } from '../../../../lib/supabase/admin';

// Ensure server runtime (node) for fetch + service key usage
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Tunables
    const LOOKBACK_HOURS = Number(process.env.PUBLISH_LOOKBACK_HOURS ?? 24);
    const TOP_PER_CATEGORY = Number(process.env.PUBLISH_TOP_PER_CATEGORY ?? 5);
    const DAILY_GLOBAL_CAP = Number(process.env.PUBLISH_DAILY_CAP ?? 60); // safety cap
    const NOW = new Date();
    const cutoffISO = new Date(NOW.getTime() - LOOKBACK_HOURS * 3600_000).toISOString();

    // 1) Fetch distinct categories seen recently (and not null)
    const { data: catRows, error: catErr } = await adminClient
      .from('deals_enriched')
      .select('category')
      .gte('last_seen_at', cutoffISO)
      .not('category', 'is', null);

    if (catErr) {
      return NextResponse.json(
        { ok: false, step: 'categories', error: catErr.message },
        { status: 500 }
      );
    }

    const categories = Array.from(new Set((catRows ?? []).map(r => r.category as string))).filter(Boolean);

    // 2) For each category: pick top N by score, not published yet, still active
    let publishedCount = 0;
    const pickedIds: string[] = [];

    for (const c of categories) {
      if (publishedCount >= DAILY_GLOBAL_CAP) break;

      const limit = Math.min(TOP_PER_CATEGORY, DAILY_GLOBAL_CAP - publishedCount);

      const { data: top, error: topErr } = await adminClient
        .from('deals_enriched')
        .select('id, expires_at')
        .gte('last_seen_at', cutoffISO)
        .eq('category', c)
        .is('published_at', null)         // don’t re-publish
        .eq('is_active', true)            // only active
        .order('score', { ascending: false })
        .limit(limit);

      if (topErr) continue;

      // Filter out already-expired server-side, just in case
      const nowMs = NOW.getTime();
      const validIds = (top ?? [])
        .filter(t => !t.expires_at || new Date(t.expires_at).getTime() > nowMs)
        .map(t => t.id as string);

      if (validIds.length === 0) continue;

      // Publish: set published_at = NOW where null
      const { error: updErr, count } = await adminClient
        .from('deals_enriched')
        .update({ published_at: NOW.toISOString() })
        .in('id', validIds)
        .is('published_at', null) // guard
        .select('id', { count: 'exact', head: true });

      if (!updErr) {
        publishedCount += count ?? 0;
        pickedIds.push(...validIds);
      }
    }

    return NextResponse.json({
      ok: true,
      categories,
      published: publishedCount,
      ids: pickedIds,
      lookbackHours: LOOKBACK_HOURS,
      perCategory: TOP_PER_CATEGORY,
      dailyCap: DAILY_GLOBAL_CAP
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'unknown error' },
      { status: 500 }
    );
  }
}
