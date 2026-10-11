import ProductCard from './ProductCard';
import useWishlist from '../../hooks/useWishlist';

export default function ProductGrid({ products }) {
  const { has, toggle } = useWishlist();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
      {products.map((p) => <ProductCard key={p.id} product={p} wishlisted={has(p.id)} onWishlist={toggle} />)}
    </div>
  );
}
