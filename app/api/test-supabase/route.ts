// app/api/test-supabase/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient(); // ⬅️ await here

    const { data, error } = await supabase
      .from('deals_enriched')
      .select('id, title, price_current, price_was, discount_pct')
      .limit(3);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      count: data?.length ?? 0,
      deals: data,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message });
  }
}

