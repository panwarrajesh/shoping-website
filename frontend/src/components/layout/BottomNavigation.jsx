import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, Search, Package, User } from 'lucide-react';
import { cn } from '../../utils/cn';

const items = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/categories', label: 'Categories', icon: LayoutGrid },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/orders', label: 'Orders', icon: Package },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function BottomNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-line bg-white pb-safe md:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink to={to} end={to === '/'} className={({ isActive }) =>
              cn('flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold',
                isActive ? 'text-brand-600' : 'text-ink-mute')}>
              <Icon className="h-5 w-5" />{label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
