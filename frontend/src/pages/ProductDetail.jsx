import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Heart, ShoppingCart, Star, BadgeCheck, MapPin, Truck, Wallet, ShieldCheck, Store, PackageX } from 'lucide-react';
import Gallery from '../components/product/Gallery';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import useWishlist from '../hooks/useWishlist';
import { productService } from '../services/productService';
import { cn, rupee } from '../utils/cn';
import { locationParams } from '../utils/location';
import { openSheet } from '../store/locationSlice';

function Chip({ active, disabled, children, ...rest }) {
  return (
    <button type="button" disabled={disabled} {...rest}
      className={cn('relative h-11 min-w-[48px] rounded-xl border px-4 text-sm font-semibold',
        active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-surface-line bg-white text-ink',
        disabled && 'text-ink-mute line-through opacity-50')}>{children}</button>
  );
}

const Card = ({ children, className }) => <section className={cn('bg-white p-4 md:rounded-card md:shadow-card', className)}>{children}</section>;

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { has, toggle } = useWishlist();
  const dispatch = useDispatch();
  const loc = useSelector((s) => s.location.current);
  const lp = useMemo(() => locationParams(loc), [loc]);
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [sel, setSel] = useState({ size: null, color: null });

  useEffect(() => {
    let alive = true;
    setP(null); setError('');
    productService.detail(id, lp).then((d) => { if (alive) { setP(d.product); window.scrollTo(0, 0); } }).catch((e) => alive && setError(e.status === 404 ? 'notfound' : e.message));
    return () => { alive = false; };
  }, [id, lp]);

  const sizes = useMemo(() => [...new Set((p?.variants || []).map((v) => v.size).filter(Boolean))], [p]);
  const colors = useMemo(() => [...new Set((p?.variants || []).map((v) => v.color).filter(Boolean))], [p]);

  // Auto-pick when there is only one choice
  useEffect(() => {
    if (!p) return;
    setSel({ size: sizes.length === 1 ? sizes[0] : null, color: colors.length === 1 ? colors[0] : null });
  }, [p, sizes, colors]);

  const needsChoice = sizes.length > 0 || colors.length > 0;
  const variant = p?.variants.find((v) => (v.size || null) === (sel.size || null) && (v.color || null) === (sel.color || null)) || null;
  const optionAvailable = (key, value) => p.variants.some((v) => v[key] === value && v.inStock && (key === 'size' ? !sel.color || v.color === sel.color : !sel.size || v.size === sel.size));
  const anyStock = p?.variants.some((v) => v.inStock);

  const requireVariant = () => {
    if (p?.deliverable === false) { toast.error('Yeh seller aapke area mein delivery nahi karta'); return false; }
    if (needsChoice && !variant) { toast.error(sizes.length && !sel.size ? 'Pehle size chuno' : 'Pehle colour chuno'); return false; }
    if (variant && !variant.inStock) { toast.error('Yeh option abhi stock mein nahi hai'); return false; }
    return true;
  };
  // Cart and checkout are built in Steps 8-10
  const addToCart = () => { if (requireVariant()) toast.success('Cart abhi ban raha hai. Jaldi aa raha hai!'); };
  const buyNow = () => { if (requireVariant()) toast.success('Checkout abhi ban raha hai. Jaldi aa raha hai!'); };

  if (error === 'notfound') {
    return <div className="mx-auto max-w-lg p-4"><EmptyState icon={PackageX} title="Yeh product nahi mila" text="Ho sakta hai seller ne isse hata diya ho." action={<Link to="/"><Button>Home par jao</Button></Link>} /></div>;
  }
  if (error) return <div className="mx-auto max-w-lg p-4"><EmptyState icon={PackageX} title="Load nahi ho paya" text={error} action={<Button onClick={() => navigate(0)}>Dobara try karo</Button>} /></div>;

  const price = variant?.price ?? p?.price;
  const mrp = variant?.mrp ?? p?.mrp;
  const off = p && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const Actions = ({ className }) => (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      <Button variant="outline" size="lg" onClick={addToCart} disabled={p && (!anyStock || p.deliverable === false)}><ShoppingCart className="h-5 w-5" />Add to Cart</Button>
      <Button variant="accent" size="lg" onClick={buyNow} disabled={p && (!anyStock || p.deliverable === false)}>Buy Now</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-alt pb-28 md:pb-10">
      <header className="sticky top-0 z-30 border-b border-surface-line bg-white pt-safe">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-2">
          <button onClick={() => navigate(-1)} aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-alt"><ArrowLeft className="h-6 w-6" /></button>
          <Link to="/" className="mr-auto px-2 text-lg font-extrabold text-brand-600">LocalMart</Link>
          {p && <button onClick={() => toggle(p)} aria-label="Wishlist" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-alt">
            <Heart className={cn('h-6 w-6', has(p.id) && 'fill-danger text-danger')} /></button>}
          <Link to="/cart" aria-label="Cart" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-alt"><ShoppingCart className="h-6 w-6" /></Link>
        </div>
      </header>

      {!p ? (
        <div className="mx-auto max-w-6xl md:grid md:grid-cols-2 md:gap-8 md:p-6">
          <Skeleton className="aspect-square w-full rounded-none md:rounded-card" />
          <div className="space-y-3 p-4"><Skeleton className="h-6 w-4/5" /><Skeleton className="h-8 w-1/3" /><Skeleton className="h-24 w-full" /></div>
        </div>
      ) : (
        <main className="mx-auto max-w-6xl md:grid md:grid-cols-2 md:items-start md:gap-8 md:p-6">
          <div className="md:sticky md:top-20"><Gallery images={p.images} video={p.video} title={p.title} /></div>

          <div className="mt-2 space-y-2 md:mt-0 md:space-y-4">
            <Card>
              {p.category && <p className="text-xs font-semibold text-brand-700">{[p.category.parent?.name, p.category.name].filter(Boolean).join(' › ')}</p>}
              <h1 className="mt-1 text-xl font-extrabold leading-snug">{p.title}</h1>
              {p.brand && <p className="text-sm text-ink-soft">Brand: {p.brand}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {p.ratingCount > 0
                  ? <span className="inline-flex items-center gap-1 rounded bg-brand-600 px-2 py-0.5 text-sm font-bold text-white">{p.rating.toFixed(1)}<Star className="h-3.5 w-3.5 fill-current" /></span>
                  : <Badge tone="gray">Naya product</Badge>}
                {p.ratingCount > 0 && <span className="text-sm text-ink-soft">{p.ratingCount} ratings</span>}
                {p.isVerified && <Badge tone="green"><BadgeCheck className="h-3.5 w-3.5" />Verified Product</Badge>}
              </div>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-3xl font-extrabold">{rupee(price)}</span>
                {off > 0 && <><span className="text-base text-ink-mute line-through">{rupee(mrp)}</span><span className="text-base font-bold text-brand-600">{off}% off</span></>}
              </div>
              <p className="mt-1 text-xs text-ink-mute">Sabhi taxes shamil</p>
            </Card>

            {needsChoice && (
              <Card className="space-y-4">
                {sizes.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-extrabold">Size {sel.size && <span className="font-medium text-ink-soft">: {sel.size}</span>}</p>
                    <div className="flex flex-wrap gap-2">{sizes.map((s) => <Chip key={s} active={sel.size === s} disabled={!optionAvailable('size', s)} onClick={() => setSel((x) => ({ ...x, size: s }))}>{s}</Chip>)}</div>
                  </div>
                )}
                {colors.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-extrabold">Colour {sel.color && <span className="font-medium text-ink-soft">: {sel.color}</span>}</p>
                    <div className="flex flex-wrap gap-2">{colors.map((c) => <Chip key={c} active={sel.color === c} disabled={!optionAvailable('color', c)} onClick={() => setSel((x) => ({ ...x, color: c }))}>{c}</Chip>)}</div>
                  </div>
                )}
              </Card>
            )}

            <Card className="space-y-2">
              {!anyStock ? <p className="text-sm font-bold text-danger">Abhi stock mein nahi hai</p>
                : variant?.lowStock ? <p className="text-sm font-bold text-amber-700">Sirf {variant.lowStock} bache hain!</p>
                : <p className="text-sm font-bold text-brand-700">Stock mein hai</p>}
              <Actions className="hidden md:grid" />
            </Card>

            <Card className="space-y-3">
              <h2 className="text-base font-extrabold">Delivery aur payment</h2>
              {p.deliverable === true && (
                <p className="flex items-start gap-3 rounded-xl bg-brand-50 p-3 text-sm font-semibold text-brand-700"><MapPin className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>Aapke area mein delivery hoti hai{p.distanceKm != null ? ` · ${p.distanceApprox ? '~' : ''}${p.distanceKm} km door` : ''}</span></p>
              )}
              {p.deliverable === false && (
                <p className="flex items-start gap-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-danger"><MapPin className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>Yeh seller {loc?.label} mein delivery nahi karta. <button onClick={() => dispatch(openSheet())} className="underline">Area badlo</button></span></p>
              )}
              {p.deliverable === null && (
                <button onClick={() => dispatch(openSheet())} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-dashed border-brand-600 px-3 text-left text-sm font-semibold text-brand-700">
                  <MapPin className="h-5 w-5 shrink-0" />Delivery check karne ke liye apna area chuno</button>
              )}
              {p.delivery && (
                <p className="flex items-start gap-3 text-sm"><Truck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  <span>{p.delivery.etaDays <= 1 ? 'Kal tak delivery' : `${p.delivery.etaDays} din mein delivery`} · {p.delivery.deliveryCharge > 0
                    ? `Delivery charge ${rupee(p.delivery.deliveryCharge)}${p.delivery.freeDeliveryAbove ? ` (${rupee(p.delivery.freeDeliveryAbove)} se upar free)` : ''}` : 'Free delivery'}</span></p>
              )}
              <p className="flex items-start gap-3 text-sm"><Wallet className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <span>{p.codAvailable ? 'Cash on Delivery aur online payment dono available' : 'Sirf online payment (UPI / card / net banking)'}</span></p>
              <p className="flex items-start gap-3 text-sm"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <span>Galat ya kharab product mile to return request kar sakte ho.</span></p>
            </Card>

            <Card>
              <h2 className="mb-3 text-base font-extrabold">Seller</h2>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-100 text-lg font-extrabold text-brand-700">
                  {p.seller.logoUrl ? <img src={p.seller.logoUrl} alt="" className="h-full w-full object-cover" /> : <Store className="h-6 w-6" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold">{p.seller.businessName}</p>
                  <p className="flex items-center gap-1 text-xs text-ink-soft"><MapPin className="h-3.5 w-3.5" />{p.seller.city}, {p.seller.state}</p>
                </div>
                {p.seller.isVerified && <Badge tone="green"><BadgeCheck className="h-3.5 w-3.5" />Verified Seller</Badge>}
              </div>
            </Card>

            <Card>
              <h2 className="mb-2 text-base font-extrabold">Product ke baare mein</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{p.description}</p>
              {p.specifications.length > 0 && (
                <dl className="mt-4 divide-y divide-surface-line rounded-xl border border-surface-line text-sm">
                  {p.specifications.map((s) => (
                    <div key={s.label} className="grid grid-cols-3 gap-3 px-3 py-2.5"><dt className="text-ink-mute">{s.label}</dt><dd className="col-span-2 font-semibold">{s.value}</dd></div>
                  ))}
                  {p.weightGrams && <div className="grid grid-cols-3 gap-3 px-3 py-2.5"><dt className="text-ink-mute">Weight</dt><dd className="col-span-2 font-semibold">{p.weightGrams} g</dd></div>}
                </dl>
              )}
            </Card>
          </div>

          {/* Sticky buy bar on phones */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-surface-line bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:hidden">
            <Actions />
          </div>
        </main>
      )}
    </div>
  );
}
