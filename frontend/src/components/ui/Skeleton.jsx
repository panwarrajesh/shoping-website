import { cn } from '../../utils/cn';

export function Skeleton({ className }) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-surface-line/70', className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card bg-white shadow-card">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
