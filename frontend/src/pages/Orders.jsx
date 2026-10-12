import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Package, ChevronRight, ImageOff, CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import StatusBadge from '../components/orders/StatusBadge';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { orderService } from '../services/orderService';
import { cn, rupee } from '../utils/cn';
import { formatDateTime } from '../utils/date';

const FILTERS = [['', 'Sab'], ['PENDING', 'Confirmation baaki'], ['OUT_FOR_DELIVERY', 'Raaste mein'], ['DELIVERED', 'Deliver hue'], ['CANCELLED', 'Cancel']];

export default function Orders() {
  const toast = useToast();
  const location = useLocation();
  const [status, setStatus] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true); setPage(1);
    orderService.list({ page: 1, limit: 20, ...(status ? { status } : {}) })
      .then((d) => { if (alive) { setItems(d.items); setHasMore(d.pagination.hasMore); } })
      .catch((e) => toast.error(e.message)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const more = async () => {
    try { const d = await orderService.list({ page: page + 1, limit: 20, ...(status ? { status } : {}) }); setItems((s) => [...s, ...d.items]); setPage(page + 1); setHasMore(d.pagination.hasMore); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Mere orders" backTo="/profile" />
      {location.state?.placed && (
        <p className="mb-4 flex items-center gap-2 rounded-card bg-brand-50 p-3 text-sm font-bold text-brand-700"><CheckCircle2 className="h-5 w-5 shrink-0" />Aapke orders ban gaye hain. Payment ho chuka ho to sellers jaldi confirm karenge.</p>
      )}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 no-scrollbar md:mx-0 md:px-0">
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className={cn('h-10 shrink-0 rounded-pill border px-4 text-sm font-semibold', status === k ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-surface-line bg-white text-ink-soft')}>{l}</button>
        ))}
      </div>

      {loading ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-card" />)}</div>
        : items.length === 0 ? (
          <div className="rounded-card bg-white shadow-card">
            <EmptyState icon={Package} title={status ? 'Is filter mein koi order nahi' : 'Abhi tak koi order nahi'} text="Apne area ke sellers se kuch kharido."
              action={!status ? <Link to="/"><Button>Shopping shuru karo</Button></Link> : undefined} />
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {items.map((o) => (
                <li key={o.id}>
                  <Link to={`/orders/${o.id}`} className="block rounded-card bg-white p-4 shadow-card active:bg-surface-alt">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="text-sm font-extrabold">#{o.orderNumber}</p><p className="text-xs text-ink-mute">{formatDateTime(o.createdAt)} · {o.sellerName}</p></div>
                      <div className="flex shrink-0 flex-col items-end gap-1"><StatusBadge status={o.status} />{o.paymentMethod === 'ONLINE' && o.paymentStatus === 'PENDING' && o.status === 'PENDING' && <Badge tone="amber">Payment baaki</Badge>}</div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {o.items.map((i, n) => (
                        <span key={n} className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-alt text-ink-mute">
                          {i.image ? <img src={i.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageOff className="h-5 w-5" />}</span>
                      ))}
                      {o.itemCount > o.items.length && <span className="text-xs font-semibold text-ink-soft">+{o.itemCount - o.items.length} aur</span>}
                      <span className="ml-auto flex items-center gap-1 text-base font-extrabold">{rupee(o.total)}<ChevronRight className="h-5 w-5 text-ink-mute" /></span>
                    </div>
                    <p className="mt-2 line-clamp-1 text-xs text-ink-soft">{o.items.map((i) => i.title).join(', ')}</p>
                  </Link>
                </li>
              ))}
            </ul>
            {hasMore && <div className="mt-5 text-center"><Button variant="outline" onClick={more}>Aur dikhao</Button></div>}
          </>
        )}
    </div>
  );
}
