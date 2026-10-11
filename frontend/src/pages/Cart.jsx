import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ShoppingCart, Minus, Plus, Trash2, Store, BadgeCheck, Truck, MapPin, AlertTriangle, ImageOff } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { loadCart, setQty, removeLine } from '../store/cartSlice';
import { openSheet } from '../store/locationSlice';
import { locationParams } from '../utils/location';
import { rupee, cn } from '../utils/cn';

const ISSUE_TEXT = {
  UNAVAILABLE: 'Yeh product ab available nahi hai',
  OUT_OF_STOCK: 'Stock khatam ho gaya',
  NOT_DELIVERABLE: 'Yeh seller aapke area mein delivery nahi karta',
  OWN_PRODUCT: 'Yeh aapka apna product hai',
};

function Stepper({ value, max, busy, onChange }) {
  const btn = 'flex h-11 w-11 items-center justify-center disabled:opacity-40';
  return (
    <div className="inline-flex items-center rounded-xl border border-surface-line" role="group" aria-label="Quantity">
      <button type="button" className={btn} disabled={busy || value <= 1} onClick={() => onChange(value - 1)} aria-label="Quantity kam karo"><Minus className="h-4 w-4" /></button>
      <span className="w-8 text-center text-sm font-bold" aria-live="polite">{value}</span>
      <button type="button" className={btn} disabled={busy || value >= max} onClick={() => onChange(value + 1)} aria-label="Quantity badhao"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

function Line({ item, busy, onQty, onRemove }) {
  const low = item.issues.find((i) => i.code === 'LOW_STOCK');
  const blocked = item.issues.find((i) => ISSUE_TEXT[i.code]);
  const variant = [item.size, item.color].filter(Boolean).join(' · ');
  return (
    <li className={cn('p-4', busy && 'opacity-60')}>
      <div className="flex gap-3">
        <Link to={item.productId ? `/products/${item.productId}` : '#'} className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-alt text-ink-mute">
          {item.image ? <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageOff className="h-6 w-6" />}
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={item.productId ? `/products/${item.productId}` : '#'} className="line-clamp-2 text-sm font-bold leading-snug">{item.title}</Link>
          {variant && <p className="mt-0.5 text-xs text-ink-mute">{variant}</p>}
          {item.price > 0 && (
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-base font-extrabold">{rupee(item.price)}</span>
              {item.mrp > item.price && <span className="text-xs text-ink-mute line-through">{rupee(item.mrp)}</span>}
            </p>
          )}
        </div>
      </div>

      {(blocked || low) && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-danger" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {blocked ? ISSUE_TEXT[blocked.code] : `Sirf ${low.availableQty} piece bache hain`}
            {!blocked && low && <button onClick={() => onQty(item, low.availableQty)} className="ml-2 underline">Quantity {low.availableQty} karo</button>}
          </span>
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        {item.purchasable || low ? <Stepper value={item.quantity} max={item.maxQty} busy={busy} onChange={(q) => onQty(item, q)} /> : <span />}
        <div className="flex items-center gap-3">
          {item.purchasable && <span className="text-sm font-extrabold">{rupee(item.price * item.quantity)}</span>}
          <button onClick={() => onRemove(item)} disabled={busy} className="flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-danger" aria-label="Cart se hatao"><Trash2 className="h-4 w-4" />Hatao</button>
        </div>
      </div>
    </li>
  );
}

function Summary({ view, onCheckout, className, hideButton }) {
  const t = view.totals;
  return (
    <div className={cn('rounded-card bg-white p-4 shadow-card', className)}>
      <h2 className="text-base font-extrabold">Price details</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-ink-soft">Price ({view.count} items)</dt><dd className="font-semibold">{rupee(t.mrpTotal || t.itemsTotal)}</dd></div>
        {t.savings > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Discount</dt><dd className="font-semibold text-brand-700">− {rupee(t.savings)}</dd></div>}
        <div className="flex justify-between"><dt className="text-ink-soft">Delivery</dt><dd className="font-semibold">{t.deliveryTotal > 0 ? rupee(t.deliveryTotal) : 'Free'}</dd></div>
        <div className="flex justify-between border-t border-surface-line pt-3 text-base"><dt className="font-extrabold">Total</dt><dd className="font-extrabold">{rupee(t.grandTotal)}</dd></div>
      </dl>
      {t.savings > 0 && <p className="mt-3 rounded-lg bg-brand-50 p-2.5 text-center text-sm font-bold text-brand-700">Aap {rupee(t.savings)} bacha rahe ho</p>}
      {!view.canCheckout && <p className="mt-3 text-xs text-danger">Pehle upar ke problem wale items theek karo ya hata do.</p>}
      {!hideButton && <Button full size="lg" className="mt-4" onClick={onCheckout}>Checkout karo</Button>}
    </div>
  );
}

export default function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const user = useSelector((s) => s.auth.user);
  const loc = useSelector((s) => s.location.current);
  const view = useSelector((s) => s.cart.view);
  const lp = useMemo(() => locationParams(loc), [loc]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  // Refresh whenever the page opens, the area changes or the user logs in/out (stock and delivery can change any time)
  useEffect(() => {
    let alive = true;
    setLoading(true);
    dispatch(loadCart()).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [dispatch, lp, user?.id]);

  const run = async (id, action, okMsg) => {
    setBusy(id);
    const r = await dispatch(action);
    setBusy(null);
    if (r.error) toast.error(r.payload || 'Kuch gadbad ho gayi. Dobara try karo.');
    else if (okMsg) toast.success(okMsg);
  };
  const onQty = (item, quantity) => run(item.id, setQty({ lineId: item.id, quantity }));
  const onRemove = (item) => run(item.id, removeLine(item.id), 'Cart se hata diya');

  const removeBroken = async () => {
    const broken = view.groups.flatMap((g) => g.items).filter((i) => i.issues.some((x) => ISSUE_TEXT[x.code]));
    for (const i of broken) await dispatch(removeLine(i.id));
    toast.success('Problem wale items hata diye');
  };

  const checkout = () => {
    if (!view.canCheckout) { toast.error('Pehle cart ke problem wale items theek karo'); return; }
    if (!user) { toast.error('Checkout ke liye login karo'); navigate('/login', { state: { from: { pathname: '/cart' } } }); return; }
    navigate('/checkout');
  };

  if (loading && !view) {
    return <div className="space-y-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-48 w-full rounded-card" /><Skeleton className="h-40 w-full rounded-card" /></div>;
  }
  if (!view || view.lines === 0) {
    return (
      <div className="rounded-card bg-white shadow-card">
        <EmptyState icon={ShoppingCart} title="Aapka cart khali hai" text="Apne area ke sellers ke products dekho aur cart mein daalo."
          action={<Link to="/"><Button>Shopping shuru karo</Button></Link>} />
      </div>
    );
  }

  const hasBroken = view.groups.some((g) => g.items.some((i) => i.issues.some((x) => ISSUE_TEXT[x.code])));

  return (
    <div className="pb-32 md:pb-24 lg:pb-0">
      <h1 className="mb-4 text-xl font-extrabold">Mera cart <span className="text-base font-semibold text-ink-soft">({view.count} items)</span></h1>

      {!loc && (
        <button onClick={() => dispatch(openSheet())} className="mb-4 flex min-h-[48px] w-full items-center gap-3 rounded-card border border-dashed border-brand-600 bg-brand-50 px-4 text-left text-sm font-semibold text-brand-700">
          <MapPin className="h-5 w-5 shrink-0" />Delivery check karne ke liye apna area chuno
        </button>
      )}
      {hasBroken && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-card bg-red-50 p-3 text-sm text-danger">
          <span className="font-semibold">Kuch items order nahi ho sakte.</span>
          <button onClick={removeBroken} className="h-10 shrink-0 rounded-lg bg-white px-3 font-bold">Sab hatao</button>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6">
        <div className="space-y-4">
          {view.groups.map((g) => (
            <section key={g.seller?.id || 'none'} className="overflow-hidden rounded-card bg-white shadow-card">
              <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-surface-line px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-extrabold"><Store className="h-4 w-4 text-brand-700" />{g.seller?.businessName || 'Unavailable items'}</span>
                {g.seller?.isVerified && <Badge tone="green"><BadgeCheck className="h-3 w-3" />Verified</Badge>}
              </header>
              <ul className="divide-y divide-surface-line">
                {g.items.map((i) => <Line key={i.id} item={i} busy={busy === i.id} onQty={onQty} onRemove={onRemove} />)}
              </ul>
              {g.seller && g.subtotal > 0 && (
                <footer className="space-y-1 border-t border-surface-line bg-surface-alt px-4 py-3 text-xs text-ink-soft">
                  <p className="flex items-center gap-2"><Truck className="h-4 w-4 shrink-0" />
                    {g.deliveryCharge > 0 ? `Delivery ${rupee(g.deliveryCharge)}` : 'Free delivery'}{g.etaDays ? ` · ${g.etaDays <= 1 ? 'Kal tak' : `${g.etaDays} din mein`}` : ''}{g.codAvailable ? ' · COD available' : ' · Sirf online payment'}</p>
                  {g.freeDeliveryAbove != null && g.subtotal < g.freeDeliveryAbove && g.deliveryCharge > 0 && (
                    <p className="font-semibold text-brand-700">Aur {rupee(g.freeDeliveryAbove - g.subtotal)} ka kharido, delivery free!</p>
                  )}
                  <p className="text-right text-sm font-extrabold text-ink">Subtotal {rupee(g.subtotal)}</p>
                </footer>
              )}
            </section>
          ))}
        </div>

        <aside className="mt-4 hidden lg:sticky lg:top-24 lg:mt-0 lg:block"><Summary view={view} onCheckout={checkout} /></aside>
        <div className="mt-4 lg:hidden"><Summary view={view} hideButton /></div>
      </div>

      {/* Sticky checkout bar on phones and tablets (sits above the bottom navigation on phones) */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 border-t border-surface-line bg-white px-4 py-3 md:bottom-0 lg:hidden">
        <div className="min-w-0"><p className="text-xs text-ink-soft">Total</p><p className="text-lg font-extrabold leading-tight">{rupee(view.totals.grandTotal)}</p></div>
        <Button size="lg" className="ml-auto flex-1 sm:flex-none sm:px-10" onClick={checkout}>Checkout karo</Button>
      </div>
    </div>
  );
}
