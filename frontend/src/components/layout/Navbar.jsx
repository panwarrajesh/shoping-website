import { MapPin, Search, ShoppingCart, ChevronDown, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { openSheet } from '../../store/locationSlice';

export default function Navbar() {
  const user = useSelector((s) => s.auth.user);
  const loc = useSelector((s) => s.location.current);
  const dispatch = useDispatch();
  return (
    <header className="sticky top-0 z-30 bg-brand-600 pt-safe text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 md:flex-nowrap">
        <Link to="/" className="hidden text-xl font-extrabold md:block">LocalMart</Link>
        <button onClick={() => dispatch(openSheet())} className="flex min-h-[44px] min-w-0 max-w-[60%] items-center gap-1.5 text-left md:max-w-[240px]" aria-label="Location badlo">
          <MapPin className="h-5 w-5 shrink-0" />
          <span className="min-w-0">
            <span className="block text-[11px] leading-none text-white/75">Your location</span>
            <span className="flex items-center gap-1 text-sm font-bold leading-tight">
              <span className="truncate">{loc?.label || 'Location chuno'}</span><ChevronDown className="h-4 w-4 shrink-0" />
            </span>
          </span>
        </button>
        <div className="ml-auto flex items-center md:order-3 md:ml-0">
          <Link to={user ? '/profile' : '/login'} className="hidden h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-white/10 md:flex">
            <User className="h-5 w-5" />{user ? user.name.split(' ')[0] : 'Login'}
          </Link>
          <Link to="/cart" aria-label="Cart" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10">
            <ShoppingCart className="h-6 w-6" />
          </Link>
        </div>
        <Link to="/search" className="order-last flex h-11 w-full items-center gap-2 rounded-xl bg-white px-3 text-sm text-ink-mute md:order-2 md:ml-4 md:flex-1">
          <Search className="h-5 w-5 shrink-0" /><span className="truncate">Search shoes, accessories, sellers…</span>
        </Link>
      </div>
    </header>
  );
}
