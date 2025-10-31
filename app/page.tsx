// app/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();

  const { data: deals, error } = await supabase
    .from('deals_enriched')
    .select('id,title,merchant,price_current,discount_pct,summary_ai,image_url')
    .not('published_at', 'is', null)
    .order('score', { ascending: false })
    .limit(12);

  if (error) {
    return <pre className="p-4 text-red-600">Error: {error.message}</pre>;
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">The Deal Navigator — Today’s Top Deals</h1>
      <div className="grid gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-3">
        {(deals ?? []).map((d) => (
          <a key={d.id} href="#" className="border rounded-lg p-4 hover:shadow">
            {/* basic image fallback */}
            <img
              src={d.image_url || 'https://via.placeholder.com/600x400?text=Deal'}
              alt=""
              className="w-full h-40 object-cover rounded"
            />
            <h2 className="mt-3 font-semibold">{d.title}</h2>
            <p className="text-sm text-gray-600">{d.merchant}</p>
            <p className="mt-1">${d.price_current} • {d.discount_pct}% off</p>
            <p className="text-sm mt-2">{d.summary_ai}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
