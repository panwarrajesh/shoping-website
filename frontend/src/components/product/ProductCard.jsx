import { Link } from 'react-router-dom';
import { Star, MapPin, Truck, BadgeCheck, Heart } from 'lucide-react';
import { cn, rupee } from '../../utils/cn';

// Expects a product from the API: { id, title, image, price, mrp, rating, distanceKm, deliveryText, sellerVerified }
export default function ProductCard({ product: p, onWishlist, wishlisted }) {
  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
  return (
    <Link to={`/products/${p.id}`} className="block overflow-hidden rounded-card bg-white shadow-card">
      <div className="relative aspect-square bg-surface-alt">
        <img src={p.image} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
        {off > 0 && <span className="absolute left-2 top-2 rounded-md bg-marigold-500 px-1.5 py-0.5 text-[11px] font-bold text-ink">{off}% off</span>}
        <button
          aria-label="Add to wishlist"
          onClick={(e) => { e.preventDefault(); onWishlist?.(p); }}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink-soft shadow-card"
        ><Heart className={cn('h-[18px] w-[18px]', wishlisted && 'fill-danger text-danger')} /></button>
      </div>
      <div className="space-y-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{p.title}</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-0.5 rounded bg-brand-600 px-1.5 py-0.5 font-bold text-white">
            {Number(p.rating || 0).toFixed(1)} <Star className="h-3 w-3 fill-current" />
          </span>
          {p.sellerVerified && <span className="inline-flex items-center gap-0.5 font-semibold text-brand-700"><BadgeCheck className="h-3.5 w-3.5" />Verified</span>}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-extrabold">{rupee(p.price)}</span>
          {off > 0 && <span className="text-xs text-ink-mute line-through">{rupee(p.mrp)}</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-soft">
          {p.distanceKm != null && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.distanceKm} km</span>}
          {p.deliveryText && <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5" />{p.deliveryText}</span>}
        </div>
      </div>
    </Link>
  );
}
