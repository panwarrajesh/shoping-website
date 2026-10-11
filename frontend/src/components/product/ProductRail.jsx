import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';
import useWishlist from '../../hooks/useWishlist';

// Horizontal swipe row on phones, grid on larger screens
export default function ProductRail({ title, products, to }) {
  const { has, toggle } = useWishlist();
  if (!products?.length) return null;
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-extrabold">{title}</h2>
        {to && <Link to={to} className="flex h-9 items-center text-sm font-semibold text-brand-700">Sab dekho<ChevronRight className="h-4 w-4" /></Link>}
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 no-scrollbar md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 lg:grid-cols-5">
        {products.map((p) => (
          <div key={p.id} className="w-40 shrink-0 snap-start md:w-auto">
            <ProductCard product={p} wishlisted={has(p.id)} onWishlist={toggle} />
          </div>
        ))}
      </div>
    </section>
  );
}
