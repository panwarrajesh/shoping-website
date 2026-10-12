import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { PackageX, CheckCircle2, MapPin, BadgeCheck, Store, ImageOff } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import StatusBadge from '../components/orders/StatusBadge';
import OrderTimeline from '../components/orders/OrderTimeline';
import ReasonSheet from '../components/orders/ReasonSheet';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { orderService } from '../services/orderService';
import { payForOrders, PAY_MESSAGES } from '../utils/razorpay';
import { rupee } from '../utils/cn';
import { formatDateTime } from '../utils/date';

const REASONS = ['Galti se order ho gaya', 'Kam price mein mil raha hai', 'Delivery mein der lag rahi hai', 'Address galat daal diya'];
const Card = ({ title, children }) => <section className="rounded-card bg-white p-4 shadow-card">{title && <h2 className="mb-3 text-base font-extrabold">{title}</h2>}{children}</section>;

export default function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const toast = useToast();
  const [o, setO] = useState(null);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let alive = true;
    setO(null); setError('');
    orderService.detail(id).then((d) => alive && setO(d.order)).catch((e) => alive && setError(e.status === 404 ? 'notfound' : e.message));
    return () => { alive = false; };
  }, [id]);

  const cancel = async (reason) => {
    setBusy(true);
    try { const d = await orderService.cancel(id, reason); setO(d.order); setSheet(false); toast.success('Order cancel ho gaya'); }
    catch (e) { toast.error(e.message); setSheet(false); orderService.detail(id).then((d) => setO(d.order)).catch(() => {}); }
    finally { setBusy(false); }
  };

  const payNow = async () => {
    setPaying(true);
    try {
      const r = await payForOrders([id], { onFailure: (m) => toast.error(m || 'Payment fail hua. Dobara try karo.') });
      const [kind, text] = PAY_MESSAGES[r.status] || PAY_MESSAGES.UNVERIFIED;
      toast[kind](r.status === 'UNVERIFIED' && r.message ? r.message : text);
    } catch (e) { toast.error(e.message); }
    finally { setPaying(false); orderService.detail(id).then((x) => setO(x.order)).catch(() => {}); }
  };

  if (error) {
    return <EmptyState icon={PackageX} title={error === 'notfound' ? 'Yeh order nahi mila' : 'Load nahi ho paya'} text={error === 'notfound' ? '' : error} action={<Link to="/orders"><Button>Mere orders</Button></Link>} />;
  }
  if (!o) return <div className="mx-auto max-w-3xl space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full rounded-card" /><Skeleton className="h-40 w-full rounded-card" /></div>;

  const a = o.address;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={`Order #${o.orderNumber}`} backTo="/orders" />
      {location.state?.placed && (o.paymentMethod === 'COD' || o.paymentStatus === 'PAID') && (
        <p className="flex items-center gap-2 rounded-card bg-brand-50 p-3 text-sm font-bold text-brand-700"><CheckCircle2 className="h-5 w-5 shrink-0" />Aapka order place ho gaya! Seller jaldi confirm karega.</p>
      )}
      <div className="flex flex-wrap items-center gap-2"><StatusBadge status={o.status} /><span className="text-xs text-ink-mute">{formatDateTime(o.createdAt)}</span></div>

      {o.payment.canPay && (
        <section className="rounded-card border border-amber-300 bg-marigold-50 p-4">
          <p className="text-sm font-extrabold text-amber-900">Payment baaki hai</p>
          <p className="mt-0.5 text-xs text-ink-soft">{rupee(o.price.total)} abhi pay karo. {o.payment.expiresAt ? `${formatDateTime(o.payment.expiresAt)} tak, uske baad order cancel ho jayega.` : ''}</p>
          <Button className="mt-3" full size="lg" loading={paying} onClick={payNow}>Abhi pay karo</Button>
        </section>
      )}

      <Card title="Order tracking"><OrderTimeline timeline={o.timeline} /></Card>

      <Card title={`Items (${o.items.reduce((t, i) => t + i.quantity, 0)})`}>
        <ul className="divide-y divide-surface-line">
          {o.items.map((i) => (
            <li key={i.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <Link to={`/products/${i.productId}`} className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-alt text-ink-mute">
                {i.image ? <img src={i.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageOff className="h-5 w-5" />}</Link>
              <div className="min-w-0 flex-1 text-sm"><p className="line-clamp-2 font-semibold">{i.title}</p><p className="text-xs text-ink-mute">Qty {i.quantity} × {rupee(i.unitPrice)}</p></div>
              <span className="text-sm font-extrabold">{rupee(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-center gap-2 border-t border-surface-line pt-3 text-xs text-ink-soft"><Store className="h-4 w-4" />Seller: <b className="text-ink">{o.seller.businessName}</b>, {o.seller.city}{o.seller.isVerified && <BadgeCheck className="h-4 w-4 text-brand-600" />}</p>
      </Card>

      <Card title="Delivery address">
        <p className="flex gap-3 text-sm"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /><span><b>{a.fullName}</b> · {a.mobile}<br /><span className="text-ink-soft">{[a.line1, a.line2, a.landmark].filter(Boolean).join(', ')}, {a.city}, {a.state} - {a.pincode}</span></span></p>
      </Card>

      <Card title="Payment">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-ink-soft">Items</dt><dd className="font-semibold">{rupee(o.price.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-soft">Delivery</dt><dd className="font-semibold">{o.price.delivery > 0 ? rupee(o.price.delivery) : 'Free'}</dd></div>
          <div className="flex justify-between border-t border-surface-line pt-2 text-base"><dt className="font-extrabold">Total</dt><dd className="font-extrabold">{rupee(o.price.total)}</dd></div>
        </dl>
        <p className="mt-3 rounded-lg bg-surface-alt p-2.5 text-xs text-ink-soft">
          {o.paymentMethod === 'COD'
            ? (o.paymentStatus === 'PAID' ? 'Cash on Delivery · paise mil chuke hain' : `Cash on Delivery · delivery par ${rupee(o.price.total)} do`)
            : ({ PAID: 'Online payment ho gaya', PENDING: 'Online payment baaki hai', FAILED: 'Online payment nahi hua', REFUNDED: 'Paise wapas ho gaye', PARTIALLY_REFUNDED: 'Kuch paise wapas ho gaye' }[o.paymentStatus] || o.paymentStatus)}
        </p>
        {o.refund && <p className="mt-2 rounded-lg bg-brand-50 p-2.5 text-xs font-semibold text-brand-700">{o.refund.status === 'PROCESSED' ? `${rupee(o.refund.amount)} wapas kar diye gaye hain.` : `${rupee(o.refund.amount)} ka refund process mein hai.`}</p>}
      </Card>

      {o.canCancel && <Button variant="outline" full size="lg" className="text-danger" onClick={() => setSheet(true)}>Order cancel karo</Button>}

      <ReasonSheet open={sheet} title="Order kyun cancel kar rahe ho?" reasons={REASONS} loading={busy} onSubmit={cancel} onClose={() => setSheet(false)} />
    </div>
  );
}
