import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ShoppingCart } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function CartLink({ className }) {
  const count = useSelector((s) => s.cart.count);
  return (
    <Link to="/cart" aria-label={count ? `Cart, ${count} items` : 'Cart'} className={cn('relative', className)}>
      <ShoppingCart className="h-6 w-6" />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-marigold-500 px-1 text-[11px] font-extrabold text-ink">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
