import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag } from 'lucide-react';
import { categoryService } from '../services/customerService';
import { Skeleton } from '../components/ui/Skeleton';

export default function Categories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    categoryService.tree().then((d) => setItems(d.categories)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-extrabold">Categories</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-card" />)
          : items.map((c) => (
            <div key={c.id} className="rounded-card bg-white p-4 shadow-card">
              <Link to={`/category/${c.slug}`} className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Tag className="h-5 w-5" /></span>
                <span className="text-base font-extrabold">{c.name}</span>
              </Link>
              {c.children.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.children.map((s) => (
                    <Link key={s.id} to={`/category/${s.slug}`} className="flex h-9 items-center rounded-pill border border-surface-line px-3 text-sm font-medium text-ink-soft">{s.name}</Link>
                  ))}
                </div>
              )}
            </div>))}
      </div>
    </div>
  );
}
