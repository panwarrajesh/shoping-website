import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { PackageX, Phone, MapPin, ExternalLink, ImageOff, Banknote } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import StatusBadge from '../../components/orders/StatusBadge';
import OrderTimeline from '../../components/orders/OrderTimeline';
import ReasonSheet from '../../components/orders/ReasonSheet';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { orderService } from '../../services/orderService';
import { rupee } from '../../utils/cn';
import { formatDateTime, formatDate } from '../../utils/date';

const NEXT_LABEL = {
  CONFIRMED: 'Order accept karo', PROCESSING: 'Taiyaar karna shuru karo', PACKED: 'Pack ho gaya',
  SHIPPED: 'Bhej diya', OUT_FOR_DELIVERY: 'Delivery ke liye nikla', DELIVERED: 'Deliver ho gaya',
};
const REASONS = ['Stock khatam ho gaya', 'Product kharab nikla', 'Customer ka address door hai', 'Customer ne cancel karne ko kaha'];
const Card = ({ title, children }) => <section className="rounded-card bg-white p-4 shadow-card">{title && <h2 className="mb-3 text-base font-extrabold">{title}</h2>}{children}</section>;

export default function SellerOrderDetail() {
  const { id } = useParams();
  const { seller } = useOutletContext();
  const toast = useToast();
  const [o, setO] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelSheet, setCancelSheet] = useState(false);
  const [confirmDeliver, setConfirmDeliver] = useState(false);
  const approved = seller.status === 'APPROVED';

  useEffect(() => {
    let alive = true;
    setO(null); setError('');
    orderService.sellerDetail(id).then((d) => alive && setO(d.order)).catch((e) => alive && setError(e.status === 404 ? 'notfound' : e.message));
    return () => { alive = false; };
  }, [id]);

  const refresh = () => orderService.sellerDetail(id).then((d) => setO(d.order)).catch(() => {});
  const advance = async () => {
    setBusy(true);
    try { const d = await orderService.sellerStatus(id, o.next); setO(d.order); toast.success('Status update ho gaya'); setConfirmDeliver(false); }
    catch (e) { toast.error(e.message); setConfirmDeliver(false); refresh(); } finally { setBusy(false); }
  };
  const cancel = async (reason) => {
    setBusy(true);
    try { const d = await orderService.sellerCancel(id, reason); setO(d.order); setCancelSheet(false); toast.success('Order cancel ho gaya'); }
    catch (e) { toast.error(e.message); setCancelSheet(false); refresh(); } finally { setBusy(false); }
  };

  if (error) return <EmptyState icon={PackageX} title={error === 'notfound' ? 'Yeh order nahi mila' : 'Load nahi ho paya'} text={error === 'notfound' ? '' : error} action={<Link to="/seller/orders"><Button>Orders par jao</Button></Link>} />;
  if (!o) return <div className="mx-auto max-w-3xl space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-40 w-full rounded-card" /><Skeleton className="h-64 w-full rounded-card" /></div>;

  const a = o.address;
  const mapsUrl = a.latitude != null ? `https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', '))}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-28 lg:pb-0">
      <PageHeader title={`Order #${o.orderNumber}`} backTo="/seller/orders" />
      <div className="flex flex-wrap items-center gap-2"><StatusBadge status={o.status} /><span className="text-xs text-ink-mute">{formatDateTime(o.createdAt)}</span></div>

      {o.status === 'OUT_FOR_DELIVERY' && o.collectCash > 0 && (
        <p className="flex items-center gap-3 rounded-card bg-marigold-50 p-3 text-sm font-bold text-amber-800"><Banknote className="h-6 w-6 shrink-0" />Delivery par customer se {rupee(o.collectCash)} cash lena hai.</p>
      )}
      {o.cancelReason && <p className="rounded-card bg-red-50 p-3 text-sm text-danger">Cancel reason: {o.cancelReason}</p>}

      <Card title="Customer aur address">
        <p className="text-sm font-extrabold">{o.customer.name}</p>
        <p className="mt-1 text-sm text-ink-soft">{[a.line1, a.line2, a.landmark].filter(Boolean).join(', ')}, {a.city}, {a.state} - {a.pincode}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <a href={`tel:+91${o.customer.mobile}`}><Button variant="outline" full><Phone className="h-4 w-4" />Call karo</Button></a>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"><Button variant="outline" full><MapPin className="h-4 w-4" />Map<ExternalLink className="h-3.5 w-3.5" /></Button></a>
        </div>
      </Card>

      <Card title="Items">
        <ul className="divide-y divide-surface-line">
          {o.items.map((i) => (
            <li key={i.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-alt text-ink-mute">
                {i.image ? <img src={i.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageOff className="h-5 w-5" />}</span>
              <div className="min-w-0 flex-1 text-sm"><p className="line-clamp-2 font-semibold">{i.title}</p><p className="text-xs text-ink-mute">Qty {i.quantity} × {rupee(i.unitPrice)}</p>
                <p className="text-xs text-ink-soft">Commission {i.commissionPercent}% = {rupee(i.commissionAmount)}</p></div>
              <span className="text-sm font-extrabold">{rupee(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Aapki kamai">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-ink-soft">Items ka total</dt><dd className="font-semibold">{rupee(o.earnings.itemsTotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-soft">Platform commission</dt><dd className="font-semibold text-danger">− {rupee(o.earnings.commission)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-soft">Delivery charge (aapka)</dt><dd className="font-semibold">+ {rupee(o.earnings.delivery)}</dd></div>
          <div className="flex justify-between border-t border-surface-line pt-2 text-base"><dt className="font-extrabold">Aapko milega</dt><dd className="font-extrabold text-brand-700">{rupee(o.earnings.net)}</dd></div>
        </dl>
        <p className="mt-3 rounded-lg bg-surface-alt p-2.5 text-xs text-ink-soft">
          {o.settlement ? `Settlement ${o.settlement.status === 'PAID' ? 'ho chuka hai' : `baaki hai (${formatDate(o.settlement.settleAfter)} ke baad)`}`
            : o.paymentMethod === 'COD' ? 'Cash on Delivery · deliver hone ke baad settlement banega' : 'Online payment'}
        </p>
      </Card>

      <Card title="Order tracking"><OrderTimeline timeline={o.timeline} /></Card>

      {(o.next || o.canCancel) && approved !== false && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-surface-line bg-white p-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <div className="mx-auto flex max-w-3xl gap-3">
            {o.canCancel && <Button variant="outline" size="lg" className="shrink-0 text-danger" onClick={() => setCancelSheet(true)}>{o.status === 'PENDING' ? 'Reject karo' : 'Cancel karo'}</Button>}
            {o.next && approved && <Button size="lg" full loading={busy} onClick={() => (o.next === 'DELIVERED' ? setConfirmDeliver(true) : advance())}>{NEXT_LABEL[o.next]}</Button>}
          </div>
        </div>
      )}

      <ReasonSheet open={cancelSheet} title={o.status === 'PENDING' ? 'Order reject karne ka reason' : 'Order cancel karne ka reason'} reasons={REASONS}
        confirmText={o.status === 'PENDING' ? 'Reject karo' : 'Cancel karo'} loading={busy} onSubmit={cancel} onClose={() => setCancelSheet(false)} />
      <ConfirmDialog open={confirmDeliver} title="Order deliver ho gaya?" confirmText="Haan, deliver hua" loading={busy} onConfirm={advance} onClose={() => setConfirmDeliver(false)}
        message={o.collectCash > 0 ? `Kya customer se ${rupee(o.collectCash)} cash mil gaya?` : 'Kya customer ko order mil gaya?'} />
    </div>
  );
}
