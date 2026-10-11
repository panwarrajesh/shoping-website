import { useEffect, useState } from 'react';
import { Boxes, ImageOff, Check } from 'lucide-react';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { productService } from '../../services/productService';
import { cn } from '../../utils/cn';

function Row({ item }) {
  const toast = useToast();
  const [saved, setSaved] = useState(item.stock);
  const [value, setValue] = useState(String(item.stock));
  const [saving, setSaving] = useState(false);
  const qty = value === '' ? NaN : Number(value);
  const valid = Number.isInteger(qty) && qty >= 0;
  const dirty = valid && qty !== saved;
  const variant = [item.size, item.color].filter(Boolean).join(' · ');

  const save = async () => {
    setSaving(true);
    try { const d = await productService.setStock(item.variantId, qty); setSaved(d.stock); toast.success('Stock update ho gaya'); }
    catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <li className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-alt text-ink-mute">
        {item.product.image ? <img src={item.product.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageOff className="h-5 w-5" />}</span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-bold">{item.product.title}</p>
        <p className="text-xs text-ink-mute">{variant || 'Default'}{item.reserved > 0 ? ` · ${item.reserved} reserved` : ''}</p>
        <p className={cn('text-xs font-semibold', saved === 0 ? 'text-danger' : saved <= 5 ? 'text-amber-700' : 'text-ink-soft')}>{saved === 0 ? 'Stock khatam' : saved <= 5 ? 'Kam stock' : 'Theek hai'}</p>
      </div>
      <input type="number" inputMode="numeric" min={0} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && dirty && save()}
        aria-label="Stock" className={cn('h-11 w-20 rounded-xl border px-2 text-center font-bold', valid ? 'border-surface-line' : 'border-danger')} />
      <Button size="md" disabled={!dirty} loading={saving} onClick={save} aria-label="Save"><Check className="h-4 w-4" /></Button>
    </li>
  );
}

export default function SellerInventory() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService.inventory({ page: 1, limit: 30 }).then((d) => { setItems(d.items); setHasMore(d.pagination.hasMore); })
      .catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const more = async () => {
    try { const d = await productService.inventory({ page: page + 1, limit: 30 }); setItems((s) => [...s, ...d.items]); setPage(page + 1); setHasMore(d.pagination.hasMore); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div><h1 className="text-xl font-extrabold lg:text-2xl">Inventory</h1><p className="text-sm text-ink-soft">Number badlo aur tick dabao.</p></div>
      {loading ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-card" />)}</div>
        : items.length === 0 ? <div className="rounded-card bg-white shadow-card"><EmptyState icon={Boxes} title="Inventory khali hai" text="Product jodoge to uska stock yahan dikhega." /></div>
        : <><ul className="space-y-3">{items.map((i) => <Row key={i.variantId} item={i} />)}</ul>
            {hasMore && <div className="text-center"><Button variant="outline" onClick={more}>Aur dikhao</Button></div>}</>}
    </div>
  );
}
