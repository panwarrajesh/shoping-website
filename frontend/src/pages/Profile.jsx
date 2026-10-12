import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { LogOut, ShieldCheck, Package, MapPin, Heart, Bell, UserPen, KeyRound, ChevronRight, Store } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { logout } from '../store/authSlice';
import { customerService } from '../services/customerService';

function Row({ to, icon: Icon, label, hint, badge }) {
  return (
    <Link to={to} className="flex min-h-[60px] items-center gap-3 px-4 py-3 active:bg-surface-alt">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block truncate text-xs text-ink-mute">{hint}</span>}
      </span>
      {badge > 0 && <span className="rounded-pill bg-danger px-2 py-0.5 text-xs font-bold text-white">{badge}</span>}
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-mute" />
    </Link>
  );
}

export default function Profile() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    customerService.me().then((d) => alive && setStats(d.stats)).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center gap-4 rounded-card bg-white p-4 shadow-card">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-2xl font-extrabold text-brand-700">
          {user.name?.[0]?.toUpperCase() || 'U'}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-extrabold">{user.name}</h1>
          <p className="truncate text-sm text-ink-soft">{user.mobile ? `+91 ${user.mobile}` : user.email}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge tone="green">{user.role}</Badge>
            {user.mobileVerified && <Badge tone="green"><ShieldCheck className="h-3 w-3" />Mobile verified</Badge>}
          </div>
        </div>
      </div>

      <div className="divide-y divide-surface-line overflow-hidden rounded-card bg-white shadow-card">
        <Row to="/orders" icon={Package} label="Mere orders" hint="Order track karo" />
        <Row to="/addresses" icon={MapPin} label="Saved addresses" hint={stats ? `${stats.addressCount} address` : undefined} />
        <Row to="/wishlist" icon={Heart} label="Wishlist" hint={stats ? `${stats.wishlistCount} products` : undefined} />
        <Row to="/notifications" icon={Bell} label="Notifications" badge={stats?.unreadNotifications} />
      </div>

      <div className="divide-y divide-surface-line overflow-hidden rounded-card bg-white shadow-card">
        <Row to="/profile/edit" icon={UserPen} label="Profile edit karo" />
        <Row to="/profile/password" icon={KeyRound} label="Password badlo" />
      </div>

      {user.role === 'SELLER' && (
        <Link to="/seller/dashboard" className="flex items-center gap-3 rounded-card bg-brand-600 p-4 text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-600"><Store className="h-6 w-6" /></span>
          <span className="flex-1"><span className="block text-sm font-extrabold">Seller dashboard</span>
            <span className="block text-xs text-white/80">Apna store aur orders manage karo</span></span>
          <ChevronRight className="h-5 w-5" />
        </Link>
      )}

      {user.role === 'CUSTOMER' && (
        <Link to="/seller/register" className="flex items-center gap-3 rounded-card bg-marigold-50 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-marigold-500 text-ink"><Store className="h-6 w-6" /></span>
          <span className="flex-1"><span className="block text-sm font-extrabold">Apna business shuru karo</span>
            <span className="block text-xs text-ink-soft">Ghar baithe apne area mein products becho</span></span>
          <ChevronRight className="h-5 w-5 text-ink-mute" />
        </Link>
      )}

      <Button variant="outline" full size="lg" onClick={async () => { await dispatch(logout()); navigate('/login'); }}>
        <LogOut className="h-5 w-5" />Logout
      </Button>
    </div>
  );
}
