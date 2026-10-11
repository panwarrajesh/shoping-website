import { useEffect, useState } from 'react';
import { Bell, Package, Wallet, Store, Tag } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { notificationService } from '../services/customerService';
import { timeAgo } from '../utils/format';
import { cn } from '../utils/cn';

const ICONS = { ORDER: Package, PAYMENT: Wallet, SELLER: Store, PROMO: Tag };

export default function Notifications() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationService.list(1)
      .then((d) => { setItems(d.items); setUnread(d.unread); setHasMore(d.pagination.hasMore); })
      .catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const open = async (n) => {
    if (n.readAt) return;
    setItems((s) => s.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    setUnread((u) => Math.max(0, u - 1));
    notificationService.markRead(n.id).catch(() => {});
  };

  const readAll = async () => {
    try {
      await notificationService.markAllRead();
      setItems((s) => s.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() }))); setUnread(0);
    } catch (e) { toast.error(e.message); }
  };

  const more = async () => {
    try {
      const d = await notificationService.list(page + 1);
      setItems((s) => [...s, ...d.items]); setPage(page + 1); setHasMore(d.pagination.hasMore);
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notifications" action={unread > 0 && (
        <button onClick={readAll} className="h-11 px-2 text-sm font-semibold text-brand-700">Sab padh liye</button>)} />
      {loading ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-card" />)}</div>
        : items.length === 0 ? (
          <div className="rounded-card bg-white shadow-card">
            <EmptyState icon={Bell} title="Koi notification nahi" text="Order aur payment ke updates yahan dikhenge." />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-surface-line overflow-hidden rounded-card bg-white shadow-card">
              {items.map((n) => {
                const Icon = ICONS[n.type] || Bell;
                return (
                  <li key={n.id}>
                    <button onClick={() => open(n)} className={cn('flex w-full items-start gap-3 px-4 py-3 text-left', !n.readAt && 'bg-brand-50/60')}>
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{n.title}</span>
                        <span className="block text-sm text-ink-soft">{n.body}</span>
                        <span className="mt-0.5 block text-xs text-ink-mute">{timeAgo(n.createdAt)}</span>
                      </span>
                      {!n.readAt && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            {hasMore && <div className="mt-5 text-center"><Button variant="outline" onClick={more}>Aur dikhao</Button></div>}
          </>
        )}
    </div>
  );
}
