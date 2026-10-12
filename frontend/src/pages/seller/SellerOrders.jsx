import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ShoppingBag, ChevronRight, ImageOff, Lock } from 'lucide-react';
import StatusBadge from '../../components/orders/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { orderService } from '../../services/orderService';
import { cn, rupee } from '../../utils/cn';
import { formatDateTime } from '../../utils/date';

const TABS = [['new', 'Naye'], ['active', 'Chal rahe'], ['done', 'Poore hue']];

export default function SellerOrders() {
  const { seller } = useOutletContext();
  const toast = useToast();
  const [group, setGroup] = useState('new');
  const [items, setItems] = useState([]);
  const [tabs, setTabs] = useState({ new: 0, active: 0, done: 0 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true); setPage(1);
    orderService.sellerList({ group, page: 1, limit: 20 })
      .then((d) => { if (alive) { setItems(d.items); setTabs(d.tabs); setHasMore(d.pagination.hasMore); } })
      .catch((e) => toast.error(e.message)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [group]); // eslint-disable-line react-hooks/exhaustive-deps

  const more = async () => {
    try { const d = await orderService.sellerList({ group, page: page + 1, limit: 20 }); setItems((s) => [...s, ...d.items]); setPage(page + 1); setHasMore(d.pagination.hasMore); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-extrabold lg:text-2xl">Orders</h1>
      {seller.status !== 'APPROVED' && <p className="flex items-center gap-2 rounded-card bg-marigold-50 p-3 text-sm text-amber-800"><Lock className="h-4 w-4 shrink-0" />Account approve hone ke baad hi aap orders manage kar paoge.</p>}

      <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-alt p-1" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={group === k} onClick={() => setGroup(k)}
            className={cn('flex h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold', group === k ? 'bg-white text-brand-700 shadow-card' : 'text-ink-soft')}>
            {l}{tabs[k] > 0 && <span className={cn('rounded-full px-1.5 text-xs font-bold', k === 'new' ? 'bg-danger text-white' : 'bg-surface-line')}>{tabs[k]}</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-card" />)}</div>
        : items.length === 0 ? <div className="rounded-card bg-white shadow-card"><EmptyState icon={ShoppingBag} title={group === 'new' ? 'Koi naya order nahi' : 'Yahan abhi kuch nahi'} text="Naye orders aate hi yahan dikhenge." /></div>
        : (
          <>
            <ul className="space-y-3">
              {items.map((o) => (
                <li key={o.id}>
                  <Link to={`/seller/orders/${o.id}`} className="block rounded-card bg-white p-4 shadow-card active:bg-surface-alt">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="text-sm font-extrabold">#{o.orderNumber}</p><p className="text-xs text-ink-mute">{formatDateTime(o.createdAt)} · {o.customerName}, {o.city}</p></div>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {o.items.map((i, n) => (
                        <span key={n} className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-alt text-ink-mute">
                          {i.image ? <img src={i.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageOff className="h-4 w-4" />}</span>
                      ))}
                      <span className="text-xs text-ink-soft">{o.itemCount} item · {o.paymentMethod === 'COD' ? 'COD' : 'Paid online'}</span>
                      <span className="ml-auto flex items-center gap-1 text-base font-extrabold">{rupee(o.total)}<ChevronRight className="h-5 w-5 text-ink-mute" /></span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {hasMore && <div className="text-center"><Button variant="outline" onClick={more}>Aur dikhao</Button></div>}
          </>
        )}
    </div>
  );
}
