import { Skeleton } from '../ui/Skeleton';

export default function StatTile({ icon: Icon, label, value, loading, tone = 'brand' }) {
  const tones = { brand: 'bg-brand-50 text-brand-700', amber: 'bg-marigold-50 text-amber-700', red: 'bg-red-50 text-danger' };
  return (
    <div className="rounded-card bg-white p-4 shadow-card">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
      {loading ? <Skeleton className="mt-3 h-7 w-20" /> : <p className="mt-3 text-2xl font-extrabold leading-none">{value}</p>}
      <p className="mt-1 text-xs font-medium text-ink-soft">{label}</p>
    </div>
  );
}
