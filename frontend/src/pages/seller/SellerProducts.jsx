import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Plus, Pencil, Trash2, Package, BadgeCheck, ImageOff } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { productService } from '../../services/productService';
import { cn, rupee } from '../../utils/cn';

const FILTERS = [['', 'Sab'], ['ACTIVE', 'Live'], ['PENDING_REVIEW', 'Review mein'], ['REJECTED', 'Reject'], ['low', 'Kam stock']];
const STATUS = { ACTIVE: ['green', 'Live'], PENDING_REVIEW: ['amber', 'Review mein'], REJECTED: ['red', 'Reject hua'], DRAFT: ['gray', 'Draft'] };

export default function SellerProducts() {
  const { seller } = useOutletContext();
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [del, setDel] = useState({ target: null, loading: false });
  const approved = seller.status === 'APPROVED';

  const params = useCallback((pg) => ({ page: pg, limit: 20, ...(filter === 'low' ? { lowStock: '1' } : filter ? { status: filter } : {}) }), [filter]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setPage(1);
    productService.mine(params(1)).then((d) => { if (alive) { setItems(d.items); setHasMore(d.pagination.hasMore); } })
      .catch((e) => toast.error(e.message)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const more = async () => {
    try { const d = await productService.mine(params(page + 1)); setItems((s) => [...s, ...d.items]); setPage(page + 1); setHasMore(d.pagination.hasMore); }
    catch (e) { toast.error(e.message); }
  };

  const confirmDelete = async () => {
    setDel((d) => ({ ...d, loading: true }));
    try { await productService.remove(del.target.id); setItems((s) => s.filter((x) => x.id !== del.target.id)); toast.success('Product delete ho gaya'); }
    catch (e) { toast.error(e.message); }
    setDel({ target: null, loading: false });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold lg:text-2xl">Mere products</h1>
        {approved && <Link to="/seller/products/add"><Button><Plus className="h-4 w-4" />Naya product</Button></Link>}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar lg:mx-0 lg:px-0">
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={cn('h-10 shrink-0 rounded-pill border px-4 text-sm font-semibold', filter === k ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-surface-line bg-white text-ink-soft')}>{l}</button>
        ))}
      </div>

      {loading ? <div className="grid gap-3 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-card" />)}</div>
        : items.length === 0 ? (
          <div className="rounded-card bg-white shadow-card">
            <EmptyState icon={Package} title={filter ? 'Is filter mein koi product nahi' : 'Abhi tak koi product nahi'}
              text={approved ? 'Apna pehla product jodo aur bechna shuru karo.' : 'Approval ke baad aap products jod paoge.'}
              action={approved && !filter ? <Link to="/seller/products/add"><Button><Plus className="h-4 w-4" />Product jodo</Button></Link> : undefined} />
          </div>
        ) : (
          <>
            <ul className="grid gap-3 lg:grid-cols-2">
              {items.map((p) => {
                const [tone, label] = STATUS[p.status] || ['gray', p.status];
                return (
                  <li key={p.id} className="rounded-card bg-white p-3 shadow-card">
                    <div className="flex gap-3">
                      <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-alt text-ink-mute">
                        {p.image ? <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageOff className="h-6 w-6" />}</span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-bold leading-snug">{p.title}</p>
                        <p className="mt-0.5 text-sm"><span className="font-extrabold">{rupee(p.price)}</span>{p.mrp > p.price && <span className="ml-2 text-xs text-ink-mute line-through">{rupee(p.mrp)}</span>}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge tone={tone}>{label}</Badge>
                          {p.isVerified && <Badge tone="green"><BadgeCheck className="h-3 w-3" />Verified</Badge>}
                          <Badge tone={p.stock === 0 ? 'red' : p.stock <= 5 ? 'amber' : 'gray'}>Stock {p.stock}</Badge>
                        </div>
                      </div>
                    </div>
                    {p.rejectionReason && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-danger">Reject reason: {p.rejectionReason}</p>}
                    <div className="mt-3 flex gap-2">
                      <Link to={`/seller/products/${p.id}/edit`} className="flex-1"><Button variant="outline" full><Pencil className="h-4 w-4" />Edit</Button></Link>
                      <Button variant="outline" className="text-danger" onClick={() => setDel({ target: p, loading: false })} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {hasMore && <div className="text-center"><Button variant="outline" onClick={more}>Aur dikhao</Button></div>}
          </>
        )}

      <ConfirmDialog open={Boolean(del.target)} danger title="Product delete karein?" confirmText="Delete karo"
        message="Yeh product customers ko dikhna band ho jayega. Purane orders par asar nahi padega."
        loading={del.loading} onConfirm={confirmDelete} onClose={() => setDel({ target: null, loading: false })} />
    </div>
  );
}
