import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Search, SlidersHorizontal, SearchX } from 'lucide-react';
import ProductGrid from '../components/product/ProductGrid';
import { ProductCardSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import BottomSheet from '../components/ui/BottomSheet';
import Button from '../components/ui/Button';
import { productService } from '../services/productService';
import { categoryService } from '../services/customerService';
import { cn } from '../utils/cn';
import { locationParams } from '../utils/location';

const SORTS = [['relevance', 'Sabse relevant'], ['newest', 'Naye pehle'], ['price_asc', 'Price: kam se zyada'], ['price_desc', 'Price: zyada se kam'], ['rating', 'Top rated']];
const RATINGS = [['', 'Sab'], ['4', '4★ aur upar'], ['3', '3★ aur upar']];

function Filters({ values, onChange, hasLocation }) {
  const set = (k, v) => onChange({ ...values, [k]: v });
  const chip = (active) => cn('h-10 rounded-pill border px-3.5 text-sm font-semibold', active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-surface-line bg-white text-ink-soft');
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-extrabold">Sort</h3>
        <div className="flex flex-wrap gap-2">{[...SORTS, ...(hasLocation ? [['distance', 'Sabse paas']] : [])].map(([k, l]) => <button key={k} className={chip(values.sort === k)} onClick={() => set('sort', k)}>{l}</button>)}</div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-extrabold">Price (₹)</h3>
        <div className="flex items-center gap-2">
          <input type="number" inputMode="numeric" min={0} placeholder="Min" value={values.minPrice} onChange={(e) => set('minPrice', e.target.value)} className="h-11 w-full min-w-0 rounded-xl border border-surface-line px-3" aria-label="Minimum price" />
          <span className="text-ink-mute">–</span>
          <input type="number" inputMode="numeric" min={0} placeholder="Max" value={values.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} className="h-11 w-full min-w-0 rounded-xl border border-surface-line px-3" aria-label="Maximum price" />
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-extrabold">Rating</h3>
        <div className="flex flex-wrap gap-2">{RATINGS.map(([k, l]) => <button key={k} className={chip(values.minRating === k)} onClick={() => set('minRating', k)}>{l}</button>)}</div>
      </div>
    </div>
  );
}

export default function ProductList() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const loc = useSelector((s) => s.location.current);
  const lp = useMemo(() => locationParams(loc), [loc]);
  const applied = useMemo(() => ({
    q: params.get('q') || '', sort: params.get('sort') || 'relevance', minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '', minRating: params.get('minRating') || '',
  }), [params]);

  const [qInput, setQInput] = useState(applied.q);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState(applied);
  const [cats, setCats] = useState([]);

  const apply = useCallback((next) => {
    const p = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => { if (v && !(k === 'sort' && v === 'relevance')) p.set(k, v); });
    setParams(p, { replace: true });
  }, [setParams]);

  // Debounced search: wait 400ms after typing stops
  useEffect(() => {
    if (qInput === applied.q) return undefined;
    const t = setTimeout(() => apply({ ...applied, q: qInput.trim() }), 400);
    return () => clearTimeout(t);
  }, [qInput]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { categoryService.tree().then((d) => setCats(d.categories)).catch(() => {}); }, []);

  const query = useMemo(() => {
    const q = { sort: applied.sort === 'distance' && !loc ? 'relevance' : applied.sort, limit: 20, ...lp };
    if (applied.q) q.q = applied.q;
    if (slug) q.category = slug;
    ['minPrice', 'maxPrice', 'minRating'].forEach((k) => { if (applied[k]) q[k] = applied[k]; });
    return q;
  }, [applied, slug, lp, loc]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(''); setPage(1);
    productService.list({ ...query, page: 1 })
      .then((d) => { if (!alive) return; setItems(d.items); setTotal(d.pagination.total); setHasMore(d.pagination.hasMore); })
      .catch((e) => alive && setError(e.message)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [query]);

  const more = async () => {
    setLoadingMore(true);
    try {
      const d = await productService.list({ ...query, page: page + 1 });
      setItems((s) => [...s, ...d.items]); setPage(page + 1); setHasMore(d.pagination.hasMore);
    } catch (e) { setError(e.message); } finally { setLoadingMore(false); }
  };

  const category = useMemo(() => {
    for (const c of cats) { if (c.slug === slug) return { ...c, parent: null }; const s = c.children.find((x) => x.slug === slug); if (s) return { ...s, children: [], parent: c }; }
    return null;
  }, [cats, slug]);
  const siblings = category ? (category.parent ? category.parent.children : category.children) : [];
  const activeCount = ['minPrice', 'maxPrice', 'minRating'].filter((k) => applied[k]).length + (applied.sort !== 'relevance' ? 1 : 0);

  return (
    <div className="lg:flex lg:gap-6">
      <aside className="sticky top-24 hidden h-fit w-64 shrink-0 rounded-card bg-white p-4 shadow-card lg:block">
        <h2 className="mb-4 text-base font-extrabold">Filters</h2>
        <Filters values={applied} onChange={apply} hasLocation={Boolean(loc)} />
      </aside>

      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-extrabold">{category ? category.name : applied.q ? `"${applied.q}"` : 'Saare products'}</h1>
        {category?.parent && <Link to={`/category/${category.parent.slug}`} className="text-sm font-semibold text-brand-700">← {category.parent.name}</Link>}

        <div className="mt-3 flex gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-mute" />
            <input value={qInput} onChange={(e) => setQInput(e.target.value)} type="search" enterKeyHint="search" placeholder="Product, brand ya seller dhundo"
              className="h-12 w-full rounded-xl border border-surface-line bg-white pl-10 pr-3 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
          </label>
          <button onClick={() => { setDraft(applied); setSheet(true); }} className="relative flex h-12 shrink-0 items-center gap-2 rounded-xl border border-surface-line bg-white px-4 text-sm font-semibold lg:hidden">
            <SlidersHorizontal className="h-5 w-5" />Filter
            {activeCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] text-white">{activeCount}</span>}
          </button>
        </div>

        {siblings.length > 0 && (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 no-scrollbar md:mx-0 md:px-0">
            {siblings.map((s) => (
              <Link key={s.id} to={`/category/${s.slug}`} className={cn('flex h-10 shrink-0 items-center rounded-pill border px-3.5 text-sm font-semibold', s.slug === slug ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-surface-line bg-white text-ink-soft')}>{s.name}</Link>
            ))}
          </div>
        )}

        {!loading && !error && <p className="mt-3 text-sm text-ink-soft">{total} products{loc ? ` · ${loc.label} mein delivery` : ''}</p>}

        <div className="mt-3">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
          ) : error ? (
            <div className="rounded-card bg-white shadow-card"><EmptyState icon={SearchX} title="Load nahi ho paya" text={error} action={<Button onClick={() => apply(applied)}>Dobara try karo</Button>} /></div>
          ) : items.length === 0 ? (
            <div className="rounded-card bg-white shadow-card"><EmptyState icon={SearchX} title="Koi product nahi mila" text="Dusra shabd ya filter badal ke dekho." /></div>
          ) : (
            <>
              <ProductGrid products={items} />
              {hasMore && <div className="mt-5 text-center"><Button variant="outline" loading={loadingMore} onClick={more}>Aur dikhao</Button></div>}
            </>
          )}
        </div>
      </div>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Filter aur sort"
        footer={<div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" onClick={() => setDraft({ ...draft, sort: 'relevance', minPrice: '', maxPrice: '', minRating: '' })}>Reset</Button>
          <Button size="lg" onClick={() => { apply({ ...draft, q: applied.q }); setSheet(false); }}>Apply karo</Button>
        </div>}>
        <Filters values={draft} onChange={setDraft} hasLocation={Boolean(loc)} />
      </BottomSheet>
    </div>
  );
}
