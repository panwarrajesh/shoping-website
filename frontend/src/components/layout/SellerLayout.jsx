import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Boxes, Wallet, Undo2, Star, Store, Settings, ExternalLink, MoreHorizontal } from 'lucide-react';
import { sellerService } from '../../services/sellerService';
import { Skeleton } from '../ui/Skeleton';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { cn } from '../../utils/cn';

const NAV = [
  { to: '/seller/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/seller/products', label: 'Products', icon: Package },
  { to: '/seller/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/seller/inventory', label: 'Inventory', icon: Boxes },
  { to: '/seller/earnings', label: 'Earnings', icon: Wallet },
  { to: '/seller/returns', label: 'Returns', icon: Undo2 },
  { to: '/seller/reviews', label: 'Reviews', icon: Star },
  { to: '/seller/profile', label: 'Store profile', icon: Store },
  { to: '/seller/settings', label: 'Settings', icon: Settings },
];
const MOBILE = [NAV[0], NAV[1], NAV[2], NAV[4], { to: '/seller/settings', label: 'More', icon: MoreHorizontal }];

const statusBadge = (s) => ({ APPROVED: ['green', 'Approved'], PENDING: ['amber', 'Pending'], REJECTED: ['red', 'Rejected'], SUSPENDED: ['red', 'Suspended'] }[s]);

export default function SellerLayout() {
  const [seller, setSeller] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { setSeller((await sellerService.me()).seller); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-ink-soft">{error}</p><Button onClick={load}>Dobara try karo</Button>
      </div>
    );
  }
  if (!seller) {
    return <div className="space-y-4 p-4"><Skeleton className="h-14 w-full" /><Skeleton className="h-32 w-full rounded-card" /><Skeleton className="h-32 w-full rounded-card" /></div>;
  }
  const [tone, text] = statusBadge(seller.status);

  return (
    <div className="min-h-screen bg-surface-alt lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-surface-line bg-white lg:flex">
        <div className="border-b border-surface-line p-5">
          <Link to="/" className="text-lg font-extrabold text-brand-600">LocalMart</Link>
          <p className="mt-3 truncate text-sm font-extrabold">{seller.businessName}</p>
          <div className="mt-1 flex items-center gap-2"><Badge tone={tone}>{text}</Badge>{seller.isVerified && <Badge tone="green">Verified</Badge>}</div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cn('flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold',
              isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-surface-alt')}>
              <Icon className="h-5 w-5" />{label}
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="m-3 flex h-11 items-center gap-2 rounded-xl border border-surface-line px-3 text-sm font-semibold text-ink-soft"><ExternalLink className="h-4 w-4" />Customer site dekho</Link>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-brand-600 px-4 pt-safe text-white lg:hidden">
          <span className="min-w-0"><span className="block truncate text-sm font-extrabold">{seller.businessName}</span>
            <span className="block text-[11px] text-white/75">Seller panel · {text}</span></span>
          <Link to="/" aria-label="Customer site" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"><ExternalLink className="h-5 w-5" /></Link>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-4 pb-24 lg:px-8 lg:py-8 lg:pb-8">
          <Outlet context={{ seller, setSeller, reload: load }} />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-line bg-white pb-safe lg:hidden">
        <ul className="grid grid-cols-5">
          {MOBILE.map(({ to, label, icon: Icon }) => (
            <li key={label}>
              <NavLink to={to} className={({ isActive }) => cn('flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold', isActive ? 'text-brand-600' : 'text-ink-mute')}>
                <Icon className="h-5 w-5" />{label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
