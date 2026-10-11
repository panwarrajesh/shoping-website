import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ShoppingBag, Clock, IndianRupee, Wallet, Package, AlertTriangle, Star, ShieldCheck, CheckCircle2, Circle, PackagePlus, Lock, MapPin } from 'lucide-react';
import StatTile from '../../components/seller/StatTile';
import StatusBanner from '../../components/seller/StatusBanner';
import { sellerService } from '../../services/sellerService';
import { rupee } from '../../utils/cn';

function Action({ to, icon: Icon, label, locked }) {
  const body = (
    <span className={`flex min-h-[88px] flex-col items-start justify-between rounded-card bg-white p-4 shadow-card ${locked ? 'opacity-60' : 'active:bg-surface-alt'}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">{locked ? <Lock className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</span>
      <span className="text-sm font-bold">{label}</span>
    </span>
  );
  return locked ? <div aria-disabled="true" title="Approval ke baad">{body}</div> : <Link to={to}>{body}</Link>;
}

export default function SellerDashboard() {
  const { seller } = useOutletContext();
  const [stats, setStats] = useState(null);
  const approved = seller.status === 'APPROVED';

  useEffect(() => {
    let alive = true;
    sellerService.dashboard().then((d) => alive && setStats(d.stats)).catch(() => alive && setStats(false));
    return () => { alive = false; };
  }, []);

  const loading = stats === null;
  const s = stats || {};
  const checklist = [
    { done: seller.verification.status !== 'NOT_SUBMITTED', text: 'KYC details submit hui' },
    { done: Boolean(seller.payout.accountLast4), text: 'Bank details jude' },
    { done: approved, text: 'Admin approval' },
    { done: (s.products || 0) > 0, text: 'Pehla product jodo' },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold lg:text-2xl">Namaste, {seller.businessName}</h1>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-soft"><MapPin className="h-4 w-4" />{seller.address.city} · {seller.delivery?.radiusKm} km delivery</p>
      </div>

      <StatusBanner seller={seller} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={ShoppingBag} label="Aaj ke orders" value={s.todayOrders} loading={loading} />
        <StatTile icon={Clock} label="Pending orders" value={s.pendingOrders} loading={loading} tone="amber" />
        <StatTile icon={IndianRupee} label="Total sales" value={rupee(s.totalSales || 0)} loading={loading} />
        <StatTile icon={Wallet} label="Settlement baaki" value={rupee(s.pendingSettlement || 0)} loading={loading} tone="amber" />
      </div>
      {stats === false && <p className="text-sm text-danger">Stats load nahi hue. Page refresh karo.</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-card bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold">Setup complete karo</h2>
            <span className="text-sm font-bold text-brand-700">{doneCount}/{checklist.length}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-line"><div className="h-full bg-brand-600 transition-all" style={{ width: `${(doneCount / checklist.length) * 100}%` }} /></div>
          <ul className="mt-3 space-y-1">
            {checklist.map((c) => (
              <li key={c.text} className="flex min-h-[40px] items-center gap-3 text-sm">
                {c.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" /> : <Circle className="h-5 w-5 shrink-0 text-ink-mute" />}
                <span className={c.done ? 'text-ink-soft line-through' : 'font-semibold'}>{c.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-extrabold">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Action to="/seller/products/add" icon={PackagePlus} label="Product jodo" locked={!approved} />
            <Action to="/seller/orders" icon={ShoppingBag} label="Orders dekho" locked={!approved} />
            <Action to="/seller/inventory" icon={Package} label="Stock manage karo" locked={!approved} />
            <Action to="/seller/settings" icon={ShieldCheck} label="Settings" />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Package} label={`Products (${s.activeProducts || 0} live)`} value={s.products} loading={loading} />
        <StatTile icon={AlertTriangle} label="Kam stock" value={s.lowStock} loading={loading} tone={s.lowStock > 0 ? 'red' : 'brand'} />
        <StatTile icon={Star} label={`Rating (${seller.ratingCount})`} value={seller.ratingCount ? seller.ratingAvg.toFixed(1) : '-'} />
        <StatTile icon={ShieldCheck} label="Quality score" value={seller.qualityScore?.toFixed(0)} />
      </div>
    </div>
  );
}
