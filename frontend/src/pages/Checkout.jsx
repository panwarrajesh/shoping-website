import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Store, Truck, Wallet, CheckCircle2, AlertTriangle, ShoppingCart, CreditCard } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import BottomSheet from '../components/ui/BottomSheet';
import AddressForm, { ADDRESS_FORM_ID } from '../components/customer/AddressForm';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { customerService } from '../services/customerService';
import { orderService } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import { loadCart } from '../store/cartSlice';
import { payForOrders, PAY_MESSAGES } from '../utils/razorpay';
import { cn, rupee } from '../utils/cn';

const ISSUE = {
  UNAVAILABLE: 'Yeh product ab available nahi hai',
  OUT_OF_STOCK: 'Stock khatam ho gaya',
  LOW_STOCK: 'Stock kam hai, cart mein quantity kam karo',
  NOT_DELIVERABLE: 'Is address par delivery nahi hoti',
  OWN_PRODUCT: 'Yeh aapka apna product hai',
};

const Section = ({ n, title, children }) => (
  <section className="rounded-card bg-white p-4 shadow-card">
    <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs text-white">{n}</span>{title}
    </h2>
    {children}
  </section>
);

function PayOption({ checked, disabled, onSelect, icon: Icon, title, text }) {
  return (
    <label className={cn('flex gap-3 rounded-xl border p-3', disabled ? 'cursor-not-allowed border-surface-line opacity-60' : 'cursor-pointer', checked && !disabled ? 'border-brand-600 bg-brand-50' : 'border-surface-line')}>
      <input type="radio" name="pay" checked={checked && !disabled} disabled={disabled} onChange={onSelect} className="mt-1 h-5 w-5 shrink-0 accent-brand-600" />
      <span className="text-sm"><span className="flex items-center gap-2 font-extrabold"><Icon className="h-4 w-4" />{title}</span><span className="text-ink-soft">{text}</span></span>
    </label>
  );
}

export default function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const user = useSelector((s) => s.auth.user);
  const [addresses, setAddresses] = useState(null);
  const [addrId, setAddrId] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [online, setOnline] = useState(false);   // is the payment gateway set up on the server?
  const [method, setMethod] = useState('ONLINE');

  const loadAddresses = useCallback(async (selectId) => {
    const list = (await customerService.addresses()).addresses;
    setAddresses(list);
    setAddrId((cur) => selectId || (list.some((a) => a.id === cur) ? cur : (list.find((a) => a.isDefault) || list[0])?.id || null));
  }, []);
  useEffect(() => { loadAddresses().catch((e) => toast.error(e.message)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { paymentService.config().then((c) => setOnline(Boolean(c.online))).catch(() => setOnline(false)); }, []);

  // Delivery rules depend on the address, so the price/delivery check is redone whenever it changes
  useEffect(() => {
    if (!addrId) { setQuote(null); return undefined; }
    let alive = true;
    setQuoting(true);
    orderService.quote(addrId).then((d) => alive && setQuote(d.cart)).catch((e) => alive && toast.error(e.message)).finally(() => alive && setQuoting(false));
    return () => { alive = false; };
  }, [addrId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAddress = async (values) => {
    setSaving(true);
    try { const d = await customerService.addAddress(values); await loadAddresses(d.address.id); setSheet(false); toast.success('Address save ho gaya'); }
    finally { setSaving(false); }
  };

  const paying = quote?.groups.filter((g) => g.seller && g.subtotal > 0) || [];
  const codOk = paying.length > 0 && paying.every((g) => g.codAvailable);
  // What will actually be used: the customer's pick if it is allowed, otherwise whatever is available
  const chosen = method === 'ONLINE' && online ? 'ONLINE' : method === 'COD' && codOk ? 'COD' : online ? 'ONLINE' : codOk ? 'COD' : null;
  const canPlace = Boolean(quote?.canCheckout && chosen && addrId && !quoting);
  const label = chosen === 'ONLINE' ? 'Pay karke order karo' : 'Order place karo';

  const place = async () => {
    setPlacing(true);
    let result;
    try {
      result = await orderService.place({ addressId: addrId, paymentMethod: chosen });
    } catch (e) {
      toast.error(e.message);
      dispatch(loadCart());
      orderService.quote(addrId).then((d) => setQuote(d.cart)).catch(() => {}); // show the latest stock/delivery state
      setPlacing(false);
      return;
    }
    const { orders, requiresPayment } = result;
    dispatch(loadCart());
    const target = orders.length === 1 ? `/orders/${orders[0].id}` : '/orders';

    if (requiresPayment) {
      try {
        const r = await payForOrders(orders.map((o) => o.id), { onFailure: (m) => toast.error(m || 'Payment fail hua. Dobara try karo.') });
        const [kind, text] = PAY_MESSAGES[r.status] || PAY_MESSAGES.UNVERIFIED;
        toast[kind](r.status === 'UNVERIFIED' && r.message ? r.message : text);
      } catch (e) {
        // Orders exist; the customer can pay from the order page
        toast.error(`${e.message} Order page se dobara pay kar sakte ho.`);
      }
    } else {
      toast.success(orders.length > 1 ? `${orders.length} orders place ho gaye` : 'Order place ho gaya!');
    }
    navigate(target, { replace: true, state: { placed: true } });
  };

  if (addresses && quote && quote.lines === 0) {
    return <div className="rounded-card bg-white shadow-card"><EmptyState icon={ShoppingCart} title="Cart khali hai" text="Pehle kuch products cart mein daalo."
      action={<Link to="/"><Button>Shopping shuru karo</Button></Link>} /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl pb-36 md:pb-28 lg:pb-0">
      <PageHeader title="Checkout" backTo="/cart" />
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6">
        <div className="space-y-4">
          <Section n={1} title="Delivery address">
            {!addresses ? <Skeleton className="h-24 w-full" /> : addresses.length === 0 ? (
              <div className="text-center">
                <p className="mb-3 text-sm text-ink-soft">Delivery ke liye apna address jodo.</p>
                <Button onClick={() => setSheet(true)}><Plus className="h-4 w-4" />Address jodo</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((a) => (
                  <label key={a.id} className={cn('flex cursor-pointer gap-3 rounded-xl border p-3', addrId === a.id ? 'border-brand-600 bg-brand-50' : 'border-surface-line')}>
                    <input type="radio" name="address" checked={addrId === a.id} onChange={() => setAddrId(a.id)} className="mt-1 h-5 w-5 shrink-0 accent-brand-600" />
                    <span className="min-w-0 text-sm">
                      <span className="block font-extrabold">{a.fullName} <span className="font-medium text-ink-soft">· {a.mobile}</span></span>
                      <span className="block text-ink-soft">{[a.line1, a.line2, a.landmark].filter(Boolean).join(', ')}, {a.city}, {a.state} - {a.pincode}</span>
                    </span>
                  </label>
                ))}
                <button onClick={() => setSheet(true)} className="flex h-11 items-center gap-1.5 text-sm font-semibold text-brand-700"><Plus className="h-4 w-4" />Naya address jodo</button>
              </div>
            )}
          </Section>

          <Section n={2} title="Order summary">
            {quoting || !quote ? <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div> : (
              <div className="space-y-4">
                {quote.groups.map((g) => (
                  <div key={g.seller?.id || 'none'} className="overflow-hidden rounded-xl border border-surface-line">
                    <p className="flex items-center gap-2 border-b border-surface-line bg-surface-alt px-3 py-2 text-sm font-extrabold"><Store className="h-4 w-4 text-brand-700" />{g.seller?.businessName || 'Unavailable'}</p>
                    <ul className="divide-y divide-surface-line">
                      {g.items.map((i) => (
                        <li key={i.id} className="flex gap-3 p-3">
                          <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-alt">{i.image && <img src={i.image} alt="" loading="lazy" className="h-full w-full object-cover" />}</span>
                          <div className="min-w-0 flex-1 text-sm">
                            <p className="line-clamp-2 font-semibold">{i.title}</p>
                            <p className="text-xs text-ink-mute">{[i.size, i.color].filter(Boolean).join(' · ')}{[i.size, i.color].some(Boolean) ? ' · ' : ''}Qty {i.quantity}</p>
                            {i.issues.length > 0 && <p className="mt-1 flex items-start gap-1 text-xs font-semibold text-danger"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{ISSUE[i.issues[0].code]}</p>}
                          </div>
                          {i.purchasable && <span className="text-sm font-extrabold">{rupee(i.price * i.quantity)}</span>}
                        </li>
                      ))}
                    </ul>
                    {g.seller && g.subtotal > 0 && (
                      <p className="flex items-center gap-2 border-t border-surface-line px-3 py-2 text-xs text-ink-soft"><Truck className="h-4 w-4 shrink-0" />
                        {g.deliveryCharge > 0 ? `Delivery ${rupee(g.deliveryCharge)}` : 'Free delivery'}{g.etaDays ? ` · ${g.etaDays <= 1 ? 'Kal tak' : `${g.etaDays} din mein`}` : ''}</p>
                    )}
                  </div>
                ))}
                {!quote.canCheckout && (
                  <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-danger">
                    Kuch items order nahi ho sakte. <Link to="/cart" className="underline">Cart theek karo</Link> ya <button onClick={() => setSheet(true)} className="underline">dusra address chuno</button>.
                  </p>
                )}
              </div>
            )}
          </Section>

          <Section n={3} title="Payment">
            <div className="space-y-2">
              <PayOption icon={CreditCard} title="UPI / Card / Net banking" checked={chosen === 'ONLINE'} disabled={!online} onSelect={() => setMethod('ONLINE')}
                text={online ? 'Abhi online pay karo, surakshit payment' : 'Abhi available nahi hai'} />
              <PayOption icon={Wallet} title="Cash on Delivery" checked={chosen === 'COD'} disabled={!codOk} onSelect={() => setMethod('COD')}
                text={codOk ? 'Delivery par paise do' : quote ? 'Is order ke kisi seller par COD available nahi hai' : ''} />
              {quote && !online && !codOk && <p className="rounded-lg bg-red-50 p-3 text-sm text-danger">Is order ke liye abhi koi payment option available nahi hai.</p>}
            </div>
          </Section>
        </div>

        <aside className="mt-4 lg:sticky lg:top-24 lg:mt-0">
          <div className="rounded-card bg-white p-4 shadow-card">
            <h2 className="text-base font-extrabold">Price details</h2>
            {quote ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-ink-soft">Items ({quote.count})</dt><dd className="font-semibold">{rupee(quote.totals.mrpTotal || quote.totals.itemsTotal)}</dd></div>
                {quote.totals.savings > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Discount</dt><dd className="font-semibold text-brand-700">− {rupee(quote.totals.savings)}</dd></div>}
                <div className="flex justify-between"><dt className="text-ink-soft">Delivery</dt><dd className="font-semibold">{quote.totals.deliveryTotal > 0 ? rupee(quote.totals.deliveryTotal) : 'Free'}</dd></div>
                <div className="flex justify-between border-t border-surface-line pt-3 text-base"><dt className="font-extrabold">Total</dt><dd className="font-extrabold">{rupee(quote.totals.grandTotal)}</dd></div>
              </dl>
            ) : <Skeleton className="mt-3 h-24 w-full" />}
            {paying.length > 1 && <p className="mt-3 text-xs text-ink-soft">Alag-alag sellers ke liye {paying.length} alag orders banenge{chosen === 'ONLINE' ? ', payment ek hi baar hoga' : ''}.</p>}
            {chosen === 'ONLINE' && <p className="mt-3 text-xs text-ink-soft">Order ban jane ke baad payment ke liye kuch samay milta hai, warna order cancel ho jata hai.</p>}
            <Button full size="lg" className="mt-4 hidden lg:inline-flex" loading={placing} disabled={!canPlace} onClick={place}><CheckCircle2 className="h-5 w-5" />{label}</Button>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 border-t border-surface-line bg-white px-4 py-3 md:bottom-0 lg:hidden">
        <div className="min-w-0"><p className="text-xs text-ink-soft">Total</p><p className="text-lg font-extrabold leading-tight">{quote ? rupee(quote.totals.grandTotal) : '—'}</p></div>
        <Button size="lg" className="ml-auto flex-1 sm:flex-none sm:px-10" loading={placing} disabled={!canPlace} onClick={place}>{label}</Button>
      </div>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Naya address"
        footer={<Button type="submit" form={ADDRESS_FORM_ID} full size="lg" loading={saving}>Address save karo</Button>}>
        <AddressForm defaultMobile={user.mobile} onSubmit={saveAddress} />
      </BottomSheet>
    </div>
  );
}
