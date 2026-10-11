import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import ProductCard from '../components/product/ProductCard';
import { ProductCardSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { customerService } from '../services/customerService';

export default function Wishlist() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    customerService.wishlist(1)
      .then((d) => { setItems(d.items); setHasMore(d.pagination.hasMore); })
      .catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const more = async () => {
    setLoadingMore(true);
    try {
      const d = await customerService.wishlist(page + 1);
      setItems((s) => [...s, ...d.items]); setPage(page + 1); setHasMore(d.pagination.hasMore);
    } catch (e) { toast.error(e.message); } finally { setLoadingMore(false); }
  };

  const remove = async (p) => {
    const before = items;
    setItems((s) => s.filter((x) => x.id !== p.id)); // instant UI, rolled back on failure
    try { await customerService.removeFromWishlist(p.id); toast.success('Wishlist se hata diya'); }
    catch (e) { setItems(before); toast.error(e.message); }
  };

  return (
    <div>
      <PageHeader title="Wishlist" />
      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">{Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-card bg-white shadow-card">
          <EmptyState icon={Heart} title="Wishlist khali hai" text="Jo products pasand aayein unpar heart dabao, yahan save ho jayenge."
            action={<Link to="/"><Button>Products dekho</Button></Link>} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((p) => <ProductCard key={p.id} product={p} wishlisted onWishlist={remove} />)}
          </div>
          {hasMore && <div className="mt-5 text-center"><Button variant="outline" loading={loadingMore} onClick={more}>Aur dikhao</Button></div>}
        </>
      )}
    </div>
  );
}
