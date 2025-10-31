import { NextResponse } from 'next/server';
import { adminClient } from '../../../../lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Tunables
    const LOOKBACK_HOURS = Number(process.env.PUBLISH_LOOKBACK_HOURS ?? 24);
    const TOP_PER_CATEGORY = Number(process.env.PUBLISH_TOP_PER_CATEGORY ?? 5);
    const DAILY_GLOBAL_CAP = Number(process.env.PUBLISH_DAILY_CAP ?? 60);

    const NOW = new Date();
    const cutoffISO = new Date(NOW.getTime() - LOOKBACK_HOURS * 3600_000).toISOString();

    // 1) Categories seen recently (and not null)
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

    const categories = Array.from(
      new Set((catRows ?? []).map((r) => r.category as string))
    ).filter(Boolean);

    // 2) Pick top N per category, publish if not expired/inactive
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
        .is('published_at', null)
        .eq('is_active', true)
        .order('score', { ascending: false })
        .limit(limit);

      if (topErr) continue;

      const nowMs = NOW.getTime();
      const validIds = (top ?? [])
        .filter((t: any) => !t.expires_at || new Date(t.expires_at).getTime() > nowMs)
        .map((t: any) => t.id as string);

      if (validIds.length === 0) continue;

      const { data: updated, error: updErr } = await adminClient
        .from('deals_enriched')
        .update({ published_at: NOW.toISOString() })
        .in('id', validIds)
        .is('published_at', null)
        .select('id');

      if (!updErr) {
        const n = updated?.length ?? 0;
        publishedCount += n;
        if (n > 0) pickedIds.push(...updated!.map((r: any) => r.id as string));
      }
    }

    return NextResponse.json({
      ok: true,
      categories,
      published: publishedCount,
      ids: pickedIds,
      lookbackHours: LOOKBACK_HOURS,
      perCategory: TOP_PER_CATEGORY,
      dailyCap: DAILY_GLOBAL_CAP,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'unknown error' },
      { status: 500 }
    );
  }
}
