import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Shirt, Smartphone, Sofa, Sparkles, Store, Tag, PackageSearch, MapPin, MapPinOff } from 'lucide-react';
import { categoryService } from '../services/customerService';
import { productService } from '../services/productService';
import { Skeleton, ProductCardSkeleton } from '../components/ui/Skeleton';
import ProductRail from '../components/product/ProductRail';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { openSheet } from '../store/locationSlice';
import { locationParams } from '../utils/location';

const ICONS = { fashion: Shirt, electronics: Smartphone, home: Sofa, beauty: Sparkles, 'local-products': Store };

function CategoryRail({ categories, loading }) {
  return (
    <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:flex-wrap md:px-0">
      {loading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex w-[72px] shrink-0 flex-col items-center gap-2"><Skeleton className="h-16 w-16 rounded-full" /><Skeleton className="h-3 w-12" /></div>))
        : categories.map((c) => {
            const Icon = ICONS[c.slug] || Tag;
            return (
              <Link key={c.id} to={`/category/${c.slug}`} className="flex w-[72px] shrink-0 snap-start flex-col items-center gap-2">
                <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white text-brand-600 shadow-card">
                  {c.imageUrl ? <img src={c.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Icon className="h-7 w-7" />}
                </span>
                <span className="line-clamp-2 text-center text-xs font-semibold leading-tight">{c.name}</span>
              </Link>
            );
          })}
    </div>
  );
}

export default function Home() {
  const user = useSelector((s) => s.auth.user);
  const loc = useSelector((s) => s.location.current);
  const dispatch = useDispatch();
  const lp = useMemo(() => locationParams(loc), [loc]);
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [sections, setSections] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    categoryService.tree().then((d) => setCategories(d.categories)).catch(() => {}).finally(() => setCatLoading(false));
  }, []);

  useEffect(() => {
    let alive = true;
    setSections(null); setFailed(false);
    productService.home(lp).then((d) => alive && setSections(d)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [lp]);

  const located = Boolean(loc);
  const nothing = sections && !sections.newest.length && !sections.nearby.length;
  const near = (t) => (located ? `${t} near you` : t);

  return (
    <div className="space-y-6">
      {located ? (
        <section className="rounded-card bg-brand-50 p-4">
          <p className="text-sm font-semibold text-brand-700">{user ? `Namaste, ${user.name.split(' ')[0]}` : 'Swagat hai'}</p>
          <h1 className="mt-0.5 text-xl font-extrabold leading-snug">{loc.label} ke sellers se kharido</h1>
          <button onClick={() => dispatch(openSheet())} className="mt-2 flex h-10 items-center gap-1.5 text-sm font-semibold text-brand-700"><MapPin className="h-4 w-4" />Area badlo</button>
        </section>
      ) : (
        <section className="rounded-card bg-brand-600 p-4 text-white">
          <h1 className="text-xl font-extrabold leading-snug">Apne area ke sellers se kharido</h1>
          <p className="mt-1 text-sm text-white/85">Area chuno aur dekho aapke paas kya mil raha hai.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="accent" onClick={() => dispatch(openSheet())}><MapPin className="h-4 w-4" />Area chuno</Button>
            {!user && <Link to="/login"><Button variant="outline">Login</Button></Link>}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-extrabold">Categories</h2>
        <CategoryRail categories={categories} loading={catLoading} />
      </section>

      {!sections && !failed && (
        <section>
          <Skeleton className="mb-3 h-6 w-40" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
        </section>
      )}
      {failed && <p className="rounded-card bg-white p-4 text-center text-sm text-ink-soft shadow-card">Products load nahi ho paye. Page refresh karo.</p>}

      {sections && !nothing && (
        <>
          {located && <ProductRail title="Products near you" products={sections.nearby} to="/products?sort=distance" />}
          <ProductRail title="Best sellers" products={sections.bestSellers} to="/products" />
          <ProductRail title="Top rated" products={sections.topRated} to="/products?sort=rating" />
          <ProductRail title={near('Deals')} products={sections.deals} to="/products?sort=price_asc" />
          <ProductRail title={located ? 'Recently added' : 'Naye products'} products={sections.newest} to="/products?sort=newest" />
        </>
      )}

      {nothing && located && (
        <div className="rounded-card bg-white shadow-card">
          <EmptyState icon={MapPinOff} title={`${loc.label} mein abhi koi seller delivery nahi karta`} text="Dusra area try karo, ya aap khud seller bankar apne area mein bechna shuru karo."
            action={<div className="flex flex-wrap justify-center gap-3"><Button onClick={() => dispatch(openSheet())}>Area badlo</Button><Link to="/seller"><Button variant="outline">Seller bano</Button></Link></div>} />
        </div>
      )}
      {nothing && !located && (
        <div className="rounded-card bg-white shadow-card">
          <EmptyState icon={PackageSearch} title="Abhi products nahi hain" text="Sellers jaldi hi apne products jodenge."
            action={<Link to="/seller"><Button variant="outline">Seller bano aur bechna shuru karo</Button></Link>} />
        </div>
      )}
    </div>
  );
}
