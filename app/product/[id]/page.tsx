// app/product/[id]/page.tsx
import { supabaseAnon } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 300;

async function fetchProductData(productId: string) {
  const sb = supabaseAnon();

  const { data: product } = await sb
    .from('products')
    .select('id, title, brand, model, image_url, tags')
    .eq('id', productId)
    .single();

  const { data: best } = await sb
    .from('product_best_offer')
    .select('merchant_id, merchant_name, total_price, url')
    .eq('product_id', productId)
    .maybeSingle();

  const { data: offers } = await sb
    .from('product_offers')
    .select('merchant_id, url, price, shipping, in_stock, last_seen')
    .eq('product_id', productId)
    .order('price', { ascending: true });

  const merchantIds = Array.from(new Set((offers || []).map(o => o.merchant_id)));
  const merchantMap = new Map<number, string>();
  if (merchantIds.length) {
    const { data: merchants } = await sb
      .from('merchants')
      .select('id, name')
      .in('id', merchantIds);
    for (const m of merchants || []) merchantMap.set(m.id, m.name as string);
  }

  return { product, best, offers: offers || [], merchantMap };
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const { product, best, offers, merchantMap } = await fetchProductData(params.id);
  if (!product) return <div className="py-10">Not found</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      {/* Left: details */}
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-start gap-4">
            {product.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt={product.title} className="w-40 h-40 object-contain rounded-lg border" />
            )}
            <div>
              <h1 className="text-2xl font-semibold">{product.title}</h1>
              {(product.brand || product.model) && (
                <p className="text-neutral-600 text-sm mt-1">{product.brand || ''} {product.model || ''}</p>
              )}
              {product.tags?.length ? (
                <div className="mt-2 text-xs text-neutral-600">
                  {product.tags.map(t => <span key={t} className="mr-2 px-2 py-1 rounded-full border">{t}</span>)}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Offers table */}
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="font-semibold mb-3">Prices across stores</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Store</th>
                  <th className="py-2">Price</th>
                  <th className="py-2">Shipping</th>
                  <th className="py-2">Stock</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {offers.map(o => {
                  const name = merchantMap.get(o.merchant_id) || 'Store';
                  const buyHref = `/go/${product.id}?m=${o.merchant_id}`;
                  return (
                    <tr key={o.merchant_id} className="border-b last:border-0">
                      <td className="py-2">{name}</td>
                      <td className="py-2">${Number(o.price).toFixed(2)}</td>
                      <td className="py-2">{o.shipping ? `$${Number(o.shipping).toFixed(2)}` : '—'}</td>
                      <td className="py-2">{o.in_stock ? 'In stock' : 'Out of stock'}</td>
                      <td className="py-2">
                        <Link href={buyHref} className="px-3 py-1.5 rounded-xl bg-black text-white text-sm">Buy</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neutral-500 mt-2">We may earn a commission when you buy through our links.</p>
        </div>

        {/* Price history placeholder */}
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="font-semibold mb-3">Price history</h2>
          <div className="h-48 grid place-items-center text-neutral-500 text-sm">
            Coming soon — we’re tracking prices over time.
          </div>
        </div>
      </div>

      {/* Right: best price box */}
      <aside className="lg:sticky lg:top-20 space-y-4">
        <div className="rounded-2xl border bg-white p-4">
          <h3 className="font-semibold">Best price</h3>
        {best ? (
          <>
            <div className="text-3xl font-bold mt-2">${Number(best.total_price).toFixed(2)}</div>
            <div className="text-neutral-600 text-sm mt-1">
              at {best.merchant_name}{offers.length > 1 ? ` — plus ${offers.length - 1} more` : ''}
            </div>
            <Link href={`/go/${product.id}?m=${best.merchant_id}`} className="mt-3 inline-block px-4 py-2 rounded-xl bg-black text-white">
              Buy at {best.merchant_name}
            </Link>
          </>
        ) : (
          <div className="text-neutral-600 text-sm mt-2">We’re finding the best price…</div>
        )}
        </div>
      </aside>
    </div>
  );
}
